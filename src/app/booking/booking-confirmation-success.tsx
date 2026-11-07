import { useLocalSearchParams, useRouter } from "expo-router"
import {
  ArrowRight,
  CalendarDays,
  Check,
  Hash,
  Info,
  Sparkles,
  type LucideIcon,
} from "lucide-react-native"
import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native"
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { pressableFeedback } from "../../components/interactiveStyles"
import { StyledPressable as Pressable } from "../../components/StyledPressable"
import { colors, radius, shadow, spacing } from "../../utils/theme"

type Detail = { label: string; value: string; icon: LucideIcon }

export default function BookingConfirmationSuccess() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { bookingId, requestId, reference, service, date, count } = useLocalSearchParams<{
    bookingId?: string
    requestId?: string
    count?: string
    reference?: string
    service?: string
    date?: string
  }>()

  const bookingRef = reference || bookingId
  // A booking ID only exists once the request has been approved and turned into
  // a job. Until then this screen celebrates a sent request, not a booking.
  const confirmed = Boolean(bookingId)
  const dateCount = Number(count) || 1
  const multiple = dateCount > 1
  const copy = confirmed
    ? {
        eyebrow: "BOOKING CONFIRMED",
        title: "You’re all booked!",
        subtitle: "We’ve saved your spot. Here’s everything you need for your appointment.",
        status: "Confirmed",
        footer: "You can manage this appointment anytime from your bookings.",
        primary: "View booking",
        secondary: "Go to all bookings",
      }
    : {
        eyebrow: multiple ? `${dateCount} REQUESTS SENT` : "REQUEST SENT",
        title: multiple ? "Requests sent!" : "Request sent!",
        subtitle: multiple
          ? `We’ve received your request for ${dateCount} dates. Each one is reviewed separately, and we’ll be in touch to confirm.`
          : "We’ve received your booking request and will be in touch to confirm the details.",
        status: "Pending",
        footer: multiple
          ? "We’ll let you know as each date is confirmed."
          : "We’ll let you know as soon as your booking is confirmed.",
        primary: requestId ? "View request" : "View my requests",
        secondary: "Back to home",
      }

  const viewBooking = () => {
    if (bookingId) {
      router.push({ pathname: "/booking/[id]", params: { id: bookingId } })
    } else if (requestId) {
      // Replace so Back from the request goes to where the user came from, not here.
      router.replace({ pathname: "/booking/request/[id]", params: { id: requestId } })
    } else {
      router.push("/bookings")
    }
  }

  const details = (
    [
      { label: "Service", value: service, icon: Sparkles },
      { label: multiple ? `Dates (${dateCount})` : "Date & time", value: date, icon: CalendarDays },
      { label: "Reference", value: bookingRef, icon: Hash },
    ] as { label: string; value?: string; icon: LucideIcon }[]
  ).filter((detail): detail is Detail => Boolean(detail.value))

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top + spacing.xxxl }]}>
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />

          <Animated.View entering={ZoomIn.duration(450).springify()} style={styles.ringOuter}>
            <View style={styles.ringInner}>
              <View style={styles.checkCircle}>
                <Check size={32} color={colors.primary} strokeWidth={3.2} />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.heroText}>
            <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
            <Text accessibilityRole="header" style={styles.title}>
              {copy.title}
            </Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </Animated.View>
        </View>

        {/* Ticket card */}
        <View style={styles.ticketWrapper}>
          <Animated.View
            entering={FadeInDown.delay(280).duration(450)}
            style={[styles.ticket, shadow.lg]}
          >
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketTitle}>Booking details</Text>
              <View style={[styles.statusChip, !confirmed && styles.statusChipPending]}>
                <View style={[styles.statusDot, !confirmed && styles.statusDotPending]} />
                <Text style={[styles.statusText, !confirmed && styles.statusTextPending]}>
                  {copy.status}
                </Text>
              </View>
            </View>

            {details.length > 0 ? (
              details.map((detail, index) => {
                const Icon = detail.icon
                return (
                  <View
                    key={detail.label}
                    style={[styles.detailRow, index > 0 && styles.detailRowBorder]}
                  >
                    <View style={styles.detailIcon}>
                      <Icon size={18} color={colors.primary} strokeWidth={1.9} />
                    </View>
                    <View style={styles.detailBody}>
                      <Text style={styles.detailLabel}>{detail.label}</Text>
                      <Text
                        style={[styles.detailValue, detail.icon === Hash && styles.detailValueMono]}
                        selectable
                      >
                        {detail.value}
                      </Text>
                    </View>
                  </View>
                )
              })
            ) : (
              <View style={styles.emptyDetails}>
                <CalendarDays size={22} color={colors.subtle} strokeWidth={1.8} />
                <Text style={styles.emptyDetailsText}>
                  Your details will appear in your bookings shortly.
                </Text>
              </View>
            )}

            {/* Perforation */}
            <View style={styles.perforation}>
              <View style={[styles.notch, styles.notchLeft]} />
              <View style={styles.dashes} />
              <View style={[styles.notch, styles.notchRight]} />
            </View>

            <View style={styles.ticketFooter}>
              <Info size={16} color={colors.muted} strokeWidth={1.9} />
              <Text style={styles.ticketFooterText}>{copy.footer}</Text>
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Sticky actions */}
      <Animated.View
        entering={FadeInDown.delay(400).duration(400)}
        style={[styles.actions, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={viewBooking}
          style={({ pressed }) => [styles.primaryButton, pressableFeedback(pressed)]}
        >
          <Text style={styles.primaryButtonText}>{copy.primary}</Text>
          <ArrowRight size={18} color={colors.white} strokeWidth={2.2} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace(confirmed ? "/bookings" : "/")}
          style={({ pressed }) => [styles.secondaryButton, pressableFeedback(pressed)]}
        >
          <Text style={styles.secondaryButtonText}>{copy.secondary}</Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}

const NOTCH = 22

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xxxl },

  // Hero
  hero: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: 88,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: radius.xl + 8,
    borderBottomRightRadius: radius.xl + 8,
    overflow: "hidden",
  },
  heroGlowLarge: {
    position: "absolute",
    top: -120,
    right: -90,
    width: 280,
    height: 280,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  heroGlowSmall: {
    position: "absolute",
    bottom: -60,
    left: -50,
    width: 170,
    height: 170,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  ringOuter: {
    width: 124,
    height: 124,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  ringInner: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  checkCircle: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  heroText: { alignItems: "center", marginTop: spacing.xxl, maxWidth: 360 },
  eyebrow: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: {
    marginTop: spacing.sm,
    color: colors.white,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -0.6,
    textAlign: "center",
  },
  subtitle: {
    marginTop: spacing.sm,
    color: "rgba(255,255,255,0.78)",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },

  // Ticket
  ticket: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  ticketWrapper: { marginTop: -64, paddingHorizontal: spacing.xl },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  ticketTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },
  statusText: { color: colors.success, fontSize: 12, fontWeight: "700" },
  statusChipPending: { backgroundColor: colors.warningSoft },
  statusDotPending: { backgroundColor: colors.warning },
  statusTextPending: { color: colors.warning },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
  },
  detailRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  detailIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  detailBody: { flex: 1 },
  detailLabel: { color: colors.subtle, fontSize: 12, fontWeight: "600" },
  detailValue: {
    marginTop: 2,
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
  },
  detailValueMono: { fontVariant: ["tabular-nums"], letterSpacing: 0.6 },

  emptyDetails: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyDetailsText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },

  perforation: {
    height: NOTCH,
    marginHorizontal: -spacing.xl,
    marginTop: spacing.sm,
    justifyContent: "center",
  },
  dashes: {
    marginHorizontal: NOTCH / 2 + spacing.sm,
    borderTopWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  notch: {
    position: "absolute",
    width: NOTCH,
    height: NOTCH,
    borderRadius: radius.pill,
    backgroundColor: colors.canvas,
  },
  notchLeft: { left: -NOTCH / 2 },
  notchRight: { right: -NOTCH / 2 },

  ticketFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  ticketFooterText: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },

  // Actions
  actions: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    backgroundColor: colors.canvas,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  primaryButton: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  secondaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
  },
})
