/* global __dirname, __filename */
// Exercise production calendar/data code with HTTP and query adapters only.
// No application credentials, native modules, or live requests are used.
const assert = require("node:assert/strict")
const fs = require("node:fs")
const Module = require("node:module")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { test } = require("node:test")
const ts = require("typescript")

const root = path.resolve(__dirname, "..")

function productionModule(relative, adapters = {}, cache = new Map()) {
  const filename = path.resolve(root, relative)
  if (cache.has(filename)) return cache.get(filename).exports
  const subject = new Module(filename, module)
  subject.filename = filename
  subject.paths = Module._nodeModulePaths(path.dirname(filename))
  cache.set(filename, subject)
  subject.require = request => {
    if (Object.hasOwn(adapters, request)) return adapters[request]
    if (request.startsWith(".")) {
      const dependency = path.resolve(path.dirname(filename), request + ".ts")
      if (fs.existsSync(dependency)) return productionModule(dependency, adapters, cache)
    }
    return require(request)
  }
  subject._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText, filename)
  return subject.exports
}

const helpers = productionModule("src/utils/bookingCalendar.ts")
const { bookingDayKey, dateFromDayKey, serviceTodayKey, monthKey, calendarRange, groupBookingsByDay, bookingsInMonth } = helpers

function job(id, day, status = "completed", startTime = "09:00") {
  return {
    _id: id, title: "Office cleaning", description: "", date: `${day}T00:00:00.000Z`,
    startTime, endTime: "11:00", minutes: 120, location: "London", status, site: null, invoice: null,
  }
}

function calendarLoader(get) {
  return productionModule("src/utils/fetchBookingCalendar.ts", {
    "./customFetch": { __esModule: true, default: { get } },
  }).fetchBookingCalendar
}

const november = () => dateFromDayKey("2026-11-01")
const freshSignal = () => new AbortController().signal
const pageResponse = (bookings, currentPage, totalPages) => ({ data: { bookings, currentPage, totalPages, total: bookings.length, success: true } })

if (process.argv.includes("--timezone-probe")) {
  assert.equal(bookingDayKey("2026-11-04T00:00:00.000Z"), "2026-11-04")
  const date = dateFromDayKey("2026-11-04")
  assert.deepEqual([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()], [2026, 10, 4, 12])
  assert.equal(monthKey(date), "2026-11")
  assert.deepEqual(calendarRange(date), { from: "2026-10-26", to: "2026-12-06" })
  assert.equal(serviceTodayKey(new Date("2026-07-03T23:30:00Z")), "2026-07-04")
  assert.equal(serviceTodayKey(new Date("2026-11-04T23:30:00Z")), "2026-11-04")
  const groups = groupBookingsByDay([job("a", "2026-11-04", "completed", "23:30")])
  assert.equal(groups.get("2026-11-04")[0].startTime, "23:30")
  process.stdout.write(JSON.stringify({ timezone: process.env.TZ, day: bookingDayKey(groups.get("2026-11-04")[0].date) }))
  process.exit(0)
}

test("stored UTC job dates retain their calendar day and reject invalid days", () => {
  assert.equal(bookingDayKey("2024-02-29T00:00:00.000Z"), "2024-02-29")
  assert.equal(bookingDayKey("2026-11-04"), "2026-11-04")
  for (const invalid of ["2025-02-29T00:00:00Z", "2026-02-30", "2026-13-01", "2026-00-10", "2026-11-00", "2026-11-32", "not-a-date", "2026-11-04junk", ""]) {
    assert.equal(bookingDayKey(invalid), null)
  }
  assert.throws(() => dateFromDayKey("2026-02-30"), RangeError)
  assert.throws(() => dateFromDayKey("2026-11-04T00:00:00Z"), RangeError)
})

test("calendar windows include all42 cells across leap, month and year boundaries", () => {
  assert.deepEqual(calendarRange(dateFromDayKey("2024-02-01")), { from: "2024-01-29", to: "2024-03-10" })
  assert.deepEqual(calendarRange(dateFromDayKey("2026-12-01")), { from: "2026-11-30", to: "2027-01-10" })
  assert.equal(monthKey(dateFromDayKey("2026-12-31")), "2026-12")
})

test("calendar query bounds stay inside canonical years1 through9999", () => {
  assert.deepEqual(calendarRange(dateFromDayKey("0001-01-01")), { from: "0001-01-01", to: "0001-02-11" })
  assert.deepEqual(calendarRange(dateFromDayKey("9999-12-01")), { from: "9999-11-29", to: "9999-12-31" })
  assert.equal(bookingDayKey("0000-12-31"), null)
  assert.equal(bookingDayKey("10000-01-01"), null)
  assert.throws(() => dateFromDayKey("0000-12-31"), RangeError)
  const beyond = dateFromDayKey("9999-12-01")
  beyond.setFullYear(10000)
  assert.throws(() => calendarRange(beyond), RangeError)
  assert.throws(() => monthKey(beyond), RangeError)
})

test("Today follows London service time across summer/winter and DST boundaries", () => {
  assert.equal(serviceTodayKey(new Date("2026-07-03T23:30:00Z")), "2026-07-04")
  assert.equal(serviceTodayKey(new Date("2026-11-04T23:30:00Z")), "2026-11-04")
  assert.equal(serviceTodayKey(new Date("2026-03-28T23:30:00Z")), "2026-03-28")
  assert.equal(serviceTodayKey(new Date("2026-03-29T23:30:00Z")), "2026-03-30")
  assert.equal(serviceTodayKey(new Date("2026-10-24T23:30:00Z")), "2026-10-25")
  assert.equal(serviceTodayKey(new Date("2026-10-25T23:30:00Z")), "2026-10-25")
  assert.throws(() => serviceTodayKey(new Date("invalid")), RangeError)
})

test("grouping deduplicates IDs, preserves all statuses and sorts same-day wall times", () => {
  const early = job("a", "2026-11-04", "draft", "00:15")
  const late = job("b", "2026-11-04", "published", "23:30")
  const completed = job("c", "2026-11-03")
  const cancelled = job("d", "2026-11-02", "cancelled")
  const source = [late, early, completed, cancelled, { ...completed, title: "Updated" }, job("bad", "2026-02-30")]
  const before = JSON.stringify(source)
  const groups = groupBookingsByDay(source)
  assert.deepEqual([...groups.keys()], ["2026-11-04", "2026-11-03", "2026-11-02"])
  assert.deepEqual(groups.get("2026-11-04").map(value => value._id), ["a", "b"])
  assert.equal(groups.get("2026-11-03")[0].title, "Updated")
  assert.equal(groups.get("2026-11-02")[0].status, "cancelled")
  assert.equal(JSON.stringify(source), before)
})

test("month agenda excludes adjacent cells and sorts recent dates then start times", () => {
  const source = [job("outside", "2026-12-01"), job("old", "2026-11-01"), job("late", "2026-11-30", "published", "18:00"), job("early", "2026-11-30", "cancelled", "07:00")]
  assert.deepEqual(bookingsInMonth(source, november()).map(value => value._id), ["early", "late", "old"])
})

test("calendar loader scans beyond page1 and includes every in-range booking", async () => {
  const records = Array.from({ length: 130 }, (_, index) => job(`future-${index}`, "2027-01-02"))
    .concat(Array.from({ length: 140 }, (_, index) => job(`visit-${index}`, "2026-11-15")))
    .concat(Array.from({ length: 20 }, (_, index) => job(`old-${index}`, "2026-10-01")))
  const signal = freshSignal()
  const calls = []
  const fetch = calendarLoader(async (url, config) => {
    calls.push(config.params.page)
    assert.equal(url, "/portal/bookings")
    assert.deepEqual(Object.keys(config.params).sort(), ["limit", "page"])
    assert.equal(config.params.limit, 100)
    assert.equal(config.signal, signal)
    const page = config.params.page
    return pageResponse(records.slice((page - 1) * 100, page * 100), page, 99)
  })
  const result = await fetch(november(), signal)
  assert.equal(result.length, 140)
  assert.ok(result.every(value => value._id.startsWith("visit-")))
  assert.deepEqual(calls, [1, 2, 3])
})

test("loader includes both calendar edges and deduplicates records across pages", async () => {
  const calls = []
  const first = [job("future", "2026-12-07"), job("last", "2026-12-06"), job("repeat", "2026-11-04")]
  const second = [{ ...job("repeat", "2026-11-04"), title: "Updated" }, job("first", "2026-10-26"), job("past", "2026-10-25")]
  const fetch = calendarLoader(async (_url, config) => {
    calls.push(config.params.page)
    return pageResponse(config.params.page === 1 ? first : second, config.params.page, 12)
  })
  const result = await fetch(november(), freshSignal())
  assert.deepEqual(result.map(value => value._id).sort(), ["first", "last", "repeat"])
  assert.equal(result.find(value => value._id === "repeat").title, "Updated")
  assert.deepEqual(calls, [1, 2])
})

test("loader reaches pagination end when the final page is still inside the month", async () => {
  const records = Array.from({ length: 205 }, (_, index) => job(`visit-${index}`, "2026-11-01"))
  let calls = 0
  const fetch = calendarLoader(async (_url, config) => {
    calls += 1
    return pageResponse(records.slice((config.params.page - 1) * 100, config.params.page * 100), config.params.page, 3)
  })
  assert.equal((await fetch(november(), freshSignal())).length, 205)
  assert.equal(calls, 3)
})

test("a later-page error rejects the entire scan instead of returning partial history", async () => {
  const failure = new Error("Offline")
  const fetch = calendarLoader(async (_url, config) => {
    if (config.params.page === 2) throw failure
    return pageResponse([job("partial", "2026-11-04")], 1, 3)
  })
  await assert.rejects(fetch(november(), freshSignal()), error => error === failure)
})

test("empty pages end scanning safely, including a zero-page empty account", async () => {
  for (const totalPages of [0, 9]) {
    let calls = 0
    const fetch = calendarLoader(async () => { calls += 1; return pageResponse([], 1, totalPages) })
    assert.deepEqual(await fetch(november(), freshSignal()), [])
    assert.equal(calls, 1)
  }
})

test("aborted month changes do not make requests or publish a partial result", async () => {
  const before = new AbortController()
  before.abort()
  let calls = 0
  const fetchBefore = calendarLoader(async () => { calls += 1; throw new Error("Should not request") })
  await assert.rejects(fetchBefore(november(), before.signal), { name: "AbortError" })
  assert.equal(calls, 0)

  const during = new AbortController()
  const fetchDuring = calendarLoader(async () => {
    calls += 1
    during.abort()
    return pageResponse([job("partial", "2026-11-04")], 1, 2)
  })
  await assert.rejects(fetchDuring(november(), during.signal), { name: "AbortError" })
  assert.equal(calls, 1)
})

test("malformed pagination fails visibly instead of silently caching incomplete history", async () => {
  for (const response of [pageResponse([], 2, 3), pageResponse([], 1, -1), pageResponse([], 1, NaN)]) {
    const fetch = calendarLoader(async () => response)
    await assert.rejects(fetch(november(), freshSignal()), /pagination/)
  }
})

test("calendar queries isolate accounts and months and respect booking-read permission", () => {
  const { useBookingCalendar } = productionModule("src/hooks/useBookingCalendar.ts", {
    "@tanstack/react-query": { useQuery: options => options },
    "./customFetch": { __esModule: true, default: { get: () => { throw new Error("No HTTP in hook configuration test") } } },
  })
  const first = useBookingCalendar({ _id: "a", clientRole: "owner" }, november())
  const second = useBookingCalendar({ _id: "b", clientRole: "viewer" }, dateFromDayKey("2026-12-01"))
  assert.deepEqual(first.queryKey, ["portal-bookings", "calendar", "a", "2026-11"])
  assert.deepEqual(second.queryKey, ["portal-bookings", "calendar", "b", "2026-12"])
  assert.equal(first.enabled, true)
  assert.equal(second.enabled, true)
  assert.equal(useBookingCalendar({ _id: "a", clientRole: "billing" }, november()).enabled, false)
  assert.equal(useBookingCalendar(null, november()).enabled, false)
  assert.equal(first.staleTime, 30_000)
  assert.equal(Object.hasOwn(first, "placeholderData"), false)
})

for (const timezone of ["UTC", "Europe/London", "America/Los_Angeles", "Pacific/Kiritimati"]) {
  test(`calendar dates, wall times and UK Today remain stable on a ${timezone} device`, () => {
    const probe = spawnSync(process.execPath, [__filename, "--timezone-probe"], { encoding: "utf8", env: { ...process.env, TZ: timezone } })
    assert.equal(probe.status, 0, probe.stderr || probe.stdout)
    assert.deepEqual(JSON.parse(probe.stdout), { timezone, day: "2026-11-04" })
  })
}
