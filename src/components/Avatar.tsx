import { Image, StyleSheet, Text, View } from "react-native"
import { colors, radius } from "../utils/theme"

export function Avatar({
  name,
  photoUrl,
  size = 44,
  tone = "light",
}: {
  name: string
  photoUrl?: string | null
  size?: number
  // "dark" for placement on a dark/colored background (e.g. the hero
  // card), "light" for placement on a white/canvas surface.
  tone?: "light" | "dark"
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("") || "C"

  const dims = { width: size, height: size, borderRadius: size / 2 }

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={[styles.image, dims]} />
  }

  return (
    <View
      style={[
        styles.fallback,
        dims,
        { backgroundColor: tone === "dark" ? "rgba(255,255,255,0.16)" : colors.primarySoft },
      ]}
    >
      <Text
        maxFontSizeMultiplier={1.2}
        style={[styles.initials, { fontSize: size * 0.38, color: tone === "dark" ? colors.white : colors.primaryDark }]}
      >
        {initials}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surfaceAlt },
  fallback: { alignItems: "center", justifyContent: "center", borderRadius: radius.pill },
  initials: { fontWeight: "800" },
})
