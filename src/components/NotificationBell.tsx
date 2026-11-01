import { router } from "expo-router"
import { Bell } from "lucide-react-native"
import { StyleSheet, Text, View } from "react-native"
import { useNotificationSummary } from "../hooks/useNotifications"
import { colors } from "../utils/theme"
import { StyledPressable } from "./StyledPressable"

export function NotificationBell() {
  const { data } = useNotificationSummary()
  const unreadCount = Math.max(0, data?.unreadCount ?? 0)

  return (
    <StyledPressable
      accessibilityRole="button"
      accessibilityLabel={unreadCount > 0
        ? `Notifications, ${unreadCount} unread`
        : "Notifications"}
      accessibilityHint="Opens your booking updates"
      onPress={() => router.push("/notifications")}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Bell size={21} strokeWidth={1.8} color={colors.primary} />
      {unreadCount > 0 && (
        <View pointerEvents="none" style={styles.badge}>
          <Text maxFontSizeMultiplier={1.2} style={styles.count}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      )}
    </StyledPressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  pressed: { opacity: 0.65 },
  badge: {
    position: "absolute",
    top: -4,
    right: -5,
    minWidth: 22,
    minHeight: 22,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderColor: colors.canvas,
    borderWidth: 2,
    borderRadius: 12,
  },
  count: { color: colors.white, fontSize: 10, lineHeight: 14, fontWeight: "700", fontVariant: ["tabular-nums"] },
})
