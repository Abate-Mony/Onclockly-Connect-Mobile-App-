/* global __dirname, __filename */
// Compile the actual pure helpers. These tests never import native modules,
// request device permissions, or contact an application server.
const assert = require("node:assert/strict")
const fs = require("node:fs")
const Module = require("node:module")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { test } = require("node:test")
const ts = require("typescript")

const filename = path.resolve(__dirname, "../src/utils/dateTimePicker.ts")
const subject = new Module(filename, module)
subject.filename = filename
subject.paths = Module._nodeModulePaths(path.dirname(filename))
subject._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const {
  HOURS, MINUTES, calendarDateKey, startOfCalendarMonth, addCalendarMonths,
  calendarMonthDays, isCalendarDayBefore, sameCalendarDay, parseTime, formatTime,
} = subject.exports

// This is a separate Node process per timezone: changing TZ cannot affect
// concurrent tests, and the same production functions run in every case.
if (process.argv.includes("--timezone-probe")) {
  const early = new Date(2026, 0, 15, 0, 15)
  const late = new Date(2026, 0, 15, 23, 45)
  assert.equal(calendarDateKey(early), "2026-01-15")
  assert.equal(calendarDateKey(late), "2026-01-15")
  if (process.env.TZ === "Asia/Dubai") assert.notEqual(early.toISOString().slice(0, 10), calendarDateKey(early))
  if (process.env.TZ === "America/Los_Angeles") assert.notEqual(late.toISOString().slice(0, 10), calendarDateKey(late))
  const days = calendarMonthDays(new Date(2026, 2, 15))
  assert.equal(days.length, 42)
  assert.equal(new Set(days.map(calendarDateKey)).size, 42)
  assert.ok(days.every(day => day.getHours() === 12))
  assert.equal(calendarDateKey(days[0]), "2026-02-23")
  assert.equal(calendarDateKey(days.at(-1)), "2026-04-05")
  assert.equal(formatTime(2, 30), "02:30")
  process.stdout.write(JSON.stringify({ timezone: process.env.TZ, first: calendarDateKey(days[0]), last: calendarDateKey(days.at(-1)) }))
  process.exit(0)
}

test("calendar grid starts on Monday and keeps six complete weeks across a leap February", () => {
  const days = calendarMonthDays(new Date(2024, 1, 20, 22, 30))
  assert.equal(days.length, 42)
  assert.equal(days[0].getDay(), 1)
  assert.equal(days.at(-1).getDay(), 0)
  assert.equal(calendarDateKey(days[0]), "2024-01-29")
  assert.equal(calendarDateKey(days.at(-1)), "2024-03-10")
  assert.equal(days.filter(day => day.getMonth() === 1).length, 29)
  assert.equal(new Set(days.map(calendarDateKey)).size, 42)
  assert.ok(days.every(day => day.getHours() === 12 && day.getMinutes() === 0))
})

test("a month beginning on Monday has no unnecessary leading week", () => {
  const days = calendarMonthDays(new Date(2026, 5, 18))
  assert.equal(calendarDateKey(days[0]), "2026-06-01")
  assert.equal(calendarDateKey(days.at(-1)), "2026-07-12")
})

test("non-leap February has 28 current-month days and distinct adjacent-month cells", () => {
  const days = calendarMonthDays(new Date(2025, 1, 1))
  assert.equal(days.filter(day => day.getMonth() === 1).length, 28)
  assert.equal(calendarDateKey(days[0]), "2025-01-27")
  assert.equal(calendarDateKey(days.at(-1)), "2025-03-09")
  assert.notEqual(days[0], days[1])
})

test("month navigation handles long-month and year boundaries without mutating its input", () => {
  const source = new Date(2026, 0, 31, 23, 59)
  const before = source.getTime()
  assert.equal(calendarDateKey(startOfCalendarMonth(source)), "2026-01-01")
  assert.equal(calendarDateKey(addCalendarMonths(source, 1)), "2026-02-01")
  assert.equal(calendarDateKey(addCalendarMonths(source, -1)), "2025-12-01")
  assert.equal(calendarDateKey(addCalendarMonths(source, 12)), "2027-01-01")
  assert.equal(addCalendarMonths(source, 1).getHours(), 12)
  assert.equal(source.getTime(), before)
})

test("minimum date compares calendar days so today remains selectable after midnight", () => {
  const minimum = new Date(2026, 10, 3, 23, 59)
  const today = new Date(2026, 10, 3, 0, 0)
  assert.equal(isCalendarDayBefore(today, minimum), false)
  assert.equal(sameCalendarDay(today, minimum), true)
  assert.equal(isCalendarDayBefore(new Date(2026, 10, 2, 23, 59), minimum), true)
  assert.equal(isCalendarDayBefore(new Date(2026, 10, 4, 0, 0), minimum), false)
  assert.equal(isCalendarDayBefore(new Date(2025, 11, 31), new Date(2026, 0, 1)), true)
  assert.equal(sameCalendarDay(new Date(2025, 10, 3), minimum), false)
})

test("full-day time values preserve midnight, late minutes and irregular existing schedules", () => {
  for (const [value, parts] of [["00:00", { hour: 0, minute: 0 }], ["23:59", { hour: 23, minute: 59 }], ["09:07", { hour: 9, minute: 7 }], ["02:30", { hour: 2, minute: 30 }]]) {
    assert.deepEqual(parseTime(value), parts)
    assert.equal(formatTime(parts.hour, parts.minute), value)
  }
  assert.equal(HOURS.length, 24)
  assert.equal(MINUTES.length, 60)
  assert.deepEqual([HOURS[0], HOURS.at(-1), MINUTES[0], MINUTES.at(-1)], [0, 23, 0, 59])
  assert.ok(Object.isFrozen(HOURS) && Object.isFrozen(MINUTES))
})

test("malformed and out-of-range wall times are rejected rather than silently normalized", () => {
  for (const value of [null, "", "9:00", "09:0", "24:00", "23:60", "-1:00", "09:07 ", " 09:07", "09:07:00", "2026-03-29T02:30:00"]) assert.equal(parseTime(value), null)
  for (const [hour, minute] of [[-1, 0], [24, 0], [0, -1], [0, 60], [1.5, 0], [0, 1.5], [NaN, 0], [0, Infinity]]) assert.throws(() => formatTime(hour, minute), RangeError)
})

test("invalid calendar inputs and fractional month offsets fail explicitly", () => {
  const invalid = new Date(NaN)
  for (const operation of [calendarDateKey, startOfCalendarMonth, calendarMonthDays]) assert.throws(() => operation(invalid), RangeError)
  assert.throws(() => addCalendarMonths(new Date(), 1.5), RangeError)
  assert.throws(() => isCalendarDayBefore(new Date(), invalid), RangeError)
  assert.throws(() => sameCalendarDay(invalid, new Date()), RangeError)
})

for (const timezone of ["UTC", "Europe/London", "Asia/Dubai", "America/Los_Angeles"]) {
  test(`calendar dates and wall times remain stable in ${timezone}, including DST month grids`, () => {
    const result = spawnSync(process.execPath, [__filename, "--timezone-probe"], {
      env: { ...process.env, TZ: timezone }, encoding: "utf8", timeout: 20_000,
    })
    assert.equal(result.status, 0, result.stderr || result.error?.message)
    assert.equal(JSON.parse(result.stdout).timezone, timezone)
  })
}
