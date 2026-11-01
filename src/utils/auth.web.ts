import { createSessionStorage } from "./sessionStorage"

export { SessionChangedError, SessionCleanupError } from "./sessionStorage"

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage
}

export const {
  getSessionVersion,
  isCurrentSession,
  saveSession,
  saveUser,
  getToken,
  saveAccessAndRefreshTokens,
  saveRefreshToken,
  getRefreshToken,
  getStoredUser,
  clearSession,
} = createSessionStorage({
  getItem: async key => getSessionStorage()?.getItem(key) ?? null,
  setItem: async (key, value) => {
    const storage = getSessionStorage()
    if (!storage) throw new Error("Browser session storage is unavailable")
    storage.setItem(key, value)
  },
  removeItem: async key => { getSessionStorage()?.removeItem(key) },
})
