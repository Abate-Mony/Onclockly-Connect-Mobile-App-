import type { Dayjs } from "dayjs"
import { router } from "expo-router"
import { ArrowRight, CalendarDays, ChevronRight, MapPin, Plus } from "lucide-react-native"
import { StyleSheet, Text, View, useWindowDimensions } from "react-native"
import type { useDashboardData } from "../../hooks/useDashboardData"
import { bookingStart } from "../../utils/dashboard"
import { colors } from "../../utils/theme"
import { StyledPressable } from "../StyledPressable"
import { QueryNotice } from "./DashboardPrimitives"

type BookingQuery = ReturnType<typeof useDashboardData>["bookings"]

function BookingSkeleton() {
  return (
    <View
      accessible
      accessibilityLabel="Loading your next visit"
      accessibilityState={{ busy: true }}
      style={styles.skeletonCard}
    >
      <View style={[styles.skeletonLine, styles.skeletonLabel]} />
      <View style={[styles.skeletonLine, styles.skeletonTitle]} />
      <View style={[styles.skeletonLine, styles.skeletonLocation]} />
      <View style={styles.skeletonFooter}>
        <View style={styles.skeletonDate} />
        <View style={styles.skeletonCopy}>
          <View style={[styles.skeletonLine, styles.skeletonLocation]} />
          <View style={[styles.skeletonLine, styles.skeletonLabel]} />
        </View>
      </View>
    </View>
  )
}

export function BookingSection({
  query,
  canRequest,
  now,
}: {
  query: BookingQuery
  canRequest: boolean
  now: Dayjs
}) {
  const { fontScale } = useWindowDimensions()
  const largeText = fontScale > 1.3
  const booking = query.data

  if (query.isPending) return <BookingSkeleton />

  if (!booking) {
    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyHeader}>
          <View style={styles.emptyIcon}><CalendarDays size={21} color={colors.primary} /></View>
          <Text style={styles.emptyEyebrow}>Your calendar</Text>
        </View>
        <Text accessibilityRole="header" style={styles.emptyTitle}>
          {query.isError ? "Your calendar is unavailable" : "No visits scheduled"}
        </Text>
        {query.isError ? (
          <QueryNotice
            message="We couldn't load your next visit."
            onRetry={() => { void query.refetch() }}
            busy={query.isFetching}
          />
        ) : (
          <>
            <Text style={styles.emptyCopy}>Your next confirmed visit will appear here.</Text>
            <StyledPressable
              accessibilityRole="button"
              onPress={() => router.push(canRequest ? "/request-booking" : "/bookings")}
            >
              {({ pressed }) => (
                <View style={[styles.emptyAction, pressed && styles.pressed]}>
                  {canRequest && <Plus size={17} color={colors.white} />}
                  <Text style={styles.emptyActionLabel}>{canRequest ? "Request a visit" : "View bookings"}</Text>
                  <ArrowRight size={17} color={colors.white} />
                </View>
              )}
            </StyledPressable>
          </>
        )}
      </View>
    )
  }

  const start = bookingStart(booking)
  const scheduledNow = !start.isAfter(now)
  const location = booking.location || booking.siteSnapshot?.name || "Location to be confirmed"

  return (
    <View style={styles.bookingCard}>
      <StyledPressable
        accessibilityRole="button"
        accessibilityLabel={`${booking.title}. ${start.format("dddd, D MMMM YYYY")}, ${booking.startTime} to ${booking.endTime}. ${location}. ${scheduledNow ? "Scheduled now" : "Scheduled"}. View booking details.`}
        onPress={() => router.push({ pathname: "/booking/[id]", params: { id: booking._id } })}
      >
        {({ pressed }) => (
          <View style={pressed && styles.pressed}>
            <View style={styles.bookingMain}>
              <View style={styles.bookingTop}>
                <View style={styles.nextLabel}>
                  <CalendarDays size={14} color="#D4E0D7" />
                  <Text style={styles.nextLabelText}>Next visit</Text>
                </View>
                <View style={styles.status}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>{scheduledNow ? "Scheduled now" : "Scheduled"}</Text>
                </View>
              </View>
              <Text accessibilityRole="header" style={styles.serviceTitle}>{booking.title}</Text>
              <View style={styles.location}>
                <MapPin size={14} color="#D4E0D7" />
                <Text style={styles.locationText} numberOfLines={2}>{location}</Text>
              </View>
            </View>

            <View style={[styles.itinerary, largeText && styles.itineraryStack]}>
              <View style={[styles.dateTile, largeText && { width: 52 * fontScale }]}>
                <Text style={styles.dateDay}>{start.format("D")}</Text>
                <Text style={styles.dateMonth}>{start.format("MMM").toUpperCase()}</Text>
              </View>
              <View style={[styles.itineraryCopy, largeText && styles.itineraryCopyStack]}>
                <Text style={styles.fullDate}>
                  {start.format(start.isSame(now, "year") ? "dddd, D MMMM" : "dddd, D MMM YYYY")}
                </Text>
                <Text style={styles.time}>{booking.startTime} – {booking.endTime}</Text>
                <Text style={styles.detailsLabel}>View booking details</Text>
              </View>
              {!largeText && <View style={styles.detailsArrow}><ChevronRight size={19} color={colors.primary} /></View>}
            </View>
          </View>
        )}
      </StyledPressable>
      {query.isError && (
        <View style={styles.savedNotice}>
          <QueryNotice
            message="Couldn't refresh. Showing saved visit details."
            onRetry={() => { void query.refetch() }}
            busy={query.isFetching}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  bookingCard: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  bookingMain: { backgroundColor: colors.primaryDark, padding: 20 },
  bookingTop: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  nextLabel: { flexDirection: "row", alignItems: "center", gap: 7 },
  nextLabelText: { color: "#D4E0D7", fontSize: 12, lineHeight: 18, fontWeight: "500" },
  status: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, backgroundColor: "#2D5042" },
  statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#C6D9AE" },
  statusText: { color: "#EBF2E5", fontSize: 11, lineHeight: 16, fontWeight: "500" },
  serviceTitle: { color: colors.white, fontSize: 24, lineHeight: 30, letterSpacing: -0.6, fontWeight: "600", marginTop: 16 },
  location: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 8 },
  locationText: { flex: 1, color: "#D4E0D7", fontSize: 13, lineHeight: 19 },
  itinerary: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: colors.surface },
  itineraryStack: { flexDirection: "column", alignItems: "flex-start" },
  dateTile: { width: 52, alignItems: "center", paddingVertical: 8, backgroundColor: colors.primarySoft, borderRadius: 12 },
  dateDay: { color: colors.primaryDark, fontSize: 28, lineHeight: 32, letterSpacing: -1, fontWeight: "600", fontVariant: ["tabular-nums"] },
  dateMonth: { color: colors.primary, fontSize: 11, lineHeight: 15, letterSpacing: 1, fontWeight: "700", marginTop: 2 },
  itineraryCopy: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  itineraryCopyStack: { flexGrow: 0, flexShrink: 0, flexBasis: "auto", width: "100%" },
  fullDate: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  time: { color: colors.ink, fontSize: 15, lineHeight: 22, fontWeight: "600", marginTop: 2, fontVariant: ["tabular-nums"] },
  detailsLabel: { color: colors.primary, fontSize: 12, lineHeight: 18, fontWeight: "500", marginTop: 4 },
  detailsArrow: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.primarySoft },
  savedNotice: { paddingHorizontal: 12, paddingBottom: 12 },
  emptyCard: { gap: 12, padding: 20, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  emptyHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  emptyIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  emptyEyebrow: { color: colors.muted, fontSize: 13, lineHeight: 20, fontWeight: "500" },
  emptyTitle: { color: colors.ink, fontSize: 21, lineHeight: 28, fontWeight: "600", letterSpacing: -0.4 },
  emptyCopy: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  emptyAction: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, marginTop: 4, borderRadius: 14, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", gap: 10 },
  emptyActionLabel: { flex: 1, color: colors.white, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  pressed: { opacity: 0.78 },
  skeletonCard: { minHeight: 224, padding: 20, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  skeletonLine: { height: 12, borderRadius: 5, backgroundColor: colors.surfaceAlt },
  skeletonLabel: { width: "35%" },
  skeletonTitle: { width: "85%", height: 24, marginTop: 24 },
  skeletonLocation: { width: "65%", marginTop: 10 },
  skeletonFooter: { flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: colors.divider, marginTop: 24, paddingTop: 16 },
  skeletonDate: { width: 52, height: 60, borderRadius: 12, backgroundColor: colors.surfaceAlt },
  skeletonCopy: { flex: 1, gap: 10 },
})
