import { useState } from "react"
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { StyledPressable as Pressable } from "../components/StyledPressable"
import { SafeAreaView } from "react-native-safe-area-context"
import { CalendarCheck2, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react-native"
import { isAxiosError } from "axios"
import Toast from "react-native-toast-message"
import { useAuth } from "../context/AuthContext"
import customFetch from "../utils/customFetch"
import { colors, radius, shadow, spacing } from "../utils/theme"
import type { ClientUser, PortalClient, PortalCompany } from "../utils/types"

interface ClientMobileLoginResponse {
  user: ClientUser
  client: PortalClient
  company: PortalCompany | null
  accessToken: string
  refreshToken: string
}

export default function LoginScreen() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSignIn = async () => {
    if (!email.trim() || !password) return
    setSubmitting(true)
    try {
      const { data } = await customFetch.post<ClientMobileLoginResponse>("/client-auth/mobile-login", {
        email: email.trim().toLowerCase(),
        password,
      })
      await login(data.accessToken, data.refreshToken, data.user, data.client, data.company)
    } catch (err) {
      const message = isAxiosError(err)
        ? err.response?.data?.msg ?? "Couldn't sign in — check your details and try again."
        : "Couldn't sign in — check your details and try again."
      Toast.show({ type: "error", text1: message })
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = !submitting && !!email.trim() && !!password

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandBlock}>
            <View style={[styles.logoMark, shadow.md]}>
              <CalendarCheck2 size={26} color={colors.white} />
            </View>
            <Text style={styles.brandName}>OnClockly</Text>
            <View style={styles.brandPill}>
              <Text style={styles.brandPillText}>CLIENT PORTAL</Text>
            </View>
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to view your bookings, quotes and invoices.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <View style={styles.inputRow}>
                <Mail size={17} color={colors.muted} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@company.com"
                  placeholderTextColor={colors.subtle}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <LockKeyhole size={17} color={colors.muted} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.subtle}
                  secureTextEntry={!showPassword}
                  style={styles.input}
                />
                <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                  {showPassword ? <EyeOff size={17} color={colors.muted} /> : <Eye size={17} color={colors.muted} />}
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleSignIn}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.button,
                shadow.md,
                !canSubmit && styles.buttonDisabled,
                pressed && canSubmit && styles.buttonPressed,
              ]}
            >
              {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Sign in</Text>}
            </Pressable>
          </View>

          <Text style={styles.footnote}>Don&apos;t have an account? Ask the company you work with to invite you.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  flex1: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.xxxl, paddingBottom: spacing.xxl, justifyContent: "center" },

  brandBlock: { alignItems: "center", marginBottom: spacing.xxxl },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  brandName: { fontSize: 22, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  brandPill: {
    marginTop: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  brandPillText: { fontSize: 10, fontWeight: "800", color: colors.primaryDark, letterSpacing: 1 },

  titleBlock: { marginBottom: spacing.xxl },
  title: { fontSize: 30, fontWeight: "800", color: colors.ink, letterSpacing: -0.5 },
  subtitle: { marginTop: 8, fontSize: 14, color: colors.muted, lineHeight: 20 },

  form: { gap: spacing.lg },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: "700", color: colors.inkSoft },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 56,
    backgroundColor: colors.canvas,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  input: { flex: 1, minWidth: 0, fontSize: 15, color: colors.ink, fontWeight: "500" },

  button: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  buttonPressed: { opacity: 0.9 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 16, fontWeight: "700", color: colors.white },

  footnote: { marginTop: spacing.xxxl, fontSize: 12, color: colors.subtle, textAlign: "center", lineHeight: 18 },
})
