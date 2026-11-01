import * as SecureStore from "expo-secure-store"
import { createSessionStorage } from "./sessionStorage"

export { SessionChangedError, SessionCleanupError } from "./sessionStorage"

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
  getItem: key => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: key => SecureStore.deleteItemAsync(key),
})
