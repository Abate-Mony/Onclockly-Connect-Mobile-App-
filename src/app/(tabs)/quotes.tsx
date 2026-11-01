import { useState } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { router } from "expo-router"
import { AlertCircle, FileText } from "lucide-react-native"
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
import type { PortalQuote, QuotesResponse } from "../../utils/types"

type QuoteFilter = "all" | "review" | "accepted" | "closed"

const QUOTE_FILTERS: readonly FilterOption<QuoteFilter>[] = [
  { label: "All quotes", value: "all" },
  { label: "To review", value: "review" },
  { label: "Accepted", value: "accepted" },
  { label: "Closed", value: "closed" },
]

function QuoteRow({ quote }: { quote: PortalQuote }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${quote.quoteNumber}, ${quote.title}, ${quote.status}, ${money(quote.total, quote.currency)}`}
      onPress={() => router.push({ pathname: "/quote/[id]", params: { id: quote._id } })}
      style={({ pressed }) => [styles.card, shadow.md, pressableFeedback(pressed)]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.flex1}>
          <Text style={styles.overline}>QUOTE {quote.quoteNumber}</Text>
          <Text style={styles.quoteTitle} numberOfLines={2}>{quote.title}</Text>
        </View>
        <StatusBadge status={quote.status} />
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.total}>{money(quote.total, quote.currency)}</Text>
        {!!quote.validUntil && <Text style={styles.meta}>Valid until {formatDate(quote.validUntil)}</Text>}
      </View>
    </Pressable>
  )
}

export default function QuotesScreen() {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<QuoteFilter>("all")
  const { data, isLoading, isError, refetch, isRefetching, hasNextPage, fetchNextPage, isFetchingNextPage, isFetchNextPageError } = useInfiniteQuery({
    queryKey: ["portal-quotes"],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await customFetch.get<QuotesResponse>("/portal/quotes", { params: { page: pageParam } })
      return data
    },
    getNextPageParam: lastPage => lastPage.currentPage < lastPage.totalPages
      ? lastPage.currentPage + 1
      : undefined,
  })

  const quotes = data?.pages.flatMap(page => page.quotes) ?? []
  const reviewCount = quotes.filter(q => q.status === "sent" || q.status === "viewed").length
  const normalizedSearch = search.trim().toLowerCase()
  const filteredQuotes = quotes.filter(quote => {
    const matchesFilter = filter === "all"
      || (filter === "review" && (quote.status === "sent" || quote.status === "viewed"))
      || (filter === "accepted" && quote.status === "accepted")
      || (filter === "closed" && (quote.status === "declined" || quote.status === "expired"))
    const searchableText = [
      quote.quoteNumber,
      quote.title,
      quote.status,
      money(quote.total, quote.currency),
      quote.validUntil ? formatDate(quote.validUntil) : "",
    ].filter(Boolean).join(" ").toLowerCase()
    return matchesFilter && searchableText.includes(normalizedSearch)
  })
  const tabBarClearance = useTabBarClearance()

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>YOUR SERVICES</Text>
        <Text style={styles.title}>Quotes</Text>
        <Text style={styles.subtitle}>Review and respond to quotes from your service provider.</Text>
      </View>

      {isLoading ? (
        <LoadingSkeleton showSummary showFilters />
      ) : isError && !data ? (
        <RetryState title="Couldn’t load your quotes" message="Check your connection and try again." onRetry={() => { refetch() }} />
      ) : (
        <FlatList
          data={filteredQuotes}
          keyExtractor={q => q._id}
          renderItem={({ item }) => <QuoteRow quote={item} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {isError && !isFetchNextPageError && <RetryNotice onRetry={() => { refetch() }} />}
              <View style={[styles.summary, shadow.md]}>
                <View style={styles.summaryIcon}>
                  <FileText size={19} color={colors.primaryDark} />
                </View>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryLabel}>Awaiting your review</Text>
                  <Text style={styles.summaryValue}>{reviewCount} {reviewCount === 1 ? "quote" : "quotes"}</Text>
                </View>
              </View>
              <SearchAndFilters
                label="Search quotes"
                placeholder="Search number, title, or status"
                search={search}
                onSearchChange={setSearch}
                options={QUOTE_FILTERS}
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
          ListFooterComponent={filteredQuotes.length > 0 && hasNextPage ? (
            <LoadMoreButton
              label="quotes"
              loading={isFetchingNextPage}
              error={isFetchNextPageError}
              onLoadMore={() => { void fetchNextPage() }}
            />
          ) : undefined}
          ListEmptyComponent={
            <View style={styles.empty}>
              {quotes.length === 0 && !hasNextPage
                ? <FileText size={20} color={colors.muted} />
                : <AlertCircle size={20} color={colors.muted} />}
              <Text style={styles.emptyTitle}>
                {quotes.length === 0 && !hasNextPage
                  ? "No quotes yet"
                  : hasNextPage ? "Keep searching more quotes" : "No quotes match your search"}
              </Text>
              <Text style={styles.emptyText}>
                {quotes.length === 0 && !hasNextPage
                  ? "Quotes from your service provider will show up here."
                  : hasNextPage
                    ? "The rest of your quotes are on the next page."
                    : "Try another search or choose a different status filter."}
              </Text>
              {hasNextPage && (
                <LoadMoreButton
                  label="quotes"
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
  summaryIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  summaryCopy: { flex: 1 },
  summaryLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  summaryValue: { marginTop: 3, color: colors.ink, fontSize: 18, fontWeight: "800" },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  overline: { color: colors.subtle, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  quoteTitle: { marginTop: 5, fontSize: 15, fontWeight: "700", color: colors.ink, lineHeight: 21 },

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
  meta: { fontSize: 12, color: colors.muted, fontWeight: "500" },

  empty: { marginTop: 60, alignItems: "center", gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  emptyText: { fontSize: 12, color: colors.muted, textAlign: "center" },
})
