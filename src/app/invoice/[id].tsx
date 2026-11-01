import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import * as FileSystem from "expo-file-system/legacy"
import { router, useLocalSearchParams } from "expo-router"
import * as Sharing from "expo-sharing"
import { ArrowLeft, Download } from "lucide-react-native"
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native"
import { StyledPressable as Pressable } from "../../components/StyledPressable"
import { SafeAreaView } from "react-native-safe-area-context"
import Toast from "react-native-toast-message"
import { LoadingSkeleton, RetryNotice, RetryState } from "../../components/QueryStates"
import { pressableFeedback } from "../../components/interactiveStyles"
import { StatusBadge } from "../../components/StatusBadge"
import { colors, radius, shadow, spacing } from "../../utils/theme"
import customFetch, { BASE_URL } from "../../utils/customFetch"
import { getToken } from "../../utils/auth"
import { formatDate, money } from "../../utils/format"
import type { InvoiceResponse } from "../../utils/types"

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [downloading, setDownloading] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["portal-invoice", id],
    queryFn: async () => {
      const { data } = await customFetch.get<InvoiceResponse>(`/portal/invoices/${id}`)
      return data
    },
    enabled: !!id,
  })
  const invoice = data?.invoice

  const handleDownloadPdf = async () => {
    if (!invoice) return
    setDownloading(true)
    try {
      const token = await getToken()
      const fileUri = `${FileSystem.cacheDirectory}${invoice.invoiceNumber}.pdf`
      const result = await FileSystem.downloadAsync(`${BASE_URL}/portal/invoices/${id}/pdf`, fileUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { mimeType: "application/pdf", dialogTitle: `${invoice.invoiceNumber}.pdf` })
      } else {
        Toast.show({ type: "success", text1: "Invoice PDF downloaded" })
      }
    } catch {
      Toast.show({ type: "error", text1: "Couldn't download the PDF", text2: "Try again." })
    } finally {
      setDownloading(false)
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <LoadingSkeleton rows={3} />
      </SafeAreaView>
    )
  }
  if (!invoice) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <RetryState
          title={isError ? "Couldn’t load this invoice" : "Invoice unavailable"}
          message={isError ? "Check your connection and try again." : "This invoice may no longer be available."}
          onRetry={() => { refetch() }}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressableFeedback(pressed)]}>
          <ArrowLeft size={18} color={colors.ink} />
          <Text style={styles.backText}>Invoices</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isError && <RetryNotice onRetry={() => { refetch() }} />}

        <View style={[styles.heroCard, shadow.lg]}>
          <View style={styles.headerRow}>
            <Text style={styles.invoiceNumber}>INVOICE {invoice.invoiceNumber}</Text>
            <StatusBadge status={invoice.displayStatus} />
          </View>
          <Text style={styles.title} numberOfLines={2}>{invoice.lineItems[0]?.description ?? invoice.invoiceNumber}</Text>
          <Text style={styles.heroTotal}>{money(invoice.total, invoice.currency)}</Text>
          <Text style={styles.subtitle}>
            Issued {formatDate(invoice.issueDate, "D MMMM YYYY")} · Due {formatDate(invoice.dueDate, "D MMMM YYYY")}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.downloadBtn, shadow.md, pressableFeedback(pressed)]}
          onPress={handleDownloadPdf}
          disabled={downloading}
        >
          {downloading ? <ActivityIndicator color={colors.white} size="small" /> : <Download size={15} color={colors.white} />}
          <Text style={styles.downloadBtnText}>{downloading ? "Preparing..." : "Download PDF"}</Text>
        </Pressable>

        <View style={[styles.card, shadow.md]}>
          <Text style={styles.cardTitle}>Line items</Text>
          {invoice.lineItems.map((item, i) => (
            <View key={i} style={styles.lineItem}>
              <Text style={styles.lineDesc}>{item.description}</Text>
              <View style={styles.lineRow}>
                <Text style={styles.lineMeta}>{item.quantity} × {money(item.rate, invoice.currency)}</Text>
                <Text style={styles.lineAmount}>{money(item.amount, invoice.currency)}</Text>
              </View>
            </View>
          ))}

          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{money(invoice.subtotal, invoice.currency)}</Text>
            </View>
            {!!invoice.vatRate && invoice.vatRate > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>VAT ({invoice.vatRate}%)</Text>
                <Text style={styles.totalsValue}>{money(invoice.vatAmount, invoice.currency)}</Text>
              </View>
            )}
            <View style={[styles.totalsRow, styles.totalsRowFinal]}>
              <Text style={styles.totalsLabelFinal}>Total</Text>
              <Text style={styles.totalsValueFinal}>{money(invoice.total, invoice.currency)}</Text>
            </View>
            {invoice.amountPaid > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Paid</Text>
                <Text style={styles.totalsValue}>{money(invoice.amountPaid, invoice.currency)}</Text>
              </View>
            )}
            {invoice.balanceDue > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabelFinal}>Balance due</Text>
                <Text style={[styles.totalsValueFinal, { color: colors.danger }]}>{money(invoice.balanceDue, invoice.currency)}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.md },

  topBar: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 4 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 4, alignSelf: "flex-start" },
  backText: { fontSize: 14, fontWeight: "700", color: colors.ink },

  heroCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  invoiceNumber: { fontSize: 11, fontWeight: "800", color: colors.subtle, letterSpacing: 0.6 },
  title: { fontSize: 18, fontWeight: "700", color: colors.inkSoft, marginTop: spacing.md },
  heroTotal: { fontSize: 32, fontWeight: "800", color: colors.ink, marginTop: 6, letterSpacing: -0.6 },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: spacing.sm },

  downloadBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radius.md,
    minHeight: 50,
    paddingVertical: 12,
  },
  downloadBtnText: { fontSize: 14, fontWeight: "700", color: colors.white },

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
})
