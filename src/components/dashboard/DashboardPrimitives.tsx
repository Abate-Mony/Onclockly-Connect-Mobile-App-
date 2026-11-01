import { ArrowRight, RotateCw } from "lucide-react-native"
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from "react-native"
import { colors } from "../../utils/theme"
import { StyledPressable } from "../StyledPressable"

export function SectionHeading({
  title,
  action,
  onPress,
}: {
  title: string
  action?: string
  onPress?: () => void
}) {
  return (
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {action && onPress ? (
        <StyledPressable accessibilityRole="button" onPress={onPress}>
          {({ pressed }) => (
            <View style={[styles.headingAction, pressed && styles.pressed]}>
              <Text style={styles.actionText}>{action}</Text>
              <ArrowRight size={14} color={colors.primary} />
            </View>
          )}
        </StyledPressable>
      ) : null}
    </View>
  )
}

export function QueryNotice({
  message,
  onRetry,
  busy = false,
}: {
  message: string
  onRetry: () => void
  busy?: boolean
}) {
  const { fontScale } = useWindowDimensions()
  const stacked = fontScale > 1.3

  return (
    <View style={[styles.notice, stacked && styles.noticeStack]} accessibilityLiveRegion="polite">
      <Text style={[styles.noticeCopy, stacked && styles.noticeCopyStack]}>{message}</Text>
      <StyledPressable
        accessibilityRole="button"
        accessibilityLabel="Retry loading"
        accessibilityState={{ busy, disabled: busy }}
        onPress={onRetry}
        disabled={busy}
        style={stacked ? styles.retryAlign : undefined}
      >
        {({ pressed }) => (
          <View style={[styles.retry, pressed && styles.pressed]}>
            {busy ? <ActivityIndicator size="small" color={colors.primary} /> : (
              <>
                <RotateCw size={13} color={colors.primary} />
                <Text style={styles.actionText}>Retry</Text>
              </>
            )}
          </View>
        )}
      </StyledPressable>
    </View>
  )
}

const styles = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 24 },
  title: { flex: 1, color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: "600", letterSpacing: -0.4 },
  headingAction: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingLeft: 8 },
  actionText: { color: colors.primary, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  notice: { flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 12, paddingRight: 4, backgroundColor: colors.surfaceAlt, borderRadius: 12 },
  noticeStack: { flexDirection: "column", alignItems: "stretch", gap: 0, paddingRight: 8, paddingTop: 4, paddingBottom: 4 },
  noticeCopy: { flexGrow: 1, flexShrink: 1, flexBasis: 0, color: colors.muted, fontSize: 12, lineHeight: 18, paddingVertical: 10 },
  noticeCopyStack: { flexGrow: 0, flexShrink: 0, flexBasis: "auto", width: "100%", paddingVertical: 8 },
  retry: { minWidth: 64, minHeight: 44, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  retryAlign: { alignSelf: "flex-end" },
  pressed: { opacity: 0.7 },
})
