// Mirrors the backend's whitelist-style /portal/* response shapes exactly
// (time_sheet_server/src/utils/portalSerializers.ts) — every field here is
// something the server explicitly chose to expose to a client, never a
// raw internal document.

export type ClientRole = "owner" | "manager" | "booking" | "billing" | "viewer"

export const CLIENT_ROLE_LABELS: Record<ClientRole, string> = {
  owner: "Owner",
  manager: "Manager",
  booking: "Booking",
  billing: "Billing",
  viewer: "Viewer",
}

export interface ClientUser {
  _id: string
  email: string
  fullname: string
  role: "client"
  clientRole?: ClientRole
  isActive: boolean
  phone?: string
  profilePhoto?: { url: string } | null
}

export interface PortalClient {
  _id: string
  name: string
}

export interface PortalCompany {
  name: string
  logo: string | null
}

// ── Quotes ────────────────────────────────────────────────────────────────

export type QuoteStatus = "sent" | "viewed" | "accepted" | "declined" | "expired"

export interface QuoteItem {
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface PortalQuote {
  _id: string
  quoteNumber: string
  status: QuoteStatus
  title: string
  description?: string
  client?: { name?: string; contactName?: string; address?: Record<string, string> } | null
  site?: Record<string, unknown> | null
  items: QuoteItem[]
  template?: { accentColor?: string } | null
  subtotal: number
  taxRate?: number
  taxAmount?: number
  total: number
  currency: string
  validUntil?: string
  notes?: string
  terms?: string
  sentAt?: string | null
  viewedAt?: string | null
  acceptedAt?: string | null
  acceptedBy?: { name: string; email: string } | null
  declinedAt?: string | null
  declinedBy?: { name: string; email: string } | null
  declineReason?: string
}

// ── Invoices ──────────────────────────────────────────────────────────────

export type InvoiceStatus = "sent" | "paid" | "cancelled"
export type InvoiceDisplayStatus = "draft" | "sent" | "paid" | "cancelled" | "overdue"

export interface InvoiceLineItem {
  description: string
  type: "hourly" | "fixed" | "adjustment"
  job: string | null
  date?: string
  startTime?: string
  endTime?: string
  location?: string
  minutes?: number
  quantity: number
  rate: number
  amount: number
}

export interface PortalInvoice {
  _id: string
  invoiceNumber: string
  currency: string
  clientSnapshot?: { name?: string; billingEmail?: string } | null
  jobs: string[]
  issueDate: string
  dueDate: string
  servicePeriod?: { start?: string; end?: string } | null
  purchaseOrderNumber?: string
  lineItems: InvoiceLineItem[]
  subtotal: number
  vatRate: number
  vatAmount: number
  total: number
  amountPaid: number
  status: InvoiceStatus
  balanceDue: number
  isOverdue: boolean
  displayStatus: InvoiceDisplayStatus
  paidAt?: string | null
  paymentReference?: string
  paymentMethod?: string
}

// ── Bookings (jobs) ───────────────────────────────────────────────────────

export type BookingStatus = "draft" | "published" | "completed" | "cancelled"

export interface PortalBooking {
  _id: string
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  minutes: number
  location: string
  address?: string
  coordinates?: { lat: number; lng: number } | null
  status: BookingStatus
  priority?: string
  site: string | null
  siteSnapshot?: { name: string; accessInstructions?: string; parkingInstructions?: string } | null
  chargeType?: "hourly" | "fixed"
  chargeRate?: number
  chargeAmount?: number
  billingStatus?: "not_billable" | "pending" | "ready" | "invoiced"
  invoice: string | null
}

// ── Sites ─────────────────────────────────────────────────────────────────

export type SiteStatus = "active" | "inactive"

export interface PortalSite {
  _id: string
  name: string
  address?: { line1?: string; line2?: string; city?: string; county?: string; postcode?: string; country?: string }
  formattedAddress?: string
  coordinates?: { lat: number; lng: number } | null
  contact?: { name?: string; phone?: string; email?: string }
  instructions?: string
  accessInstructions?: string
  parkingInstructions?: string
  status: SiteStatus
}

// ── Booking requests ─────────────────────────────────────────────────────

export type BookingRequestStatus = "pending" | "approved" | "declined" | "cancelled"

export interface PortalBookingRequest {
  _id: string
  service: string
  preferredDate: string
  preferredTime?: string
  notes: string
  status: BookingRequestStatus
  reviewNotes?: string
  convertedJob: string | null
  createdAt: string
}

export interface CreateBookingRequestInput {
  service: string
  preferredDate: string
  preferredTime?: string
  notes?: string
}

// ── Job change requests (reschedule/cancel) ─────────────────────────────

export type JobChangeRequestStatus = "pending" | "approved" | "declined" | "cancelled"
export type JobChangeRequestType = "reschedule" | "cancel"

export interface PortalJobChangeRequest {
  _id: string
  job: string | null
  type: JobChangeRequestType
  requestedDate?: string
  requestedStartTime?: string
  requestedEndTime?: string
  reason: string
  originalDate: string
  originalStartTime: string
  originalEndTime: string
  status: JobChangeRequestStatus
  reviewNotes?: string
  createdAt: string
}

export interface CreateRescheduleRequestInput {
  requestedDate: string
  requestedStartTime: string
  requestedEndTime: string
  reason?: string
}

// ── Pagination / response envelopes ──────────────────────────────────────

export interface PaginatedResponse<T> {
  success: boolean
  total: number
  totalPages: number
  currentPage: number
}

export interface QuotesResponse extends PaginatedResponse<PortalQuote> {
  quotes: PortalQuote[]
}

export interface QuoteResponse {
  quote: PortalQuote
}

export interface InvoicesResponse extends PaginatedResponse<PortalInvoice> {
  invoices: PortalInvoice[]
}

export interface InvoiceResponse {
  invoice: PortalInvoice
}

export interface BookingsResponse extends PaginatedResponse<PortalBooking> {
  bookings: PortalBooking[]
}

export interface BookingResponse {
  booking: PortalBooking
}

export interface SitesResponse extends PaginatedResponse<PortalSite> {
  sites: PortalSite[]
}

export interface SiteResponse {
  site: PortalSite
}

export interface BookingRequestsResponse {
  requests: PortalBookingRequest[]
}

export interface JobChangeRequestsResponse {
  requests: PortalJobChangeRequest[]
}

export interface PortalMeResponse {
  success: boolean
  user: ClientUser
  client: PortalClient
  company: PortalCompany | null
}
