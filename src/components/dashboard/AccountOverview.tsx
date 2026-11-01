import { router } from "expo-router"
import { ChevronRight } from "lucide-react-native"
import type { ReactNode } from "react"
import { StyleSheet, Text, View } from "react-native"
import type { useDashboardData } from "../../hooks/useDashboardData"
import { groupOutstandingByCurrency } from "../../utils/dashboard"
import { money } from "../../utils/format"
import { colors } from "../../utils/theme"
import { StyledPressable } from "../StyledPressable"
import { QueryNotice, SectionHeading } from "./DashboardPrimitives"

type DashboardData = ReturnType<typeof useDashboardData>

function formatBalance(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(amount)
  } catch {
    return money(amount, currency)
  }
}

function AccountRow({
  title,
  detail,
  value,
  accessibilityLabel,
  onPress,
  stacked,
  warning = false,
}: {
  title: string
  detail: string
  value: ReactNode
  accessibilityLabel: string
  onPress: () => void
  stacked: boolean
  warning?: boolean
}) {
  return (
    <StyledPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
    >
      {({ pressed }) => (
        <View style={[styles.row, stacked && styles.stackedRow, pressed && styles.pressed]}>
          <View style={[styles.copy, stacked && styles.stackedCopy]}>
            <Text style={styles.label}>{title}</Text>
            <Text style={[styles.detail, warning && styles.warning]}>{detail}</Text>
          </View>
          <View style={[styles.valueGroup, stacked && styles.stackedValueGroup]}>
            <View style={styles.values}>{value}</View>
            <ChevronRight size={14} color={colors.muted} />
          </View>
        </View>
      )}
    </StyledPressable>
  )
}

function LoadingRow({ label, stacked }: { label: string; stacked: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={`Loading ${label}`}
      accessibilityState={{ busy: true }}
      style={[styles.row, stacked && styles.stackedRow]}
    >
      <View style={[styles.copy, stacked && styles.stackedCopy]}>
        <View style={[styles.skeleton, styles.skeletonLabel]} />
        <View style={[styles.skeleton, styles.skeletonDetail]} />
      </View>
      <View style={[styles.skeleton, styles.skeletonValue]} />
    </View>
  )
}

function UnavailableRow({ title, stacked }: { title: string; stacked: boolean }) {
  return (
    <View style={[styles.row, stacked && styles.stackedRow]}>
      <Text style={[styles.label, styles.copy, stacked && styles.stackedCopy]}>{title}</Text>
      <Text style={styles.unavailable}>Unavailable</Text>
    </View>
  )
}

function QuotesRow({ query, stacked }: { query: DashboardData["quotes"]; stacked: boolean }) {
  if (query.isPending) return <LoadingRow label="quotes" stacked={stacked} />
  if (!query.data) return <UnavailableRow title="Quotes to review" stacked={stacked} />

  const { total, first } = query.data

  return (
    <AccountRow
      title="Quotes to review"
      detail={total === 0 ? "All caught up" : "Awaiting your review"}
      accessibilityLabel={`${total} quotes to review. ${total === 0 ? "All caught up." : "Awaiting your review."} View quotes.`}
      stacked={stacked}
      onPress={() => total === 1 && first
        ? router.push({ pathname: "/quote/[id]", params: { id: first._id } })
        : router.push("/quotes")}
      value={<Text style={[styles.value, stacked && styles.stackedValue]}>{total}</Text>}
    />
  )
}

function InvoicesRow({ query, stacked }: { query: DashboardData["invoices"]; stacked: boolean }) {
  if (query.isPending) return <LoadingRow label="outstanding balance" stacked={stacked} />
  if (!query.data) return <UnavailableRow title="Outstanding" stacked={stacked} />

  const invoices = query.data
  const groups = groupOutstandingByCurrency(invoices)
  const stackBalance = stacked || groups.some(group => formatBalance(group.total, group.currency).length > 13)
  const count = invoices.length
  const overdue = invoices.filter(invoice => invoice.isOverdue).length
  const allBalances = groups.length
    ? groups.map(group => `${formatBalance(group.total, group.currency)} ${group.currency}`).join(", ")
    : "No outstanding balance"
  const detail = overdue > 0
    ? `${overdue} of ${count} overdue`
    : count > 0 ? `${count} invoice${count === 1 ? "" : "s"} to pay` : "Nothing to pay"

  return (
    <AccountRow
      title="Outstanding"
      detail={detail}
      warning={overdue > 0}
      accessibilityLabel={`${allBalances}. ${count} outstanding invoices, ${overdue} overdue. View invoices.`}
      stacked={stackBalance}
      onPress={() => count === 1
        ? router.push({ pathname: "/invoice/[id]", params: { id: invoices[0]._id } })
        : router.push("/invoices")}
      value={groups.length === 0 ? (
        <Text style={[styles.value, stackBalance && styles.stackedValue]}>0</Text>
      ) : (
        <View style={styles.balances}>
          {groups.slice(0, 2).map(group => (
            <Text
              key={group.currency}
              style={[styles.value, groups.length > 1 && styles.currencyValue, stackBalance && styles.stackedValue]}
              numberOfLines={stackBalance ? undefined : 1}
              adjustsFontSizeToFit={!stackBalance}
              minimumFontScale={0.8}
            >
              {formatBalance(group.total, group.currency)}
              {groups.length > 1 ? <Text style={styles.currencyCode}> {group.currency}</Text> : null}
            </Text>
          ))}
          {groups.length > 2 ? (
            <Text style={[styles.moreCurrencies, stackBalance && styles.stackedValue]}>
              +{groups.length - 2} more currencies
            </Text>
          ) : null}
        </View>
      )}
    />
  )
}

export function OverviewSection({ quotes, invoices, stacked }: {
  quotes?: DashboardData["quotes"]
  invoices?: DashboardData["invoices"]
  stacked: boolean
}) {
  const failedQueries = [quotes, invoices].filter(query => query?.isError)
  const unavailable: string[] = []
  const saved: string[] = []

  if (quotes?.isError) (quotes.data ? saved : unavailable).push("quotes")
  if (invoices?.isError) (invoices.data ? saved : unavailable).push("balance")

  const message = unavailable.length > 0
    ? `Couldn't load your ${unavailable.join(" and ")}.${saved.length > 0 ? " Other results are saved." : ""}`
    : `Couldn't refresh. Showing saved ${saved.join(" and ")}.`

  function retryFailedQueries() {
    void Promise.allSettled(failedQueries.map(query => query!.refetch()))
  }

  return (
    <View style={styles.section}>
      <SectionHeading title="Your account" />
      <View style={styles.surface}>
        {quotes ? <QuotesRow query={quotes} stacked={stacked} /> : null}
        {quotes && invoices ? <View style={styles.divider} /> : null}
        {invoices ? <InvoicesRow query={invoices} stacked={stacked} /> : null}
        {failedQueries.length > 0 ? (
          <View style={styles.notice}>
            <QueryNotice
              message={message}
              onRetry={retryFailedQueries}
              busy={failedQueries.some(query => query?.isFetching)}
            />
          </View>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  surface: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    minHeight: 74,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stackedRow: { flexDirection: "column", alignItems: "stretch", gap: 8 },
  pressed: { opacity: 0.64 },
  copy: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  stackedCopy: { flexGrow: 0, flexShrink: 0, flexBasis: "auto", width: "100%" },
  label: { color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  detail: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  warning: { color: colors.warning },
  valueGroup: {
    maxWidth: "55%",
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stackedValueGroup: { maxWidth: "100%", alignSelf: "stretch", justifyContent: "space-between" },
  values: { flexShrink: 1, minWidth: 0 },
  value: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
    letterSpacing: -0.7,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  stackedValue: { textAlign: "left" },
  balances: { gap: 3 },
  currencyValue: { fontSize: 20, lineHeight: 27, letterSpacing: -0.3 },
  currencyCode: { color: colors.muted, fontSize: 12, letterSpacing: 0 },
  moreCurrencies: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "right" },
  unavailable: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: "500" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: 16 },
  notice: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingHorizontal: 16, paddingVertical: 4 },
  skeleton: { borderRadius: 4, backgroundColor: colors.surfaceAlt },
  skeletonLabel: { width: 112, height: 13 },
  skeletonDetail: { width: 136, height: 10, marginTop: 8 },
  skeletonValue: { width: 64, height: 25 },
})
