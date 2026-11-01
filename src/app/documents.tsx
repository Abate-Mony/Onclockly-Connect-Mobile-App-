import { router } from "expo-router"
import { ArrowLeft, FileText } from "lucide-react-native"
import { StyleSheet, Text, View } from "react-native"
import { StyledPressable as Pressable } from "../components/StyledPressable"
import { SafeAreaView } from "react-native-safe-area-context"
import { pressableFeedback } from "../components/interactiveStyles"
import { colors, radius, shadow, spacing } from "../utils/theme"

// No ClientDocument model/backend exists yet — mirrors
// client_portal_onclockly's own Documents.tsx, which shows the same honest
// "not available yet" state rather than a fake document list.
export default function DocumentsScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressableFeedback(pressed)]}>
          <ArrowLeft size={18} color={colors.ink} />
          <Text style={styles.backText}>Home</Text>
        </Pressable>
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>FILES & RECORDS</Text>
        <Text style={styles.title}>Documents</Text>
        <Text style={styles.subtitle}>Files securely shared with you by your service provider</Text>
      </View>

      <View style={[styles.empty, shadow.md]}>
        <View style={styles.emptyIcon}>
          <FileText size={22} color={colors.primaryDark} />
        </View>
        <Text style={styles.emptyTitle}>Document sharing is coming soon</Text>
        <Text style={styles.emptyText}>
          This isn&apos;t built yet — check back in a future update, or contact your service provider directly for any documents you need now.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },

  topBar: { paddingHorizontal: 12, paddingTop: 4 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 4, alignSelf: "flex-start" },
  backText: { fontSize: 14, fontWeight: "700", color: colors.ink },

  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  eyebrow: { color: colors.subtle, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  title: { marginTop: 5, fontSize: 26, fontWeight: "800", color: colors.ink, letterSpacing: -0.4 },
  subtitle: { marginTop: 5, fontSize: 13, color: colors.muted },

  empty: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
  },
  emptyIcon: { width: 52, height: 52, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  emptyText: { fontSize: 12, color: colors.muted, textAlign: "center", lineHeight: 18 },
})
