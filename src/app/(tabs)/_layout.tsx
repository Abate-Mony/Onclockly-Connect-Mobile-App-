import { Tabs } from "expo-router"
import type { LucideIcon } from "lucide-react-native"
import { FileText, Home, Receipt, User } from "lucide-react-native"
import { StyleSheet, View, useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "../../context/AuthContext"
import { canClient } from "../../utils/clientPermissions"
import { colors, radius } from "../../utils/theme"

function TabIcon({ Icon, focused }: { Icon: LucideIcon; focused: boolean }) {
  return (
    <View style={[styles.icon, focused && styles.activeIcon]}>
      <Icon size={21} strokeWidth={focused ? 2 : 1.8} color={focused ? colors.primary : colors.muted} />
    </View>
  )
}

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const { fontScale } = useWindowDimensions()
  const { user } = useAuth()
  const contentHeight = 64 + Math.max(0, fontScale - 1) * 16

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelPosition: "below-icon",
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: styles.label,
        tabBarIconStyle: styles.iconContainer,
        tabBarItemStyle: styles.item,
        tabBarStyle: [styles.bar, { height: contentHeight + insets.bottom, paddingBottom: insets.bottom }],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarAccessibilityLabel: "Home",
          tabBarIcon: ({ focused }) => <TabIcon Icon={Home} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="quotes"
        options={{
          title: "Quotes",
          href: canClient(user?.clientRole, "quote:read") ? undefined : null,
          tabBarAccessibilityLabel: "Quotes",
          tabBarIcon: ({ focused }) => <TabIcon Icon={FileText} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: "Invoices",
          href: canClient(user?.clientRole, "invoice:read") ? undefined : null,
          tabBarAccessibilityLabel: "Invoices",
          tabBarIcon: ({ focused }) => <TabIcon Icon={Receipt} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarAccessibilityLabel: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon Icon={User} focused={focused} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: 6,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  item: { paddingTop: 0, paddingBottom: 6 },
  iconContainer: { height: 32, flex: 0 },
  icon: {
    width: 52,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  activeIcon: { backgroundColor: colors.primarySoft },
  label: { fontSize: 11, fontWeight: "600", lineHeight: 16 },
})
