import axios, { CanceledError, create, isAxiosError, type InternalAxiosRequestConfig } from "axios"
import {
  getRefreshToken, getSessionVersion, getToken, isCurrentSession,
  saveAccessAndRefreshTokens,
} from "./auth"
import { notifyUnauthorized } from "./authEvents"
import { getPushRegistration, type PushRegistration } from "./pushRegistration"

if (!process.env.EXPO_PUBLIC_API_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not set. Configure it in the app's environment file.")
}
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL

const customFetch = create({ baseURL: BASE_URL })
const AUTH_ENDPOINTS = ["/client-auth/mobile-login", "/client-auth/refresh", "/client-auth/logout"]
const isAuthEndpoint = (url?: string) => !!url && AUTH_ENDPOINTS.some(endpoint => url.includes(endpoint))

type SessionConfig = InternalAxiosRequestConfig & { _sessionVersion?: number; _retry?: boolean }
type Tokens = { accessToken: string; refreshToken: string }

class MissingRefreshTokenError extends Error {}

function requestIsCurrent(config: SessionConfig) {
  const version = config._sessionVersion
  if (version === undefined) return false
  // Sign-in is also allowed after local logout, but an older sign-in response
  // must not reopen a session the user has since closed or replaced.
  return isAuthEndpoint(config.url)
    ? version === getSessionVersion()
    : isCurrentSession(version)
}

function sessionChanged(config?: SessionConfig) {
  return new CanceledError("The account session changed", config)
}

export async function revokeRefreshToken(refreshToken: string, clientPushRegistration?: PushRegistration | null): Promise<void> {
  // Bypass authenticated interceptors: logout must never refresh a session.
  await axios.post(BASE_URL + "/client-auth/logout", {
    refreshToken, ...(clientPushRegistration ? { clientPushRegistration } : {}),
  }, { timeout: 5_000, withCredentials: false })
}

customFetch.interceptors.request.use(async original => {
  const config = original as SessionConfig
  config._sessionVersion ??= getSessionVersion()
  if (!requestIsCurrent(config)) throw sessionChanged(config)

  if (isAuthEndpoint(config.url)) {
    config.withCredentials = false
  } else {
    const token = await getToken()
    if (!requestIsCurrent(config)) throw sessionChanged(config)
    if (token) config.headers.Authorization = "Bearer " + token
  }
  return config
})

let refresh: { version: number; promise: Promise<string> } | null = null

function refreshAccessToken(version: number): Promise<string> {
  if (refresh?.version === version) return refresh.promise

  const operation = { version, promise: Promise.resolve("") }
  operation.promise = (async () => {
    const pushRegistration = getPushRegistration(version)
    const refreshToken = await getRefreshToken()
    if (!isCurrentSession(version)) throw sessionChanged()
    if (!refreshToken) throw new MissingRefreshTokenError("No refresh token is available")

    // Do not abort a rotating refresh when logout starts: the server might
    // already have issued a new token. Retire that returned token instead.
    const { data } = await axios.post<Tokens>(
      BASE_URL + "/client-auth/refresh", { refreshToken }, { timeout: 10_000, withCredentials: false },
    )
    try {
      if (!isCurrentSession(version)) throw sessionChanged()
      await saveAccessAndRefreshTokens(data.accessToken, data.refreshToken, version)
      if (!isCurrentSession(version)) throw sessionChanged()
      return data.accessToken
    } catch (error) {
      if (!isCurrentSession(version)) {
        try { await revokeRefreshToken(data.refreshToken, pushRegistration) } catch { /* Local logout still takes effect offline. */ }
        throw sessionChanged()
      }
      throw error
    }
  })().finally(() => {
    if (refresh === operation) refresh = null
  })
  refresh = operation
  return operation.promise
}

customFetch.interceptors.response.use(
  response => {
    if (!requestIsCurrent(response.config as SessionConfig)) {
      // A sign-in can finish after logout or account replacement. Retire its
      // newly issued session even though the response cannot reach the UI.
      const refreshToken = response.data?.refreshToken
      if (isAuthEndpoint(response.config.url) && typeof refreshToken === "string" && refreshToken) {
        void revokeRefreshToken(refreshToken).catch(() => undefined)
      }
      throw sessionChanged(response.config)
    }
    return response
  },
  async (error: unknown) => {
    if (!isAxiosError(error)) return Promise.reject(error)
    const config = error.config as SessionConfig | undefined
    if (config && !requestIsCurrent(config)) return Promise.reject(sessionChanged(config))

    if (error.response?.status === 401 && config && !config._retry && !isAuthEndpoint(config.url)) {
      config._retry = true
      const version = config._sessionVersion!
      try {
        const accessToken = await refreshAccessToken(version)
        if (!requestIsCurrent(config)) throw sessionChanged(config)
        config.headers.Authorization = "Bearer " + accessToken
        return customFetch(config)
      } catch (refreshError) {
        if (!isCurrentSession(version)) return Promise.reject(sessionChanged(config))
        const rejectedCredentials = refreshError instanceof MissingRefreshTokenError ||
          (isAxiosError(refreshError) && (refreshError.response?.status === 401 || refreshError.response?.status === 403))
        // Timeouts, offline failures and server outages are retryable. They
        // must not erase a valid session or a different account's credentials.
        if (rejectedCredentials) notifyUnauthorized()
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  },
)

export default customFetch
