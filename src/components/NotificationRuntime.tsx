import { useQueryClient } from "@tanstack/react-query"
import type { NotificationResponse } from "expo-notifications"
import { router } from "expo-router"
import { useEffect } from "react"
import { AppState } from "react-native"
import { useAuth } from "../context/AuthContext"
import { getSessionVersion, isCurrentSession } from "../utils/auth"
import { loadClientNotifications, registerClientPush } from "../utils/clientPush"
import { resolveNotificationDestination } from "../utils/notifications"

export function NotificationRuntime() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user) return
    const version = getSessionVersion()
    let disposed = false
    const subscriptions: { remove: () => void }[] = []
    let native: Awaited<ReturnType<typeof loadClientNotifications>> = null
    const handled = new Set<string>()
    const current = () => !disposed && isCurrentSession(version)
    const refreshBookings = () => {
      if (!current()) return
      for (const key of ["portal-notifications", "portal-bookings", "portal-booking-requests", "portal-booking", "portal-booking-change-requests"]) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
    }
    const register = () => { void registerClientPush().catch(() => undefined) }
    subscriptions.push(AppState.addEventListener("change", state => {
      if (state === "active" && current()) {
        refreshBookings()
        register()
      }
    }))
    register()

    void (async () => {
      native = await loadClientNotifications()
      if (!native || !current()) return
      native.setNotificationHandler({
        handleNotification: async notification => {
          const belongsToUser = current() && notification.request.content.data?.userId === user._id
          return { shouldShowBanner: belongsToUser, shouldShowList: belongsToUser, shouldPlaySound: belongsToUser, shouldSetBadge: false }
        },
      })
      const handleResponse = (response: NotificationResponse) => {
        const { request } = response.notification
        const identifier = `${request.identifier}:${response.actionIdentifier}`
        if (!current() || handled.has(identifier)) return
        handled.add(identifier)
        native?.clearLastNotificationResponse()
        if (response.actionIdentifier !== native?.DEFAULT_ACTION_IDENTIFIER || request.content.data?.userId !== user._id) return
        refreshBookings()
        const destination = resolveNotificationDestination(request.content.data?.url, user.clientRole)
        if (destination) router.push(destination)
      }
      subscriptions.push(native.addNotificationReceivedListener(notification => {
        if (notification.request.content.data?.userId === user._id) refreshBookings()
      }))
      subscriptions.push(native.addNotificationResponseReceivedListener(handleResponse))
      subscriptions.push(native.addPushTokenListener(() => { if (current()) register() }))
      const response = native.getLastNotificationResponse()
      if (response) handleResponse(response)
    })().catch(() => undefined)

    return () => {
      disposed = true
      subscriptions.forEach(subscription => subscription.remove())
      // Keep a synchronous reject-all handler while the app is signed out.
      native?.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
      })
    }
  }, [queryClient, user?._id, user?.clientRole, user])

  return null
}
