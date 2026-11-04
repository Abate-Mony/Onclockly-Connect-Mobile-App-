import { bookingDayKey, calendarRange } from "./bookingCalendar"
import customFetch from "./customFetch"
import type { BookingsResponse, PortalBooking } from "./types"

const PAGE_SIZE = 100

function assertNotAborted(signal: AbortSignal) {
  if (!signal.aborted) return
  const error = new Error("Booking calendar request was cancelled")
  error.name = "AbortError"
  throw error
}

export async function fetchBookingCalendar(month: Date, signal: AbortSignal): Promise<PortalBooking[]> {
  const { from, to } = calendarRange(month)
  const bookings = new Map<string, PortalBooking>()
  let page = 1
  let totalPages = 1

  do {
    assertNotAborted(signal)
    // The existing endpoint supports status/page/limit only. Its descending
    // calendar-date sort lets us stop after the visible grid's oldest day.
    const { data } = await customFetch.get<BookingsResponse>("/portal/bookings", {
      params: { page, limit: PAGE_SIZE },
      signal,
    })
    assertNotAborted(signal)
    if (!Array.isArray(data.bookings) || !Number.isInteger(data.totalPages) || data.totalPages < 0 || data.currentPage !== page) {
      throw new Error("Couldn't read booking calendar pagination")
    }
    totalPages = data.totalPages
    let reachedOlderDates = false

    for (const booking of data.bookings) {
      const key = bookingDayKey(booking.date)
      if (!key) continue
      if (key < from) reachedOlderDates = true
      if (key >= from && key <= to) bookings.set(booking._id, booking)
    }

    if (reachedOlderDates || data.bookings.length === 0) break
    page += 1
  } while (page <= totalPages)

  // Errors reject the entire scan, allowing React Query to retain an earlier
  // complete result rather than caching an incomplete month as empty.
  return [...bookings.values()]
}
