import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { AppState } from "react-native"
import Toast from "react-native-toast-message"
import { useAuth } from "../context/AuthContext"
import customFetch from "../utils/customFetch"
import type { NotificationsResponse } from "../utils/notifications"

export function invalidateBookingUpdates(client: QueryClient) {
  return Promise.all([
    "portal-bookings", "portal-booking", "portal-booking-requests", "portal-booking-change-requests",
  ].map(key => client.invalidateQueries({ queryKey: [key] })))
}

function useAppActive() {
  const [active, setActive] = useState(AppState.currentState !== "background" && AppState.currentState !== "inactive")
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => setActive(state === "active"))
    return () => subscription.remove()
  }, [])
  return active
}

export function useNotificationSummary() {
  const { user, accessToken } = useAuth()
  const active = useAppActive()
  const client = useQueryClient()
  const latest = useRef<{ userId: string; id: string | undefined } | null>(null)
  const query = useQuery({
    queryKey: ["portal-notifications", user?._id, "summary"],
    enabled: !!user && !!accessToken && active,
    queryFn: async ({ signal }) => {
      const { data } = await customFetch.get<NotificationsResponse>("/portal/notifications", {
        params: { page: 1, limit: 1 }, signal,
      })
      return data
    },
    staleTime: 15_000,
    refetchInterval: active ? 30_000 : false,
    refetchIntervalInBackground: false,
  })
  const newestId = query.data?.notifications[0]?._id
  useEffect(() => {
    if (!user || !query.data) return
    if (latest.current?.userId === user._id && latest.current.id !== newestId) {
      void invalidateBookingUpdates(client)
      void client.invalidateQueries({ queryKey: ["portal-notifications", user._id, "inbox"] })
    }
    latest.current = { userId: user._id, id: newestId }
  }, [client, newestId, query.data, user])
  return query
}

export function useNotificationInbox() {
  const { user, accessToken } = useAuth()
  const client = useQueryClient()
  const active = useAppActive()
  const key = ["portal-notifications", user?._id] as const
  const query = useInfiniteQuery({
    queryKey: [...key, "inbox"],
    enabled: !!user && !!accessToken && active,
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      const { data } = await customFetch.get<NotificationsResponse>("/portal/notifications", {
        params: { page: pageParam, limit: 20 }, signal,
      })
      return data
    },
    getNextPageParam: last => last.page < last.totalPages ? last.page + 1 : undefined,
    staleTime: 15_000,
    refetchInterval: active ? 30_000 : false,
    refetchIntervalInBackground: false,
  })
  const markRead = useMutation({
    mutationFn: (id: string) => customFetch.patch(`/portal/notifications/${encodeURIComponent(id)}/read`),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
    onError: () => Toast.show({ type: "error", text1: "Couldn't mark this update as read", text2: "Please try again." }),
  })
  const markAllRead = useMutation({
    mutationFn: () => customFetch.patch("/portal/notifications/read-all"),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
    onError: () => Toast.show({ type: "error", text1: "Couldn't mark your updates as read", text2: "Please try again." }),
  })
  return { query, markRead, markAllRead }
}
