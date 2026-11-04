import { useQuery } from "@tanstack/react-query"
import { monthKey } from "../utils/bookingCalendar"
import { canClient } from "../utils/clientPermissions"
import { fetchBookingCalendar } from "../utils/fetchBookingCalendar"
import type { ClientUser } from "../utils/types"

export function useBookingCalendar(user: ClientUser | null, month: Date) {
  return useQuery({
    queryKey: ["portal-bookings", "calendar", user?._id, monthKey(month)],
    queryFn: ({ signal }) => fetchBookingCalendar(month, signal),
    enabled: !!user && canClient(user.clientRole, "booking:read"),
    staleTime: 30_000,
  })
}
