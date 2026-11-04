import { useMutation, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { Redirect, router, useLocalSearchParams } from "expo-router"
import { ArrowLeft, Info } from "lucide-react-native"
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
import { calendarDateKey, isCalendarDayBefore } from "../utils/dateTimePicker"
import { colors, radius, shadow, spacing } from "../utils/theme"
import type { CreateBookingRequestInput, PortalBookingRequest } from "../utils/types"

export default function RequestBookingScreen() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { service: prefillService } = useLocalSearchParams<{ service?: string }>()
  const [service, setService] = useState(prefillService ?? "")
  const [preferredDate, setPreferredDate] = useState(dayjs().add(1, "day").toDate())
  const [preferredTime, setPreferredTime] = useState<string | null>(null)
  const [picker, setPicker] = useState<"date" | "time" | null>(null)
  const [notes, setNotes] = useState("")

  function leaveScreen() {
    if (router.canGoBack()) router.back()
    else router.replace("/bookings")
  }

  function openPicker(mode: "date" | "time") {
    Keyboard.dismiss()
    setPicker(mode)
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const input: CreateBookingRequestInput = {
        service: service.trim(),
        preferredDate: calendarDateKey(preferredDate),
        preferredTime: preferredTime ?? undefined,
        notes: notes.trim() || undefined,
      }
      const { data } = await customFetch.post<{ request: PortalBookingRequest }>("/portal/bookings/requests", input)
      return data.request
    },
    onSuccess: () => {
      Toast.show({ type: "success", text1: "Request sent", text2: "We'll be in touch to confirm the details." })
      qc.invalidateQueries({ queryKey: ["portal-booking-requests"] })
      leaveScreen()
    },
    onError: (err: any) => Toast.show({ type: "error", text1: "Couldn't send your request", text2: err?.response?.data?.msg }),
  })

  const dateIsPast = isCalendarDayBefore(preferredDate, new Date())
  const canSubmit = service.trim().length > 0 && !dateIsPast && !mutation.isPending

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
            <Text style={styles.sectionTitle}>Your preferred visit</Text>
            <Text style={styles.sectionDescription}>Choose a day and a time that work for you.</Text>
            <DateTimePickerField kind="date" label="Preferred date" value={dayjs(preferredDate).format("ddd, D MMM YYYY")} onPress={() => openPicker("date")} disabled={mutation.isPending} />
            <DateTimePickerField kind="time" label="Preferred time · optional" value={preferredTime ?? "Any time"} onPress={() => openPicker("time")} disabled={mutation.isPending} />
            {dateIsPast && <Text accessibilityRole="alert" style={styles.dateError}>Choose today or a future date.</Text>}
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
            <Text style={styles.submitText}>{mutation.isPending ? "Sending…" : "Send request"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      {picker && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPicker(null)}>
          <View style={styles.pickerOverlay}>
            <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={() => setPicker(null)} />
            {picker === "date" ? (
              <DateTimePickerSheet
                mode="date"
                title="Choose a date"
                value={preferredDate}
                minimumDate={new Date()}
                onCancel={() => setPicker(null)}
                onConfirm={date => {
                  setPreferredDate(date)
                  setPicker(null)
                }}
              />
            ) : (
              <DateTimePickerSheet
                mode="time"
                title="Choose a time"
                value={preferredTime}
                allowAnyTime
                onCancel={() => setPicker(null)}
                onConfirm={time => {
                  setPreferredTime(time)
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
