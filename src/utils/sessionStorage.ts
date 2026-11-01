import type { ClientUser } from "./types"

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
}

const TOKEN_KEY = "accessToken"
const REFRESH_TOKEN_KEY = "refreshToken"
const USER_KEY = "user"
const SESSION_KEYS = [TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]

export class SessionChangedError extends Error {
  constructor() {
    super("The session changed while this operation was in progress")
    this.name = "SessionChangedError"
  }
}

export class SessionCleanupError extends Error {
  readonly refreshToken: string | null
  readonly cause: unknown

  constructor(cause: unknown, refreshToken: string | null) {
    super(cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "Unable to clear session")
    this.name = "SessionCleanupError"
    this.refreshToken = refreshToken
    this.cause = cause
  }
}

// Versions invalidate work immediately; the queue also covers native writes
// already underway, which a version check cannot cancel.
export function createSessionStorage(storage: StorageAdapter) {
  let version = 0
  let active = true // Allow the persisted session to be restored on startup.
  let writes: Promise<unknown> = Promise.resolve()

  const getSessionVersion = () => version
  const isCurrentSession = (expectedVersion: number) => active && version === expectedVersion
  const assertCurrent = (expectedVersion: number) => {
    if (!isCurrentSession(expectedVersion)) throw new SessionChangedError()
  }

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = writes.then(operation)
    // A failed operation must not prevent later logout/login work.
    writes = result.catch(() => undefined)
    return result
  }

  async function removeAll() {
    const results = await Promise.allSettled(SESSION_KEYS.map(key => storage.removeItem(key)))
    const failed = results.find(result => result.status === "rejected")
    if (failed?.status === "rejected") throw failed.reason
  }

  async function read(key: string): Promise<string | null> {
    const expectedVersion = version
    if (!isCurrentSession(expectedVersion)) return null
    await writes
    if (!isCurrentSession(expectedVersion)) return null
    const value = await storage.getItem(key)
    return isCurrentSession(expectedVersion) ? value : null
  }

  function write(expectedVersion: number, operation: () => Promise<void>) {
    return enqueue(async () => {
      assertCurrent(expectedVersion)
      await operation()
      assertCurrent(expectedVersion)
    })
  }

  function saveSession(accessToken: string, user: ClientUser): Promise<number> {
    const expectedVersion = ++version
    active = true
    return enqueue(async () => {
      assertCurrent(expectedVersion)
      try {
        // Never pair a previous account's refresh token with a new login.
        await storage.removeItem(REFRESH_TOKEN_KEY)
        await storage.setItem(TOKEN_KEY, accessToken)
        await storage.setItem(USER_KEY, JSON.stringify(user))
        assertCurrent(expectedVersion)
        return expectedVersion
      } catch (error) {
        if (isCurrentSession(expectedVersion)) {
          active = false
          version++
          // This cleanup runs ahead of any subsequently queued login.
          try { await removeAll() } catch { /* Preserve the original save failure. */ }
        }
        throw error
      }
    })
  }

  function clearSession(): Promise<string | null> {
    version++
    active = false
    return enqueue(async () => {
      // Older writes may have rotated the token needing server revocation.
      let refreshToken: string | null = null
      let readError: SessionCleanupError | undefined
      try {
        refreshToken = await storage.getItem(REFRESH_TOKEN_KEY)
      } catch (error) {
        readError = new SessionCleanupError(error, null)
      }
      try {
        await removeAll()
      } catch (error) {
        // Keep the captured token available for server revocation even when
        // local deletion fails. The caller must still see the cleanup failure.
        throw new SessionCleanupError(error, refreshToken)
      }
      if (readError) throw readError
      return refreshToken
    })
  }

  return {
    getSessionVersion,
    isCurrentSession,
    saveSession,
    clearSession,
    getToken: () => read(TOKEN_KEY),
    getRefreshToken: () => read(REFRESH_TOKEN_KEY),
    getStoredUser: async (): Promise<ClientUser | null> => {
      const raw = await read(USER_KEY)
      return raw ? JSON.parse(raw) as ClientUser : null
    },
    saveUser: (user: ClientUser, expectedVersion = version) =>
      write(expectedVersion, () => storage.setItem(USER_KEY, JSON.stringify(user))),
    saveRefreshToken: (refreshToken: string, expectedVersion = version) =>
      write(expectedVersion, () => storage.setItem(REFRESH_TOKEN_KEY, refreshToken)),
    saveAccessAndRefreshTokens: (accessToken: string, refreshToken: string, expectedVersion: number) =>
      write(expectedVersion, async () => {
        await storage.setItem(TOKEN_KEY, accessToken)
        await storage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      }),
  }
}
