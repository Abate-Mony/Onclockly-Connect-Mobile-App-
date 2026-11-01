import { useQuery } from "@tanstack/react-query"
import { router, useLocalSearchParams } from "expo-router"
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react-native"
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native"
import { StyledPressable as Pressable } from "../../components/StyledPressable"
import { SafeAreaView } from "react-native-safe-area-context"
import { pressableFeedback } from "../../components/interactiveStyles"
import { colors, radius, shadow, spacing } from "../../utils/theme"
import customFetch from "../../utils/customFetch"
import type { SiteResponse } from "../../utils/types"

export default function SiteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading } = useQuery({
    queryKey: ["portal-site", id],
    queryFn: async () => {
      const { data } = await customFetch.get<SiteResponse>(`/portal/sites/${id}`)
      return data
    },
    enabled: !!id,
  })
  const site = data?.site

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primaryDark} />
      </SafeAreaView>
    )
  }
  if (!site) return null

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressableFeedback(pressed)]}>
          <ArrowLeft size={18} color={colors.ink} />
          <Text style={styles.backText}>Sites</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, shadow.lg]}>
          <View style={styles.heroIcon}>
            <MapPin size={22} color={colors.white} />
          </View>
          <Text style={styles.title}>{site.name}</Text>
        </View>

        <View style={[styles.card, shadow.md]}>
          <Text style={styles.cardTitle}>Address & contact</Text>
          {!!site.formattedAddress && (
            <View style={styles.row}>
              <View style={styles.rowIcon}><MapPin size={15} color={colors.primaryDark} /></View>
              <Text style={styles.rowText}>{site.formattedAddress}</Text>
            </View>
          )}
          {!!site.contact?.phone && (
            <View style={styles.row}>
              <View style={styles.rowIcon}><Phone size={15} color={colors.primaryDark} /></View>
              <Text style={styles.rowText}>{site.contact.phone}</Text>
            </View>
          )}
          {!!site.contact?.email && (
            <View style={styles.row}>
              <View style={styles.rowIcon}><Mail size={15} color={colors.primaryDark} /></View>
              <Text style={styles.rowText}>{site.contact.email}</Text>
            </View>
          )}
        </View>

        {!!site.accessInstructions && (
          <View style={[styles.card, shadow.md]}>
            <Text style={styles.cardTitle}>Access</Text>
            <Text style={styles.rowText}>{site.accessInstructions}</Text>
          </View>
        )}
        {!!site.parkingInstructions && (
          <View style={[styles.card, shadow.md]}>
            <Text style={styles.cardTitle}>Parking</Text>
            <Text style={styles.rowText}>{site.parkingInstructions}</Text>
          </View>
        )}
        {!!site.instructions && (
          <View style={[styles.card, shadow.md]}>
            <Text style={styles.cardTitle}>Other instructions</Text>
            <Text style={styles.rowText}>{site.instructions}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.md },

  topBar: { paddingHorizontal: 12, paddingTop: 4 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 4, alignSelf: "flex-start" },
  backText: { fontSize: 14, fontWeight: "700", color: colors.ink },

  heroCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    padding: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  heroIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 20, fontWeight: "800", color: colors.white, letterSpacing: -0.3 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: colors.ink, marginBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginBottom: spacing.md },
  rowIcon: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  rowText: { fontSize: 13, color: colors.inkSoft, flex: 1, lineHeight: 19, marginTop: 6 },
})
