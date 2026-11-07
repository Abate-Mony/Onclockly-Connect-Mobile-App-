import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { router, useLocalSearchParams } from "expo-router"
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Hash,
  MessageSquareText,
  Repeat,
  Send,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react-native"
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import Toast from "react-native-toast-message"
import { pressableFeedback } from "../../../components/interactiveStyles"
import { LoadingSkeleton, RetryNotice, RetryState } from "../../../components/QueryStates"
import { StatusBadge } from "../../../components/StatusBadge"
import { StyledPressable as Pressable } from "../../../components/StyledPressable"
import { formatPreferredDate, requestReference } from "../../../utils/bookingCalendar"
import customFetch from "../../../utils/customFetch"
import { colors, radius, shadow, spacing } from "../../../utils/theme"
import type {
  BookingRequestsResponse,
  BookingRequestStatus,
  PortalBookingRequest,
} from "../../../utils/types"

type StepState = "done" | "current" | "upcoming" | "failed"

function timelineFor(request: PortalBookingRequest) {
  const outcome: Record<BookingRequestStatus, { label: string; state: StepState }> = {
    pending: { label: "Booking confirmed", state: "upcoming" },
    approved: { label: "Booking confirmed", state: "done" },
    declined: { label: "Request declined", state: "failed" },
    cancelled: { label: "Request cancelled", state: "failed" },
  }
  return [
    { label: "Request sent", sub: dayjs(request.createdAt).format("D MMM YYYY, h:mm A"), state: "done" as StepState },
    {
      label: "Under review",
      sub: request.status === "pending" ? "Our team is checking availability" : undefined,
      state: (request.status === "pending" ? "current" : "done") as StepState,
    },
    { ...outcome[request.status], sub: undefined },
  ]
}

export default function BookingRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const qc = useQueryClient()
  const insets = useSafeAreaInsets()

  const { data: request, isLoading, isError, refetch } = useQuery({
    queryKey: ["portal-booking-request", id],
    queryFn: async () => {
      const { data } = await customFetch.get<{ request: PortalBookingRequest }>(
        `/portal/bookings/requests/${id}`,
      )
      return data.request
    },
    enabled: !!id,
  })

  // Same query (and shape) as the bookings tab, so it's usually already cached.
  const { data: allRequests } = useQuery({
    queryKey: ["portal-booking-requests"],
    queryFn: async () => {
      const { data } = await customFetch.get<BookingRequestsResponse>("/portal/bookings/requests")
      return data
    },
    enabled: !!request?.batch,
  })
  const siblings = request?.batch
    ? (allRequests?.requests ?? [])
        .filter(r => r.batch === request.batch && r._id !== request._id)
        .sort((a, b) => a.preferredDate.localeCompare(b.preferredDate))
    : []

  const cancelMutation = useMutation({
    mutationFn: () => customFetch.patch(`/portal/bookings/requests/${id}/cancel`),
    onSuccess: () => {
      Toast.show({ type: "success", text1: "Request cancelled" })
      qc.invalidateQueries({ queryKey: ["portal-booking-request", id] })
      qc.invalidateQueries({ queryKey: ["portal-booking-requests"] })
    },
    onError: (err: any) =>
      Toast.show({
        type: "error",
        text1: "Couldn't cancel this request",
        text2: err?.response?.data?.msg,
      }),
  })

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/bookings"))

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <LoadingSkeleton rows={3} />
      </SafeAreaView>
    )
  }
  if (!request) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <RetryState
          title={isError ? "Couldn’t load this request" : "Request unavailable"}
          message={
            isError
              ? "Check your connection and try again."
              : "This booking request may no longer be available."
          }
          onRetry={() => {
            refetch()
          }}
        />
      </SafeAreaView>
    )
  }

  const confirmCancel = () =>
    Alert.alert("Cancel this request?", "We’ll stop reviewing it. You can always send a new one.", [
      { text: "Keep it", style: "cancel" },
      { text: "Cancel request", style: "destructive", onPress: () => cancelMutation.mutate() },
    ])

  const details: { label: string; value: string; icon: LucideIcon }[] = [
    { label: "Service", value: request.service, icon: Sparkles },
    { label: "Preferred date", value: formatPreferredDate(request.preferredDate), icon: CalendarDays },
    { label: "Preferred time", value: request.preferredTime || "Any time", icon: Clock },
    { label: "Reference", value: requestReference(request._id), icon: Hash },
  ]

  const showActions =
    request.status === "pending" ||
    (request.status === "approved" && !!request.convertedJob) ||
    request.status === "declined" ||
    request.status === "cancelled"

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          onPress={goBack}
          style={({ pressed }) => [styles.backBtn, pressableFeedback(pressed)]}
        >
          <ArrowLeft size={18} color={colors.ink} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isError && (
          <RetryNotice
            onRetry={() => {
              refetch()
            }}
          />
        )}

        {/* Hero */}
        <View style={[styles.heroCard, shadow.lg]}>
          <View style={styles.heroTop}>
            <Text style={styles.heroEyebrow}>BOOKING REQUEST</Text>
            <StatusBadge status={request.status} />
          </View>
          <Text accessibilityRole="header" style={styles.heroTitle}>
            {request.service}
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaItem}>
              <CalendarDays size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroMetaText}>{formatPreferredDate(request.preferredDate)}</Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Clock size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroMetaText}>{request.preferredTime || "Any time"}</Text>
            </View>
          </View>
        </View>

        {/* Team response */}
        {!!request.reviewNotes && (
          <View
            style={[
              styles.noteCard,
              request.status === "declined" ? styles.noteCardDeclined : styles.noteCardNeutral,
            ]}
          >
            <MessageSquareText
              size={18}
              color={request.status === "declined" ? colors.danger : colors.primary}
            />
            <View style={styles.flex1}>
              <Text style={styles.noteTitle}>Message from our team</Text>
              <Text style={styles.noteBody}>{request.reviewNotes}</Text>
            </View>
          </View>
        )}

        {/* Progress */}
        <View style={[styles.card, shadow.sm]}>
          <Text style={styles.cardTitle}>Progress</Text>
          {timelineFor(request).map((step, index, steps) => (
            <View key={step.label} style={styles.stepRow}>
              <View style={styles.stepRail}>
                <View
                  style={[
                    styles.stepDot,
                    step.state === "done" && styles.stepDotDone,
                    step.state === "current" && styles.stepDotCurrent,
                    step.state === "failed" && styles.stepDotFailed,
                  ]}
                >
                  {step.state === "done" && <Check size={12} color={colors.white} strokeWidth={3} />}
                  {step.state === "failed" && <X size={12} color={colors.white} strokeWidth={3} />}
                  {step.state === "current" && <View style={styles.stepPulse} />}
                </View>
                {index < steps.length - 1 && (
                  <View style={[styles.stepLine, step.state === "done" && styles.stepLineDone]} />
                )}
              </View>
              <View style={styles.stepBody}>
                <Text
                  style={[styles.stepLabel, step.state === "upcoming" && styles.stepLabelUpcoming]}
                >
                  {step.label}
                </Text>
                {!!step.sub && <Text style={styles.stepSub}>{step.sub}</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Details */}
        <View style={[styles.card, shadow.sm]}>
          <Text style={styles.cardTitle}>Request details</Text>
          {details.map((detail, index) => {
            const Icon = detail.icon
            return (
              <View
                key={detail.label}
                style={[styles.detailRow, index > 0 && styles.detailRowBorder]}
              >
                <View style={styles.detailIcon}>
                  <Icon size={16} color={colors.primary} strokeWidth={1.9} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.detailLabel}>{detail.label}</Text>
                  <Text style={styles.detailValue} selectable>
                    {detail.value}
                  </Text>
                </View>
              </View>
            )
          })}
          {!!request.notes && (
            <View style={styles.notesBlock}>
              <Text style={styles.detailLabel}>Your notes</Text>
              <Text style={styles.notesText}>{request.notes}</Text>
            </View>
          )}
        </View>

        {siblings.length > 0 && (
          <View style={[styles.card, shadow.sm]}>
            <Text style={styles.cardTitle}>Other dates in this request</Text>
            {siblings.map((sibling, index) => (
              <Pressable
                key={sibling._id}
                accessibilityRole="button"
                accessibilityLabel={`View request for ${formatPreferredDate(sibling.preferredDate)}`}
                onPress={() =>
                  router.push({ pathname: "/booking/request/[id]", params: { id: sibling._id } })
                }
                style={({ pressed }) => [
                  styles.siblingRow,
                  index > 0 && styles.detailRowBorder,
                  pressableFeedback(pressed),
                ]}
              >
                <View style={styles.flex1}>
                  <Text style={styles.detailValue}>
                    {formatPreferredDate(sibling.preferredDate)}
                  </Text>
                  <Text style={styles.detailLabel}>{sibling.preferredTime || "Any time"}</Text>
                </View>
                <StatusBadge status={sibling.status} />
                <ChevronRight size={16} color={colors.subtle} />
              </Pressable>
            ))}
          </View>
        )}

        {request.status === "pending" && (
          <View style={styles.infoRow}>
            <Send size={14} color={colors.muted} />
            <Text style={styles.infoText}>
              We’ll let you know as soon as your booking is confirmed.
            </Text>
          </View>
        )}
      </ScrollView>

      {showActions && (
        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          {request.status === "approved" && !!request.convertedJob && (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/booking/[id]",
                  params: { id: request.convertedJob as string },
                })
              }
              style={({ pressed }) => [styles.primaryButton, pressableFeedback(pressed)]}
            >
              <Text style={styles.primaryButtonText}>View booking</Text>
              <ArrowRight size={18} color={colors.white} strokeWidth={2.2} />
            </Pressable>
          )}
          {(request.status === "declined" || request.status === "cancelled") && (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: "/request-booking", params: { service: request.service } })
              }
              style={({ pressed }) => [styles.primaryButton, pressableFeedback(pressed)]}
            >
              <Repeat size={17} color={colors.white} strokeWidth={2.2} />
              <Text style={styles.primaryButtonText}>Request again</Text>
            </Pressable>
          )}
          {request.status === "pending" && (
            <Pressable
              accessibilityRole="button"
              onPress={confirmCancel}
              disabled={cancelMutation.isPending}
              accessibilityState={{ busy: cancelMutation.isPending }}
              style={({ pressed }) => [styles.dangerButton, pressableFeedback(pressed)]}
            >
              <Text style={styles.dangerButtonText}>
                {cancelMutation.isPending ? "Cancelling…" : "Cancel request"}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </SafeAreaView>
  )
}

const DOT = 22

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex1: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.md },

  topBar: { paddingHorizontal: 12, paddingTop: 4 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignSelf: "flex-start",
  },
  backText: { fontSize: 14, fontWeight: "700", color: colors.ink },

  heroCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroEyebrow: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  heroTitle: { color: colors.white, fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  heroMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: 2 },
  heroMetaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroMetaText: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },

  noteCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  noteCardDeclined: { backgroundColor: colors.dangerSoft, borderColor: "#F7D4D4" },
  noteCardNeutral: { backgroundColor: colors.primarySoft, borderColor: colors.border },
  noteTitle: { fontSize: 13, fontWeight: "800", color: colors.ink },
  noteBody: { fontSize: 13, lineHeight: 19, color: colors.inkSoft, marginTop: 2 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: colors.ink, marginBottom: spacing.md },

  stepRow: { flexDirection: "row", gap: spacing.md },
  stepRail: { alignItems: "center", width: DOT },
  stepDot: {
    width: DOT,
    height: DOT,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  stepDotDone: { backgroundColor: colors.success, borderColor: colors.success },
  stepDotCurrent: { backgroundColor: colors.warningSoft, borderColor: colors.warning },
  stepDotFailed: { backgroundColor: colors.danger, borderColor: colors.danger },
  stepPulse: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.warning },
  stepLine: { flex: 1, width: 2, minHeight: 18, marginVertical: 3, backgroundColor: colors.border },
  stepLineDone: { backgroundColor: colors.success },
  stepBody: { flex: 1, paddingBottom: spacing.lg, paddingTop: 1 },
  stepLabel: { fontSize: 14, fontWeight: "700", color: colors.ink },
  stepLabelUpcoming: { color: colors.subtle },
  stepSub: { fontSize: 12, color: colors.muted, marginTop: 2 },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  detailRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  detailValue: { fontSize: 14, fontWeight: "700", color: colors.ink, marginTop: 2 },
  siblingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  notesBlock: {
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  notesText: { fontSize: 13, lineHeight: 19, color: colors.inkSoft, marginTop: 4 },

  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: 4 },
  infoText: { flex: 1, fontSize: 12, color: colors.muted, lineHeight: 17 },

  actions: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.canvas,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  primaryButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  dangerButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#F3C6C6",
    backgroundColor: colors.surface,
  },
  dangerButtonText: { color: colors.danger, fontSize: 14, fontWeight: "700" },
})
