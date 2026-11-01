import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { router, useLocalSearchParams } from "expo-router"
import { ArrowLeft, Check, Clock3, X } from "lucide-react-native"
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { StyledPressable as Pressable } from "../../components/StyledPressable"
import { SafeAreaView } from "react-native-safe-area-context"
import Toast from "react-native-toast-message"
import { LoadingSkeleton, RetryNotice, RetryState } from "../../components/QueryStates"
import { pressableFeedback } from "../../components/interactiveStyles"
import { StatusBadge } from "../../components/StatusBadge"
import { useAuth } from "../../context/AuthContext"
import { canClient } from "../../utils/clientPermissions"
import { colors, radius, shadow, spacing } from "../../utils/theme"
import customFetch from "../../utils/customFetch"
import { formatDate, money } from "../../utils/format"
import type { QuoteResponse } from "../../utils/types"

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const qc = useQueryClient()
  const { user } = useAuth()
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState("")

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["portal-quote", id],
    queryFn: async () => {
      const { data } = await customFetch.get<QuoteResponse>(`/portal/quotes/${id}`)
      return data
    },
    enabled: !!id,
  })
  const quote = data?.quote

  const respondMutation = useMutation({
    mutationFn: (action: "accept" | "decline") =>
      customFetch.post(`/portal/quotes/${id}/${action}`, action === "decline" ? { declineReason: reason || undefined } : {}),
    onSuccess: (_res, action) => {
      Toast.show({ type: "success", text1: action === "accept" ? "Quote approved" : "Quote declined" })
      setDeclining(false)
      qc.invalidateQueries({ queryKey: ["portal-quote", id] })
      qc.invalidateQueries({ queryKey: ["portal-quotes"] })
    },
    onError: (err: any) => Toast.show({ type: "error", text1: "Couldn't record your response", text2: err?.response?.data?.msg }),
  })

  const confirmDecline = () => {
    Alert.alert("Decline quote?", "This will let your account manager know you're declining.", [
      { text: "Cancel", style: "cancel" },
      { text: "Decline", style: "destructive", onPress: () => respondMutation.mutate("decline") },
    ])
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <LoadingSkeleton rows={3} />
      </SafeAreaView>
    )
  }
  if (!quote) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <RetryState
          title={isError ? "Couldn’t load this quote" : "Quote unavailable"}
          message={isError ? "Check your connection and try again." : "This quote may no longer be available."}
          onRetry={() => { refetch() }}
        />
      </SafeAreaView>
    )
  }

  const isRespondable = quote.status === "sent" || quote.status === "viewed"
  const canAccept = canClient(user?.clientRole, "quote:accept")
  const expiringSoon = isRespondable && !!quote.validUntil && dayjs(quote.validUntil).diff(dayjs(), "day") <= 10

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressableFeedback(pressed)]}>
          <ArrowLeft size={18} color={colors.ink} />
          <Text style={styles.backText}>Quotes</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isError && <RetryNotice onRetry={() => { refetch() }} />}

        <View style={[styles.heroCard, shadow.lg]}>
          <View style={styles.headerRow}>
            <Text style={styles.quoteNumber}>QUOTE {quote.quoteNumber}</Text>
            <StatusBadge status={quote.status} />
          </View>
          <Text style={styles.title}>{quote.title}</Text>
          <Text style={styles.heroTotal}>{money(quote.total, quote.currency)}</Text>
          {!!quote.validUntil && <Text style={styles.subtitle}>Valid until {formatDate(quote.validUntil, "D MMMM YYYY")}</Text>}
        </View>

        {expiringSoon && (
          <View style={styles.warningBanner}>
            <Clock3 size={16} color="#92610A" />
            <View style={styles.flex1}>
              <Text style={styles.warningTitle}>This quote expires soon</Text>
              <Text style={styles.warningText}>Please review and respond by {formatDate(quote.validUntil!, "D MMMM YYYY")}.</Text>
            </View>
          </View>
        )}

        <View style={[styles.card, shadow.md]}>
          <Text style={styles.cardTitle}>Line items</Text>
          {quote.items.map((item, i) => (
            <View key={i} style={styles.lineItem}>
              <Text style={styles.lineDesc}>{item.description}</Text>
              <View style={styles.lineRow}>
                <Text style={styles.lineMeta}>{item.quantity} × {money(item.unitPrice, quote.currency)}</Text>
                <Text style={styles.lineAmount}>{money(item.amount, quote.currency)}</Text>
              </View>
            </View>
          ))}

          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{money(quote.subtotal, quote.currency)}</Text>
            </View>
            {!!quote.taxRate && quote.taxRate > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>VAT ({quote.taxRate}%)</Text>
                <Text style={styles.totalsValue}>{money(quote.taxAmount ?? 0, quote.currency)}</Text>
              </View>
            )}
            <View style={[styles.totalsRow, styles.totalsRowFinal]}>
              <Text style={styles.totalsLabelFinal}>Total</Text>
              <Text style={styles.totalsValueFinal}>{money(quote.total, quote.currency)}</Text>
            </View>
          </View>
        </View>

        {isRespondable && canAccept && (
          <View style={[styles.actionCard, shadow.md]}>
            {!declining ? (
              <>
                <Text style={styles.actionTitle}>Ready to respond?</Text>
                <Text style={styles.actionSubtitle}>Your response will be shared with your account manager.</Text>
                <View style={styles.actionButtons}>
                  <Pressable style={({ pressed }) => [styles.declineBtn, pressableFeedback(pressed)]} onPress={() => setDeclining(true)}>
                    <X size={15} color={colors.inkSoft} />
                    <Text style={styles.declineBtnText}>Decline</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.acceptBtn, pressableFeedback(pressed)]}
                    onPress={() => respondMutation.mutate("accept")}
                    disabled={respondMutation.isPending}
                  >
                    {respondMutation.isPending ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <>
                        <Check size={15} color={colors.white} />
                        <Text style={styles.acceptBtnText}>Approve quote</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.actionTitle}>Decline quote</Text>
                <Text style={styles.actionSubtitle}>You can optionally tell us why.</Text>
                <TextInput
                  style={styles.textarea}
                  placeholder="Reason for declining (optional)"
                  placeholderTextColor={colors.subtle}
                  multiline
                  value={reason}
                  onChangeText={setReason}
                />
                <View style={styles.actionButtons}>
                  <Pressable style={({ pressed }) => [styles.declineBtn, pressableFeedback(pressed)]} onPress={() => setDeclining(false)}>
                    <Text style={styles.declineBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={({ pressed }) => [styles.dangerBtn, pressableFeedback(pressed)]} onPress={confirmDecline} disabled={respondMutation.isPending}>
                    {respondMutation.isPending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.acceptBtnText}>Confirm decline</Text>}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}

        {isRespondable && !canAccept && (
          <Text style={styles.ownerOnlyText}>Only an account owner can accept or decline this quote.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex1: { flex: 1, minWidth: 0 },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.md },

  topBar: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 4 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 4, alignSelf: "flex-start" },
  backText: { fontSize: 14, fontWeight: "700", color: colors.ink },

  heroCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  quoteNumber: { fontSize: 11, fontWeight: "800", color: colors.subtle, letterSpacing: 0.6 },
  title: { fontSize: 20, fontWeight: "800", color: colors.ink, marginTop: spacing.md },
  heroTotal: { fontSize: 32, fontWeight: "800", color: colors.ink, marginTop: 6, letterSpacing: -0.6 },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: spacing.sm },

  warningBanner: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  warningTitle: { fontSize: 13, fontWeight: "700", color: "#92610A" },
  warningText: { fontSize: 12, color: "#92610A", marginTop: 2 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: colors.ink, marginBottom: spacing.md },
  lineItem: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  lineDesc: { fontSize: 14, fontWeight: "600", color: colors.ink },
  lineRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  lineMeta: { fontSize: 12, color: colors.muted },
  lineAmount: { fontSize: 13, fontWeight: "700", color: colors.ink },

  totalsBlock: { marginTop: 8, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider, gap: 6 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between" },
  totalsLabel: { fontSize: 13, color: colors.muted },
  totalsValue: { fontSize: 13, color: colors.inkSoft },
  totalsRowFinal: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.divider },
  totalsLabelFinal: { fontSize: 15, fontWeight: "700", color: colors.ink },
  totalsValueFinal: { fontSize: 15, fontWeight: "800", color: colors.ink },

  actionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  actionTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  actionSubtitle: { fontSize: 12, color: colors.muted, marginTop: 2, marginBottom: spacing.md },
  actionButtons: { flexDirection: "row", gap: 10 },
  textarea: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    borderRadius: radius.sm,
    padding: spacing.md,
    minHeight: 80,
    fontSize: 13,
    color: colors.ink,
    textAlignVertical: "top",
    marginBottom: spacing.md,
  },
  declineBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.canvas,
    minHeight: 48,
    paddingVertical: 12,
  },
  declineBtnText: { fontSize: 13, fontWeight: "700", color: colors.inkSoft },
  acceptBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.primaryDark,
    minHeight: 48,
    paddingVertical: 12,
  },
  acceptBtnText: { fontSize: 13, fontWeight: "700", color: colors.white },
  dangerBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.danger,
    minHeight: 48,
    paddingVertical: 12,
  },
  ownerOnlyText: { fontSize: 12, color: colors.muted, textAlign: "center", marginTop: spacing.lg },
})
