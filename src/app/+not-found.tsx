import { router, usePathname } from "expo-router"
import { ArrowLeft, Compass, House } from "lucide-react-native"
import { StatusBar, StyleSheet, Text, View } from "react-native"
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated"
import { SafeAreaView } from "react-native-safe-area-context"
import { pressableFeedback } from "../components/interactiveStyles"
import { StyledPressable as Pressable } from "../components/StyledPressable"
import { colors, radius, spacing } from "../utils/theme"

// Shown for any link to a screen that no longer exists — e.g. an old push
// notification or a bookmarked route that has since been moved or removed.
export default function NotFoundScreen() {
  const pathname = usePathname()
  const canGoBack = router.canGoBack()

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        <Animated.View entering={ZoomIn.duration(400).springify()} style={styles.ringOuter}>
          <View style={styles.ringInner}>
            <View style={styles.iconCircle}>
              <Compass size={30} color={colors.white} strokeWidth={2} />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.textBlock}>
          <Text style={styles.eyebrow}>PAGE NOT FOUND</Text>
          <Text accessibilityRole="header" style={styles.title}>
            This page has moved
          </Text>
          <Text style={styles.subtitle}>
            The screen you’re looking for may have been moved or is no longer available.
            Everything you need is still in the app.
          </Text>
          {!!pathname && pathname !== "/" && (
            <View style={styles.pathChip}>
              <Text style={styles.pathText} numberOfLines={1} selectable>
                {pathname}
              </Text>
            </View>
          )}
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(240).duration(400)} style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/")}
          style={({ pressed }) => [styles.primaryButton, pressableFeedback(pressed)]}
        >
          <House size={18} color={colors.white} strokeWidth={2.2} />
          <Text style={styles.primaryButtonText}>Go to home</Text>
        </Pressable>
        {canGoBack && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.secondaryButton, pressableFeedback(pressed)]}
          >
            <ArrowLeft size={17} color={colors.primary} strokeWidth={2.2} />
            <Text style={styles.secondaryButtonText}>Go back</Text>
          </Pressable>
        )}
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },

  ringOuter: {
    width: 124,
    height: 124,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  ringInner: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: "#DCE7DD",
  },
  iconCircle: {
    width: 66,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },

  textBlock: { alignItems: "center", marginTop: spacing.xxl, maxWidth: 360 },
  eyebrow: { color: colors.subtle, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: {
    marginTop: spacing.sm,
    color: colors.ink,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  pathChip: {
    marginTop: spacing.lg,
    maxWidth: "100%",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pathText: { color: colors.muted, fontSize: 12, fontWeight: "600" },

  actions: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  primaryButton: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  secondaryButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
  },
  secondaryButtonText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
})
