import { AlertCircle } from "lucide-react-native"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { StyledPressable as Pressable } from "./StyledPressable"
import { pressableFeedback } from "./interactiveStyles"
import { colors, radius, shadow } from "../utils/theme"

export function LoadingSkeleton({
  rows = 3,
  showSummary = false,
  showFilters = false,
  horizontalPadding = 20,
}: {
  rows?: number
  showSummary?: boolean
  showFilters?: boolean
  horizontalPadding?: number
}) {
  return (
    <View
      accessible
      accessibilityLabel="Loading content"
      accessibilityState={{ busy: true }}
      style={[styles.skeletonContainer, { paddingHorizontal: horizontalPadding }]}
    >
      {showSummary && (
        <View style={[styles.summary, styles.skeletonBlock]}>
          <View style={styles.summaryIcon} />
          <View style={styles.summaryCopy}>
            <View style={[styles.skeletonLine, styles.summaryLine]} />
            <View style={[styles.skeletonLine, styles.valueLine]} />
          </View>
        </View>
      )}
      {showFilters && (
        <View style={styles.filterSkeletons}>
          <View style={[styles.skeletonLine, styles.searchLine]} />
          <View style={styles.filterRow}>
            {[82, 64, 77].map(width => (
              <View key={width} style={[styles.skeletonLine, styles.filterLine, { width }]} />
            ))}
          </View>
        </View>
      )}
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={[styles.card, shadow.sm]}>
          <View style={styles.cardHeader}>
            <View style={[styles.skeletonLine, styles.titleLine]} />
            <View style={[styles.skeletonLine, styles.badgeLine]} />
          </View>
          <View style={[styles.skeletonLine, styles.metaLine]} />
          <View style={styles.divider} />
          <View style={styles.cardFooter}>
            <View style={[styles.skeletonLine, styles.amountLine]} />
            <View style={[styles.skeletonLine, styles.amountLine]} />
          </View>
        </View>
      ))}
    </View>
  )
}

export function RetryState({
  title,
  message,
  onRetry,
}: {
  title: string
  message: string
  onRetry: () => void
}) {
  return (
    <View style={styles.errorState}>
      <View style={styles.errorIcon}>
        <AlertCircle size={22} color={colors.danger} />
      </View>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.retryButton, pressableFeedback(pressed)]}
      >
        <Text style={styles.retryLabel}>Try again</Text>
      </Pressable>
    </View>
  )
}

export function RetryNotice({
  onRetry,
  message = "Couldn't refresh. Your saved results are still shown.",
}: {
  onRetry: () => void
  message?: string
}) {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeText}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.noticeButton, pressableFeedback(pressed)]}
      >
        <Text style={styles.noticeButtonLabel}>Retry</Text>
      </Pressable>
    </View>
  )
}

export function LoadMoreButton({
  label,
  loading,
  error,
  onLoadMore,
}: {
  label: string
  loading: boolean
  error: boolean
  onLoadMore: () => void
}) {
  if (loading) {
    return (
      <View accessibilityLabel={`Loading more ${label}`} style={styles.loadMoreState}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadMoreText}>Loading more {label}…</Text>
      </View>
    )
  }

  if (error) {
    return <RetryNotice message={`Couldn't load more ${label}.`} onRetry={onLoadMore} />
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onLoadMore}
      style={({ pressed }) => [styles.loadMoreButton, pressableFeedback(pressed)]}
    >
      <Text style={styles.loadMoreButtonText}>Load more {label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  skeletonContainer: { gap: 12, paddingTop: 6 },
  skeletonBlock: { backgroundColor: colors.surfaceAlt },
  skeletonLine: { height: 11, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  summary: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
    padding: 18,
    borderRadius: radius.lg,
  },
  summaryIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: "#E3E8E5" },
  summaryCopy: { flex: 1, gap: 9 },
  summaryLine: { width: "46%" },
  valueLine: { width: "32%", height: 17 },
  filterSkeletons: { gap: 11 },
  searchLine: { width: "100%", height: 50, borderRadius: radius.md },
  filterRow: { flexDirection: "row", gap: 8 },
  filterLine: { height: 38, borderRadius: radius.pill },
  card: {
    gap: 14,
    padding: 18,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  titleLine: { width: "43%", height: 15 },
  badgeLine: { width: 65, height: 22 },
  metaLine: { width: "56%" },
  divider: { height: 1, backgroundColor: colors.divider },
  cardFooter: { flexDirection: "row", justifyContent: "space-between" },
  amountLine: { width: 75, height: 14 },
  errorState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 28, paddingVertical: 36 },
  errorIcon: { width: 52, height: 52, borderRadius: radius.lg, backgroundColor: colors.dangerSoft, alignItems: "center", justifyContent: "center" },
  errorTitle: { marginTop: 4, color: colors.ink, fontSize: 17, fontWeight: "800", textAlign: "center" },
  errorMessage: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center" },
  retryButton: { minHeight: 48, justifyContent: "center", marginTop: 6, paddingHorizontal: 24, backgroundColor: colors.ink, borderRadius: radius.md },
  retryLabel: { color: colors.white, fontSize: 14, fontWeight: "700" },
  notice: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, padding: 12, backgroundColor: colors.dangerSoft, borderRadius: radius.md },
  noticeText: { flex: 1, color: "#9A3B3B", fontSize: 11, lineHeight: 16 },
  noticeButton: { minHeight: 36, justifyContent: "center", paddingHorizontal: 12, backgroundColor: colors.white, borderRadius: radius.sm },
  noticeButtonLabel: { color: colors.danger, fontSize: 11, fontWeight: "700" },
  loadMoreState: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  loadMoreText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  loadMoreButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    paddingHorizontal: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  loadMoreButtonText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
})
