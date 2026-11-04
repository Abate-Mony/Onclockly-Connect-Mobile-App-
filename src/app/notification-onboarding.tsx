import { useState } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Bell, CalendarClock, FileCheck2, Receipt } from "lucide-react-native"
import { StyledPressable as Pressable } from "../components/StyledPressable"
import { useAuth } from "../context/AuthContext"
import { enableClientPush } from "../utils/clientPush"
import { colors, radius, shadow, spacing } from "../utils/theme"

const BENEFITS = [
  { Icon: CalendarClock, text: "Know the moment a booking is approved or rescheduled" },
  { Icon: FileCheck2, text: "Get notified when a new quote is ready to review" },
  { Icon: Receipt, text: "See invoices as soon as they're sent to you" },
]

export default function NotificationOnboardingScreen() {
  const { completeNotificationOnboarding } = useAuth()
  const [enabling, setEnabling] = useState(false)

  async function enable() {
    setEnabling(true)
    try {
      await enableClientPush()
    } finally {
      setEnabling(false)
      completeNotificationOnboarding()
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.top}>
          <View style={[styles.iconMark, shadow.md]}>
            <Bell size={30} color={colors.white} />
          </View>
          <Text style={styles.title}>Stay up to date</Text>
          <Text style={styles.subtitle}>Turn on notifications so you never miss an update about your bookings.</Text>

          <View style={styles.benefits}>
            {BENEFITS.map(({ Icon, text }) => (
              <View key={text} style={styles.benefitRow}>
                <View style={styles.benefitIcon}><Icon size={18} color={colors.primary} strokeWidth={1.8} /></View>
                <Text style={styles.benefitText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: enabling, busy: enabling }}
            disabled={enabling}
            onPress={() => { void enable() }}
            style={({ pressed }) => [styles.button, shadow.md, pressed && styles.buttonPressed, enabling && styles.buttonDisabled]}
          >
            {enabling ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Enable notifications</Text>}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={enabling}
            onPress={() => completeNotificationOnboarding()}
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
          >
            <Text style={styles.skipText}>Maybe later</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { flex: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.xxxl, paddingBottom: spacing.xxl, justifyContent: "space-between" },
  top: { alignItems: "center" },
  iconMark: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: { fontSize: 26, fontWeight: "800", color: colors.ink, letterSpacing: -0.5, textAlign: "center" },
  subtitle: { marginTop: 10, fontSize: 14, lineHeight: 21, color: colors.muted, textAlign: "center", maxWidth: 320 },
  benefits: { marginTop: spacing.xxxl, width: "100%", gap: spacing.lg },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  benefitIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  benefitText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.inkSoft, fontWeight: "500" },
  actions: { gap: spacing.md },
  button: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radius.md,
  },
  buttonPressed: { opacity: 0.9 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: 16, fontWeight: "700", color: colors.white },
  skipButton: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.6 },
  skipText: { fontSize: 14, fontWeight: "600", color: colors.muted },
})
