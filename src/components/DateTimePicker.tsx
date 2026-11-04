import dayjs from "dayjs"
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  X,
} from "lucide-react-native"
import { Fragment, useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react"
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  addCalendarMonths,
  calendarDateKey,
  calendarMonthDays,
  formatTime,
  HOURS,
  isCalendarDayBefore,
  MINUTES,
  parseTime,
  sameCalendarDay,
  startOfCalendarMonth,
} from "@/utils/dateTimePicker"
import { colors, radius, spacing } from "@/utils/theme"
import { StyledPressable } from "./StyledPressable"

type DateTimePickerFieldProps = {
  label: string
  value: string
  kind: "date" | "time"
  onPress: () => void
  disabled?: boolean
}

export type DateTimePickerSheetProps =
  | {
      mode: "date"
      value: Date
      minimumDate?: Date
      onConfirm: (value: Date) => void
      onCancel: () => void
      title?: string
    }
  | {
      mode: "time"
      value: string | null
      allowAnyTime?: boolean
      onConfirm: (value: string | null) => void
      onCancel: () => void
      title?: string
    }

type DateSheetProps = Extract<DateTimePickerSheetProps, { mode: "date" }>
type TimeSheetProps = Extract<DateTimePickerSheetProps, { mode: "time" }>
type TimeParts = NonNullable<ReturnType<typeof parseTime>>

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
const COMMON_MINUTES = [0, 15, 30, 45]
const DEFAULT_TIME: TimeParts = { hour: 9, minute: 0 }

function atLocalNoon(value: Date) {
  const date = new Date(value)
  date.setHours(12, 0, 0, 0)
  return date
}

/** A stable, display-only form field. Picker presentation belongs to the screen. */
export function DateTimePickerField({ label, value, kind, onPress, disabled }: DateTimePickerFieldProps) {
  const Icon = kind === "date" ? CalendarDays : Clock3

  return (
    <StyledPressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      accessibilityHint={`Opens the ${kind} picker`}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.field, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <View style={styles.fieldIcon}>
        <Icon size={20} color={colors.primary} strokeWidth={1.8} />
      </View>
      <View style={styles.fieldCopy}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value}</Text>
      </View>
      <ChevronDown size={18} color={colors.muted} />
    </StyledPressable>
  )
}

/**
 * Card content only: the owner supplies one Modal and mounts a fresh sheet per opening.
 * A local draft prevents Cancel, Android Back and backdrop taps from changing the form.
 */
export function DateTimePickerSheet(props: DateTimePickerSheetProps) {
  return props.mode === "date" ? <DateSheet {...props} /> : <TimeSheet {...props} />
}

function PickerCard({
  title,
  subtitle,
  onCancel,
  children,
  preferredHeight,
  footer,
  scrollResetKey,
}: {
  title: string
  subtitle: string
  onCancel: () => void
  children: ReactNode
  preferredHeight?: number
  footer: ReactNode
  scrollResetKey?: string
}) {
  const { height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null)
  const availableHeight = Math.max(0, height - insets.top - spacing.md)

  useEffect(() => {
    // Advancing from an hour near the bottom must reveal the minute controls,
    // including on short screens where the previous panel was scrolled.
    scrollRef.current?.scrollTo({ y: 0, animated: false })
  }, [scrollResetKey])

  return (
    <View
      accessibilityViewIsModal
      onAccessibilityEscape={onCancel}
      style={[styles.card, { maxHeight: availableHeight, height: preferredHeight ? Math.min(preferredHeight, availableHeight) : undefined }]}
    >
      <View style={styles.handle} importantForAccessibility="no" />
      <ScrollView ref={scrollRef} style={styles.body} bounces={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <StyledPressable
            accessibilityRole="button"
            accessibilityLabel="Cancel and close picker"
            onPress={onCancel}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <X size={20} color={colors.inkSoft} />
          </StyledPressable>
        </View>
        <View style={styles.bodyContent}>{children}</View>
      </ScrollView>
      {footer}
    </View>
  )
}

function PickerFooter({ label, onPress, disabled = false }: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      <StyledPressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.confirmButton, pressed && styles.confirmPressed, disabled && styles.disabled]}
      >
        <Text style={styles.confirmText}>{label}</Text>
      </StyledPressable>
    </View>
  )
}

function DateSheet({ value, minimumDate, onConfirm, onCancel, title }: DateSheetProps) {
  const [today] = useState(() => atLocalNoon(new Date()))
  const [draft, setDraft] = useState(() => atLocalNoon(
    minimumDate && isCalendarDayBefore(value, minimumDate) ? minimumDate : value,
  ))
  const [month, setMonth] = useState(() => startOfCalendarMonth(draft))
  const { width } = useWindowDimensions()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const previousMonth = addCalendarMonths(month, -1)
  const canGoBack = !minimumDate || !isCalendarDayBefore(previousMonth, startOfCalendarMonth(minimumDate))
  const canConfirm = !minimumDate || !isCalendarDayBefore(draft, minimumDate)
  // Even a 320pt phone retains 44pt day touch targets by reducing calendar-only gutters.
  const calendarBleed = Math.max(0, (7 * 44 - (Math.min(width, 560) - spacing.xl * 2)) / 2)

  const selectDate = (date: Date) => {
    setDraft(atLocalNoon(date))
    setMonth(startOfCalendarMonth(date))
  }

  return (
    <PickerCard
      title={title ?? "Choose a date"}
      subtitle="Select a day for your visit."
      onCancel={onCancel}
      footer={<PickerFooter label="Use date" disabled={!canConfirm} onPress={() => onConfirm(atLocalNoon(draft))} />}
    >
        <View style={styles.dateSummary} accessibilityLiveRegion="polite">
          <CalendarDays size={22} color={colors.primary} strokeWidth={1.8} />
          <View style={styles.summaryCopy}>
            <Text style={styles.eyebrow}>SELECTED DATE</Text>
            <Text style={styles.selectedDate}>{dayjs(draft).format("ddd, D MMMM YYYY")}</Text>
          </View>
        </View>

        <View style={styles.quickDates}>
          {[{ label: "Today", date: today }, { label: "Tomorrow", date: tomorrow }].map(({ label, date }) => {
            const selected = sameCalendarDay(date, draft)
            const disabled = Boolean(minimumDate && isCalendarDayBefore(date, minimumDate))
            return (
              <StyledPressable
                key={label}
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${dayjs(date).format("dddd D MMMM YYYY")}`}
                accessibilityState={{ selected, disabled }}
                disabled={disabled}
                onPress={() => selectDate(date)}
                style={({ pressed }) => [styles.quickDate, selected && styles.quickDateSelected, pressed && styles.pressed, disabled && styles.disabled]}
              >
                {selected && <Check size={15} color={colors.primary} />}
                <Text style={[styles.quickDateText, selected && styles.quickDateTextSelected]}>{label}</Text>
              </StyledPressable>
            )
          })}
        </View>

        <View style={styles.monthHeader}>
          <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.monthTitle}>{dayjs(month).format("MMMM YYYY")}</Text>
          <View style={styles.monthControls}>
            <StyledPressable
              accessibilityRole="button"
              accessibilityLabel={`Previous month, ${dayjs(previousMonth).format("MMMM YYYY")}`}
              accessibilityState={{ disabled: !canGoBack }}
              disabled={!canGoBack}
              onPress={() => setMonth(previousMonth)}
              style={({ pressed }) => [styles.monthButton, pressed && styles.pressed, !canGoBack && styles.disabled]}
            >
              <ChevronLeft size={21} color={colors.primary} />
            </StyledPressable>
            <StyledPressable
              accessibilityRole="button"
              accessibilityLabel={`Next month, ${dayjs(addCalendarMonths(month, 1)).format("MMMM YYYY")}`}
              onPress={() => setMonth(addCalendarMonths(month, 1))}
              style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
            >
              <ChevronRight size={21} color={colors.primary} />
            </StyledPressable>
          </View>
        </View>

        <View style={{ marginHorizontal: -calendarBleed }}>
          <View style={styles.weekdays} importantForAccessibility="no-hide-descendants">
            {WEEKDAYS.map((day, index) => <Text key={index} maxFontSizeMultiplier={2} style={styles.weekday}>{day}</Text>)}
          </View>
          <View style={styles.calendar}>
            {calendarMonthDays(month).map((date) => {
              const selected = sameCalendarDay(date, draft)
              const isToday = sameCalendarDay(date, today)
              const disabled = Boolean(minimumDate && isCalendarDayBefore(date, minimumDate))
              const outsideMonth = date.getMonth() !== month.getMonth()

              return (
                <StyledPressable
                  key={calendarDateKey(date)}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayjs(date).format("dddd D MMMM YYYY")}${isToday ? ", today" : ""}`}
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => selectDate(date)}
                  style={({ pressed }) => [styles.dayTouchTarget, pressed && styles.pressed]}
                >
                  <View style={[
                    styles.dayCircle,
                    isToday && styles.todayCircle,
                    selected && styles.selectedDayCircle,
                  ]}>
                    <Text maxFontSizeMultiplier={2} style={[
                      styles.dayText,
                      outsideMonth && styles.outsideDayText,
                      disabled && styles.disabledDayText,
                      selected && styles.selectedDayText,
                    ]}>{date.getDate()}</Text>
                  </View>
                </StyledPressable>
              )
            })}
          </View>
        </View>
        {!canConfirm && minimumDate && <Text style={styles.validationText}>Choose {dayjs(minimumDate).format("D MMMM YYYY")} or a later date.</Text>}
    </PickerCard>
  )
}

function TimeSheet({ value, allowAnyTime = false, onConfirm, onCancel, title }: TimeSheetProps) {
  const initialTime = parseTime(value)
  const [draft, setDraft] = useState<TimeParts>(() => initialTime ?? DEFAULT_TIME)
  const [anyTime, setAnyTime] = useState(() => allowAnyTime && !initialTime)
  const [editing, setEditing] = useState<"hour" | "minute">("hour")
  const [allMinutes, setAllMinutes] = useState(() => !COMMON_MINUTES.includes(initialTime?.minute ?? 0))
  const { width, fontScale } = useWindowDimensions()
  const columns = fontScale > 2 ? 3 : fontScale > 1.4 ? 4 : Math.max(4, Math.min(6, Math.floor((Math.min(width, 560) - spacing.xl * 2) / 48)))
  const selectedTime = formatTime(draft.hour, draft.minute)
  const values = editing === "hour" ? HOURS : allMinutes ? MINUTES : COMMON_MINUTES

  const chooseValue = (part: number) => {
    if (editing === "hour") {
      setDraft((current) => ({ ...current, hour: part }))
      setEditing("minute")
    } else {
      setDraft((current) => ({ ...current, minute: part }))
    }
  }

  return (
    <PickerCard
      title={title ?? "Choose a time"}
      subtitle="24-hour clock · Hours, then minutes"
      onCancel={onCancel}
      preferredHeight={anyTime ? undefined : 640}
      scrollResetKey={`${anyTime}:${editing}`}
      footer={<PickerFooter label={anyTime ? "Use any time" : "Use time"} onPress={() => onConfirm(anyTime ? null : selectedTime)} />}
    >
        {allowAnyTime && (
          <View style={styles.timeMode}>
            {[{ label: "Any time", any: true }, { label: "Choose a time", any: false }].map(({ label, any }) => (
              <StyledPressable
                key={label}
                accessibilityRole="button"
                accessibilityState={{ selected: anyTime === any }}
                onPress={() => setAnyTime(any)}
                style={({ pressed }) => [styles.timeModeButton, anyTime === any && styles.timeModeSelected, pressed && styles.pressed]}
              >
                <Text style={[styles.timeModeText, anyTime === any && styles.timeModeTextSelected]}>{label}</Text>
              </StyledPressable>
            ))}
          </View>
        )}

        {anyTime ? (
          <View style={styles.anyTimePreview}>
            <View style={styles.anyTimeIcon}><Clock3 size={28} strokeWidth={1.5} color={colors.primary} /></View>
            <Text style={styles.anyTimeTitle}>Keep it flexible</Text>
            <Text style={styles.anyTimeDescription}>No preferred start time.</Text>
          </View>
        ) : (
          <>
            <View style={styles.timePreview}>
              {(["hour", "minute"] as const).map((part, index) => (
                <Fragment key={part}>
                  {index > 0 && <Text maxFontSizeMultiplier={1.5} style={styles.timeColon}>:</Text>}
                  <StyledPressable
                    accessibilityRole="button"
                    accessibilityLabel={`${part === "hour" ? "Hour" : "Minute"}, ${String(draft[part]).padStart(2, "0")}. Tap to choose.`}
                    accessibilityState={{ selected: editing === part }}
                    onPress={() => setEditing(part)}
                    style={({ pressed }) => [styles.timePart, editing === part && styles.activeTimePart, pressed && styles.pressed]}
                  >
                    <Text maxFontSizeMultiplier={1.5} style={[styles.timeDigits, editing === part && styles.activeTimeDigits]}>{String(draft[part]).padStart(2, "0")}</Text>
                    <Text style={[styles.timePartLabel, editing === part && styles.activeTimePartLabel]}>{part === "hour" ? "HOUR" : "MINUTE"}</Text>
                  </StyledPressable>
                </Fragment>
              ))}
            </View>

            <View style={styles.timeGridHeader}>
              <Text accessibilityRole="header" style={styles.timeGridTitle}>{editing === "hour" ? "Select hour" : "Select minute"}</Text>
              {editing === "minute" && (
                <StyledPressable
                  accessibilityRole="button"
                  accessibilityLabel={allMinutes ? "Show common minutes" : "Show all 60 minutes"}
                  accessibilityState={{ expanded: allMinutes }}
                  onPress={() => setAllMinutes((current) => !current)}
                  style={({ pressed }) => [styles.allMinutesButton, pressed && styles.pressed]}
                >
                  <Text style={styles.allMinutesText}>{allMinutes ? "Quick choices" : "All minutes"}</Text>
                  {allMinutes ? <ChevronUp size={16} color={colors.primary} /> : <ChevronDown size={16} color={colors.primary} />}
                </StyledPressable>
              )}
            </View>
            <View style={styles.timeGrid}>
              {values.map((part) => {
                const selected = part === draft[editing]
                const quick = editing === "minute" && !allMinutes
                const choiceColumns = quick ? Math.min(columns, 4) : columns
                return (
                  <View key={part} style={[styles.timeTileCell, { width: `${100 / choiceColumns}%` }]}>
                    <StyledPressable
                      accessibilityRole="button"
                      accessibilityLabel={`${String(part).padStart(2, "0")} ${editing === "hour" ? "hours" : "minutes"}`}
                      accessibilityState={{ selected }}
                      onPress={() => chooseValue(part)}
                      style={({ pressed }) => [styles.timeTile, selected && styles.selectedTimeTile, pressed && styles.pressed]}
                    >
                      <Text style={[styles.timeTileText, selected && styles.selectedTimeTileText]}>{String(part).padStart(2, "0")}</Text>
                    </StyledPressable>
                  </View>
                )
              })}
            </View>
            <Text style={styles.timeSummary} accessibilityLiveRegion="polite">Selected time <Text style={styles.timeSummaryValue}>{selectedTime}</Text></Text>
          </>
        )}
    </PickerCard>
  )
}

const styles = StyleSheet.create({
  field: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 76, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  fieldIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  fieldCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  fieldLabel: { fontSize: 12, lineHeight: 16, fontWeight: "500", color: colors.muted },
  fieldValue: { fontSize: 15, lineHeight: 21, fontWeight: "600", color: colors.ink, flexShrink: 1 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  card: { width: "100%", maxWidth: 560, alignSelf: "center", backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: "hidden", flexShrink: 1 },
  handle: { width: 36, height: 4, borderRadius: radius.pill, backgroundColor: colors.border, alignSelf: "center", marginTop: spacing.md },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  headerCopy: { flex: 1, minWidth: 0, gap: 5 },
  title: { fontSize: 23, lineHeight: 30, fontWeight: "700", color: colors.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, lineHeight: 19, color: colors.muted },
  closeButton: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  body: { flexShrink: 1, minHeight: 0 },
  bodyContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  dateSummary: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.canvas },
  summaryCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  eyebrow: { fontSize: 10, lineHeight: 15, letterSpacing: 1, fontWeight: "600", color: colors.muted },
  selectedDate: { fontSize: 17, lineHeight: 24, fontWeight: "600", color: colors.primary },
  quickDates: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.lg },
  quickDate: { minHeight: 44, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  quickDateSelected: { borderColor: colors.primarySoft, backgroundColor: colors.primarySoft },
  quickDateText: { fontSize: 13, lineHeight: 20, fontWeight: "500", color: colors.inkSoft },
  quickDateTextSelected: { color: colors.primary, fontWeight: "600" },
  monthHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  monthTitle: { flex: 1, fontSize: 17, lineHeight: 24, fontWeight: "600", color: colors.ink },
  monthControls: { flexDirection: "row", gap: spacing.xs, flexShrink: 0 },
  monthButton: { width: 44, height: 44, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  weekdays: { flexDirection: "row", marginBottom: spacing.xs },
  weekday: { width: `${100 / 7}%`, textAlign: "center", fontSize: 11, lineHeight: 20, fontWeight: "500", color: colors.muted },
  calendar: { flexDirection: "row", flexWrap: "wrap" },
  dayTouchTarget: { width: `${100 / 7}%`, minHeight: 48, paddingVertical: 3, alignItems: "center", justifyContent: "center" },
  dayCircle: { width: "90%", maxWidth: 46, minHeight: 42, paddingVertical: 8, borderWidth: 1, borderColor: "transparent", borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  todayCircle: { borderColor: colors.primary },
  selectedDayCircle: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontSize: 14, lineHeight: 20, fontWeight: "500", color: colors.ink },
  outsideDayText: { color: colors.subtle },
  disabledDayText: { color: "#B9C1BA" },
  selectedDayText: { fontWeight: "700", color: colors.white },
  validationText: { fontSize: 13, lineHeight: 20, color: colors.danger, marginTop: spacing.md },
  footer: { flexShrink: 0, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surface },
  confirmButton: { minHeight: 54, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  confirmPressed: { backgroundColor: colors.primaryDark },
  confirmText: { fontSize: 15, lineHeight: 21, fontWeight: "600", textAlign: "center", color: colors.white },
  timeMode: { flexDirection: "row", alignItems: "stretch", padding: 4, borderRadius: radius.md, backgroundColor: colors.canvas, marginBottom: spacing.xl },
  timeModeButton: { flex: 1, minHeight: 44, paddingHorizontal: spacing.sm, paddingVertical: spacing.md, alignItems: "center", justifyContent: "center", borderRadius: radius.sm },
  timeModeSelected: { backgroundColor: colors.primary },
  timeModeText: { fontSize: 13, lineHeight: 19, fontWeight: "600", textAlign: "center", color: colors.muted },
  timeModeTextSelected: { color: colors.white },
  anyTimePreview: { alignItems: "center", paddingVertical: spacing.xxl, gap: spacing.sm },
  anyTimeIcon: { height: 64, width: 64, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  anyTimeTitle: { fontSize: 22, lineHeight: 30, fontWeight: "600", textAlign: "center", color: colors.ink },
  anyTimeDescription: { fontSize: 14, lineHeight: 22, textAlign: "center", color: colors.muted },
  timePreview: { flexDirection: "row", marginBottom: spacing.xl, gap: spacing.md },
  timePart: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm, paddingVertical: spacing.lg, gap: spacing.xs, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.canvas },
  activeTimePart: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  timeDigits: { fontSize: 38, lineHeight: 46, fontWeight: "600", letterSpacing: -1, fontVariant: ["tabular-nums"], color: colors.inkSoft },
  activeTimeDigits: { color: colors.primary },
  timeColon: { fontSize: 28, lineHeight: 40, fontWeight: "500", color: colors.subtle, alignSelf: "center", marginBottom: spacing.xl },
  timePartLabel: { fontSize: 10, lineHeight: 16, fontWeight: "600", letterSpacing: 1.1, color: colors.muted },
  activeTimePartLabel: { color: colors.primary },
  timeGridHeader: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.sm },
  timeGridTitle: { fontSize: 14, lineHeight: 22, fontWeight: "600", color: colors.ink },
  allMinutesButton: { minHeight: 44, paddingHorizontal: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  allMinutesText: { fontSize: 12, lineHeight: 18, fontWeight: "600", color: colors.primary },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -3 },
  timeTileCell: { padding: 3 },
  timeTile: { minHeight: 48, paddingVertical: spacing.md, paddingHorizontal: spacing.xs, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface },
  selectedTimeTile: { borderColor: colors.primary, backgroundColor: colors.primary },
  timeTileText: { fontSize: 16, lineHeight: 22, fontVariant: ["tabular-nums"], fontWeight: "500", color: colors.inkSoft },
  selectedTimeTileText: { fontWeight: "600", color: colors.white },
  timeSummary: { fontSize: 13, lineHeight: 21, color: colors.muted, textAlign: "center", marginTop: spacing.lg },
  timeSummaryValue: { color: colors.primary, fontWeight: "600", fontVariant: ["tabular-nums"] },
})
