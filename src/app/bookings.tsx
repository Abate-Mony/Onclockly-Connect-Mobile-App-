import { useState } from "react"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { router } from "expo-router"
import { AlertCircle, ArrowLeft, CalendarDays, ChevronRight, Plus } from "lucide-react-native"
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native"
import { StyledPressable as Pressable } from "../components/StyledPressable"
import { SafeAreaView } from "react-native-safe-area-context"
import Toast from "react-native-toast-message"
import { SearchAndFilters } from "../components/SearchAndFilters"
import type { FilterOption } from "../components/SearchAndFilters"
import { LoadMoreButton, LoadingSkeleton, RetryNotice, RetryState } from "../components/QueryStates"
import { pressableFeedback } from "../components/interactiveStyles"
import { StatusBadge } from "../components/StatusBadge"
import { useAuth } from "../context/AuthContext"
import { colors, radius, shadow, spacing } from "../utils/theme"
import { canClient } from "../utils/clientPermissions"
import customFetch from "../utils/customFetch"
import type { BookingRequestsResponse, BookingsResponse, PortalBooking, PortalBookingRequest } from "../utils/types"

type BookingFilter = "all" | "upcoming" | "past" | "completed" | "cancelled"

const BOOKING_FILTERS: readonly FilterOption<BookingFilter>[] = [
  { label: "All bookings", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Past", value: "past" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
]

function YourRequests() {
  const qc = useQueryClient()
  const { data, isError, refetch } = useQuery({
    queryKey: ["portal-booking-requests"],
    queryFn: async () => {
      const { data } = await customFetch.get<BookingRequestsResponse>("/portal/bookings/requests")
      return data
    },
  })
  const requests = (data?.requests ?? []).filter(r => r.status === "pending" || r.status === "declined")

  const cancelMutation = useMutation({
    mutationFn: (id: string) => customFetch.patch(`/portal/bookings/requests/${id}/cancel`),
    onSuccess: () => {
      Toast.show({ type: "success", text1: "Request cancelled" })
      qc.invalidateQueries({ queryKey: ["portal-booking-requests"] })
    },
    onError: (err: any) => Toast.show({ type: "error", text1: "Couldn't cancel this request", text2: err?.response?.data?.msg }),
  })

  if (requests.length === 0 && !isError) return null

  return (
    <View style={styles.requestsBlock}>
      <Text style={styles.sectionLabel}>Your requests</Text>
      {isError && (
        <RetryNotice
          message={data
            ? "Couldn't refresh your booking requests. Saved requests are still shown."
            : "Couldn't load your booking requests."}
          onRetry={() => { refetch() }}
        />
      )}
      {requests.map((r: PortalBookingRequest) => (
        <View key={r._id} style={[styles.requestCard, shadow.sm]}>
          <View style={styles.flex1}>
            <View style={styles.requestTitleRow}>
              <Text style={styles.requestService} numberOfLines={1}>{r.service}</Text>
              <StatusBadge status={r.status} />
            </View>
            <Text style={styles.requestMeta}>
              Preferred {dayjs(r.preferredDate).format("D MMM YYYY")}{r.preferredTime ? ` · ${r.preferredTime}` : ""}
            </Text>
            {r.status === "declined" && !!r.reviewNotes && <Text style={styles.requestMeta}>{r.reviewNotes}</Text>}
          </View>
          {r.status === "pending" && (
            <Pressable
              accessibilityRole="button"
              onPress={() => cancelMutation.mutate(r._id)}
              disabled={cancelMutation.isPending}
              style={({ pressed }) => [styles.cancelButton, pressableFeedback(pressed)]}
            >
              <Text style={styles.cancelLink}>Cancel</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  )
}

function BookingRow({ booking }: { booking: PortalBooking }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${booking.title}, ${dayjs(booking.date).format("D MMM YYYY")}, ${booking.status}, ${booking.location}`}
      onPress={() => router.push({ pathname: "/booking/[id]", params: { id: booking._id } })}
      style={({ pressed }) => [styles.card, shadow.md, pressableFeedback(pressed)]}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.dateChip}>
          <Text style={styles.dateChipMonth}>{dayjs(booking.date).format("MMM").toUpperCase()}</Text>
          <Text style={styles.dateChipDay}>{dayjs(booking.date).format("D")}</Text>
        </View>
        <View style={styles.flex1}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{booking.title}</Text>
            <StatusBadge status={booking.status} />
          </View>
          <Text style={styles.cardMeta}>{booking.startTime}–{booking.endTime} · {booking.location}</Text>
        </View>
        <ChevronRight size={16} color={colors.subtle} />
      </View>
    </Pressable>
  )
}

export default function BookingsScreen() {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<BookingFilter>("all")
  const { user } = useAuth()
  const { data, isLoading, isError, refetch, isRefetching, hasNextPage, fetchNextPage, isFetchingNextPage, isFetchNextPageError } = useInfiniteQuery({
    queryKey: ["portal-bookings"],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await customFetch.get<BookingsResponse>("/portal/bookings", { params: { page: pageParam } })
      return data
    },
    getNextPageParam: lastPage => lastPage.currentPage < lastPage.totalPages
      ? lastPage.currentPage + 1
      : undefined,
  })
  const bookings = data?.pages.flatMap(page => page.bookings) ?? []
  const canRequest = canClient(user?.clientRole, "booking:create")
  const normalizedSearch = search.trim().toLowerCase()
  const filteredBookings = bookings.filter(booking => {
    const isUpcoming = (booking.status === "draft" || booking.status === "published")
      && !dayjs(booking.date).isBefore(dayjs(), "day")
    const isPast = dayjs(booking.date).isBefore(dayjs(), "day") && booking.status !== "cancelled"
    const matchesFilter = filter === "all"
      || (filter === "upcoming" && isUpcoming)
      || (filter === "past" && isPast)
      || (filter === "completed" && booking.status === "completed")
      || (filter === "cancelled" && booking.status === "cancelled")
    const searchableText = [
      booking.title,
      booking.location,
      booking.address,
      booking.status,
      dayjs(booking.date).format("D MMM YYYY"),
      dayjs(booking.date).format("MMMM"),
    ].filter(Boolean).join(" ").toLowerCase()
    return matchesFilter && searchableText.includes(normalizedSearch)
  })

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressableFeedback(pressed)]}
        >
          <ArrowLeft size={18} color={colors.ink} />
          <Text style={styles.backText}>Home</Text>
        </Pressable>
      </View>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.flex1}>
            <Text style={styles.eyebrow}>YOUR SERVICES</Text>
            <Text style={styles.title}>Bookings</Text>
            <Text style={styles.subtitle}>Your upcoming and past visits, all in one place.</Text>
          </View>
          {canRequest && (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/request-booking")}
              style={({ pressed }) => [styles.requestBtn, shadow.md, pressableFeedback(pressed)]}
            >
              <Plus size={15} color={colors.white} />
              <Text style={styles.requestBtnText}>Request</Text>
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        <LoadingSkeleton rows={3} showFilters />
      ) : isError && !data ? (
        <RetryState title="Couldn’t load your bookings" message="Check your connection and try again." onRetry={() => { refetch() }} />
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={b => b._id}
          renderItem={({ item }) => <BookingRow booking={item} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {isError && !isFetchNextPageError && <RetryNotice onRetry={() => { refetch() }} />}
              <SearchAndFilters
                label="Search bookings"
                placeholder="Search title, site, date, or status"
                search={search}
                onSearchChange={setSearch}
                options={BOOKING_FILTERS}
                selected={filter}
                onSelect={setFilter}
              />
              {canRequest && <YourRequests />}
            </View>
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
          }}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch() }} tintColor={colors.primaryDark} />}
          ListFooterComponent={filteredBookings.length > 0 && hasNextPage ? (
            <LoadMoreButton
              label="bookings"
              loading={isFetchingNextPage}
              error={isFetchNextPageError}
              onLoadMore={() => { void fetchNextPage() }}
            />
          ) : undefined}
          ListEmptyComponent={
            <View style={styles.empty}>
              {bookings.length === 0 && !hasNextPage
                ? <CalendarDays size={20} color={colors.muted} />
                : <AlertCircle size={20} color={colors.muted} />}
              <Text style={styles.emptyTitle}>
                {bookings.length === 0 && !hasNextPage
                  ? "No bookings yet"
                  : hasNextPage ? "Keep searching more bookings" : "No bookings match your search"}
              </Text>
              <Text style={styles.emptyText}>
                {bookings.length === 0 && !hasNextPage
                  ? "Upcoming and past bookings will show up here."
                  : hasNextPage
                    ? "The rest of your bookings are on the next page."
                    : "Try another search or choose a different status filter."}
              </Text>
              {hasNextPage && (
                <LoadMoreButton
                  label="bookings"
                  loading={isFetchingNextPage}
                  error={isFetchNextPageError}
                  onLoadMore={() => { void fetchNextPage() }}
                />
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex1: { flex: 1, minWidth: 0 },

  topBar: { paddingHorizontal: 12, paddingTop: 4 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingVertical: 8, paddingHorizontal: 4, alignSelf: "flex-start" },
  backText: { fontSize: 14, fontWeight: "700", color: colors.ink },

  header: { paddingHorizontal: spacing.xl, paddingTop: 4, paddingBottom: spacing.lg },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  eyebrow: { color: colors.subtle, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  title: { marginTop: 5, fontSize: 30, fontWeight: "800", color: colors.ink, letterSpacing: -0.5 },
  subtitle: { marginTop: 5, color: colors.muted, fontSize: 13, lineHeight: 19 },

  requestBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    backgroundColor: colors.primaryDark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  requestBtnText: { fontSize: 12, fontWeight: "700", color: colors.white },

  list: { paddingHorizontal: spacing.xl, paddingBottom: 28, gap: spacing.md, flexGrow: 1 },
  listHeader: { gap: spacing.lg, marginBottom: 3 },

  sectionLabel: { fontSize: 11, fontWeight: "800", color: colors.subtle, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  requestsBlock: { marginTop: 1, marginBottom: 2, gap: 8 },
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  requestTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  requestService: { fontSize: 14, fontWeight: "700", color: colors.ink, flexShrink: 1 },
  requestMeta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  cancelButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  cancelLink: { fontSize: 12, fontWeight: "700", color: colors.danger },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dateChip: {
    width: 48,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  dateChipMonth: { color: colors.primaryDark, fontSize: 9, fontWeight: "800", letterSpacing: 0.4 },
  dateChipDay: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  cardTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.ink, flexShrink: 1 },
  cardMeta: { fontSize: 12, color: colors.muted, marginTop: 6 },

  empty: { marginTop: 60, alignItems: "center", gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  emptyText: { fontSize: 12, color: colors.muted, textAlign: "center" },
})
