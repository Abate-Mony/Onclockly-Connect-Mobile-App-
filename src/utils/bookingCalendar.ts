import dayjs from "dayjs"
import { calendarDateKey, calendarMonthDays } from "./dateTimePicker"
import type { PortalBooking } from "./types"

const serviceDayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

function dateForParts(year: number, month: number, day: number): Date | null {
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(0)
  date.setHours(12, 0, 0, 0)
  date.setFullYear(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

// Job dates are UTC-midnight calendar values, not device-local instants. Keep
// the server's written calendar day even when the phone is west of UTC.
export function bookingDayKey(iso: string): string | null {
  if (typeof iso !== "string") return null
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(iso)
  if (!match || !dateForParts(Number(match[1]), Number(match[2]), Number(match[3]))) return null
  return iso.slice(0, 10)
}

export function dateFromDayKey(key: string): Date {
  if (key.length !== 10 || bookingDayKey(key) !== key) throw new RangeError("A valid YYYY-MM-DD calendar key is required")
  return dateForParts(Number(key.slice(0, 4)), Number(key.slice(5, 7)), Number(key.slice(8, 10)))!
}

export function serviceTodayKey(now: Date = new Date()): string {
  if (!Number.isFinite(now.getTime())) throw new RangeError("A valid current date is required")
  const parts = serviceDayFormatter.formatToParts(now)
  const year = parts.find(part => part.type === "year")!.value
  const month = parts.find(part => part.type === "month")!.value
  const day = parts.find(part => part.type === "day")!.value
  return `${year}-${month}-${day}`
}

export function monthKey(month: Date): string {
  assertCalendarYear(month)
  return calendarDateKey(month).slice(0, 7)
}

function assertCalendarYear(month: Date) {
  const year = month.getFullYear()
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new RangeError("Calendar years must be between 1 and 9999")
}

export function calendarRange(month: Date): { from: string; to: string } {
  assertCalendarYear(month)
  // Boundary months can draw adjacent cells outside the canonical four-digit
  // year range. They remain unavailable in the grid and must not enter queries.
  const days = calendarMonthDays(month).filter(day => day.getFullYear() >= 1 && day.getFullYear() <= 9999)
  return { from: calendarDateKey(days[0]), to: calendarDateKey(days[days.length - 1]) }
}

function uniqueValidBookings(bookings: readonly PortalBooking[]): PortalBooking[] {
  const unique = new Map<string, PortalBooking>()
  for (const booking of bookings) {
    if (bookingDayKey(booking.date)) unique.set(booking._id, booking)
  }
  return [...unique.values()]
}

function compareBookings(a: PortalBooking, b: PortalBooking): number {
  return b.date.slice(0, 10).localeCompare(a.date.slice(0, 10))
    || a.startTime.localeCompare(b.startTime)
    || a._id.localeCompare(b._id)
}

export function groupBookingsByDay(bookings: readonly PortalBooking[]): Map<string, PortalBooking[]> {
  const groups = new Map<string, PortalBooking[]>()
  for (const booking of uniqueValidBookings(bookings).sort(compareBookings)) {
    const key = bookingDayKey(booking.date)!
    const day = groups.get(key)
    if (day) day.push(booking)
    else groups.set(key, [booking])
  }
  return groups
}

export function bookingsInMonth(bookings: readonly PortalBooking[], month: Date): PortalBooking[] {
  const prefix = monthKey(month)
  return uniqueValidBookings(bookings)
    .filter(booking => booking.date.slice(0, 7) === prefix)
    .sort(compareBookings)
}

// Formats a request's preferred date by its calendar day, so a date stored as
// UTC midnight never shows as the previous day in negative-offset timezones.
export function formatPreferredDate(iso: string, format = "ddd, D MMM YYYY"): string {
  const key = bookingDayKey(iso)
  return key ? dayjs(dateFromDayKey(key)).format(format) : "Date unavailable"
}

// Short, human-friendly reference for a booking request ID.
export function requestReference(id: string): string {
  return id.slice(-8).toUpperCase()
}
