import { router, type Href } from "expo-router"
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ChevronRight,
  Files,
  Plus,
  UserRound,
  type LucideIcon,
} from "lucide-react-native"
import { Fragment } from "react"
import { StyleSheet, Text, View, useWindowDimensions } from "react-native"
import { colors } from "../../utils/theme"
import { StyledPressable } from "../StyledPressable"
import { SectionHeading } from "./DashboardPrimitives"

type UtilityAction = {
  title: string
  Icon: LucideIcon
  href: Href
}

export function QuickActions({
  canReadBookings,
  canRequest,
}: {
  canReadBookings: boolean
  canRequest: boolean
}) {
  const { fontScale } = useWindowDimensions()
  const stacked = fontScale > 1.3
  const utilities: UtilityAction[] = [
    ...(canReadBookings
      ? [{ title: "Sites", Icon: Building2, href: "/sites" as const }]
      : []),
    { title: "Documents", Icon: Files, href: "/documents" },
    { title: "Profile", Icon: UserRound, href: "/profile" },
  ]

  return (
    <View style={styles.section}>
      <SectionHeading title="Quick actions" />

      {canRequest && (
        <StyledPressable
          accessibilityRole="button"
          accessibilityLabel="Request a visit"
          onPress={() => router.push("/request-booking")}
        >
          {({ pressed }) => (
            <View style={[styles.primaryAction, pressed && styles.pressed]}>
              <Plus size={18} color={colors.white} strokeWidth={1.8} />
              <Text style={styles.primaryLabel}>Request a visit</Text>
              <ArrowRight size={18} color={colors.white} strokeWidth={1.8} />
            </View>
          )}
        </StyledPressable>
      )}

      {canReadBookings && (
        <StyledPressable
          accessibilityRole="button"
          accessibilityLabel="Manage bookings"
          onPress={() => router.push("/bookings")}
        >
          {({ pressed }) => (
            <View style={[styles.secondaryAction, pressed && styles.pressed]}>
              <CalendarDays size={20} color={colors.primary} strokeWidth={1.7} />
              <Text style={styles.secondaryLabel}>Manage bookings</Text>
              <ChevronRight size={16} color={colors.muted} strokeWidth={1.8} />
            </View>
          )}
        </StyledPressable>
      )}

      <View style={[styles.utilityStrip, stacked && styles.utilityStripStack]}>
        {utilities.map(({ title, Icon, href }, index) => (
          <Fragment key={title}>
            {index > 0 && (
              <View
                style={[
                  styles.utilityDivider,
                  stacked && styles.utilityDividerStack,
                ]}
              />
            )}
            <View style={[styles.utilityCell, stacked && styles.utilityCellStack]}>
              <StyledPressable
                accessibilityRole="button"
                accessibilityLabel={title}
                onPress={() => router.push(href)}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.utilityAction,
                      stacked && styles.utilityActionStack,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Icon size={20} color={colors.primary} strokeWidth={1.7} />
                    <Text style={styles.utilityLabel}>{title}</Text>
                  </View>
                )}
              </StyledPressable>
            </View>
          </Fragment>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  primaryAction: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  primaryLabel: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
  secondaryAction: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryLabel: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  utilityStrip: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  utilityStripStack: { flexDirection: "column" },
  utilityCell: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  utilityCellStack: { flexGrow: 0, flexShrink: 0, flexBasis: "auto" },
  utilityAction: {
    minHeight: 80,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  utilityActionStack: {
    minHeight: 56,
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 12,
    paddingHorizontal: 20,
  },
  utilityLabel: {
    flexShrink: 1,
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    textAlign: "center",
  },
  utilityDivider: {
    width: 1,
    marginVertical: 16,
    backgroundColor: colors.divider,
  },
  utilityDividerStack: {
    width: "auto",
    height: 1,
    marginHorizontal: 20,
    marginVertical: 0,
  },
  pressed: { opacity: 0.75 },
})
