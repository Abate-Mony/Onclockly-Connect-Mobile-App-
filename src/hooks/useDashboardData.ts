import { useQuery } from "@tanstack/react-query"
import dayjs, { type Dayjs } from "dayjs"
import { canClient } from "../utils/clientPermissions"
import customFetch from "../utils/customFetch"
import { selectNextBooking } from "../utils/dashboard"
import type {
  BookingsResponse,
  ClientUser,
  InvoicesResponse,
  PortalBooking,
  PortalInvoice,
  PortalQuote,
  QuotesResponse,
} from "../utils/types"

const PAGE_SIZE = 100

export interface DashboardQuotes {
  total: number
  first: PortalQuote | undefined
}

async function fetchUpcomingBookings(signal: AbortSignal): Promise<PortalBooking[]> {
  const now = dayjs()
  // Yesterday can contain a visit that runs past midnight and is still active.
  const oldestRelevantDay = now.subtract(1, "day").format("YYYY-MM-DD")
  const bookings: PortalBooking[] = []
  let page = 1
  let totalPages = 1

  do {
    const { data } = await customFetch.get<BookingsResponse>("/portal/bookings", {
      params: { status: "published", page, limit: PAGE_SIZE },
      signal,
    })
    bookings.push(...data.bookings)
    totalPages = data.totalPages

    // The existing endpoint sorts calendar dates descending. Once older days
    // appear, later pages cannot contain an upcoming or ongoing visit.
    if (data.bookings.length === 0 || data.bookings.some(booking => booking.date.slice(0, 10) < oldestRelevantDay)) break
    page += 1
  } while (page <= totalPages)

  return bookings
}

async function fetchReviewableQuotes(signal: AbortSignal): Promise<DashboardQuotes> {
  // A quote becomes "viewed" when its detail screen opens; it still needs a
  // response. The endpoint accepts one status, and returns an exact total.
  const [sent, viewed] = await Promise.all([
    customFetch.get<QuotesResponse>("/portal/quotes", {
      params: { status: "sent", limit: 1 },
      signal,
    }),
    customFetch.get<QuotesResponse>("/portal/quotes", {
      params: { status: "viewed", limit: 1 },
      signal,
    }),
  ])

  return {
    total: sent.data.total + viewed.data.total,
    first: sent.data.quotes[0] ?? viewed.data.quotes[0],
  }
}

async function fetchOutstandingInvoices(signal: AbortSignal): Promise<PortalInvoice[]> {
  const invoices = new Map<string, PortalInvoice>()
  let page = 1
  let totalPages = 1

  do {
    const { data } = await customFetch.get<InvoicesResponse>("/portal/invoices", {
      params: { status: "sent", page, limit: PAGE_SIZE },
      signal,
    })
    for (const invoice of data.invoices) {
      if (invoice.status === "sent" && invoice.balanceDue > 0) invoices.set(invoice._id, invoice)
    }
    totalPages = data.totalPages
    if (data.invoices.length === 0) break
    page += 1
  } while (page <= totalPages)

  return [...invoices.values()]
}

export function useDashboardData(user: ClientUser | null, now: Dayjs = dayjs()) {
  // Retain the shared prefixes so quote responses and other existing mutation
  // invalidations update this screen, while keeping different clients isolated.
  const bookings = useQuery({
    queryKey: ["portal-bookings", "dashboard", user?._id, "candidates"],
    queryFn: ({ signal }) => fetchUpcomingBookings(signal),
    // The screen's minute clock advances the selected visit from cached
    // candidates, without downloading every bookings page again each minute.
    select: candidates => selectNextBooking(candidates, now),
    enabled: !!user && canClient(user.clientRole, "booking:read"),
  })

  const quotes = useQuery({
    queryKey: ["portal-quotes", "dashboard", user?._id],
    queryFn: ({ signal }) => fetchReviewableQuotes(signal),
    enabled: !!user && canClient(user.clientRole, "quote:read"),
  })

  const invoices = useQuery({
    queryKey: ["portal-invoices", "dashboard", user?._id],
    queryFn: ({ signal }) => fetchOutstandingInvoices(signal),
    enabled: !!user && canClient(user.clientRole, "invoice:read"),
  })

  return { bookings, quotes, invoices }
}
