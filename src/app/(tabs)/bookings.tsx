import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { Redirect, router } from "expo-router"
import { AlertCircle, CalendarDays, ChevronRight, List, Plus } from "lucide-react-native"
import { useState } from "react"
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Toast from "react-native-toast-message"
import { BookingCalendarView } from "../../components/bookings/BookingCalendarView"
import { pressableFeedback } from "../../components/interactiveStyles"
import { LoadMoreButton, LoadingSkeleton, RetryNotice, RetryState } from "../../components/QueryStates"
import type { FilterOption } from "../../components/SearchAndFilters"
import { SearchAndFilters } from "../../components/SearchAndFilters"
import { StatusBadge } from "../../components/StatusBadge"
import { StyledPressable as Pressable } from "../../components/StyledPressable"
import { useAuth } from "../../context/AuthContext"
import { useTabBarClearance } from "../../hooks/useTabBarClearance"
import { bookingDayKey, dateFromDayKey, serviceTodayKey } from "../../utils/bookingCalendar"
import { canClient } from "../../utils/clientPermissions"
import customFetch from "../../utils/customFetch"
import { startOfCalendarMonth } from "../../utils/dateTimePicker"
import { colors, radius, shadow, spacing } from "../../utils/theme"
import type { BookingRequestsResponse, BookingsResponse, PortalBooking, PortalBookingRequest } from "../../utils/types"

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
      {requests.map((r: PortalBookingRequest) => {
        const key = bookingDayKey(r.preferredDate)
        const date = key ? dateFromDayKey(key) : null
        return (
          <Pressable
            key={r._id}
            accessibilityRole="button"
            accessibilityLabel={`Request for ${r.service}, ${date ? dayjs(date).format("D MMM YYYY") : "Date unavailable"}${r.preferredTime ? `, ${r.preferredTime}` : ""}, ${r.status}`}
            onPress={() => router.push({ pathname: "/booking/request/[id]", params: { id: r._id } })}
            style={({ pressed }) => [styles.card, shadow.md, pressableFeedback(pressed)]}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.dateChip}>
                <Text style={styles.dateChipMonth}>{date ? dayjs(date).format("MMM").toUpperCase() : "—"}</Text>
                <Text style={styles.dateChipDay}>{date ? date.getDate() : "—"}</Text>
              </View>
              <View style={styles.flex1}>
       <View className="flex-row items-center justify-between gap-2">
                 <Text style={styles.cardTitle} numberOfLines={1}>{r.service}</Text>
              <ChevronRight size={16} color={colors.subtle} />

       </View>
                <View className="bg-black/15 h-px my-1 w-full"/>
                <View style={styles.requestMetaRow}>
                  <Text style={styles.requestMetaText} numberOfLines={1}>{r.preferredTime ? `${r.preferredTime} · Requested` : "Requested"}</Text>
                  <StatusBadge status={r.status} />
                </View>
                {r.status === "declined" && !!r.reviewNotes && <Text style={styles.requestMeta}>{r.reviewNotes}</Text>}
              </View>
            </View>
            {/* Cancel button (pending only) was here; re-add with cancelMutation if needed. */}
          </Pressable>
        )
      })}
    </View>
  )
}

function BookingRow({ booking }: { booking: PortalBooking }) {
  const key = bookingDayKey(booking.date)
  const date = key ? dateFromDayKey(key) : null
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${booking.title}, ${date ? dayjs(date).format("D MMM YYYY") : "Date unavailable"}, ${booking.status}, ${booking.location}`}
      onPress={() => router.push({ pathname: "/booking/[id]", params: { id: booking._id } })}
      style={({ pressed }) => [styles.card, shadow.md, pressableFeedback(pressed)]}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.dateChip}>
          <Text style={styles.dateChipMonth}>{date ? dayjs(date).format("MMM").toUpperCase() : "—"}</Text>
          <Text style={styles.dateChipDay}>{date ? date.getDate() : "—"}</Text>
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
  const [view, setView] = useState<"calendar" | "list">("calendar")
  const [calendarMonth, setCalendarMonth] = useState(() => startOfCalendarMonth(dateFromDayKey(serviceTodayKey())))
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<BookingFilter>("all")
  const { user } = useAuth()
  const { fontScale, width } = useWindowDimensions()
  const stackedHeader = fontScale > 1.3 || width < 360
  const canRead = canClient(user?.clientRole, "booking:read")
  const bottomPadding = useTabBarClearance(28)
  const { data, isLoading, isError, refetch, isRefetching, hasNextPage, fetchNextPage, isFetchingNextPage, isFetchNextPageError } = useInfiniteQuery({
    queryKey: ["portal-bookings", "list", user?._id],
    enabled: canRead && view === "list",
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      const { data } = await customFetch.get<BookingsResponse>("/portal/bookings", { params: { page: pageParam }, signal })
      return data
    },
    getNextPageParam: lastPage => lastPage.currentPage < lastPage.totalPages
      ? lastPage.currentPage + 1
      : undefined,
  })
  const bookings = data?.pages.flatMap(page => page.bookings) ?? []
  const canRequest = canClient(user?.clientRole, "booking:create")
  const normalizedSearch = search.trim().toLowerCase()
  const today = serviceTodayKey()
  const filteredBookings = bookings.filter(booking => {
    const key = bookingDayKey(booking.date)
    const date = key ? dateFromDayKey(key) : null
    const isUpcoming = (booking.status === "draft" || booking.status === "published")
      && key !== null && key >= today
    const isPast = key !== null && key < today && booking.status !== "cancelled"
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
      date ? dayjs(date).format("D MMM YYYY") : "",
      date ? dayjs(date).format("MMMM") : "",
    ].filter(Boolean).join(" ").toLowerCase()
    return matchesFilter && searchableText.includes(normalizedSearch)
  })

  if (!canRead) return <Redirect href="/" />

  const header = (
    <View style={styles.header}>
      <View style={[styles.headerRow, stackedHeader && styles.headerRowStacked]}>
        <View style={[styles.flex1, stackedHeader && styles.stackedHeaderCopy]}>
          <Text style={styles.title}>Bookings</Text>
          <Text style={styles.subtitle}>Every visit, past and upcoming.</Text>
        </View>
        {canRequest && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Request a booking"
            onPress={() => router.push("/request-booking")}
            style={({ pressed }) => [styles.requestBtn, shadow.md, pressableFeedback(pressed)]}
          >
            <Plus size={15} color={colors.white} />
            <Text style={styles.requestBtnText}>Request</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.viewSwitch}>
        {(["calendar", "list"] as const).map(mode => {
          const selected = view === mode
          const Icon = mode === "calendar" ? CalendarDays : List
          return (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityLabel={`${mode === "calendar" ? "Calendar" : "List"} view`}
              accessibilityState={{ selected }}
              onPress={() => setView(mode)}
              style={({ pressed }) => [styles.viewButton, selected && styles.viewButtonSelected, pressableFeedback(pressed)]}
            >
              {fontScale <= 1.4 && <Icon size={17} strokeWidth={1.8} color={selected ? colors.primary : colors.muted} />}
              <Text style={[styles.viewButtonText, selected && styles.viewButtonTextSelected]}>{mode === "calendar" ? "Calendar" : "List"}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      {view === "calendar" ? (
        <BookingCalendarView
          user={user}
          header={header}
          month={calendarMonth}
          selectedDate={calendarSelectedDate}
          onMonthChange={setCalendarMonth}
          onSelectDate={setCalendarSelectedDate}
          requests={canRequest ? <YourRequests /> : undefined}
        />
      ) : isLoading ? (
        <ScrollView style={styles.flex1}>
          {header}
          <LoadingSkeleton rows={3} showFilters />
        </ScrollView>
      ) : isError && !data ? (
        <ScrollView style={styles.flex1}>
          {header}
          <RetryState title="Couldn’t load your bookings" message="Check your connection and try again." onRetry={() => { refetch() }} />
        </ScrollView>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={b => b._id}
          renderItem={({ item }) => <BookingRow booking={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.listScreenHeader}>{header}</View>
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

  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.md },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  headerRowStacked: { flexDirection: "column", alignItems: "stretch" },
  stackedHeaderCopy: { flexGrow: 0, flexShrink: 0, flexBasis: "auto" },
  title: { fontSize: 28, lineHeight: 35, fontWeight: "700", color: colors.ink, letterSpacing: -0.6 },
  subtitle: { marginTop: 5, color: colors.muted, fontSize: 13, lineHeight: 19 },
  viewSwitch: { flexDirection: "row", padding: 4, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, marginTop: spacing.lg },
  viewButton: { flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  viewButtonSelected: { backgroundColor: colors.surface },
  viewButtonText: { flexShrink: 1, color: colors.muted, fontSize: 13, lineHeight: 20, fontWeight: "500", textAlign: "center" },
  viewButtonTextSelected: { color: colors.primary, fontWeight: "600" },

  requestBtn: {
    alignSelf: "flex-start",
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

  list: { paddingHorizontal: spacing.xl, gap: spacing.md, flexGrow: 1 },
  listHeader: { gap: spacing.lg, marginBottom: 3 },
  listScreenHeader: { marginHorizontal: -spacing.xl, marginBottom: -spacing.lg },

  sectionLabel: { fontSize: 11, fontWeight: "800", color: colors.subtle, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  requestsBlock: { marginTop: 1, marginBottom: 2, gap: spacing.md },
  requestMeta: { fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 4 },
  requestMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginTop: 6 },
  requestMetaText: { flexShrink: 1, fontSize: 13, lineHeight: 18, color: colors.muted },
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
  cardMeta: { fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 6 },

  empty: { marginTop: 60, alignItems: "center", gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  emptyText: { fontSize: 12, color: colors.muted, textAlign: "center" },
})
