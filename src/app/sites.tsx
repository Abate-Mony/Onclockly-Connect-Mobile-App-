import { useQuery } from "@tanstack/react-query"
import { router } from "expo-router"
import { AlertCircle, ArrowLeft, Building2, ChevronRight } from "lucide-react-native"
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native"
import { StyledPressable as Pressable } from "../components/StyledPressable"
import { SafeAreaView } from "react-native-safe-area-context"
import { pressableFeedback } from "../components/interactiveStyles"
import { colors, radius, shadow, spacing } from "../utils/theme"
import customFetch from "../utils/customFetch"
import type { PortalSite, SitesResponse } from "../utils/types"

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase()
}

function SiteRow({ site }: { site: PortalSite }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, shadow.md, pressableFeedback(pressed)]}
      onPress={() => router.push({ pathname: "/site/[id]", params: { id: site._id } })}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(site.name)}</Text>
      </View>
      <View style={styles.flex1}>
        <Text style={styles.siteName}>{site.name}</Text>
        {!!site.formattedAddress && <Text style={styles.siteAddress} numberOfLines={1}>{site.formattedAddress}</Text>}
      </View>
      <ChevronRight size={17} color={colors.subtle} />
    </Pressable>
  )
}

export default function SitesScreen() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["portal-sites"],
    queryFn: async () => {
      const { data } = await customFetch.get<SitesResponse>("/portal/sites")
      return data
    },
  })
  const sites = data?.sites ?? []

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressableFeedback(pressed)]}>
          <ArrowLeft size={18} color={colors.ink} />
          <Text style={styles.backText}>Home</Text>
        </Pressable>
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>YOUR LOCATIONS</Text>
        <Text style={styles.title}>Sites</Text>
        <Text style={styles.subtitle}>Your service addresses and booking history</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primaryDark} />
      ) : isError ? (
        <View style={styles.empty}>
          <AlertCircle size={20} color={colors.muted} />
          <Text style={styles.emptyTitle}>Couldn&apos;t load sites</Text>
          <Text style={styles.emptyText}>You may not have permission to view this, or something went wrong.</Text>
        </View>
      ) : (
        <FlatList
          data={sites}
          keyExtractor={s => s._id}
          renderItem={({ item }) => <SiteRow site={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Building2 size={20} color={colors.muted} />
              <Text style={styles.emptyTitle}>No sites yet</Text>
              <Text style={styles.emptyText}>Your service locations will show up here.</Text>
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

  topBar: { paddingHorizontal: 12, paddingTop: 4 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 4, alignSelf: "flex-start" },
  backText: { fontSize: 14, fontWeight: "700", color: colors.ink },

  header: { paddingHorizontal: spacing.xl, paddingTop: 4, paddingBottom: spacing.lg },
  eyebrow: { color: colors.subtle, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  title: { marginTop: 5, fontSize: 26, fontWeight: "800", color: colors.ink, letterSpacing: -0.4 },
  subtitle: { marginTop: 5, fontSize: 13, color: colors.muted },

  list: { paddingHorizontal: spacing.xl, paddingTop: 0, gap: spacing.md, flexGrow: 1 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: { width: 46, height: 46, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 13, fontWeight: "800", color: colors.primaryDark },
  siteName: { fontSize: 14, fontWeight: "700", color: colors.ink },
  siteAddress: { fontSize: 12, color: colors.muted, marginTop: 2 },

  empty: { marginTop: 60, alignItems: "center", gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: colors.inkSoft },
  emptyText: { fontSize: 12, color: colors.muted, textAlign: "center" },
})
