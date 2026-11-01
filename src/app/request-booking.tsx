import DateTimePicker from "@react-native-community/datetimepicker"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { router } from "expo-router"
import { CalendarDays, Clock, Info, X } from "lucide-react-native"
import { useState } from "react"
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Toast from "react-native-toast-message"
import { pressableFeedback } from "../components/interactiveStyles"
import { StyledPressable as Pressable } from "../components/StyledPressable"
import customFetch from "../utils/customFetch"
import { colors, radius, shadow, spacing } from "../utils/theme"
import type { CreateBookingRequestInput, PortalBookingRequest } from "../utils/types"

function DateField({ value, onChange }: { value: Date; onChange: (date: Date) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <View style={styles.fieldHalf}>
      <Text style={styles.label}>Preferred date</Text>
      <Pressable style={({ pressed }) => [styles.input, pressableFeedback(pressed)]} onPress={() => setOpen(true)}>
        <CalendarDays size={14} color={colors.muted} />
        <Text style={styles.inputValue}>{dayjs(value).format("D MMM YYYY")}</Text>
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

function TimeField({ value, onChange }: { value: Date | null; onChange: (date: Date) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <View style={styles.fieldHalf}>
      <Text style={styles.label}>Preferred time (optional)</Text>
      <Pressable style={({ pressed }) => [styles.input, pressableFeedback(pressed)]} onPress={() => setOpen(true)}>
        <Clock size={14} color={colors.muted} />
        <Text style={styles.inputValue}>{value ? dayjs(value).format("HH:mm") : "Any time"}</Text>
      </Pressable>

      {open && (
        <DateTimePicker
          value={value ?? dayjs().hour(9).minute(0).toDate()}
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

export default function RequestBookingScreen() {
  const qc = useQueryClient()
  const [service, setService] = useState("")
  const [preferredDate, setPreferredDate] = useState(dayjs().add(1, "day").toDate())
  const [preferredTime, setPreferredTime] = useState<Date | null>(null)
  const [notes, setNotes] = useState("")

  const mutation = useMutation({
    mutationFn: async () => {
      const input: CreateBookingRequestInput = {
        service: service.trim(),
        preferredDate: dayjs(preferredDate).format("YYYY-MM-DD"),
        preferredTime: preferredTime ? dayjs(preferredTime).format("HH:mm") : undefined,
        notes: notes.trim() || undefined,
      }
      const { data } = await customFetch.post<{ request: PortalBookingRequest }>("/portal/bookings/requests", input)
      return data.request
    },
    onSuccess: () => {
      Toast.show({ type: "success", text1: "Request sent", text2: "We'll be in touch to confirm the details." })
      qc.invalidateQueries({ queryKey: ["portal-booking-requests"] })
      router.back()
    },
    onError: (err: any) => Toast.show({ type: "error", text1: "Couldn't send your request", text2: err?.response?.data?.msg }),
  })

  const canSubmit = service.trim().length > 0 && !mutation.isPending

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Request a booking</Text>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.closeBtn, pressableFeedback(pressed)]}>
          <X size={18} color={colors.muted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>What do you need?</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Office cleaning"
          placeholderTextColor={colors.subtle}
          value={service}
          onChangeText={setService}
        />

        <View style={styles.row}>
          <DateField value={preferredDate} onChange={setPreferredDate} />
          <TimeField value={preferredTime} onChange={setPreferredTime} />
        </View>

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
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
        <Pressable style={({ pressed }) => [styles.cancelBtn, pressableFeedback(pressed)]} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.submitBtn, shadow.md, !canSubmit && styles.submitBtnDisabled, pressed && canSubmit && styles.submitBtnPressed]}
          onPress={() => mutation.mutate()}
          disabled={!canSubmit}
        >
          <Text style={styles.submitText}>{mutation.isPending ? "Sending…" : "Send request"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg + 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: "800", color: colors.ink },
  closeBtn: { padding: 4 },

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

  row: { flexDirection: "row", gap: spacing.md },
  fieldHalf: { flex: 1 },
  input: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  inputValue: { fontSize: 13, fontWeight: "600", color: colors.ink },

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
