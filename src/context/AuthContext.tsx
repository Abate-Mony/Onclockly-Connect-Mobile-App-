import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import Toast from "react-native-toast-message"
import { queryClient } from "../lib/queryClient"
import {
  clearSession, getSessionVersion, getStoredUser, getToken, isCurrentSession,
  saveRefreshToken, saveSession, saveUser, SessionChangedError, SessionCleanupError,
} from "../utils/auth"
import { setUnauthorizedHandler } from "../utils/authEvents"
import { revokeRefreshToken } from "../utils/customFetch"
import { prepareClientPushLogout } from "../utils/clientPush"
import type { ClientUser, PortalClient, PortalCompany } from "../utils/types"

type AuthContextType = {
  user: ClientUser | null
  client: PortalClient | null
  company: PortalCompany | null
  accessToken: string | null
  loading: boolean
  login: (accessToken: string, refreshToken: string, user: ClientUser, client: PortalClient, company: PortalCompany | null) => Promise<void>
  logout: () => Promise<void>
  updateUser: (patch: Partial<ClientUser>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

function clearAccountCache() {
  // Cancel and remove synchronously, including mutations. Do not leave an
  // await gap in which a new account could observe the previous one's data.
  void queryClient.cancelQueries()
  queryClient.clear()
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ClientUser | null>(null)
  const [client, setClient] = useState<PortalClient | null>(null)
  const [company, setCompany] = useState<PortalCompany | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const logoutOperation = useRef<{ version: number; task: Promise<void> } | null>(null)

  useEffect(() => {
    let mounted = true
    const version = getSessionVersion()
    clearAccountCache()
    async function restoreSession() {
      try {
        const [token, storedUser] = await Promise.all([getToken(), getStoredUser()])
        if (mounted && isCurrentSession(version)) {
          if (token && storedUser) {
            setAccessToken(token)
            setUser(storedUser)
          } else {
            await clearSession()
          }
        }
      } catch {
        if (mounted && isCurrentSession(version)) await clearSession().catch(() => undefined)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void restoreSession()
    return () => { mounted = false }
  }, [])

  const login = useCallback(async (
    token: string, refreshToken: string, nextUser: ClientUser,
    nextClient: PortalClient, nextCompany: PortalCompany | null,
  ) => {
    const saving = saveSession(token, nextUser)
    const version = getSessionVersion()
    setAccessToken(null)
    setUser(null)
    setClient(null)
    setCompany(null)
    clearAccountCache()
    try {
      await saving
      await saveRefreshToken(refreshToken, version)
      if (!isCurrentSession(version)) return
      setUser(nextUser)
      setClient(nextClient)
      setCompany(nextCompany)
      setAccessToken(token)
    } catch (error) {
      // A token issued by login still needs retiring if persistence failed
      // or the user closed that session before it could finish opening.
      void revokeRefreshToken(refreshToken).catch(() => undefined)
      if (error instanceof SessionChangedError) return
      if (isCurrentSession(version)) await clearSession().catch(() => undefined)
      throw error
    }
  }, [])

  const logout = useCallback((): Promise<void> => {
    if (logoutOperation.current?.version === getSessionVersion()) return logoutOperation.current.task
    const pushCleanup = prepareClientPushLogout(user?._id).catch(() => null)
    const clearing = clearSession() // Invalidates in-flight work before any await.
    const operation = { version: getSessionVersion(), task: Promise.resolve() }
    setAccessToken(null)
    setUser(null)
    setClient(null)
    setCompany(null)
    clearAccountCache()

    operation.task = (async () => {
      let refreshToken: string | null
      try {
        refreshToken = await clearing
      } catch (error) {
        // Even if native storage cannot delete a key, retire the server
        // session when its token was captured successfully.
        refreshToken = error instanceof SessionCleanupError ? error.refreshToken : null
        if (getSessionVersion() === operation.version) {
          Toast.show({ type: "error", text1: "Couldn't clear saved sign-in", text2: "Please try signing out again." })
        }
      }
      if (refreshToken) {
        try {
          await revokeRefreshToken(refreshToken, await pushCleanup)
        } catch {
          if (getSessionVersion() === operation.version) {
            Toast.show({ type: "info", text1: "Signed out on this device", text2: "The server session couldn't be closed. Check your connection." })
          }
        }
      }
    })().finally(() => {
      if (logoutOperation.current === operation) logoutOperation.current = null
    })
    logoutOperation.current = operation
    return operation.task
  }, [user?._id])

  const updateUser = useCallback(async (patch: Partial<ClientUser>) => {
    if (!user) return
    const version = getSessionVersion()
    const next = { ...user, ...patch }
    await saveUser(next, version)
    if (isCurrentSession(version)) setUser(next)
  }, [user])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      Toast.show({ type: "error", text1: "Session expired", text2: "Please log in again." })
      void logout()
      // Root Stack.Protected reacts to accessToken immediately; a delayed
      // router.replace after network logout could kick out a newer login.
    })
    return () => setUnauthorizedHandler(null)
  }, [logout])

  return (
    <AuthContext.Provider value={{ user, client, company, accessToken, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}
