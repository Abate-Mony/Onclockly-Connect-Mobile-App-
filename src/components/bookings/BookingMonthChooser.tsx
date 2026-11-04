import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react-native"
import { useState } from "react"
import { Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { dateFromDayKey } from "../../utils/bookingCalendar"
import { startOfCalendarMonth } from "../../utils/dateTimePicker"
import { colors, radius, spacing } from "../../utils/theme"
import { StyledPressable } from "../StyledPressable"

type BookingMonthChooserProps = {
  month: Date
  today: string
  onSelect: (month: Date) => void
  onClose: () => void
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const

function monthDate(year: number, month: number): Date | null {
  // The booking API's calendar keys use a four-digit AD year.
  if (!Number.isInteger(year) || year < 1 || year > 9999) return null
  const date = new Date(0)
  date.setHours(12, 0, 0, 0)
  date.setFullYear(year, month, 1)
  return Number.isFinite(date.getTime()) ? date : null
}

function validYear(year: number): boolean {
  return MONTHS.some((_, index) => monthDate(year, index) !== null)
}

// Mount per opening so browsing years and closing never changes the calendar.
export function BookingMonthChooser({ month, today, onSelect, onClose }: BookingMonthChooserProps) {
  const [year, setYear] = useState(() => month.getFullYear())
  const { height, fontScale } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const columns = fontScale > 1.4 ? 2 : 3
  const canGoBack = validYear(year - 1)
  const canGoForward = validYear(year + 1)
  const currentMonth = startOfCalendarMonth(dateFromDayKey(today))

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingLeft: insets.left, paddingRight: insets.right }]}>
        <StyledPressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          style={[styles.card, { maxHeight: Math.max(0, height - insets.top - spacing.md) }]}
        >
          <View style={styles.handle} importantForAccessibility="no" />
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} bounces={false}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text accessibilityRole="header" style={styles.title}>Go to month</Text>
                <Text style={styles.subtitle}>Find a visit in your calendar.</Text>
              </View>
              <StyledPressable
                accessibilityRole="button"
                accessibilityLabel="Close month chooser"
                onPress={onClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <X size={20} color={colors.inkSoft} />
              </StyledPressable>
            </View>

            <View style={styles.yearRow}>
              <StyledPressable
                accessibilityRole="button"
                accessibilityLabel={`Previous year, ${year - 1}`}
                accessibilityState={{ disabled: !canGoBack }}
                disabled={!canGoBack}
                onPress={() => setYear(current => current - 1)}
                style={({ pressed }) => [styles.yearButton, pressed && styles.pressed, !canGoBack && styles.disabled]}
              >
                <ChevronLeft size={21} color={colors.primary} />
              </StyledPressable>
              <Text accessibilityRole="header" accessibilityLiveRegion="polite" maxFontSizeMultiplier={2} style={styles.year}>{year}</Text>
              <StyledPressable
                accessibilityRole="button"
                accessibilityLabel={`Next year, ${year + 1}`}
                accessibilityState={{ disabled: !canGoForward }}
                disabled={!canGoForward}
                onPress={() => setYear(current => current + 1)}
                style={({ pressed }) => [styles.yearButton, pressed && styles.pressed, !canGoForward && styles.disabled]}
              >
                <ChevronRight size={21} color={colors.primary} />
              </StyledPressable>
            </View>

            <View style={styles.grid}>
              {MONTHS.map((label, index) => {
                const selected = year === month.getFullYear() && index === month.getMonth()
                const value = monthDate(year, index)
                return (
                  <View key={label} style={[styles.cell, { width: `${100 / columns}%` }]}>
                    <StyledPressable
                      accessibilityRole="button"
                      accessibilityLabel={`${label} ${year}`}
                      accessibilityState={{ selected, disabled: value === null }}
                      disabled={value === null}
                      onPress={() => { if (value) onSelect(value) }}
                      style={({ pressed }) => [styles.month, selected && styles.selectedMonth, pressed && styles.pressed, !value && styles.disabled]}
                    >
                      <Text style={[styles.monthText, selected && styles.selectedMonthText]}>{label.slice(0, 3)}</Text>
                    </StyledPressable>
                  </View>
                )
              })}
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(spacing.lg, insets.bottom) }]}>
            <StyledPressable
              accessibilityRole="button"
              accessibilityLabel={`Go to this month, ${MONTHS[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`}
              onPress={() => onSelect(currentMonth)}
              style={({ pressed }) => [styles.todayButton, pressed && styles.pressed]}
            >
              <CalendarDays size={19} color={colors.primary} strokeWidth={1.8} />
              <Text style={styles.todayText}>This month</Text>
            </StyledPressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(16,47,40,0.4)" },
  card: { width: "100%", maxWidth: 560, alignSelf: "center", flexShrink: 1, overflow: "hidden", backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  handle: { width: 36, height: 4, borderRadius: radius.pill, backgroundColor: colors.border, alignSelf: "center", marginTop: spacing.md },
  scroll: { flexShrink: 1, minHeight: 0 },
  content: { padding: spacing.xl },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginBottom: spacing.xxl },
  headerCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  title: { fontSize: 23, lineHeight: 30, fontWeight: "700", letterSpacing: -0.5, color: colors.ink },
  subtitle: { fontSize: 13, lineHeight: 20, color: colors.muted },
  closeButton: { width: 44, height: 44, flexShrink: 0, borderRadius: radius.pill, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center" },
  yearRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  yearButton: { width: 44, height: 44, flexShrink: 0, borderRadius: radius.sm, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center" },
  year: { flex: 1, fontSize: 24, lineHeight: 32, fontWeight: "600", fontVariant: ["tabular-nums"], color: colors.ink, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", margin: -4 },
  cell: { padding: spacing.xs },
  month: { minHeight: 56, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  selectedMonth: { borderColor: colors.primary, backgroundColor: colors.primary },
  monthText: { fontSize: 15, lineHeight: 22, fontWeight: "500", color: colors.inkSoft },
  selectedMonthText: { color: colors.white, fontWeight: "600" },
  footer: { flexShrink: 0, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.divider },
  todayButton: { minHeight: 52, padding: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  todayText: { fontSize: 15, lineHeight: 22, fontWeight: "600", color: colors.primary, flexShrink: 1, textAlign: "center" },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
})
