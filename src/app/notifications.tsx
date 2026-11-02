import dayjs from "dayjs"
import { router, useFocusEffect } from "expo-router"
import { ArrowLeft, ArrowUpRight, Bell, BellRing, CalendarCheck2, CalendarClock, CalendarDays, Check, CheckCheck, CircleX } from "lucide-react-native"
import { useCallback, useState } from "react"
import { ActivityIndicator, FlatList, Linking, RefreshControl, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Toast from "react-native-toast-message"
import { LoadMoreButton, LoadingSkeleton, RetryNotice, RetryState } from "../components/QueryStates"
import { StyledPressable } from "../components/StyledPressable"
import { useAuth } from "../context/AuthContext"
import { useNotificationInbox } from "../hooks/useNotifications"
import { enableClientPush, getClientPushStatus, type ClientPushStatus } from "../utils/clientPush"
import { resolveNotificationDestination, type PortalNotification } from "../utils/notifications"
import { colors, radius } from "../utils/theme"

function notificationAppearance(type: string) {
  if (/declin|reject/.test(type)) return { Icon: CircleX, color: colors.warning, background: colors.warningSoft }
  if (/cancel/.test(type)) return { Icon: CircleX, color: colors.muted, background: colors.surfaceAlt }
  if (/time|resched/.test(type)) return { Icon: CalendarClock, color: colors.primary, background: colors.primarySoft }
  if (/approv|confirm/.test(type)) return { Icon: CalendarCheck2, color: colors.primary, background: colors.primarySoft }
  return { Icon: CalendarDays, color: colors.primary, background: colors.primarySoft }
}

function notificationTime(createdAt: string, now: number) {
  const date = dayjs(createdAt)
  if (!date.isValid()) return ""
  const minutes = Math.floor((now - date.valueOf()) / 60_000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`
  if (date.isSame(dayjs(now).subtract(1, "day"), "day")) return `Yesterday, ${date.format("h:mm A")}`
  return date.format(date.year() === dayjs(now).year() ? "D MMM, h:mm A" : "D MMM YYYY, h:mm A")
}

function PhoneAlerts() {
  const [status, setStatus] = useState<ClientPushStatus | null>(null)
  const [enabling, setEnabling] = useState(false)
  const [error, setError] = useState(false)

  useFocusEffect(useCallback(() => {
    let active = true
    getClientPushStatus().then(next => {
      if (active) {
        setStatus(next)
        setError(false)
      }
    }).catch(() => {
      if (active) setError(true)
    })
    return () => { active = false }
  }, []))

  async function enable() {
    setEnabling(true)
    setError(false)
    try {
      setStatus(await enableClientPush())
    } catch {
      setError(true)
    } finally {
      setEnabling(false)
    }
  }

  function openSettings() {
    void Linking.openSettings().catch(() => {
      Toast.show({ type: "error", text1: "Couldn't open settings", text2: "You can change notification permissions in your phone's settings." })
    })
  }

  const message = status === "enabled"
    ? "Booking updates can appear on this phone, even when the app is closed."
    : status === "denied"
      ? "Turn on notifications in your phone's settings to receive booking updates."
      : status === "unavailable"
        ? "Phone alerts are available in the installed app. Your updates will always appear here."
        : "Get approvals and schedule changes, even when the app is closed."

  return (
    <View style={styles.alertCard}>
      <View style={styles.alertIntro}>
        <View style={styles.alertIcon}><BellRing size={20} color={colors.primary} strokeWidth={1.7} /></View>
        <View style={styles.flex1}>
          <Text style={styles.alertTitle}>{status === "enabled" ? "Phone alerts allowed" : "Stay in the loop"}</Text>
          <Text style={styles.alertDescription}>{message}</Text>
        </View>
      </View>
      {error && <Text accessibilityRole="alert" style={styles.alertError}>{"Couldn't set up phone alerts. Please try again."}</Text>}
      {status === "denied" ? (
        <StyledPressable accessibilityRole="button" onPress={openSettings} style={({ pressed }) => [styles.alertButton, pressed && styles.pressed]}>
          <Text style={styles.alertButtonText}>Open settings</Text>
          <ArrowUpRight size={15} color={colors.primary} />
        </StyledPressable>
      ) : status === "undetermined" || error ? (
        <StyledPressable
          accessibilityRole="button"
          accessibilityState={{ disabled: enabling, busy: enabling }}
          disabled={enabling}
          onPress={() => { void enable() }}
          style={({ pressed }) => [styles.alertButton, pressed && styles.pressed]}
        >
          {enabling ? <ActivityIndicator size="small" color={colors.primary} /> : <Bell size={15} color={colors.primary} />}
          <Text style={styles.alertButtonText}>{enabling ? "Setting up alerts…" : "Enable phone alerts"}</Text>
        </StyledPressable>
      ) : null}
    </View>
  )
}

function NotificationRow({ notification, now, onOpen, canOpen }: {
  notification: PortalNotification
  now: number
  onOpen: () => void
  canOpen: boolean
}) {
  const { Icon, color, background } = notificationAppearance(notification.type)
  const timestamp = notificationTime(notification.createdAt, now)
  return (
    <StyledPressable
      accessibilityRole="button"
      accessibilityLabel={`${notification.isRead ? "" : "Unread. "}${notification.title}. ${notification.body}. ${timestamp}`}
      accessibilityHint={canOpen ? "Opens the related booking" : notification.isRead ? undefined : "Marks this update as read"}
      onPress={onOpen}
      style={({ pressed }) => [styles.notification, !notification.isRead && styles.unreadNotification, pressed && styles.pressed]}
    >
      <View style={[styles.notificationIcon, { backgroundColor: background }]}><Icon size={20} color={color} strokeWidth={1.7} /></View>
      <View style={styles.notificationCopy}>
        <View style={styles.notificationTitleRow}>
          <Text style={[styles.notificationTitle, !notification.isRead && styles.unreadTitle]}>{notification.title}</Text>
          {!notification.isRead && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notificationBody}>{notification.body}</Text>
        <View style={styles.notificationFooter}>
          <Text style={styles.timestamp}>{timestamp}</Text>
          {canOpen && <Text style={styles.viewBooking}>View booking <Text style={styles.viewArrow}>↗</Text></Text>}
        </View>
      </View>
    </StyledPressable>
  )
}

export default function NotificationsScreen() {
  const { user } = useAuth()
  const { query, markRead, markAllRead } = useNotificationInbox()
  const { refetch } = query
  const [now, setNow] = useState(() => Date.now())
  const [refreshing, setRefreshing] = useState(false)
  const notifications = query.data?.pages.flatMap(page => page.notifications) ?? []
  const unreadCount = query.data?.pages[0]?.unreadCount ?? 0

  useFocusEffect(useCallback(() => {
    void refetch()
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [refetch]))

  async function refresh() {
    setRefreshing(true)
    try { await refetch() } finally { setRefreshing(false) }
  }

  function open(notification: PortalNotification) {
    if (!notification.isRead) markRead.mutate(notification._id)
    const destination = resolveNotificationDestination(notification.link, user?.clientRole)
    if (destination) router.push(destination)
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.topBar}>
        <StyledPressable
          accessibilityRole="button"
          accessibilityLabel="Back to home"
          onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/") }}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <ArrowLeft size={19} color={colors.primary} />
          <Text style={styles.backText}>Home</Text>
        </StyledPressable>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={item => item._id}
        extraData={{ now, role: user?.clientRole }}
        style={styles.list}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void refresh() }} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={
          <View>
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={styles.title}>Notifications</Text>
              <Text style={styles.subtitle}>Updates to your bookings, all in one place.</Text>
            </View>
            <PhoneAlerts />
            <View style={styles.activityHeader}>
              <View style={styles.activityLabel}>
                <Text accessibilityRole="header" style={styles.activityTitle}>Your updates</Text>
                {unreadCount > 0 && <View style={styles.unreadPill}><Text style={styles.unreadPillText}>{unreadCount} unread</Text></View>}
              </View>
              {unreadCount > 0 && (
                <StyledPressable
                  accessibilityRole="button"
                  accessibilityLabel="Mark all notifications as read"
                  accessibilityState={{ disabled: markAllRead.isPending, busy: markAllRead.isPending }}
                  disabled={markAllRead.isPending}
                  onPress={() => markAllRead.mutate()}
                  style={({ pressed }) => [styles.markAll, pressed && styles.pressed]}
                >
                  {markAllRead.isPending ? <ActivityIndicator size="small" color={colors.primary} /> : <CheckCheck size={16} color={colors.primary} />}
                  <Text style={styles.markAllText}>Mark all read</Text>
                </StyledPressable>
              )}
            </View>
            {query.isError && !!query.data && <RetryNotice message="Couldn't refresh your updates. Saved updates are still shown." onRetry={() => { void refetch() }} />}
          </View>
        }
        renderItem={({ item }) => <NotificationRow notification={item} now={now} onOpen={() => open(item)} canOpen={!!resolveNotificationDestination(item.link, user?.clientRole)} />}
        ItemSeparatorComponent={NotificationSeparator}
        ListEmptyComponent={query.isPending ? <LoadingSkeleton rows={3} horizontalPadding={0} /> : query.isError ? (
          <RetryState title="Couldn't load your updates" message="Check your connection and try again." onRetry={() => { void refetch() }} />
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Check size={28} color={colors.primary} strokeWidth={1.5} /></View>
            <Text style={styles.emptyTitle}>{"You're all caught up"}</Text>
            <Text style={styles.emptyDescription}>{"When your booking is approved or your visit changes, you'll find the update here."}</Text>
          </View>
        )}
        ListFooterComponent={query.hasNextPage ? <View style={styles.loadMore}><LoadMoreButton label="updates" loading={query.isFetchingNextPage} error={query.isFetchNextPageError} onLoadMore={() => { if (!query.isFetchingNextPage) void query.fetchNextPage() }} /></View> : notifications.length > 0 ? <Text style={styles.historyNote}>Updates are kept here for 30 days.</Text> : undefined}
      />
    </SafeAreaView>
  )
}

function NotificationSeparator() { return <View style={styles.separator} /> }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex1: { flex: 1, minWidth: 0 },
  topBar: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 12, paddingTop: 4 },
  backButton: { minHeight: 48, flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 8, paddingHorizontal: 8 },
  backText: { color: colors.primary, fontSize: 14, fontWeight: "500" },
  list: { flex: 1 },
  content: { flexGrow: 1, width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 20, paddingBottom: 24 },
  heading: { paddingTop: 12, paddingBottom: 24, gap: 8 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 38, fontWeight: "600", letterSpacing: -1 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  alertCard: { padding: 16, gap: 12, marginBottom: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  alertIntro: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  alertIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySoft, justifyContent: "center", alignItems: "center" },
  alertTitle: { color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  alertDescription: { marginTop: 4, color: colors.muted, fontSize: 13, lineHeight: 20 },
  alertError: { color: colors.warning, fontSize: 12, lineHeight: 18 },
  alertButton: { alignSelf: "flex-start", minHeight: 44, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.primarySoft },
  alertButtonText: { color: colors.primary, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  activityHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 8, rowGap: 0, marginBottom: 12 },
  activityLabel: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, paddingVertical: 8 },
  activityTitle: { color: colors.ink, fontSize: 16, lineHeight: 23, fontWeight: "600" },
  unreadPill: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.primarySoft },
  unreadPillText: { color: colors.primary, fontSize: 10, lineHeight: 15, fontWeight: "600", fontVariant: ["tabular-nums"] },
  markAll: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 2 },
  markAllText: { color: colors.primary, fontSize: 12, lineHeight: 18, fontWeight: "500" },
  notification: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  unreadNotification: { borderColor: "#CAD9CD" },
  notificationIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  notificationCopy: { flex: 1, minWidth: 0 },
  notificationTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  notificationTitle: { flex: 1, color: colors.inkSoft, fontSize: 15, lineHeight: 22, fontWeight: "500" },
  unreadTitle: { color: colors.ink, fontWeight: "600" },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, flexShrink: 0 },
  notificationBody: { marginTop: 5, color: colors.muted, fontSize: 14, lineHeight: 21 },
  notificationFooter: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 8, rowGap: 4 },
  timestamp: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  viewBooking: { color: colors.primary, fontSize: 10, lineHeight: 16, fontWeight: "600" },
  viewArrow: { fontSize: 12 },
  pressed: { opacity: 0.65 },
  separator: { height: 10 },
  emptyState: { paddingHorizontal: 16, paddingVertical: 36, alignItems: "center", gap: 12 },
  emptyIcon: { width: 64, height: 64, alignItems: "center", justifyContent: "center", borderRadius: 24, backgroundColor: colors.primarySoft, marginBottom: 4 },
  emptyTitle: { color: colors.ink, fontSize: 18, lineHeight: 26, fontWeight: "600" },
  emptyDescription: { maxWidth: 280, color: colors.muted, fontSize: 13, lineHeight: 21, textAlign: "center" },
  loadMore: { paddingTop: 16 },
  historyNote: { color: colors.subtle, fontSize: 11, lineHeight: 17, textAlign: "center", paddingTop: 24 },
})
