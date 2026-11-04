// Calendar days and wall-clock times are deliberately separate. A preferred
// "02:30" must not be coerced through a Date and shifted by a device DST gap.

export const HOURS: readonly number[] = Object.freeze(Array.from({ length: 24 }, (_, hour) => hour))
export const MINUTES: readonly number[] = Object.freeze(Array.from({ length: 60 }, (_, minute) => minute))

function assertDate(value: Date) {
  if (!Number.isFinite(value.getTime())) throw new RangeError("A valid calendar date is required")
}

function calendarDay(value: Date): Date {
  assertDate(value)
  const day = new Date(value.getTime())
  day.setHours(12, 0, 0, 0)
  return day
}

export function calendarDateKey(value: Date): string {
  assertDate(value)
  return [
    String(value.getFullYear()).padStart(4, "0"),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-")
}

export function startOfCalendarMonth(value: Date): Date {
  const month = calendarDay(value)
  month.setDate(1)
  return month
}

export function addCalendarMonths(value: Date, delta: number): Date {
  if (!Number.isInteger(delta)) throw new RangeError("Month offset must be an integer")
  const month = startOfCalendarMonth(value)
  month.setMonth(month.getMonth() + delta)
  assertDate(month)
  return month
}

// A fixed six-week grid keeps the sheet height stable while changing months.
// Local noon avoids calendar dates rolling across midnight DST transitions.
export function calendarMonthDays(value: Date): Date[] {
  const month = startOfCalendarMonth(value)
  const leadingDays = (month.getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(month.getTime())
    day.setDate(1 - leadingDays + index)
    day.setHours(12, 0, 0, 0)
    return day
  })
}

export function sameCalendarDay(a: Date, b: Date): boolean {
  assertDate(a)
  assertDate(b)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function isCalendarDayBefore(day: Date, minimum: Date): boolean {
  assertDate(day)
  assertDate(minimum)
  if (day.getFullYear() !== minimum.getFullYear()) return day.getFullYear() < minimum.getFullYear()
  if (day.getMonth() !== minimum.getMonth()) return day.getMonth() < minimum.getMonth()
  return day.getDate() < minimum.getDate()
}

export function parseTime(value: string | null): { hour: number; minute: number } | null {
  if (typeof value !== "string") return null
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null
}

export function formatTime(hour: number, minute: number): string {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new RangeError("Time must use an hour from 0 to 23 and a minute from 0 to 59")
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}
