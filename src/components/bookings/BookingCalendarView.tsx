import dayjs from "dayjs"
import { router, useFocusEffect } from "expo-router"
import { CalendarDays, Check, ChevronRight } from "lucide-react-native"
import { useCallback, useMemo, useRef, useState, type ComponentRef, type ReactNode } from "react"
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { useBookingCalendar } from "../../hooks/useBookingCalendar"
import { useTabBarClearance } from "../../hooks/useTabBarClearance"
import { bookingDayKey, bookingsInMonth, dateFromDayKey, groupBookingsByDay, monthKey, serviceTodayKey } from "../../utils/bookingCalendar"
import { startOfCalendarMonth } from "../../utils/dateTimePicker"
import { colors, radius, shadow, spacing } from "../../utils/theme"
import type { ClientUser, PortalBooking } from "../../utils/types"
import { RetryNotice, RetryState } from "../QueryStates"
import { StatusBadge } from "../StatusBadge"
import { StyledPressable } from "../StyledPressable"
import { BookingMonthCalendar } from "./BookingMonthCalendar"
import { BookingMonthChooser } from "./BookingMonthChooser"

const NO_BOOKINGS: PortalBooking[] = []

// Mirrors the worker app's own schedule screen: "Today"/"Tomorrow" read
// better at a glance than a bare date once you're looking at your own
// upcoming work, and fall through to the full weekday name otherwise.
function dayHeading(key: string, today: string): string {
  const date = dateFromDayKey(key)
  if (key === today) return "Today"
  if (key === dayjs(dateFromDayKey(today)).add(1, "day").format("YYYY-MM-DD")) return "Tomorrow"
  return dayjs(date).format("dddd, D MMMM")
}

function dateBadgeLabel(key: string, today: string): string {
  const date = dateFromDayKey(key)
  if (key === today) return "Today"
  if (key === dayjs(dateFromDayKey(today)).add(1, "day").format("YYYY-MM-DD")) return "Tmrw"
  return dayjs(date).format("D MMM")
}

/** A single booking row inside the day panel — mirrors the worker app's ShiftRow.
 * When `dateKey` is given (the "all month" view, spanning several days), a
 * compact date badge replaces the single-day time column so each row still
 * says which day it belongs to. */
function BookingRow({ booking, dateKey, today }: { booking: PortalBooking; dateKey?: string; today: string }) {
  return (
    <StyledPressable
      accessibilityRole="button"
      accessibilityLabel={`${booking.title}, ${dayjs(dateFromDayKey(bookingDayKey(booking.date)!)).format("dddd D MMMM YYYY")}, ${booking.startTime} to ${booking.endTime}, UK time, ${booking.location || booking.siteSnapshot?.name || "Location not provided"}`}
      accessibilityHint="Opens booking details"
      onPress={() => router.push({ pathname: "/booking/[id]", params: { id: booking._id } })}
      style={({ pressed }) => [styles.shiftRow, shadow.sm, pressed && styles.pressed]}
    >
      {dateKey ? (
        <View style={styles.dateBadge}>
          <Text maxFontSizeMultiplier={1.6} style={styles.dateBadgeText}>{dateBadgeLabel(dateKey, today)}</Text>
        </View>
      ) : (
        <>
          <View style={styles.shiftTime}>
            <Text maxFontSizeMultiplier={1.6} style={styles.startTime}>{booking.startTime}</Text>
            <Text maxFontSizeMultiplier={1.6} style={styles.endTime}>{booking.endTime}</Text>
          </View>
          <View style={styles.verticalDivider} />
        </>
      )}

      <View style={styles.shiftInfo}>
        <Text style={styles.shiftTitle} numberOfLines={1}>{booking.title}</Text>
        <Text style={styles.shiftLocation} numberOfLines={1}>
          {dateKey ? `${booking.startTime}–${booking.endTime} · ` : ""}{booking.location || booking.siteSnapshot?.name || "Location not provided"}
        </Text>
      </View>

      <StatusBadge status={booking.status} />
    </StyledPressable>
  )
}

export function BookingCalendarView({ user, requests, header, month, selectedDate, onMonthChange: setMonth, onSelectDate: setSelectedDate }: {
  user: ClientUser | null
  requests?: ReactNode
  header?: ReactNode
  month: Date
  selectedDate: string | null
  onMonthChange: (month: Date) => void
  onSelectDate: (date: string | null) => void
}) {
  const [today, setToday] = useState(() => serviceTodayKey())
  const [choosingMonth, setChoosingMonth] = useState(false)
  const query = useBookingCalendar(user, month)
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null)
  const viewportHeight = useRef(0)
  const agendaOffset = useRef(0)
  const bottomPadding = useTabBarClearance(28)
  const bookings = query.data ?? NO_BOOKINGS
  const grouped = useMemo(() => groupBookingsByDay(bookings), [bookings])
  const statusesByDay = useMemo(() => new Map([...grouped].map(([key, items]) => [key, items.map(booking => booking.status)])), [grouped])
  const monthBookings = useMemo(() => bookingsInMonth(bookings, month), [bookings, month])
  const agenda = selectedDate ? grouped.get(selectedDate) ?? NO_BOOKINGS : monthBookings
  const completed = monthBookings.filter(booking => booking.status === "completed").length
  const hasData = query.data !== undefined
  const canShowEmpty = hasData && !query.isPending

  useFocusEffect(useCallback(() => {
    const updateToday = () => setToday(serviceTodayKey())
    updateToday()
    const timer = setInterval(updateToday, 60_000)
    return () => clearInterval(timer)
  }, []))

  function changeMonth(nextMonth: Date) {
    if (nextMonth.getFullYear() < 1 || nextMonth.getFullYear() > 9999) return
    setMonth(startOfCalendarMonth(nextMonth))
    setSelectedDate(null)
    scrollRef.current?.scrollTo({ y: 0, animated: false })
  }

  function selectDate(key: string) {
    if (bookingDayKey(key) !== key || key.length !== 10 || key < "0001-01-01") return
    const date = dateFromDayKey(key)
    if (monthKey(date) !== monthKey(month)) setMonth(startOfCalendarMonth(date))
    setSelectedDate(key)
    // Reveal the day panel on short phones while retaining as much calendar as fits.
    requestAnimationFrame(() => scrollRef.current?.scrollTo({
      y: Math.max(0, agendaOffset.current + 180 - viewportHeight.current),
      animated: true,
    }))
  }

  function goToToday() {
    const key = serviceTodayKey()
    setToday(key)
    selectDate(key)
  }

  const agendaTitle = selectedDate ? dayHeading(selectedDate, today) : "Monthly visits"

  return (
    <View style={styles.container} onLayout={event => { viewportHeight.current = event.nativeEvent.layout.height }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch() }} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {header && <View style={styles.screenHeader}>{header}</View>}

        <BookingMonthCalendar
          month={month}
          selectedDate={selectedDate}
          today={today}
          statuses={statusesByDay}
          onSelectDate={selectDate}
          onChangeMonth={changeMonth}
          onToday={goToToday}
          onChooseMonth={() => setChoosingMonth(true)}
          loading={query.isPending || (query.isFetching && !hasData)}
          unavailable={query.isError && !hasData}
        />

        <View style={styles.monthSummary}>
          <View style={styles.summaryItem}>
            <CalendarDays size={15} color={colors.primary} />
            <Text style={styles.summaryText}><Text style={styles.summaryNumber}>{hasData ? monthBookings.length : "—"}</Text> bookings</Text>
          </View>
          <View style={styles.summaryItem}>
            <Check size={15} color={colors.primary} />
            <Text style={styles.summaryText}><Text style={styles.summaryNumber}>{hasData ? completed : "—"}</Text> completed</Text>
          </View>
        </View>

        {query.isError && hasData && <RetryNotice message="Couldn't refresh this month. Your saved bookings are still shown." onRetry={() => { void query.refetch() }} />}

        {/* Day panel — mirrors the worker app's own schedule-day card. */}
        <View style={styles.dayPanel} onLayout={event => { agendaOffset.current = event.nativeEvent.layout.y }}>
          <View style={styles.dayPanelHeader}>
            <View style={styles.headingCopy}>
              <Text accessibilityRole="header" style={styles.agendaTitle}>{agendaTitle}</Text>
              <Text style={styles.agendaSubtitle}>{selectedDate ? "Your selected day · UK time" : `${dayjs(month).format("MMMM YYYY")} · UK time`}</Text>
            </View>
            {selectedDate && (
              <StyledPressable accessibilityRole="button" accessibilityLabel="Show all bookings this month" onPress={() => setSelectedDate(null)} style={({ pressed }) => [styles.allMonthButton, pressed && styles.pressed]}>
                <Text style={styles.allMonthText}>All month</Text>
              </StyledPressable>
            )}
          </View>

          {query.isPending ? (
            <View style={styles.emptyDayState}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : query.isError && !hasData ? (
            <RetryState title="Couldn't load this month" message="Check your connection and try again." onRetry={() => { void query.refetch() }} />
          ) : canShowEmpty && agenda.length === 0 ? (
            <View style={styles.emptyDayState}>
              <View style={styles.emptyIconCircle}>
                <CalendarDays size={18} color={colors.subtle} />
              </View>
              <Text style={styles.emptyDayTitle}>{selectedDate ? "A clear day on your calendar" : "No bookings this month"}</Text>
              <Text style={styles.emptyDayText}>{selectedDate ? "There are no bookings for this day. Browse the month to see your other visits." : "Choose another month to explore your past visits. New bookings will appear here too."}</Text>
              <StyledPressable accessibilityRole="button" onPress={() => selectedDate ? setSelectedDate(null) : setChoosingMonth(true)} style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}>
                <Text style={styles.emptyButtonText}>{selectedDate ? "View the whole month" : "Choose a month"}</Text>
                <ChevronRight size={16} color={colors.primary} />
              </StyledPressable>
            </View>
          ) : (
            <View style={styles.shiftList}>
              {agenda.map(booking => (
                <BookingRow key={booking._id} booking={booking} dateKey={selectedDate ? undefined : bookingDayKey(booking.date)!} today={today} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.timezoneNote}>All times are shown in UK time.</Text>
          {requests}
        </View>
      </ScrollView>
      {choosingMonth && <BookingMonthChooser month={month} today={today} onClose={() => setChoosingMonth(false)} onSelect={nextMonth => { changeMonth(nextMonth); setChoosingMonth(false) }} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs, gap: spacing.md },
  screenHeader: { marginHorizontal: -spacing.xl, marginBottom: -spacing.md },
  monthSummary: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, paddingHorizontal: spacing.xs },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  summaryText: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  summaryNumber: { color: colors.ink, fontWeight: "700", fontVariant: ["tabular-nums"] },

  dayPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.sm,
  },
  dayPanelHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.md },
  headingCopy: { flexGrow: 1, flexShrink: 1, minWidth: 160, gap: spacing.xs },
  agendaTitle: { color: colors.ink, fontSize: 19, lineHeight: 25, fontWeight: "700", letterSpacing: -0.3 },
  agendaSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  allMonthButton: { minHeight: 44, paddingHorizontal: spacing.md, justifyContent: "center", backgroundColor: colors.primarySoft, borderRadius: radius.pill },
  allMonthText: { color: colors.primary, fontSize: 12, lineHeight: 18, fontWeight: "600" },

  shiftList: { gap: spacing.sm },
  shiftRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  shiftTime: { width: 48, alignItems: "center", justifyContent: "center" },
  startTime: { fontSize: 12, fontWeight: "800", color: colors.inkSoft },
  endTime: { marginTop: 2, fontSize: 10, color: colors.subtle },
  verticalDivider: { width: 1, alignSelf: "stretch", backgroundColor: colors.divider },
  dateBadge: { minWidth: 52, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  dateBadgeText: { fontSize: 10, fontWeight: "800", color: colors.inkSoft },
  shiftInfo: { flex: 1, minWidth: 0 },
  shiftTitle: { fontSize: 14, lineHeight: 20, fontWeight: "700", color: colors.ink },
  shiftLocation: { marginTop: 3, fontSize: 12, lineHeight: 17, color: colors.muted },

  emptyDayState: { alignItems: "center", justifyContent: "center", paddingVertical: 20, gap: 8 },
  emptyIconCircle: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center" },
  emptyDayTitle: { fontSize: 15, lineHeight: 21, fontWeight: "700", color: colors.ink, textAlign: "center" },
  emptyDayText: { fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: "center", paddingHorizontal: spacing.md },
  emptyButton: { maxWidth: "100%", minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, marginTop: spacing.xs },
  emptyButtonText: { flexShrink: 1, color: colors.primary, fontSize: 13, lineHeight: 20, fontWeight: "600", textAlign: "center" },

  footer: { gap: spacing.xl, marginTop: spacing.sm },
  timezoneNote: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center" },
  pressed: { opacity: 0.65 },
})
