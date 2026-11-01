/* global __dirname */
// Run: node --test scripts/test-session-storage.cjs
// Compile the production factory; the fake only replaces the storage device.
const assert = require("node:assert/strict")
const fs = require("node:fs")
const Module = require("node:module")
const path = require("node:path")
const { test } = require("node:test")
const ts = require("typescript")

const filename = path.resolve(__dirname, "../src/utils/sessionStorage.ts")
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const subject = new Module(filename, module)
subject.filename = filename
subject.paths = Module._nodeModulePaths(path.dirname(filename))
subject._compile(compiled, filename)
const { createSessionStorage, SessionChangedError, SessionCleanupError } = subject.exports

const userA = { _id: "account-a", email: "a@example.test", fullname: "Client A", role: "client", isActive: true }
const userB = { ...userA, _id: "account-b", email: "b@example.test", fullname: "Client B" }
const storedA = { accessToken: "access-a", refreshToken: "refresh-a", user: JSON.stringify(userA) }

function deferred() {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

function memory(initial = {}, hooks = {}) {
  const values = new Map(Object.entries(initial))
  const events = []
  const storage = {
    getItem: async key => {
      const value = values.get(key) ?? null
      await hooks.get?.(key)
      return value
    },
    setItem: async (key, value) => {
      events.push(["set", key, value])
      await hooks.set?.(key, value)
      values.set(key, value)
    },
    removeItem: async key => {
      events.push(["remove", key])
      await hooks.remove?.(key)
      values.delete(key)
    },
  }
  return { values, events, session: createSessionStorage(storage) }
}

test("restores existing keys, starts a clean login, and returns its version", async () => {
  const { session } = memory(storedA)
  assert.equal(await session.getToken(), "access-a")
  assert.deepEqual(await session.getStoredUser(), userA)
  const version = await session.saveSession("access-b", userB)
  assert.equal(session.isCurrentSession(version), true)
  assert.equal(await session.getRefreshToken(), null)
  await session.saveRefreshToken("refresh-b", version)
  assert.equal(await session.getToken(), "access-b")
  assert.deepEqual(await session.getStoredUser(), userB)
})

test("logout invalidates immediately and returns the raw refresh token for revocation", async () => {
  const { session, values } = memory(storedA)
  const previous = session.getSessionVersion()
  const logout = session.clearSession()
  assert.equal(session.isCurrentSession(previous), false)
  assert.equal(await session.getToken(), null)
  assert.equal(await logout, "refresh-a")
  assert.equal(values.size, 0)
})

test("a late refresh and profile save cannot resurrect a logged-out account", async () => {
  const { session, values } = memory(storedA)
  const previous = session.getSessionVersion()
  await session.clearSession()
  await assert.rejects(session.saveAccessAndRefreshTokens("late-access", "late-refresh", previous), SessionChangedError)
  await assert.rejects(session.saveUser({ ...userA, fullname: "Late profile" }, previous), SessionChangedError)
  await assert.rejects(session.saveRefreshToken("late-refresh", previous), SessionChangedError)
  assert.equal(values.size, 0)
})

test("an underway rotation is cleared before another account is saved", async () => {
  const started = deferred()
  const release = deferred()
  const { session, values } = memory(storedA, {
    set: async (key, value) => {
      if (key === "accessToken" && value === "rotated-a") {
        started.resolve()
        await release.promise
      }
    },
  })
  const rotation = session.saveAccessAndRefreshTokens("rotated-a", "rotated-refresh-a", session.getSessionVersion())
  const staleRotation = assert.rejects(rotation, SessionChangedError)
  await started.promise
  const logout = session.clearSession()
  const login = session.saveSession("access-b", userB)
  const versionB = session.getSessionVersion()
  const refreshB = session.saveRefreshToken("refresh-b", versionB)
  release.resolve()
  await staleRotation
  assert.equal(await logout, "rotated-refresh-a")
  assert.equal(await login, versionB)
  await refreshB
  assert.deepEqual(Object.fromEntries(values), {
    accessToken: "access-b", refreshToken: "refresh-b", user: JSON.stringify(userB),
  })
})

test("a login superseded during its native write cannot become the current session", async () => {
  const started = deferred()
  const release = deferred()
  const { session, values } = memory({}, {
    set: async (key, value) => {
      if (key === "accessToken" && value === "access-a") {
        started.resolve()
        await release.promise
      }
    },
  })
  const loginA = session.saveSession("access-a", userA)
  const staleA = assert.rejects(loginA, SessionChangedError)
  await started.promise
  const loginB = session.saveSession("access-b", userB)
  release.resolve()
  await staleA
  const versionB = await loginB
  assert.equal(session.isCurrentSession(versionB), true)
  assert.equal(values.get("accessToken"), "access-b")
  assert.deepEqual(await session.getStoredUser(), userB)
})

test("a storage read started before logout never returns the old credential", async () => {
  const started = deferred()
  const release = deferred()
  const { session } = memory(storedA, {
    get: async key => {
      if (key === "accessToken") {
        started.resolve()
        await release.promise
      }
    },
  })
  const read = session.getToken()
  await started.promise
  await session.clearSession()
  release.resolve()
  assert.equal(await read, null)
})

test("reads wait for the complete token pair instead of seeing partial rotation", async () => {
  const started = deferred()
  const release = deferred()
  const { session } = memory(storedA, {
    set: async key => {
      if (key === "refreshToken") {
        started.resolve()
        await release.promise
      }
    },
  })
  const rotation = session.saveAccessAndRefreshTokens("new-access", "new-refresh", session.getSessionVersion())
  await started.promise
  let returned = false
  const read = session.getToken().then(token => { returned = true; return token })
  await Promise.resolve()
  await Promise.resolve()
  assert.equal(returned, false)
  release.resolve()
  await rotation
  assert.equal(await read, "new-access")
  assert.equal(await session.getRefreshToken(), "new-refresh")
})

test("cleanup attempts every key after one deletion fails and keeps reads inactive", async () => {
  const failure = new Error("Keychain unavailable")
  const { session, values, events } = memory(storedA, {
    remove: async key => { if (key === "accessToken") throw failure },
  })
  await assert.rejects(session.clearSession(), error => {
    assert.ok(error instanceof SessionCleanupError)
    assert.equal(error.message, failure.message)
    assert.equal(error.cause, failure)
    assert.equal(error.refreshToken, "refresh-a", "The caller can still revoke the server session")
    return true
  })
  assert.deepEqual(events.filter(event => event[0] === "remove").map(event => event[1]).sort(), ["accessToken", "refreshToken", "user"])
  assert.equal(values.has("refreshToken"), false)
  assert.equal(values.has("user"), false)
  assert.equal(await session.getToken(), null)
})

test("cleanup still deletes every key when reading the refresh token fails", async () => {
  const failure = new Error("Unable to read credential")
  const { session, values } = memory(storedA, {
    get: async key => { if (key === "refreshToken") throw failure },
  })
  await assert.rejects(session.clearSession(), error => {
    assert.ok(error instanceof SessionCleanupError)
    assert.equal(error.message, failure.message)
    assert.equal(error.cause, failure)
    assert.equal(error.refreshToken, null)
    return true
  })
  assert.equal(values.size, 0)
})

test("failed login removes partial credentials and does not poison the next login", async () => {
  let failOnce = true
  const failure = new Error("User write failed")
  const { session, values } = memory(storedA, {
    set: async key => {
      if (key === "user" && failOnce) {
        failOnce = false
        throw failure
      }
    },
  })
  await assert.rejects(session.saveSession("incomplete", userA), error => error === failure)
  assert.equal(values.size, 0)
  assert.equal(await session.getToken(), null)
  const version = await session.saveSession("access-b", userB)
  await session.saveRefreshToken("refresh-b", version)
  assert.equal(await session.getToken(), "access-b")
  assert.deepEqual(await session.getStoredUser(), userB)
})
