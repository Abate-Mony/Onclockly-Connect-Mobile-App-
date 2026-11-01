import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import DateTimePicker from "@react-native-community/datetimepicker"
import dayjs from "dayjs"
import { router, useLocalSearchParams } from "expo-router"
import { ArrowLeft, CalendarClock, CalendarDays, CheckCircle2, Clock, MapPin, Receipt, XCircle } from "lucide-react-native"
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { StyledPressable as Pressable } from "../../components/StyledPressable"
import { SafeAreaView } from "react-native-safe-area-context"
import Toast from "react-native-toast-message"
import { LoadingSkeleton, RetryNotice, RetryState } from "../../components/QueryStates"
import { pressableFeedback } from "../../components/interactiveStyles"
import { StatusBadge } from "../../components/StatusBadge"
import { useAuth } from "../../context/AuthContext"
import { colors, radius, shadow, spacing } from "../../utils/theme"
import { canClient } from "../../utils/clientPermissions"
import customFetch from "../../utils/customFetch"
import { formatDate, money } from "../../utils/format"
import type { BookingResponse, JobChangeRequestsResponse } from "../../utils/types"

function ModalDateField({ label, value, onChange }: { label: string; value: Date; onChange: (date: Date) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <View style={styles.modalFieldHalf}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        style={({ pressed }) => [styles.input, pressableFeedback(pressed)]}
        onPress={() => setOpen(true)}
      >
        <View style={styles.inputRow}>
          <CalendarDays size={14} color={colors.muted} />
          <Text style={styles.inputValueText}>{dayjs(value).format("D MMM YYYY")}</Text>
        </View>
      </Pressable>

      {open && (
        <DateTimePicker
          value={value}
          mode="date"
          minimumDate={new Date()}
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(event, selected) => {
            if (Platform.OS === "android") setOpen(false)
            if (event.type === "set" && selected) onChange(selected)
          }}
        />
      )}
    </View>
  )
}

function ModalTimeField({ label, value, onChange }: { label: string; value: Date; onChange: (date: Date) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <View style={styles.modalFieldHalf}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        style={({ pressed }) => [styles.input, pressableFeedback(pressed)]}
        onPress={() => setOpen(true)}
      >
        <View style={styles.inputRow}>
          <Clock size={14} color={colors.muted} />
          <Text style={styles.inputValueText}>{dayjs(value).format("HH:mm")}</Text>
        </View>
      </Pressable>

      {open && (
        <DateTimePicker
          value={value}
          mode="time"
          is24Hour
          minuteInterval={15}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selected) => {
            if (Platform.OS === "android") setOpen(false)
            if (event.type === "set" && selected) onChange(selected)
          }}
        />
      )}
    </View>
  )
}

function RescheduleModal({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [date, setDate] = useState(dayjs().add(1, "day").toDate())
  const [startTime, setStartTime] = useState(dayjs().hour(9).minute(0).toDate())
  const [endTime, setEndTime] = useState(dayjs().hour(11).minute(0).toDate())
  const [reason, setReason] = useState("")

  const mutation = useMutation({
    mutationFn: () =>
      customFetch.post(`/portal/bookings/${bookingId}/reschedule-request`, {
        requestedDate: dayjs(date).format("YYYY-MM-DD"),
        requestedStartTime: dayjs(startTime).format("HH:mm"),
        requestedEndTime: dayjs(endTime).format("HH:mm"),
        reason: reason || undefined,
      }),
    onSuccess: () => {
      Toast.show({ type: "success", text1: "Reschedule requested" })
      qc.invalidateQueries({ queryKey: ["portal-booking-change-requests", bookingId] })
      onClose()
    },
    onError: (err: any) => Toast.show({ type: "error", text1: "Couldn't submit this request", text2: err?.response?.data?.msg }),
  })

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Request reschedule</Text>
          <Text style={styles.modalSubtitle}>Tell us your preferred new date and time.</Text>

          <View style={styles.modalRow}>
            <ModalDateField label="Preferred date" value={date} onChange={setDate} />
          </View>
          <View style={styles.modalRow}>
            <ModalTimeField label="Start time" value={startTime} onChange={setStartTime} />
            <ModalTimeField label="End time" value={endTime} onChange={setEndTime} />
          </View>

          <Text style={styles.fieldLabel}>Reason (optional)</Text>
          <TextInput style={[styles.input, styles.textarea]} multiline value={reason} onChangeText={setReason} />

          <View style={styles.modalActions}>
            <Pressable
              style={({ pressed }) => [styles.modalCancelBtn, pressableFeedback(pressed)]}
              onPress={onClose}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.modalSubmitBtn, pressableFeedback(pressed)]}
              disabled={mutation.isPending}
              onPress={() => mutation.mutate()}
            >
              {mutation.isPending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.modalSubmitText}>Submit request</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function CancelModal({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [reason, setReason] = useState("")

  const mutation = useMutation({
    mutationFn: () => customFetch.post(`/portal/bookings/${bookingId}/cancel-request`, { reason: reason || undefined }),
    onSuccess: () => {
      Toast.show({ type: "success", text1: "Cancellation requested" })
      qc.invalidateQueries({ queryKey: ["portal-booking-change-requests", bookingId] })
      onClose()
    },
    onError: (err: any) => Toast.show({ type: "error", text1: "Couldn't submit this request", text2: err?.response?.data?.msg }),
  })

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Request cancellation</Text>
          <Text style={styles.modalSubtitle}>Your account manager will review this request.</Text>

          <Text style={styles.fieldLabel}>Reason (optional)</Text>
          <TextInput style={[styles.input, styles.textarea]} multiline value={reason} onChangeText={setReason} />

          <View style={styles.modalActions}>
            <Pressable
              style={({ pressed }) => [styles.modalCancelBtn, pressableFeedback(pressed)]}
              onPress={onClose}
            >
              <Text style={styles.modalCancelText}>Back</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.modalDangerBtn, pressableFeedback(pressed)]}
              disabled={mutation.isPending}
              onPress={() => mutation.mutate()}
            >
              {mutation.isPending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.modalSubmitText}>Confirm cancellation</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const qc = useQueryClient()
  const { user } = useAuth()
  const [rescheduling, setRescheduling] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["portal-booking", id],
    queryFn: async () => {
      const { data } = await customFetch.get<BookingResponse>(`/portal/bookings/${id}`)
      return data
    },
    enabled: !!id,
  })
  const { data: changeRequestsData } = useQuery({
    queryKey: ["portal-booking-change-requests", id],
    queryFn: async () => {
      const { data } = await customFetch.get<JobChangeRequestsResponse>(`/portal/bookings/${id}/change-requests`)
      return data
    },
    enabled: !!id,
  })
  const booking = data?.booking

  const withdrawMutation = useMutation({
    mutationFn: (requestId: string) => customFetch.patch(`/portal/change-requests/${requestId}/cancel`),
    onSuccess: () => {
      Toast.show({ type: "success", text1: "Request withdrawn" })
      qc.invalidateQueries({ queryKey: ["portal-booking-change-requests", id] })
    },
    onError: (err: any) => Toast.show({ type: "error", text1: "Couldn't withdraw this request", text2: err?.response?.data?.msg }),
  })

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <LoadingSkeleton rows={3} />
      </SafeAreaView>
    )
  }
  if (!booking) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <RetryState
          title={isError ? "Couldn’t load this booking" : "Booking unavailable"}
          message={isError ? "Check your connection and try again." : "This booking may no longer be available."}
          onRetry={() => { refetch() }}
        />
      </SafeAreaView>
    )
  }

  const pendingRequest = changeRequestsData?.requests.find(r => r.status === "pending")
  const eligible = (booking.status === "draft" || booking.status === "published") && !dayjs(booking.date).isBefore(dayjs(), "day")
  const canReschedule = eligible && canClient(user?.clientRole, "booking:update")
  const canCancel = eligible && canClient(user?.clientRole, "booking:cancel")

  const confirmCancelRequest = () => {
    if (!pendingRequest) return
    Alert.alert("Withdraw request?", undefined, [
      { text: "Keep it", style: "cancel" },
      { text: "Withdraw", style: "destructive", onPress: () => withdrawMutation.mutate(pendingRequest._id) },
    ])
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressableFeedback(pressed)]}>
          <ArrowLeft size={18} color={colors.ink} />
          <Text style={styles.backText}>Bookings</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isError && <RetryNotice onRetry={() => { refetch() }} />}

        <View style={[styles.heroCard, shadow.lg]}>
          <StatusBadge status={booking.status} />
          <Text style={styles.heroTitle}>{booking.title}</Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaItem}>
              <CalendarDays size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroMetaText}>{formatDate(booking.date, "D MMM YYYY")}</Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Clock size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroMetaText}>{booking.startTime}–{booking.endTime}</Text>
            </View>
          </View>
        </View>

        {!pendingRequest && (canReschedule || canCancel) && (
          <View style={styles.actionRow}>
            {canReschedule && (
              <Pressable style={({ pressed }) => [styles.outlineBtn, shadow.sm, pressableFeedback(pressed)]} onPress={() => setRescheduling(true)}>
                <CalendarClock size={14} color={colors.ink} />
                <Text style={styles.outlineBtnText}>Request reschedule</Text>
              </Pressable>
            )}
            {canCancel && (
              <Pressable style={({ pressed }) => [styles.outlineBtn, shadow.sm, pressableFeedback(pressed)]} onPress={() => setCancelling(true)}>
                <XCircle size={14} color={colors.ink} />
                <Text style={styles.outlineBtnText}>Request cancellation</Text>
              </Pressable>
            )}
          </View>
        )}

        {pendingRequest && (
          <View style={[styles.pendingCard, shadow.sm]}>
            <View style={styles.flex1}>
              <Text style={styles.pendingTitle}>
                {pendingRequest.type === "reschedule" ? "Reschedule request pending" : "Cancellation request pending"}
              </Text>
              <Text style={styles.pendingMeta}>
                {pendingRequest.type === "reschedule"
                  ? `Requested ${dayjs(pendingRequest.requestedDate).format("D MMM YYYY")} · ${pendingRequest.requestedStartTime}–${pendingRequest.requestedEndTime}`
                  : "Awaiting staff review."}
              </Text>
            </View>
            <Pressable onPress={confirmCancelRequest} disabled={withdrawMutation.isPending}>
              <Text style={styles.withdrawLink}>Withdraw</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.card, shadow.md]}>
          <Text style={styles.cardTitle}>Service details</Text>
          {!!booking.description && <Text style={styles.description}>{booking.description}</Text>}

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <CalendarDays size={16} color={colors.primaryDark} />
            </View>
            <View>
              <Text style={styles.detailLabel}>Date & time</Text>
              <Text style={styles.detailValue}>{formatDate(booking.date, "D MMM YYYY")} · {booking.startTime}–{booking.endTime}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <MapPin size={16} color={colors.primaryDark} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.detailLabel}>Service site</Text>
              <Text style={styles.detailValue}>{booking.location}</Text>
              {!!booking.address && <Text style={styles.detailSub}>{booking.address}</Text>}
            </View>
          </View>

          {(!!booking.siteSnapshot?.accessInstructions || !!booking.siteSnapshot?.parkingInstructions) && (
            <View style={styles.instructionsBlock}>
              {!!booking.siteSnapshot?.accessInstructions && (
                <View style={styles.flex1}>
                  <Text style={styles.detailLabel}>Access</Text>
                  <Text style={styles.detailValue}>{booking.siteSnapshot.accessInstructions}</Text>
                </View>
              )}
              {!!booking.siteSnapshot?.parkingInstructions && (
                <View style={styles.flex1}>
                  <Text style={styles.detailLabel}>Parking</Text>
                  <Text style={styles.detailValue}>{booking.siteSnapshot.parkingInstructions}</Text>
                </View>
              )}
            </View>
          )}

          {booking.status === "completed" && (
            <View style={styles.completedBanner}>
              <CheckCircle2 size={16} color={colors.primaryDark} />
              <Text style={styles.completedText}>Completed on {formatDate(booking.date, "D MMM YYYY")}</Text>
            </View>
          )}
        </View>

        {booking.chargeAmount != null && booking.chargeType === "fixed" && (
          <View style={[styles.card, shadow.md]}>
            <Text style={styles.cardTitle}>Cost</Text>
            <Text style={styles.costValue}>{money(booking.chargeAmount)}</Text>
          </View>
        )}
        {booking.chargeRate != null && booking.chargeType === "hourly" && (
          <View style={[styles.card, shadow.md]}>
            <Text style={styles.cardTitle}>Rate</Text>
            <Text style={styles.costValue}>{money(booking.chargeRate)}<Text style={styles.costUnit}>/hr</Text></Text>
          </View>
        )}
        {!!booking.invoice && (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.card, shadow.md, pressableFeedback(pressed)]}
            onPress={() => router.push({ pathname: "/invoice/[id]", params: { id: booking.invoice! } })}
          >
            <Text style={styles.cardTitle}>Linked invoice</Text>
            <View style={styles.outlineBtn}>
              <Receipt size={14} color={colors.ink} />
              <Text style={styles.outlineBtnText}>View invoice</Text>
            </View>
          </Pressable>
        )}
      </ScrollView>

      {rescheduling && <RescheduleModal bookingId={id} onClose={() => setRescheduling(false)} />}
      {cancelling && <CancelModal bookingId={id} onClose={() => setCancelling(false)} />}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex1: { flex: 1, minWidth: 0 },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.md },

  topBar: { paddingHorizontal: 12, paddingTop: 4 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 4, alignSelf: "flex-start" },
  backText: { fontSize: 14, fontWeight: "700", color: colors.ink },

  heroCard: { backgroundColor: colors.primaryDark, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.sm },
  heroTitle: { color: colors.white, fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  heroMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: 2 },
  heroMetaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroMetaText: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },

  actionRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  outlineBtn: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    minHeight: 44,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
  },
  outlineBtnText: { fontSize: 12, fontWeight: "700", color: colors.ink },

  pendingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pendingTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  pendingMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  withdrawLink: { fontSize: 12, fontWeight: "700", color: colors.ink },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: colors.ink, marginBottom: 10 },
  description: { fontSize: 13, color: colors.inkSoft, lineHeight: 19, marginBottom: spacing.md },

  detailRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, alignItems: "flex-start" },
  detailIcon: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  detailLabel: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  detailValue: { fontSize: 13, fontWeight: "700", color: colors.ink, marginTop: 2 },
  detailSub: { fontSize: 12, color: colors.muted, marginTop: 2 },

  instructionsBlock: { flexDirection: "row", gap: 16, marginTop: 4, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },

  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    padding: 10,
    marginTop: 8,
  },
  completedText: { fontSize: 12, color: colors.primaryDark, fontWeight: "700" },

  costValue: { fontSize: 24, fontWeight: "800", color: colors.ink },
  costUnit: { fontSize: 13, fontWeight: "500", color: colors.muted },

  modalOverlay: { flex: 1, backgroundColor: "rgba(11,18,32,0.55)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: 32 },
  modalHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.ink },
  modalSubtitle: { fontSize: 12, color: colors.muted, marginTop: 4, marginBottom: spacing.lg },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.inkSoft, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  modalRow: { flexDirection: "row", gap: 10 },
  modalFieldHalf: { flex: 1 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  inputValueText: { fontSize: 13, fontWeight: "600", color: colors.ink },
  textarea: { minHeight: 70, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancelBtn: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas, borderRadius: radius.md, paddingVertical: 12 },
  modalCancelText: { fontSize: 13, fontWeight: "700", color: colors.inkSoft },
  modalSubmitBtn: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryDark, borderRadius: radius.md, paddingVertical: 12 },
  modalDangerBtn: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center", backgroundColor: colors.danger, borderRadius: radius.md, paddingVertical: 12 },
  modalSubmitText: { fontSize: 13, fontWeight: "700", color: colors.white },
})
