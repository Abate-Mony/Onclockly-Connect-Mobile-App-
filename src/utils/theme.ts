import { Platform, type ViewStyle } from "react-native"

// Shared light theme for screens, navigation and reusable components.
export const colors = {
  // Brand
  primary: "#173F35",
  primaryDark: "#102F28",
  primarySoft: "#E9F0E9",

  // Text
  ink: "#182D26",
  inkSoft: "#43564B",
  muted: "#68756D",
  subtle: "#819087",

  // Surfaces
  canvas: "#F6F5F0",
  surface: "#FFFFFF",
  surfaceAlt: "#F0F2EB",
  border: "#E3E7DF",
  divider: "#EDF0E9",

  // Semantic
  danger: "#DC2626",
  dangerSoft: "#FDECEC",
  warning: "#936126",
  warningSoft: "#F8F0E1",
  info: "#2563EB",
  infoSoft: "#EAF1FF",
  success: "#237457",
  successSoft: "#E9F0E9",

  white: "#FFFFFF",
} as const

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

function makeShadow(opacity: number, blur: number, offsetY: number, elevation: number): ViewStyle {
  return Platform.select({
    // Android elevation reads much lighter than an equivalent iOS shadow at
    // the same visual weight, so it's bumped relative to its iOS pair.
    android: { elevation },
    default: {
      shadowColor: colors.ink,
      shadowOpacity: opacity,
      shadowRadius: blur,
      shadowOffset: { width: 0, height: offsetY },
    },
  }) as ViewStyle
}

// Three weights: sm for small chips/buttons, md for ordinary cards, lg for
// hero/featured surfaces that should visibly float above everything else.
export const shadow = {
  sm: makeShadow(0.06, 6, 2, 2),
  md: makeShadow(0.12, 18, 8, 6),
  lg: makeShadow(0.18, 28, 16, 10),
} as const
