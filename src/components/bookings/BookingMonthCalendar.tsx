import dayjs from "dayjs"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react-native"
import { useState } from "react"
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from "react-native"
import { addCalendarMonths, calendarDateKey, calendarMonthDays } from "../../utils/dateTimePicker"
import { colors, radius, shadow, spacing } from "../../utils/theme"
import type { BookingStatus } from "../../utils/types"
import { StyledPressable } from "../StyledPressable"

export type BookingMonthCalendarProps = {
  month: Date
  selectedDate: string | null
  today: string
  statuses: ReadonlyMap<string, BookingStatus[]>
  onSelectDate: (key: string) => void
  onChangeMonth: (month: Date) => void
  onToday: () => void
  onChooseMonth: () => void
  loading?: boolean
  unavailable?: boolean
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
const MINIMUM_CARD_WIDTH = 7 * 44 + 2

// Matches the colour language of the worker app's own schedule calendar —
// one dot colour per booking status, capped at 3 distinct statuses a day.
const STATUS_DOT_COLOR: Record<BookingStatus, string> = {
  draft: colors.warning,
  published: colors.info,
  completed: colors.success,
  cancelled: colors.danger,
}

const STATUS_LEGEND: { label: string; status: BookingStatus }[] = [
  { label: "Pending", status: "draft" },
  { label: "Confirmed", status: "published" },
  { label: "Completed", status: "completed" },
  { label: "Cancelled", status: "cancelled" },
]

/** A service-calendar view. Booking keys are provided by the parent without timezone conversion. */
export function BookingMonthCalendar({
  month,
  selectedDate,
  today,
  statuses,
  onSelectDate,
  onChangeMonth,
  onToday,
  onChooseMonth,
  loading = false,
  unavailable = false,
}: BookingMonthCalendarProps) {
  const { width, fontScale } = useWindowDimensions()
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null)
  const availableWidth = measuredWidth ?? width - spacing.xl * 2
  // On a small phone, borrow page gutters so all seven day targets retain 44pt.
  const bleed = Math.max(0, (MINIMUM_CARD_WIDTH - availableWidth) / 2)
  const cardWidth = Math.max(MINIMUM_CARD_WIDTH, availableWidth)
  const calendarGutter = Math.min(spacing.md, Math.max(0, (cardWidth - MINIMUM_CARD_WIDTH) / 2))
  const stackedHeader = fontScale > 1.35
  const previousMonth = addCalendarMonths(month, -1)
  const nextMonth = addCalendarMonths(month, 1)
  const canGoBack = previousMonth.getFullYear() >= 1
  const canGoForward = nextMonth.getFullYear() <= 9999

  return (
    <View onLayout={event => setMeasuredWidth(event.nativeEvent.layout.width)}>
      <View style={[styles.card, shadow.sm, { marginHorizontal: -bleed }]}>
        <View style={[styles.header, stackedHeader && styles.stackedHeader]}>
          <StyledPressable
            accessibilityRole="button"
            accessibilityLabel={`${dayjs(month).format("MMMM YYYY")}, choose a month and year`}
            accessibilityHint="Opens the month selector"
            onPress={onChooseMonth}
            style={({ pressed }) => [styles.monthButton, stackedHeader && styles.stackedMonthButton, pressed && styles.pressed]}
          >
            <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.monthTitle}>{dayjs(month).format("MMMM YYYY")}</Text>
            <ChevronDown size={16} color={colors.muted} />
          </StyledPressable>
          <View style={[styles.monthControls, stackedHeader && styles.stackedControls]}>
            <StyledPressable
              accessibilityRole="button"
              accessibilityLabel={`Previous month, ${dayjs(previousMonth).format("MMMM YYYY")}`}
              accessibilityState={{ disabled: !canGoBack }}
              disabled={!canGoBack}
              onPress={() => onChangeMonth(previousMonth)}
              style={({ pressed }) => [styles.navigationButton, pressed && styles.pressed, !canGoBack && styles.disabled]}
            >
              <ChevronLeft size={19} color={colors.primary} />
            </StyledPressable>
            <StyledPressable
              accessibilityRole="button"
              accessibilityLabel={`Next month, ${dayjs(nextMonth).format("MMMM YYYY")}`}
              accessibilityState={{ disabled: !canGoForward }}
              disabled={!canGoForward}
              onPress={() => onChangeMonth(nextMonth)}
              style={({ pressed }) => [styles.navigationButton, pressed && styles.pressed, !canGoForward && styles.disabled]}
            >
              <ChevronRight size={19} color={colors.primary} />
            </StyledPressable>
          </View>
        </View>

        <View style={{ paddingHorizontal: calendarGutter }}>
          <View style={styles.weekdays} importantForAccessibility="no-hide-descendants">
            {WEEKDAYS.map(day => <Text key={day} maxFontSizeMultiplier={1.6} style={styles.weekday}>{day}</Text>)}
          </View>
          <View style={styles.days}>
            {calendarMonthDays(month).map(date => {
              const key = calendarDateKey(date)
              const dayStatuses = [...new Set(statuses.get(key) ?? [])].slice(0, 3)
              const count = statuses.get(key)?.length ?? 0
              const selected = selectedDate === key
              const isToday = today === key
              const outsideMonth = date.getMonth() !== month.getMonth()
              const disabled = date.getFullYear() < 1 || date.getFullYear() > 9999
              const bookingDescription = unavailable
                ? "bookings unavailable"
                : count > 0
                  ? `${count} ${count === 1 ? "booking" : "bookings"}`
                  : loading ? "bookings loading" : "no bookings"

              return (
                <StyledPressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayjs(date).format("dddd D MMMM YYYY")}${isToday ? ", today" : ""}, ${bookingDescription}`}
                  accessibilityHint="Shows bookings for this date"
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => onSelectDate(key)}
                  style={({ pressed }) => [styles.dayTarget, pressed && styles.pressed, disabled && styles.disabled]}
                >
                  <View style={[
                    styles.dayPill,
                    isToday ? styles.todayPill : selected && styles.selectedPill,
                  ]}>
                    <Text maxFontSizeMultiplier={2} style={[
                      styles.dayNumber,
                      outsideMonth && styles.outsideDay,
                      isToday ? styles.todayNumber : selected && styles.selectedNumber,
                    ]}>{date.getDate()}</Text>
                  </View>
                  <View style={styles.dotsRow}>
                    {dayStatuses.map(status => (
                      <View key={status} style={[styles.dot, { backgroundColor: STATUS_DOT_COLOR[status] }]} />
                    ))}
                  </View>
                </StyledPressable>
              )
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.legendRow} accessibilityLiveRegion="polite">
            {unavailable ? (
              <Text style={styles.legendText}>Bookings unavailable</Text>
            ) : (
              <>
                {loading && <ActivityIndicator size="small" color={colors.primary} />}
                {STATUS_LEGEND.map(item => (
                  <View key={item.status} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: STATUS_DOT_COLOR[item.status] }]} />
                    <Text style={styles.legendText}>{item.label}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
          <StyledPressable
            accessibilityRole="button"
            accessibilityLabel="Go to today"
            onPress={onToday}
            style={({ pressed }) => [styles.todayButton, pressed && styles.pressed]}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </StyledPressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  stackedHeader: { flexDirection: "column", alignItems: "stretch", gap: spacing.xs },
  monthButton: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 44, paddingVertical: spacing.xs },
  stackedMonthButton: { flexGrow: 0, flexShrink: 0, flexBasis: "auto" },
  monthTitle: { flexShrink: 1, color: colors.ink, fontSize: 18, lineHeight: 25, fontWeight: "700", letterSpacing: -0.3 },
  monthControls: { flexDirection: "row", gap: spacing.xs, flexShrink: 0 },
  stackedControls: { alignSelf: "flex-end" },
  navigationButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, backgroundColor: colors.canvas },
  weekdays: { flexDirection: "row", paddingVertical: spacing.sm },
  weekday: { width: `${100 / 7}%`, color: colors.muted, textAlign: "center", fontSize: 10, lineHeight: 16, fontWeight: "600", letterSpacing: 0.2 },
  days: { flexDirection: "row", flexWrap: "wrap" },
  dayTarget: { width: `${100 / 7}%`, minHeight: 48, alignItems: "center", justifyContent: "flex-start", paddingVertical: 2, gap: 3 },
  dayPill: { width: "92%", maxWidth: 44, minHeight: 32, alignItems: "center", justifyContent: "center", borderRadius: radius.pill },
  todayPill: { backgroundColor: colors.primary },
  selectedPill: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary },
  dayNumber: { color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: "500", fontVariant: ["tabular-nums"] },
  outsideDay: { color: colors.subtle },
  todayNumber: { color: colors.white, fontWeight: "700" },
  selectedNumber: { color: colors.primary, fontWeight: "700" },
  dotsRow: { flexDirection: "row", gap: 2, height: 4 },
  dot: { width: 4, height: 4, borderRadius: radius.pill },
  footer: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: spacing.sm, rowGap: spacing.xs, marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  legendRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.md, flexShrink: 1 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: radius.pill },
  legendText: { flexShrink: 1, color: colors.muted, fontSize: 11, lineHeight: 17 },
  todayButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  todayButtonText: { color: colors.primary, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.35 },
})
