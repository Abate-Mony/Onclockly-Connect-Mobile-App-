import { canClient } from "./clientPermissions"
import type { ClientRole } from "./types"

export type PortalNotification = {
  _id: string
  type: string
  title: string
  body: string
  link: string | null
  isRead: boolean
  createdAt: string
}

export type NotificationsResponse = {
  notifications: PortalNotification[]
  total: number
  totalPages: number
  page: number
  unreadCount: number
}

export type NotificationDestination = "/bookings" | {
  pathname: "/booking/[id]"
  params: { id: string }
}

// Notification links originate on the server, but are still restricted to
// client booking routes. Never open an arbitrary push URL or staff route.
export function resolveNotificationDestination(
  link: unknown,
  role: ClientRole | null | undefined,
): NotificationDestination | null {
  if (typeof link !== "string" || !canClient(role, "booking:read")) return null
  const booking = /^\/bookings\/([a-f\d]{24})\/?$/i.exec(link)
  if (booking) return { pathname: "/booking/[id]", params: { id: booking[1] } }
  if (/^\/bookings\/?(?:\?[^#]*)?$/.test(link)) return "/bookings"
  return null
}
