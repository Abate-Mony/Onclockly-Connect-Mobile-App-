import dayjs, { type Dayjs } from "dayjs"
import type { PortalBooking, PortalInvoice } from "./types"

// The API stores a booking's calendar date at UTC midnight. Keep that date
// intact, then apply the separately supplied local service time. Parsing the
// ISO timestamp first would move the visit to yesterday in western time zones.
export function bookingStart(booking: PortalBooking): Dayjs {
  return dayjs(`${booking.date.slice(0, 10)}T${booking.startTime}:00`)
}

export function bookingEnd(booking: PortalBooking): Dayjs {
  const start = bookingStart(booking)
  const end = dayjs(`${booking.date.slice(0, 10)}T${booking.endTime}:00`)
  const rollsOver = end.isBefore(start) || (end.isSame(start) && booking.minutes > 0)
  return rollsOver ? end.add(1, "day") : end
}

// Include an ongoing published visit until its scheduled end. Among eligible
// visits the earliest start wins, regardless of the API's descending ordering.
export function selectNextBooking(
  bookings: readonly PortalBooking[],
  now: Dayjs = dayjs(),
): PortalBooking | null {
  let next: PortalBooking | null = null

  for (const booking of bookings) {
    const start = bookingStart(booking)
    const end = bookingEnd(booking)
    if (booking.status !== "published" || !start.isValid() || !end.isValid() || !end.isAfter(now)) continue
    if (!next || start.isBefore(bookingStart(next))) next = booking
  }

  return next
}

export interface OutstandingCurrencyTotal {
  currency: string
  total: number
  count: number
  overdueCount: number
}

// Currency totals stay separate: adding GBP and EUR would misstate the balance.
export function groupOutstandingByCurrency(
  invoices: readonly PortalInvoice[],
): OutstandingCurrencyTotal[] {
  const groups = new Map<string, OutstandingCurrencyTotal>()

  for (const invoice of invoices) {
    if (invoice.status !== "sent" || invoice.balanceDue <= 0) continue
    const group = groups.get(invoice.currency) ?? {
      currency: invoice.currency,
      total: 0,
      count: 0,
      overdueCount: 0,
    }
    group.total += invoice.balanceDue
    group.count += 1
    if (invoice.isOverdue) group.overdueCount += 1
    groups.set(invoice.currency, group)
  }

  return [...groups.values()]
}
