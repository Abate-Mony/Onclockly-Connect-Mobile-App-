import dayjs from "dayjs"
import { router, useFocusEffect } from "expo-router"
import { useCallback, useState } from "react"
import { RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Avatar } from "../../components/Avatar"
import { NotificationBell } from "../../components/NotificationBell"
import { StyledPressable } from "../../components/StyledPressable"
import { OverviewSection } from "../../components/dashboard/AccountOverview"
import { BookingSection } from "../../components/dashboard/BookingCard"
import { QuickActions } from "../../components/dashboard/QuickActions"
import { useAuth } from "../../context/AuthContext"
import { useDashboardData } from "../../hooks/useDashboardData"
import { useTabBarClearance } from "../../hooks/useTabBarClearance"
import { canClient } from "../../utils/clientPermissions"
import { colors } from "../../utils/theme"

function greeting(hour: number) {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export default function DashboardScreen() {
  const { user } = useAuth()
  const [now, setNow] = useState(() => dayjs())
  const { bookings, quotes, invoices } = useDashboardData(user, now)
  const { refetch: refreshBookings } = bookings
  const { refetch: refreshQuotes } = quotes
  const { refetch: refreshInvoices } = invoices
  const [refreshing, setRefreshing] = useState(false)
  const { fontScale } = useWindowDimensions()
  const bottomPadding = useTabBarClearance(32)
  const role = user?.clientRole
  const canReadBookings = canClient(role, "booking:read")
  const canReadQuotes = canClient(role, "quote:read")
  const canReadInvoices = canClient(role, "invoice:read")
  const canRequest = canClient(role, "booking:create")
  const firstName = user?.fullname?.trim().split(/\s+/)[0] || "there"

  useFocusEffect(useCallback(() => {
    setNow(dayjs())
    if (canReadBookings) void refreshBookings()
    if (canReadQuotes) void refreshQuotes()
    if (canReadInvoices) void refreshInvoices()
    const timer = setInterval(() => setNow(dayjs()), 60_000)
    return () => clearInterval(timer)
  }, [canReadBookings, canReadQuotes, canReadInvoices, refreshBookings, refreshQuotes, refreshInvoices]))

  async function refresh() {
    setRefreshing(true)
    try {
      await Promise.allSettled([
        ...(canReadBookings ? [bookings.refetch()] : []),
        ...(canReadQuotes ? [quotes.refetch()] : []),
        ...(canReadInvoices ? [invoices.refetch()] : []),
      ])
      setNow(dayjs())
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <View style={[styles.header, fontScale > 1.3 && styles.headerStack]}>
          <StyledPressable
            accessibilityRole="button"
            accessibilityLabel="Open your profile"
            onPress={() => router.push("/profile")}
            style={[styles.profileLink, fontScale > 1.3 && styles.profileLinkStack]}
          >
            {({ pressed }) => (
              <View style={[styles.identity, pressed && styles.pressed]}>
                <View style={styles.avatarRing}>
                  <Avatar name={user?.fullname ?? "Client"} photoUrl={user?.profilePhoto?.url} size={40} />
                </View>
                <View style={styles.headerCopy}>
                  <Text style={styles.greeting}>{greeting(now.hour())},</Text>
                  <Text accessibilityRole="header" style={styles.name} numberOfLines={1}>{firstName}</Text>
                </View>
              </View>
            )}
          </StyledPressable>
          <NotificationBell />
        </View>
        {canReadBookings && <BookingSection query={bookings} canRequest={canRequest} now={now} />}
        {(canReadQuotes || canReadInvoices) && (
          <OverviewSection
            quotes={canReadQuotes ? quotes : undefined}
            invoices={canReadInvoices ? invoices : undefined}
            stacked={fontScale > 1.25}
          />
        )}
        <View style={{ height: 8 }} >
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center" }}>
            {`Last updated ${now.format("h:mm A")}`}
          </Text>
        </View>
        <QuickActions canReadBookings={canReadBookings} canRequest={canRequest} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flex: 1 },
  content: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 20, paddingTop: 16, gap: 24 },
  header: { flexDirection: "row", alignItems: "center", gap: 16, minHeight: 56 },
  headerStack: { flexDirection: "column", alignItems: "stretch", gap: 8 },
  profileLink: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  profileLinkStack: { flexGrow: 0, flexShrink: 0, flexBasis: "auto", width: "100%" },
  identity: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
  avatarRing: { padding: 3, borderWidth: 1, borderColor: colors.border, borderRadius: 26, backgroundColor: colors.surface },
  headerCopy: { flex: 1, minWidth: 0 },
  greeting: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  name: { color: colors.ink, fontSize: 21, lineHeight: 27, fontWeight: "600", letterSpacing: -0.5 },
  dateBlock: { alignItems: "flex-end" },
  dateBlockStack: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateWeekday: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  date: { color: colors.inkSoft, fontSize: 12, lineHeight: 18, fontWeight: "500" },
  pressed: { opacity: 0.72 },
})
