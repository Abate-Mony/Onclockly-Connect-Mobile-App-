import { useQuery } from "@tanstack/react-query"
import { Building2, CircleHelp, LogOut, Mail, ShieldCheck } from "lucide-react-native"
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native"
import { StyledPressable as Pressable } from "../../components/StyledPressable"
import { SafeAreaView } from "react-native-safe-area-context"
import { Avatar } from "../../components/Avatar"
import { pressableFeedback } from "../../components/interactiveStyles"
import { useAuth } from "../../context/AuthContext"
import { useTabBarClearance } from "../../hooks/useTabBarClearance"
import { colors, radius, shadow, spacing } from "../../utils/theme"
import customFetch from "../../utils/customFetch"
import { CLIENT_ROLE_LABELS, type PortalMeResponse } from "../../utils/types"

export default function ProfileScreen() {
  const { user, logout } = useAuth()
  const tabBarClearance = useTabBarClearance()

  const { data, isError, refetch } = useQuery({
    queryKey: ["portal-me"],
    queryFn: async () => {
      const { data } = await customFetch.get<PortalMeResponse>("/portal/me")
      return data
    },
  })

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Do you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ])
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Your details and account information.</Text>
        </View>

        <View style={[styles.identityCard, shadow.lg]}>
          <Avatar name={user?.fullname ?? "Client"} photoUrl={user?.profilePhoto?.url} size={56} tone="dark" />
          <View style={styles.identityCopy}>
            <Text style={styles.name} numberOfLines={2}>{user?.fullname || "Your profile"}</Text>
            <Text style={styles.role}>
              {user?.clientRole ? CLIENT_ROLE_LABELS[user.clientRole] : "Client"}
            </Text>
          </View>
          <ShieldCheck size={20} color="rgba(255,255,255,0.5)" />
        </View>

        {isError && (
          <View style={styles.errorNotice}>
            <Text style={styles.errorText}>Couldn’t load your account details.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => { refetch() }}
              style={({ pressed }) => [styles.retryButton, pressableFeedback(pressed)]}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.detailsCard, shadow.md]}>
          <Text style={styles.cardTitle}>Account details</Text>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Mail size={17} color={colors.primaryDark} />
            </View>
            <View style={styles.detailCopy}>
              <Text style={styles.fieldLabel}>Email address</Text>
              <Text style={styles.fieldValue} numberOfLines={2}>{user?.email ?? "—"}</Text>
            </View>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Building2 size={17} color={colors.primaryDark} />
            </View>
            <View style={styles.detailCopy}>
              <Text style={styles.fieldLabel}>Account</Text>
              <Text style={styles.fieldValue}>{data?.client?.name ?? "—"}</Text>
            </View>
          </View>
          {data?.company && (
            <>
              <View style={styles.rowDivider} />
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Building2 size={17} color={colors.primaryDark} />
                </View>
                <View style={styles.detailCopy}>
                  <Text style={styles.fieldLabel}>Service provider</Text>
                  <Text style={styles.fieldValue}>{data.company.name}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        <View style={[styles.helpCard, shadow.sm]}>
          <View style={styles.helpIcon}>
            <CircleHelp size={18} color={colors.primaryDark} />
          </View>
          <View style={styles.helpCopy}>
            <Text style={styles.helpTitle}>Need to update your details?</Text>
            <Text style={styles.helpText}>
              Contact your service provider to change your account information. Use “Forgot password” on sign-in to reset your password.
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOutRow, shadow.sm, pressableFeedback(pressed)]}
        >
          <View style={styles.signOutIcon}>
            <LogOut size={17} color={colors.danger} />
          </View>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.lg },

  header: { marginBottom: 2 },
  eyebrow: { color: colors.subtle, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  title: { marginTop: 5, fontSize: 30, fontWeight: "800", color: colors.ink, letterSpacing: -0.5 },
  subtitle: { marginTop: 5, fontSize: 13, lineHeight: 19, color: colors.muted },

  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
  },
  identityCopy: { flex: 1, minWidth: 0 },
  name: { color: colors.white, fontSize: 18, fontWeight: "800", lineHeight: 24 },
  role: { marginTop: 4, color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "700" },

  detailsCard: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 5,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  cardTitle: { marginBottom: 4, color: colors.ink, fontSize: 15, fontWeight: "800" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 13 },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  detailCopy: { flex: 1, minWidth: 0 },
  fieldLabel: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  fieldValue: { marginTop: 3, color: colors.ink, fontSize: 13, fontWeight: "700" },
  rowDivider: { height: 1, backgroundColor: colors.divider },

  helpCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
  },
  helpIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  helpCopy: { flex: 1, minWidth: 0 },
  helpTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  helpText: { marginTop: 5, color: colors.inkSoft, fontSize: 11, lineHeight: 17 },

  errorNotice: { flexDirection: "row", alignItems: "center", gap: 8, padding: spacing.md, backgroundColor: colors.dangerSoft, borderRadius: radius.md },
  errorText: { flex: 1, color: "#9A3B3B", fontSize: 11, lineHeight: 16 },
  retryButton: { minHeight: 36, justifyContent: "center", paddingHorizontal: 12, backgroundColor: colors.white, borderRadius: radius.sm },
  retryText: { color: colors.danger, fontSize: 11, fontWeight: "700" },

  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  signOutIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: { color: colors.danger, fontSize: 14, fontWeight: "700" },
})
