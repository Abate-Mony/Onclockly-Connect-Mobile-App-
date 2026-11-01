import { useState } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { router } from "expo-router"
import { AlertCircle, CalendarDays, Receipt } from "lucide-react-native"
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native"
import { StyledPressable as Pressable } from "../../components/StyledPressable"
import { SafeAreaView } from "react-native-safe-area-context"
import { SearchAndFilters } from "../../components/SearchAndFilters"
import type { FilterOption } from "../../components/SearchAndFilters"
import { LoadMoreButton, LoadingSkeleton, RetryNotice, RetryState } from "../../components/QueryStates"
import { pressableFeedback } from "../../components/interactiveStyles"
import { StatusBadge } from "../../components/StatusBadge"
import { useTabBarClearance } from "../../hooks/useTabBarClearance"
import { colors, radius, shadow, spacing } from "../../utils/theme"
import customFetch from "../../utils/customFetch"
import { formatDate, money } from "../../utils/format"
import type { InvoicesResponse, PortalInvoice } from "../../utils/types"

type InvoiceFilter = "all" | "due" | "overdue" | "paid"

const INVOICE_FILTERS: readonly FilterOption<InvoiceFilter>[] = [
  { label: "All invoices", value: "all" },
  { label: "Due", value: "due" },
  { label: "Overdue", value: "overdue" },
  { label: "Paid", value: "paid" },
]

function InvoiceRow({ invoice }: { invoice: PortalInvoice }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${invoice.invoiceNumber}, ${invoice.displayStatus}, ${money(invoice.total, invoice.currency)}`}
      onPress={() => router.push({ pathname: "/invoice/[id]", params: { id: invoice._id } })}
      style={({ pressed }) => [styles.card, shadow.md, pressableFeedback(pressed)]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.flex1}>
          <Text style={styles.overline}>INVOICE</Text>
          <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
        </View>
        <StatusBadge status={invoice.displayStatus || invoice.status} />
      </View>

      <View style={styles.dueRow}>
        <Text style={styles.meta}>Due {formatDate(invoice.dueDate)}</Text>
        <CalendarDays size={14} color={colors.muted} />
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.total}>{money(invoice.total, invoice.currency)}</Text>
        {invoice.balanceDue > 0 && invoice.status !== "paid" && (
          <Text style={styles.balance}>{money(invoice.balanceDue, invoice.currency)} due</Text>
        )}
      </View>
    </Pressable>
  )
}

export default function InvoicesScreen() {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<InvoiceFilter>("all")
  const { data, isLoading, isError, refetch, isRefetching, hasNextPage, fetchNextPage, isFetchingNextPage, isFetchNextPageError } = useInfiniteQuery({
    queryKey: ["portal-invoices"],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await customFetch.get<InvoicesResponse>("/portal/invoices", { params: { page: pageParam } })
      return data
    },
    getNextPageParam: lastPage => lastPage.currentPage < lastPage.totalPages
      ? lastPage.currentPage + 1
      : undefined,
  })

  const invoices = data?.pages.flatMap(page => page.invoices) ?? []
  const outstandingInvoices = invoices.filter(invoice => invoice.status === "sent" && invoice.balanceDue > 0)
  const outstanding = outstandingInvoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0)
  const outstandingCount = outstandingInvoices.length
  const currency = outstandingInvoices[0]?.currency ?? invoices[0]?.currency ?? "GBP"
  const normalizedSearch = search.trim().toLowerCase()
  const filteredInvoices = invoices.filter(invoice => {
    const matchesFilter = filter === "all"
      || (filter === "due" && invoice.status === "sent" && invoice.balanceDue > 0 && !invoice.isOverdue)
      || (filter === "overdue" && invoice.status === "sent" && invoice.isOverdue && invoice.balanceDue > 0)
      || (filter === "paid" && invoice.status === "paid")
    const searchableText = [
      invoice.invoiceNumber,
      invoice.displayStatus,
      invoice.status,
      invoice.clientSnapshot?.name,
      invoice.purchaseOrderNumber,
      money(invoice.total, invoice.currency),
      money(invoice.balanceDue, invoice.currency),
      invoice.dueDate ? formatDate(invoice.dueDate) : "",
      ...invoice.lineItems.map(item => item.description),
    ].filter(Boolean).join(" ").toLowerCase()
    return matchesFilter && searchableText.includes(normalizedSearch)
  })
  const tabBarClearance = useTabBarClearance()

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
        <Text style={styles.title}>Invoices</Text>
        <Text style={styles.subtitle}>A clear view of your payments and billing history.</Text>
      </View>

      {isLoading ? (
        <LoadingSkeleton showSummary showFilters />
      ) : isError && !data ? (
        <RetryState title="Couldn’t load your invoices" message="Check your connection and try again." onRetry={() => { refetch() }} />
      ) : (
        <FlatList
          data={filteredInvoices}
          keyExtractor={i => i._id}
          renderItem={({ item }) => <InvoiceRow invoice={item} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {isError && !isFetchNextPageError && <RetryNotice onRetry={() => { refetch() }} />}
              <View style={[styles.summary, shadow.md]}>
                <View style={styles.summaryIcon}>
                  <Receipt size={19} color="#B9680F" />
                </View>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryLabel}>
                    {hasNextPage ? "Balance on loaded invoices" : "Outstanding balance"}
                  </Text>
                  <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={styles.summaryValue}>
                    {money(outstanding, currency)}
                  </Text>
                </View>
                <View style={styles.summaryCount}>
                  <Text style={styles.summaryCountValue}>{outstandingCount}</Text>
                  <Text style={styles.summaryCountLabel}>{hasNextPage ? "loaded" : "due"}</Text>
                </View>
              </View>
              <SearchAndFilters
                label="Search invoices"
                placeholder="Search number, service, or status"
                search={search}
                onSearchChange={setSearch}
                options={INVOICE_FILTERS}
                selected={filter}
                onSelect={setFilter}
              />
            </View>
          }
          contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
          }}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch() }} tintColor={colors.primaryDark} />}
          ListFooterComponent={filteredInvoices.length > 0 && hasNextPage ? (
            <LoadMoreButton
              label="invoices"
              loading={isFetchingNextPage}
              error={isFetchNextPageError}
              onLoadMore={() => { void fetchNextPage() }}
            />
          ) : undefined}
          ListEmptyComponent={
            <View style={styles.empty}>
              {invoices.length === 0 && !hasNextPage
                ? <Receipt size={20} color={colors.muted} />
                : <AlertCircle size={20} color={colors.muted} />}
              <Text style={styles.emptyTitle}>
                {invoices.length === 0 && !hasNextPage
                  ? "No invoices yet"
                  : hasNextPage ? "Keep searching more invoices" : "No invoices match your search"}
              </Text>
              <Text style={styles.emptyText}>
                {invoices.length === 0 && !hasNextPage
                  ? "Invoices will show up here once you're billed."
                  : hasNextPage
                    ? "The rest of your invoices are on the next page."
                    : "Try another search or choose a different status filter."}
              </Text>
              {hasNextPage && (
                <LoadMoreButton
                  label="invoices"
                  loading={isFetchingNextPage}
                  error={isFetchNextPageError}
                  onLoadMore={() => { void fetchNextPage() }}
                />
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  flex1: { flex: 1, minWidth: 0 },

  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg },
  eyebrow: { color: colors.subtle, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  title: { marginTop: 5, fontSize: 30, fontWeight: "800", color: colors.ink, letterSpacing: -0.5 },
  subtitle: { marginTop: 5, fontSize: 13, lineHeight: 19, color: colors.muted },

  list: { paddingHorizontal: spacing.xl, paddingBottom: 24, gap: spacing.md, flexGrow: 1 },
  listHeader: { gap: spacing.md, marginBottom: 3 },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  summaryIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.warningSoft, alignItems: "center", justifyContent: "center" },
  summaryCopy: { flex: 1 },
  summaryLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  summaryValue: { marginTop: 3, color: colors.ink, fontSize: 20, fontWeight: "800" },
  summaryCount: { alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44, borderRadius: radius.md, backgroundColor: colors.canvas },
  summaryCountValue: { color: colors.primaryDark, fontSize: 15, fontWeight: "800" },
  summaryCountLabel: { color: colors.muted, fontSize: 10, fontWeight: "600" },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  overline: { color: colors.subtle, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  invoiceNumber: { marginTop: 3, fontSize: 16, fontWeight: "700", color: colors.ink },
  dueRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md },
  meta: { fontSize: 12, color: colors.muted },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  total: { fontSize: 17, fontWeight: "800", color: colors.ink },
  balance: { fontSize: 12, fontWeight: "700", color: colors.danger },

  empty: { marginTop: 60, alignItems: "center", gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  emptyText: { fontSize: 12, color: colors.muted, textAlign: "center" },
})
