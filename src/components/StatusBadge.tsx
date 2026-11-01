import { StyleSheet, Text, View } from "react-native"
import { radius } from "../utils/theme"

// Mirrors client_portal_onclockly's src/components/Status.tsx config exactly
// — covers booking/quote/invoice/request statuses in one place.
type Variant = "info" | "warning" | "success" | "danger" | "neutral"

const VARIANT_COLORS: Record<Variant, { bg: string; dot: string; text: string }> = {
  info: { bg: "#EAF1FF", dot: "#2563EB", text: "#1D4ED8" },
  warning: { bg: "#FFF5E3", dot: "#D97706", text: "#92610A" },
  success: { bg: "#E3F8EE", dot: "#0E9F6E", text: "#0A7A55" },
  danger: { bg: "#FDECEC", dot: "#DC2626", text: "#B91C1C" },
  neutral: { bg: "#F1F4F2", dot: "#6B7684", text: "#475058" },
}

const CONFIG: Record<string, { label: string; variant: Variant }> = {
  draft: { label: "Pending confirmation", variant: "warning" },
  published: { label: "Confirmed", variant: "info" },
  pending: { label: "Pending review", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "danger" },
  sent: { label: "Sent", variant: "info" },
  viewed: { label: "Viewed", variant: "warning" },
  accepted: { label: "Accepted", variant: "success" },
  declined: { label: "Declined", variant: "danger" },
  expired: { label: "Expired", variant: "neutral" },
  paid: { label: "Paid", variant: "success" },
  overdue: { label: "Sent · overdue", variant: "warning" },
}

export function StatusBadge({ status }: { status: string }) {
  const item = CONFIG[status] ?? { label: status, variant: "neutral" as const }
  const color = VARIANT_COLORS[item.variant]
  return (
    <View style={[styles.badge, { backgroundColor: color.bg }]}>
      <View style={[styles.dot, { backgroundColor: color.dot }]} />
      <Text style={[styles.text, { color: color.text }]}>{item.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: "700" },
})
