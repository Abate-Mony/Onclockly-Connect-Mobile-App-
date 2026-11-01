/* global __dirname */
// Run: node --test scripts/test-session-cleanup.cjs
// Exercise the production provider, native storage wrapper, Axios interceptors,
// and TanStack cache. Only the native device, toast host and React hook host are
// replaced; Axios adapters guarantee these tests can never issue HTTP requests.
const assert = require("node:assert/strict")
const fs = require("node:fs")
const Module = require("node:module")
const path = require("node:path")
const { after, test } = require("node:test")
const ts = require("typescript")
const React = require("react")
const axios = require("axios")

const root = path.resolve(__dirname, "..")
const src = path.join(root, "src") + path.sep
const providerFile = path.join(src, "context", "AuthContext.tsx")
const previousLoad = Module._load
const previousExtensions = { ts: require.extensions[".ts"], tsx: require.extensions[".tsx"] }
const previousAdapter = axios.defaults.adapter
const previousApi = process.env.EXPO_PUBLIC_API_URL
process.env.EXPO_PUBLIC_API_URL = "https://session-test.invalid/api/v1"
let host

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (loadedModule, filename) => {
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
      },
      fileName: filename,
    }).outputText
    loadedModule._compile(compiled, filename)
  }
}

Module._load = function (request, parent, isMain) {
  if (request === "expo-secure-store") return host.storage
  if (request === "react-native-toast-message") return { show: message => host.toasts.push(message) }
  if (request === "react" && parent?.filename === providerFile) return host.react
  return previousLoad.call(this, request, parent, isMain)
}

after(() => {
  Module._load = previousLoad
  axios.defaults.adapter = previousAdapter
  for (const [extension, previous] of [[".ts", previousExtensions.ts], [".tsx", previousExtensions.tsx]]) {
    if (previous) require.extensions[extension] = previous
    else delete require.extensions[extension]
  }
  if (previousApi === undefined) delete process.env.EXPO_PUBLIC_API_URL
  else process.env.EXPO_PUBLIC_API_URL = previousApi
})

const accountA = { _id: "account-a", fullname: "Client A", email: "a@example.test", role: "client", isActive: true }
const accountB = { ...accountA, _id: "account-b", fullname: "Client B", email: "b@example.test" }

function deferred() {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

function outcome(promise) {
  return promise.then(value => ({ value }), error => ({ error }))
}

function response(config, data = {}, status = 200) {
  return { config, data, status, statusText: String(status), headers: {} }
}

function httpError(config, status) {
  return new axios.AxiosError("HTTP " + status, "ERR_BAD_RESPONSE", config, null, response(config, {}, status))
}

function body(config) {
  return typeof config.data === "string" ? JSON.parse(config.data) : config.data
}

async function until(predicate, message = "Expected asynchronous operation to finish") {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return
    await new Promise(resolve => setImmediate(resolve))
  }
  assert.fail(message)
}

async function fixture(t, storageHooks = {}) {
  for (const filename of Object.keys(require.cache)) {
    if (filename.startsWith(src)) delete require.cache[filename]
  }
  const values = new Map()
  const states = []
  const effects = []
  const refs = []
  const toasts = []
  const rawCalls = []
  let stateCursor = 0
  let refCursor = 0
  let collectEffects = true
  let rawHandler = async config => {
    assert.ok(config.url.endsWith("/client-auth/logout"), "Unexpected raw Axios request: " + config.url)
    return response(config)
  }
  const react = {
    ...React,
    useState: initial => {
      const slot = stateCursor++
      if (slot >= states.length) states.push(typeof initial === "function" ? initial() : initial)
      return [states[slot], next => { states[slot] = typeof next === "function" ? next(states[slot]) : next }]
    },
    useRef: initial => refs[refCursor++] ??= { current: initial },
    useCallback: callback => callback,
    useEffect: effect => { if (collectEffects) effects.push(effect) },
  }
  host = {
    react, toasts,
    storage: {
      getItemAsync: async key => {
        await storageHooks.get?.(key)
        return values.get(key) ?? null
      },
      setItemAsync: async (key, value) => {
        await storageHooks.set?.(key, value)
        values.set(key, value)
      },
      deleteItemAsync: async key => {
        await storageHooks.remove?.(key)
        values.delete(key)
      },
    },
  }
  axios.defaults.adapter = async config => {
    rawCalls.push(config)
    assert.equal(config.withCredentials, false, "Raw token calls must not use browser credentials")
    return rawHandler(config)
  }
  const { AuthProvider } = require(providerFile)
  const auth = require(path.join(src, "utils", "auth.ts"))
  const customFetch = require(path.join(src, "utils", "customFetch.ts")).default
  const { queryClient } = require(path.join(src, "lib", "queryClient.ts"))
  customFetch.defaults.adapter = async config => {
    throw new Error("Unexpected protected Axios request: " + config.url)
  }
  function context() {
    stateCursor = 0
    refCursor = 0
    return AuthProvider({ children: null }).props.value
  }
  context()
  collectEffects = false
  const cleanups = effects.map(effect => effect())
  await until(() => context().loading === false)
  t.after(() => {
    cleanups.forEach(cleanup => cleanup?.())
    queryClient.clear()
  })
  return {
    auth, context, values, customFetch, queryClient, rawCalls, toasts,
    raw: handler => { rawHandler = handler },
    login: (account = accountA) => context().login(
      "access-" + account._id, "refresh-" + account._id, account,
      { _id: "client-" + account._id, name: account.fullname }, { name: "Company", logo: null },
    ),
  }
}

function assertSignedOut(f) {
  assert.equal(f.context().accessToken, null)
  assert.equal(f.context().user, null)
  assert.equal(f.context().client, null)
  assert.equal(f.context().company, null)
}

function assertAccountB(f) {
  assert.equal(f.context().user._id, accountB._id)
  assert.equal(f.context().accessToken, "access-account-b")
  assert.equal(f.values.get("accessToken"), "access-account-b")
  assert.equal(f.values.get("refreshToken"), "refresh-account-b")
  assert.equal(JSON.parse(f.values.get("user"))._id, accountB._id)
}

const options = { concurrency: false, timeout: 5_000 }

test("mobile login after local logout sends no bearer token or browser credentials", options, async t => {
  const f = await fixture(t)
  await f.login()
  await f.context().logout()
  assertSignedOut(f)
  f.customFetch.defaults.withCredentials = true
  f.customFetch.defaults.adapter = async config => {
    assert.equal(config.url, "/client-auth/mobile-login")
    assert.equal(config.headers.get("Authorization"), undefined)
    assert.equal(config.withCredentials, false, "Mobile login must override credentialed defaults")
    assert.equal(body(config).email, accountB.email)
    return response(config, { accessToken: "access-account-b", refreshToken: "refresh-account-b" })
  }
  const { data } = await f.customFetch.post("/client-auth/mobile-login", { email: accountB.email, password: "test-only" })
  await f.context().login(data.accessToken, data.refreshToken, accountB, { _id: "client-b", name: "Client B" }, null)
  assertAccountB(f)
})

test("an in-flight mobile-login reply cannot reopen a closed or replaced session", options, async t => {
  for (const replaceAccount of [false, true]) {
    await t.test(replaceAccount ? "replaced by account B" : "closed before login returns", async child => {
      const f = await fixture(child)
      await f.context().logout()
      const started = deferred()
      const release = deferred()
      f.customFetch.defaults.adapter = async config => {
        assert.equal(config.headers.get("Authorization"), undefined)
        assert.equal(config.withCredentials, false)
        started.resolve()
        await release.promise
        return response(config, { accessToken: "late-access-a", refreshToken: "late-refresh-a" })
      }
      const login = outcome(f.customFetch.post("/client-auth/mobile-login", {
        email: accountA.email, password: "test-only",
      }).then(({ data }) => f.context().login(
        data.accessToken, data.refreshToken, accountA, { _id: "client-a", name: "Client A" }, null,
      )))
      await started.promise
      await f.context().logout()
      if (replaceAccount) await f.login(accountB)
      release.resolve()
      assert.ok(axios.isCancel((await login).error))
      await until(() => f.rawCalls.some(config => body(config).refreshToken === "late-refresh-a"))
      const revocation = f.rawCalls.find(config => body(config).refreshToken === "late-refresh-a")
      assert.ok(revocation.url.endsWith("/client-auth/logout"))
      assert.equal(revocation.withCredentials, false)
      assert.equal(revocation.timeout, 5_000)
      assert.equal(revocation.headers.get("Authorization"), undefined)
      if (replaceAccount) assertAccountB(f)
      else {
        assertSignedOut(f)
        assert.equal(f.values.size, 0)
      }
      assert.equal(f.toasts.length, 0)
    })
  }
})

test("logout clears provider state, queries and mutations before remote revocation completes", options, async t => {
  const f = await fixture(t)
  await f.login()
  f.queryClient.setQueryData(["quotes"], [{ private: "account-a" }])
  f.queryClient.getMutationCache().build(f.queryClient, { mutationKey: ["accept-quote"] })
  assert.equal(f.queryClient.getMutationCache().getAll().length, 1)
  const release = deferred()
  f.raw(async config => { await release.promise; return response(config) })
  const logout = f.context().logout()
  assertSignedOut(f)
  assert.deepEqual(f.queryClient.getQueryCache().getAll(), [])
  assert.deepEqual(f.queryClient.getMutationCache().getAll(), [])
  await until(() => f.rawCalls.length === 1)
  assert.equal(f.values.size, 0)
  assert.equal(body(f.rawCalls[0]).refreshToken, "refresh-account-a")
  assert.equal(f.rawCalls[0].headers.get("Authorization"), undefined)
  assert.strictEqual(f.context().logout(), logout, "Same-session logout must share its task")
  release.resolve()
  await logout
})

for (const lateStatus of [200, 401]) {
  test("a late account A HTTP " + lateStatus + " cannot expose data or sign out account B", options, async t => {
    const f = await fixture(t)
    await f.login()
    const started = deferred()
    const release = deferred()
    f.customFetch.defaults.adapter = async config => {
      started.resolve()
      await release.promise
      if (lateStatus === 401) throw httpError(config, 401)
      return response(config, { private: "account-a" })
    }
    const request = outcome(f.customFetch.get("/portal/me"))
    await started.promise
    await f.context().logout()
    await f.login(accountB)
    f.queryClient.setQueryData(["quotes"], [{ private: "account-b" }])
    release.resolve()
    assert.ok(axios.isCancel((await request).error))
    assertAccountB(f)
    assert.deepEqual(f.queryClient.getQueryData(["quotes"]), [{ private: "account-b" }])
    assert.equal(f.rawCalls.filter(config => config.url.endsWith("/refresh")).length, 0)
    assert.equal(f.toasts.length, 0)
  })
}

test("an in-flight query is canceled and cannot repopulate a new account's cache", options, async t => {
  const f = await fixture(t)
  await f.login()
  const started = deferred()
  const release = deferred()
  f.customFetch.defaults.adapter = async config => {
    started.resolve()
    await release.promise
    return response(config, { private: "account-a" })
  }
  const query = outcome(f.queryClient.fetchQuery({
    queryKey: ["quotes"], queryFn: async () => (await f.customFetch.get("/portal/quotes")).data,
  }))
  await started.promise
  await f.context().logout()
  await f.login(accountB)
  f.queryClient.setQueryData(["quotes"], { private: "account-b" })
  release.resolve()
  assert.ok((await query).error)
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(f.queryClient.getQueryData(["quotes"]), { private: "account-b" })
  assertAccountB(f)
})

test("account B may sign in and sign out while account A's remote logout is still pending", options, async t => {
  const f = await fixture(t)
  await f.login()
  const releaseA = deferred()
  f.raw(async config => {
    if (body(config).refreshToken === "refresh-account-a") await releaseA.promise
    return response(config)
  })
  const logoutA = f.context().logout()
  await until(() => f.rawCalls.length === 1)
  await f.login(accountB)
  assertAccountB(f)
  f.queryClient.setQueryData(["invoices"], ["account-b"])
  releaseA.resolve()
  await logoutA
  assertAccountB(f)
  assert.deepEqual(f.queryClient.getQueryData(["invoices"]), ["account-b"])

  // Start another blocked A logout to prove B's own logout does not reuse it.
  await f.login()
  const releaseAgain = deferred()
  f.raw(async config => {
    if (body(config).refreshToken === "refresh-account-a") await releaseAgain.promise
    return response(config)
  })
  const secondA = f.context().logout()
  await until(() => f.rawCalls.length === 2)
  await f.login(accountB)
  const logoutB = f.context().logout()
  assert.notStrictEqual(logoutB, secondA)
  await logoutB
  assertSignedOut(f)
  assert.equal(body(f.rawCalls.at(-1)).refreshToken, "refresh-account-b")
  releaseAgain.resolve()
  await secondA
  assert.equal(f.values.size, 0)
})

test("concurrent protected 401 responses share one rotation and retry with the new token", options, async t => {
  const f = await fixture(t)
  await f.login()
  const release = deferred()
  let rejected = 0
  f.customFetch.defaults.adapter = async config => {
    if (config.headers.get("Authorization") === "Bearer access-account-a") {
      rejected++
      throw httpError(config, 401)
    }
    assert.equal(config.headers.get("Authorization"), "Bearer rotated-access-a")
    return response(config, config.url)
  }
  f.raw(async config => {
    assert.ok(config.url.endsWith("/refresh"))
    assert.equal(body(config).refreshToken, "refresh-account-a")
    await release.promise
    return response(config, { accessToken: "rotated-access-a", refreshToken: "rotated-refresh-a" })
  })
  const requests = outcome(Promise.all([f.customFetch.get("/portal/quotes"), f.customFetch.get("/portal/invoices")]))
  await until(() => rejected === 2 && f.rawCalls.length === 1)
  release.resolve()
  const result = await requests
  assert.equal(result.error, undefined)
  assert.deepEqual(result.value.map(item => item.data), ["/portal/quotes", "/portal/invoices"])
  assert.equal(f.rawCalls.length, 1)
  assert.equal(f.values.get("accessToken"), "rotated-access-a")
  assert.equal(f.values.get("refreshToken"), "rotated-refresh-a")
})

test("logout during rotation retires the returned token without overwriting account B", options, async t => {
  const f = await fixture(t)
  await f.login()
  const releaseRefresh = deferred()
  f.customFetch.defaults.adapter = async config => { throw httpError(config, 401) }
  f.raw(async config => {
    if (config.url.endsWith("/refresh")) {
      await releaseRefresh.promise
      return response(config, { accessToken: "late-rotated-a", refreshToken: "late-refresh-a" })
    }
    return response(config)
  })
  const request = outcome(f.customFetch.get("/portal/bookings"))
  await until(() => f.rawCalls.some(config => config.url.endsWith("/refresh")))
  await f.context().logout()
  await f.login(accountB)
  releaseRefresh.resolve()
  assert.ok(axios.isCancel((await request).error))
  assertAccountB(f)
  assert.deepEqual(f.rawCalls.filter(config => config.url.endsWith("/logout")).map(config => body(config).refreshToken).sort(), ["late-refresh-a", "refresh-account-a"])
  assert.equal(f.toasts.length, 0)
})

for (const failure of ["offline", 500, 401, 403]) {
  test("refresh " + failure + (typeof failure === "number" && failure < 500 ? " ends the session" : " keeps the local session"), options, async t => {
    const f = await fixture(t)
    await f.login()
    f.customFetch.defaults.adapter = async config => { throw httpError(config, 401) }
    f.raw(async config => {
      if (config.url.endsWith("/refresh")) {
        if (failure === "offline") throw new axios.AxiosError("Offline", "ERR_NETWORK", config)
        throw httpError(config, failure)
      }
      return response(config)
    })
    const result = await outcome(f.customFetch.get("/portal/quotes"))
    assert.ok(result.error)
    if (failure === 401 || failure === 403) {
      assertSignedOut(f)
      await until(() => f.values.size === 0 && f.rawCalls.some(config => config.url.endsWith("/logout")))
      assert.ok(f.toasts.some(toast => toast.text1 === "Session expired"))
    } else {
      assert.equal(f.context().user._id, accountA._id)
      assert.equal(await f.auth.getToken(), "access-account-a")
      assert.equal(await f.auth.getRefreshToken(), "refresh-account-a")
      assert.equal(f.rawCalls.length, 1)
      assert.equal(f.toasts.length, 0)
    }
  })
}

test("offline remote logout still clears all local account state and cached data", options, async t => {
  const f = await fixture(t)
  await f.login()
  f.queryClient.setQueryData(["invoices"], ["private-a"])
  f.raw(async config => { throw new axios.AxiosError("Offline", "ERR_NETWORK", config) })
  await f.context().logout()
  assertSignedOut(f)
  assert.equal(f.values.size, 0)
  assert.deepEqual(f.queryClient.getQueryCache().getAll(), [])
  assert.ok(f.toasts.some(toast => toast.text1 === "Signed out on this device"))
})

test("a native deletion failure still revokes the captured token and leaves local authentication inactive", options, async t => {
  let failDelete = false
  const attempted = []
  const f = await fixture(t, {
    remove: async key => {
      if (!failDelete) return
      attempted.push(key)
      if (key === "accessToken") throw new Error("Keychain deletion failed")
    },
  })
  await f.login()
  f.queryClient.setQueryData(["quotes"], ["private-account-a"])
  f.queryClient.getMutationCache().build(f.queryClient, { mutationKey: ["accept-quote"] })
  const oldVersion = f.auth.getSessionVersion()
  failDelete = true
  const logout = f.context().logout()
  assertSignedOut(f)
  assert.equal(f.auth.isCurrentSession(oldVersion), false)
  assert.deepEqual(f.queryClient.getQueryCache().getAll(), [])
  assert.deepEqual(f.queryClient.getMutationCache().getAll(), [])
  await logout
  assert.deepEqual(attempted.sort(), ["accessToken", "refreshToken", "user"])
  assert.equal(f.values.get("accessToken"), "access-account-a", "The simulated native deletion really failed")
  assert.equal(f.values.has("refreshToken"), false)
  assert.equal(f.values.has("user"), false)
  assert.equal(await f.auth.getToken(), null, "An undeleted credential must remain unusable in this session")
  assert.equal(f.rawCalls.length, 1)
  assert.ok(f.rawCalls[0].url.endsWith("/client-auth/logout"))
  assert.equal(body(f.rawCalls[0]).refreshToken, "refresh-account-a")
  assert.ok(f.toasts.some(toast => toast.type === "error" && toast.text1 === "Couldn't clear saved sign-in"))
})

test("failed refresh-token persistence cleans up partial login and revokes its issued token", options, async t => {
  const failure = new Error("Keychain write failed")
  const f = await fixture(t, { set: async key => { if (key === "refreshToken") throw failure } })
  await assert.rejects(f.login(), error => error === failure)
  assertSignedOut(f)
  assert.equal(f.values.size, 0)
  assert.equal(await f.auth.getToken(), null)
  await until(() => f.rawCalls.length === 1)
  assert.equal(body(f.rawCalls[0]).refreshToken, "refresh-account-a")
})

test("login canceled during native persistence cannot resurrect credentials and retires its issued token", options, async t => {
  const started = deferred()
  const release = deferred()
  const f = await fixture(t, {
    set: async (key, value) => {
      if (key === "accessToken" && value === "access-account-a") {
        started.resolve()
        await release.promise
      }
    },
  })
  const login = f.login()
  await started.promise
  const logout = f.context().logout()
  assertSignedOut(f)
  release.resolve()
  await Promise.all([login, logout])
  assertSignedOut(f)
  assert.equal(f.values.size, 0)
  await until(() => f.rawCalls.some(config => body(config).refreshToken === "refresh-account-a"))
})
