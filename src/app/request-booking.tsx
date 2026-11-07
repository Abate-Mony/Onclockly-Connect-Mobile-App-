import { useMutation, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { Redirect, router, useLocalSearchParams } from "expo-router"
import { ArrowLeft, Info, Plus, Trash2 } from "lucide-react-native"
import { useState } from "react"
import { Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Toast from "react-native-toast-message"
import { DateTimePickerField, DateTimePickerSheet } from "../components/DateTimePicker"
import { pressableFeedback } from "../components/interactiveStyles"
import { StyledPressable as Pressable } from "../components/StyledPressable"
import { useAuth } from "../context/AuthContext"
import { canClient } from "../utils/clientPermissions"
import customFetch from "../utils/customFetch"
import { formatPreferredDate, requestReference } from "../utils/bookingCalendar"
import { calendarDateKey, isCalendarDayBefore } from "../utils/dateTimePicker"
import { colors, radius, shadow, spacing } from "../utils/theme"
import type { CreateBookingRequestInput, CreateBookingRequestResponse, PortalBookingRequest } from "../utils/types"

const MAX_DATES = 10

type Slot = { key: string; date: Date; time: string | null }

let slotSeq = 0
const newSlot = (date: Date): Slot => ({ key: `slot-${slotSeq++}`, date, time: null })

export default function RequestBookingScreen() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { service: prefillService } = useLocalSearchParams<{ service?: string }>()
  const [service, setService] = useState(prefillService ?? "")
  const [slots, setSlots] = useState<Slot[]>(() => [newSlot(dayjs().add(1, "day").toDate())])
  const [picker, setPicker] = useState<{ index: number; mode: "date" | "time" } | null>(null)
  const [notes, setNotes] = useState("")

  function leaveScreen() {
    if (router.canGoBack()) router.back()
    else router.replace("/bookings")
  }

  function showSuccess(requests: PortalBookingRequest[]) {
    if (requests.length > 1) {
      return router.replace({
        pathname: "/booking/booking-confirmation-success",
        params: {
          service: requests[0].service,
          count: String(requests.length),
          date: requests
            .map(r => `${formatPreferredDate(r.preferredDate)}${r.preferredTime ? ` · ${r.preferredTime}` : ""}`)
            .join("\n"),
        },
      })
    }
    const request = requests[0]
    const date = formatPreferredDate(request.preferredDate)
    return router.replace({
      pathname: "/booking/booking-confirmation-success",
      params: {
        // Only a request that has been turned into a job has a booking to open.
        ...(request.convertedJob ? { bookingId: request.convertedJob } : {}),
        requestId: request._id,
        reference: requestReference(request._id),
        service: request.service,
        date: request.preferredTime ? `${date} · ${request.preferredTime}` : date,
      },
    })
  }

  function openPicker(index: number, mode: "date" | "time") {
    Keyboard.dismiss()
    setPicker({ index, mode })
  }

  function updateSlot(index: number, patch: Partial<Omit<Slot, "key">>) {
    setSlots(current => current.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)))
  }

  function addSlot() {
    setSlots(current => {
      if (current.length >= MAX_DATES) return current
      const last = current[current.length - 1]
      return [...current, newSlot(dayjs(last.date).add(1, "day").toDate())]
    })
  }

  function removeSlot(index: number) {
    setSlots(current => (current.length > 1 ? current.filter((_, i) => i !== index) : current))
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const input: CreateBookingRequestInput = {
        service: service.trim(),
        dates: slots.map(slot => ({
          preferredDate: calendarDateKey(slot.date),
          preferredTime: slot.time ?? undefined,
        })),
        notes: notes.trim() || undefined,
      }
      const { data } = await customFetch.post<CreateBookingRequestResponse>("/portal/bookings/requests", input)
      return data.requests?.length ? data.requests : [data.request]
    },
    onSuccess: (requests) => {
      Toast.show({
        type: "success",
        text1: requests.length > 1 ? "Requests sent" : "Request sent",
        text2: requests.length > 1 ? `${requests.length} dates sent for review.` : "We'll be in touch to confirm the details.",
      })
      qc.invalidateQueries({ queryKey: ["portal-booking-requests"] })
      showSuccess(requests)
    },
    onError: (err: any) => Toast.show({ type: "error", text1: "Couldn't send your request", text2: err?.response?.data?.msg }),
  })

  const today = new Date()
  const pastSlots = slots.map(slot => isCalendarDayBefore(slot.date, today))
  const slotKeys = slots.map(slot => `${calendarDateKey(slot.date)}|${slot.time ?? ""}`)
  const duplicateSlots = slotKeys.map((key, i) => slotKeys.indexOf(key) !== i)
  const hasSlotError = pastSlots.some(Boolean) || duplicateSlots.some(Boolean)
  const canSubmit = service.trim().length > 0 && !hasSlotError && !mutation.isPending
  const multiple = slots.length > 1
  const pickerSlot = picker ? slots[picker.index] : undefined

  if (!canClient(user?.clientRole, "booking:create")) return <Redirect href="/" />

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={leaveScreen}
            style={({ pressed }) => [styles.backButton, pressableFeedback(pressed)]}
          >
            <ArrowLeft size={20} color={colors.ink} />
          </Pressable>
          <Text style={styles.title}>Request a booking</Text>
        </View>

        <ScrollView style={styles.flex1} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Text style={styles.label}>What do you need?</Text>
          <TextInput
            accessibilityLabel="What do you need?"
            style={styles.textInput}
            placeholder="e.g. Office cleaning"
            placeholderTextColor={colors.subtle}
            value={service}
            onChangeText={setService}
          />

          <View style={styles.scheduleSection}>
            <Text style={styles.sectionTitle}>{multiple ? `Your preferred visits (${slots.length})` : "Your preferred visit"}</Text>
            <Text style={styles.sectionDescription}>Choose the days and times that work for you. Need more than one visit? Add another date.</Text>
            {slots.map((slot, index) => (
              <View key={slot.key} style={[styles.slot, multiple && styles.slotCard]}>
                {multiple && (
                  <View style={styles.slotHeader}>
                    <View style={styles.slotNumber}>
                      <Text style={styles.slotNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.slotTitle}>Visit {index + 1}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove visit ${index + 1}`}
                      onPress={() => removeSlot(index)}
                      disabled={mutation.isPending}
                      style={({ pressed }) => [styles.slotRemove, pressableFeedback(pressed)]}
                    >
                      <Trash2 size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                )}
                <DateTimePickerField kind="date" label="Preferred date" value={dayjs(slot.date).format("ddd, D MMM YYYY")} onPress={() => openPicker(index, "date")} disabled={mutation.isPending} />
                <DateTimePickerField kind="time" label="Preferred time · optional" value={slot.time ?? "Any time"} onPress={() => openPicker(index, "time")} disabled={mutation.isPending} />
                {pastSlots[index] && <Text accessibilityRole="alert" style={styles.dateError}>Choose today or a future date.</Text>}
                {!pastSlots[index] && duplicateSlots[index] && <Text accessibilityRole="alert" style={styles.dateError}>You’ve already added this date and time.</Text>}
              </View>
            ))}
            {slots.length < MAX_DATES ? (
              <Pressable
                accessibilityRole="button"
                onPress={addSlot}
                disabled={mutation.isPending}
                style={({ pressed }) => [styles.addDateBtn, pressableFeedback(pressed)]}
              >
                <Plus size={17} color={colors.primary} strokeWidth={2.4} />
                <Text style={styles.addDateText}>Add another date</Text>
              </Pressable>
            ) : (
              <Text style={styles.sectionDescription}>You can request up to {MAX_DATES} dates at once.</Text>
            )}
          </View>

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            accessibilityLabel="Booking notes, optional"
            style={[styles.textInput, styles.textArea]}
            placeholder="Anything else that would help us plan this"
            placeholderTextColor={colors.subtle}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />

          <View style={styles.infoBox}>
            <Info size={15} color={colors.info} />
            <Text style={styles.infoText}>This sends a request, not a confirmed booking — our team will review it and reach out to confirm the details.</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.cancelBtn, pressableFeedback(pressed)]} onPress={leaveScreen}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit, busy: mutation.isPending }}
            style={({ pressed }) => [styles.submitBtn, shadow.md, !canSubmit && styles.submitBtnDisabled, pressed && canSubmit && styles.submitBtnPressed]}
            onPress={() => mutation.mutate()}
            disabled={!canSubmit}
          >
            <Text style={styles.submitText}>{mutation.isPending ? "Sending…" : multiple ? `Send ${slots.length} requests` : "Send request"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      {picker && pickerSlot && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPicker(null)}>
          <View style={styles.pickerOverlay}>
            <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={() => setPicker(null)} />
            {picker.mode === "date" ? (
              <DateTimePickerSheet
                mode="date"
                title="Choose a date"
                value={pickerSlot.date}
                minimumDate={new Date()}
                onCancel={() => setPicker(null)}
                onConfirm={date => {
                  updateSlot(picker.index, { date })
                  setPicker(null)
                }}
              />
            ) : (
              <DateTimePickerSheet
                mode="time"
                title="Choose a time"
                value={pickerSlot.time}
                allowAnyTime
                onCancel={() => setPicker(null)}
                onConfirm={time => {
                  updateSlot(picker.index, { time })
                  setPicker(null)
                }}
              />
            )}
          </View>
        </Modal>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  flex1: { flex: 1 },
  pickerOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(16,47,40,0.4)" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { flex: 1, fontSize: 17, fontWeight: "800", color: colors.ink },
  backButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },

  content: { padding: spacing.lg, gap: 4 },

  label: { fontSize: 12, fontWeight: "700", color: colors.inkSoft, marginBottom: 6, marginTop: spacing.md },
  textInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },

  scheduleSection: { marginTop: spacing.xxl, gap: spacing.md },
  sectionTitle: { color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: "600" },
  sectionDescription: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: -6, marginBottom: 4 },
  dateError: { color: colors.danger, fontSize: 13, lineHeight: 20 },
  slot: { gap: spacing.md },
  slotCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  slotHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  slotNumber: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  slotNumberText: { fontSize: 12, fontWeight: "800", color: colors.primary },
  slotTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.ink },
  slotRemove: { minWidth: 40, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: radius.sm },
  addDateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 50,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  addDateText: { fontSize: 14, fontWeight: "700", color: colors.primary },

  infoBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  infoText: { flex: 1, fontSize: 12, color: "#1D4ED8", lineHeight: 17 },

  footer: {
    flexDirection: "row",
    gap: 10,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.canvas,
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: colors.inkSoft },
  submitBtn: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primaryDark,
  },
  submitBtnPressed: { opacity: 0.9 },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { fontSize: 14, fontWeight: "700", color: colors.white },
})
