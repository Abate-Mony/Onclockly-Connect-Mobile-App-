/* global __dirname */
// Actual push registration/storage/HTTP modules with native and HTTP adapters.
// No device permissions, real tokens, backend connections or pushes are used.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const { test, after } = require('node:test')
const ts = require('typescript')
const axios = require('axios')
const root = path.resolve(__dirname, '..')
const src = path.join(root, 'src') + path.sep
const priorLoad = Module._load
const priorExtension = require.extensions['.ts']
const priorAdapter = axios.defaults.adapter
const priorApi = process.env.EXPO_PUBLIC_API_URL
process.env.EXPO_PUBLIC_API_URL = 'https://notification-test.invalid/api/v1'
let host
require.extensions['.ts'] = (subject, file) => subject._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file)
Module._load = function (name, parent, isMain) {
  if (name === 'expo-constants') return host.constants
  if (name === 'react-native') return { Platform: { OS: host.platform } }
  if (name === 'expo-secure-store') return host.storage
  if (name === 'expo-notifications') { host.nativeImports++; return host.native }
  return priorLoad.call(this, name, parent, isMain)
}
after(() => {
  Module._load = priorLoad
  if (priorExtension) require.extensions['.ts'] = priorExtension
  else delete require.extensions['.ts']
  axios.defaults.adapter = priorAdapter
  if (priorApi === undefined) delete process.env.EXPO_PUBLIC_API_URL
  else process.env.EXPO_PUBLIC_API_URL = priorApi
})
const account = { _id: '111111111111111111111111', role: 'client', clientRole: 'owner', fullname: 'Client' }
const token = 'ExponentPushToken[test-device]'
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { resolve, promise } }
const response = (config, data = {}) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
const body = config => typeof config.data === 'string' ? JSON.parse(config.data) : config.data
async function until(check) { for (let i = 0; i < 100; i++) { if (check()) return; await new Promise(done => setImmediate(done)) } assert.fail('Async operation did not reach expected state') }
function fixture() {
  for (const file of Object.keys(require.cache)) if (file.startsWith(src)) delete require.cache[file]
  const values = new Map([['accessToken', 'access-a'], ['refreshToken', 'refresh-a'], ['user', JSON.stringify(account)]])
  host = {
    constants: { executionEnvironment: 'standalone', easConfig: { projectId: 'test-project-id' } }, platform: 'android',
    nativeImports: 0, prompts: 0, channelCalls: 0, tokenCalls: 0, posts: [], deletes: [],
    permissions: { granted: false, status: 'undetermined', canAskAgain: true },
    storage: { getItemAsync: async key => values.get(key) ?? null, setItemAsync: async (key, value) => { values.set(key, value) }, deleteItemAsync: async key => { values.delete(key) } },
  }
  const state = host
  state.native = {
    IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 }, AndroidImportance: { HIGH: 4 },
    setNotificationChannelAsync: async () => { state.channelCalls++ },
    getPermissionsAsync: async () => state.permissions,
    requestPermissionsAsync: async () => { state.prompts++; return { granted: true, status: 'granted', canAskAgain: true } },
    getExpoPushTokenAsync: async () => { state.tokenCalls++; if (state.tokenGate) await state.tokenGate.promise; return { data: token } },
    clearLastNotificationResponse() {}, dismissAllNotificationsAsync: async () => {},
  }
  axios.defaults.adapter = async config => { state.deletes.push(config); return response(config) }
  const push = require(path.join(src, 'utils/clientPush.ts'))
  const auth = require(path.join(src, 'utils/auth.ts'))
  const registration = require(path.join(src, 'utils/pushRegistration.ts'))
  const fetch = require(path.join(src, 'utils/customFetch.ts')).default
  fetch.defaults.adapter = async config => { state.posts.push(config); if (state.postGate) await state.postGate.promise; return response(config) }
  return { ...state, state, values, push, auth, registration, fetch }
}
const options = { concurrency: false, timeout: 10_000 }
test('Expo Go and web never evaluate the unsupported native notification module', options, async () => {
  for (const platform of ['android', 'ios', 'web']) {
    const f = fixture(); f.state.platform = platform; f.state.constants.executionEnvironment = 'storeClient'
    assert.equal(await f.push.registerClientPush(true), 'unavailable')
    assert.equal(f.state.nativeImports, 0); assert.equal(f.state.prompts, 0)
  }
})
test('missing project setup leaves in-app sessions intact and never prompts', options, async () => {
  const f = fixture(); f.state.constants.easConfig = null
  assert.equal(await f.push.enableClientPush(), 'unavailable')
  assert.equal(await f.auth.getToken(), 'access-a'); assert.equal(f.state.prompts, 0)
})
test('automatic registration never asks permission until the user enables phone alerts', options, async () => {
  const f = fixture()
  assert.equal(await f.push.registerClientPush(), 'undetermined'); assert.equal(f.state.prompts, 0)
  assert.equal(await f.push.enableClientPush(), 'enabled'); assert.equal(f.state.prompts, 1)
  assert.equal(f.state.channelCalls, 2)
  const saved = body(f.state.posts[0]); assert.equal(saved.token, token)
  assert.match(saved.registrationId, /^[A-Za-z0-9_-]{16,128}$/)
  assert.equal(f.state.posts[0].headers.Authorization, 'Bearer access-a')
})
test('denied permissions do not register or repeatedly prompt', options, async () => {
  const f = fixture(); f.state.permissions = { granted: false, status: 'denied', canAskAgain: false }
  assert.equal(await f.push.enableClientPush(), 'denied')
  assert.equal(f.state.prompts, 0); assert.equal(f.state.posts.length, 0)
})
test('logout during native token acquisition prevents any stale registration', options, async () => {
  const f = fixture(); f.state.permissions = { granted: true }; f.state.tokenGate = deferred()
  const pending = f.push.registerClientPush().then(() => null, error => error)
  await until(() => f.state.tokenCalls === 1)
  const cleanup = f.push.prepareClientPushLogout(account._id); await f.auth.clearSession()
  f.state.tokenGate.resolve()
  assert.ok(await pending instanceof f.auth.SessionChangedError)
  assert.equal(await cleanup, null); assert.equal(f.state.posts.length, 0)
})
test('late A registration is retired before B takes device ownership', options, async () => {
  const f = fixture(); f.state.permissions = { granted: true }; f.state.postGate = deferred()
  const pendingA = f.push.registerClientPush().then(() => null, error => error)
  await until(() => f.state.posts.length === 1)
  const pairA = body(f.state.posts[0]); const cleanup = f.push.prepareClientPushLogout(account._id)
  await f.auth.clearSession()
  const versionB = await f.auth.saveSession('access-b', { ...account, _id: 'bbbbbbbbbbbbbbbbbbbbbbbb' })
  await f.auth.saveRefreshToken('refresh-b', versionB)
  const pendingB = f.push.registerClientPush()
  f.state.postGate.resolve()
  assert.ok(await pendingA instanceof f.auth.SessionChangedError)
  assert.deepEqual(await cleanup, pairA)
  assert.equal(await pendingB, 'enabled')
  const pairB = body(f.state.posts.at(-1)); assert.notEqual(pairA.registrationId, pairB.registrationId)
  f.state.deletes.forEach(config => { assert.deepEqual(body(config), pairA); assert.equal(config.headers.Authorization, 'Bearer access-a') })
  assert.deepEqual(f.registration.getPushRegistration(versionB), pairB)
  assert.equal(await f.auth.getToken(), 'access-b')
})
test('same-user new login has different ownership and old snapshots cannot mutate it', options, async () => {
  const f = fixture(); f.state.permissions = { granted: true }
  await f.push.registerClientPush(); const old = f.registration.getPushRegistration(0)
  const cleanup = f.push.prepareClientPushLogout(account._id); await f.auth.clearSession(); await cleanup
  const version = await f.auth.saveSession('access-b', account); await f.auth.saveRefreshToken('refresh-b', version)
  await f.push.registerClientPush(); const current = f.registration.getPushRegistration(version)
  assert.notEqual(old.registrationId, current.registrationId)
  old.registrationId = 'mutated-snapshot'; assert.deepEqual(f.registration.getPushRegistration(version), current)
})
test('notification links reject staff routes, external URLs and unauthorized bookings', options, () => {
  fixture(); const { resolveNotificationDestination: resolve } = require(path.join(src, 'utils/notifications.ts'))
  assert.deepEqual(resolve('/bookings/444444444444444444444444', 'owner'), { pathname: '/booking/[id]', params: { id: '444444444444444444444444' } })
  assert.equal(resolve('/bookings?request=declined', 'booking'), '/bookings')
  for (const link of ['https://example.test/bookings', '//example.test', '/worker/jobs/123', '/bookings/invalid']) assert.equal(resolve(link, 'owner'), null)
  assert.equal(resolve('/bookings/444444444444444444444444', 'billing'), null)
})
