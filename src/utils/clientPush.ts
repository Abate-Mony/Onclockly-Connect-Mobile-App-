import axios, { type AxiosRequestConfig } from "axios"
import Constants from "expo-constants"
import * as SecureStore from "expo-secure-store"
import { Platform } from "react-native"
import { getSessionVersion, getStoredUser, getToken, isCurrentSession, SessionChangedError } from "./auth"
import customFetch, { BASE_URL } from "./customFetch"
import {
  createPushRegistration, forgetPushRegistration, getPushRegistration, rememberPushRegistration,
  type PushRegistration,
} from "./pushRegistration"

export type ClientPushStatus = "enabled" | "denied" | "undetermined" | "unavailable"
type NotificationsModule = typeof import("expo-notifications")
type Identity = { version: number; userId: string; accessToken: string; epoch: number }
type SavedRegistration = PushRegistration & { userId: string }

const STORAGE_KEY = "clientPushRegistration"
let nativeModule: Promise<NotificationsModule> | null = null
let operations: Promise<unknown> = Promise.resolve()
let epoch = 0
let identity: Identity | null = null

function nativeIsAvailable() {
  return (Platform.OS === "ios" || Platform.OS === "android") && Constants.executionEnvironment !== "storeClient"
}

function projectId() {
  const value = Constants.easConfig?.projectId
    ?? Constants.expoConfig?.extra?.eas?.projectId
    ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID
  return typeof value === "string" && value.trim() ? value : null
}

// Expo Go must not evaluate expo-notifications: remote push is not available
// there, and importing it alone can emit native-module warnings.
export async function loadClientNotifications(): Promise<NotificationsModule | null> {
  if (!nativeIsAvailable()) return null
  nativeModule ??= import("expo-notifications")
  return nativeModule
}

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = operations.then(operation)
  operations = result.catch(() => undefined)
  return result
}

function assertCurrent(candidate: Identity) {
  if (candidate.epoch !== epoch || !isCurrentSession(candidate.version)) throw new SessionChangedError()
}

async function readSaved(): Promise<SavedRegistration | null> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY)
  if (!raw) return null
  try {
    const saved: unknown = JSON.parse(raw)
    if (!saved || typeof saved !== "object") return null
    const value = saved as Partial<SavedRegistration>
    if (typeof value.userId !== "string" || typeof value.token !== "string" ||
      typeof value.registrationId !== "string") return null
    return value as SavedRegistration
  } catch { return null }
}

function sameRegistration(a: PushRegistration | null, b: PushRegistration | null) {
  return !!a && !!b && a.token === b.token && a.registrationId === b.registrationId
}

async function deleteRemote(registration: PushRegistration, accessToken: string) {
  // A logout cleanup must never refresh/reopen authentication or use B's JWT.
  await axios.delete(BASE_URL + "/portal/expo-push-token", {
    data: registration, headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 5_000, withCredentials: false,
  })
}

function permissionStatus(permissions: Awaited<ReturnType<NotificationsModule["getPermissionsAsync"]>>, native: NotificationsModule): ClientPushStatus {
  if (permissions.granted || permissions.ios?.status === native.IosAuthorizationStatus.PROVISIONAL ||
    permissions.ios?.status === native.IosAuthorizationStatus.EPHEMERAL) return "enabled"
  return permissions.status === "denied" ? "denied" : "undetermined"
}

export async function getClientPushStatus(): Promise<ClientPushStatus> {
  if (!nativeIsAvailable() || !projectId()) return "unavailable"
  const native = await loadClientNotifications()
  if (!native) return "unavailable"
  return permissionStatus(await native.getPermissionsAsync(), native)
}

export async function registerClientPush(askPermission = false): Promise<ClientPushStatus> {
  const version = getSessionVersion()
  const capturedEpoch = epoch
  if (!isCurrentSession(version) || !nativeIsAvailable() || !projectId()) return "unavailable"
  const [user, accessToken] = await Promise.all([getStoredUser(), getToken()])
  const candidate = { version, userId: user?._id ?? "", accessToken: accessToken ?? "", epoch: capturedEpoch }
  assertCurrent(candidate)
  if (!user || !accessToken) return "unavailable"
  identity = candidate

  // Only the initial restored session may hydrate a previous registration.
  // A subsequent sign-in must create its own ownership identifier.
  if (version === 0 && !getPushRegistration(version)) {
    const saved = await readSaved().catch(() => null)
    assertCurrent(candidate)
    if (saved?.userId === user._id) rememberPushRegistration(version, saved)
  }

  const native = await loadClientNotifications()
  assertCurrent(candidate)
  if (!native) return "unavailable"
  if (Platform.OS === "android") {
    await native.setNotificationChannelAsync("default", {
      name: "Booking updates", importance: native.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250], lightColor: "#173F35",
    })
    assertCurrent(candidate)
  }
  let permissions = await native.getPermissionsAsync()
  assertCurrent(candidate)
  if (askPermission && permissionStatus(permissions, native) !== "enabled" && permissions.canAskAgain) {
    permissions = await native.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } })
    assertCurrent(candidate)
  }
  const status = permissionStatus(permissions, native)
  if (status !== "enabled") return status

  const { data: token } = await native.getExpoPushTokenAsync({ projectId: projectId()! })
  assertCurrent(candidate)
  const registration = createPushRegistration(version, token)
  return enqueue(async (): Promise<ClientPushStatus> => {
    assertCurrent(candidate)
    const previous = getPushRegistration(version)
    // Remember before POST so logout and a rotating refresh can snapshot
    // the exact in-flight binding rather than a newer account's metadata.
    rememberPushRegistration(version, registration)
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify({ ...registration, userId: user._id }))
      assertCurrent(candidate)
      const config: AxiosRequestConfig & { _sessionVersion: number } = { timeout: 10_000, _sessionVersion: version }
      await customFetch.post("/portal/expo-push-token", registration, config)
      assertCurrent(candidate)
      if (previous && !sameRegistration(previous, registration)) {
        await deleteRemote(previous, accessToken).catch(() => undefined)
      }
      return "enabled"
    } catch (error) {
      if (!isCurrentSession(version) || candidate.epoch !== epoch) {
        await deleteRemote(registration, accessToken).catch(() => undefined)
        throw new SessionChangedError()
      }
      throw error
    }
  })
}

export function enableClientPush(): Promise<ClientPushStatus> {
  return registerClientPush(true)
}

// Invoke synchronously before clearSession(). Native permission/token work
// is invalidated now; already-started POSTs and exact-owner cleanup finish
// in order. The caller can revoke its refresh session with the returned pair.
export function prepareClientPushLogout(userId?: string): Promise<PushRegistration | null> {
  const version = getSessionVersion()
  const candidate = identity?.version === version ? identity : null
  const expectedUserId = userId ?? candidate?.userId
  const captured = getPushRegistration(version)
  epoch++
  identity = null
  if (!nativeIsAvailable()) {
    forgetPushRegistration(version)
    return Promise.resolve(captured)
  }
  return enqueue(async () => {
    const saved = await readSaved().catch(() => null)
    const registration = captured ?? (saved?.userId === expectedUserId ? saved : null)
    if (registration && candidate?.accessToken) {
      await deleteRemote(registration, candidate.accessToken).catch(() => undefined)
    }
    if (sameRegistration(saved, registration)) await SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => undefined)
    forgetPushRegistration(version)
    const native = await loadClientNotifications().catch(() => null)
    if (native) {
      native.clearLastNotificationResponse()
      await native.dismissAllNotificationsAsync().catch(() => undefined)
    }
    return registration
  })
}
