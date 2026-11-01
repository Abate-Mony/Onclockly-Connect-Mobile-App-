import type { ViewStyle } from "react-native"

export function pressableFeedback(pressed: boolean): ViewStyle | undefined {
  return pressed ? { opacity: 0.78, transform: [{ scale: 0.99 }] } : undefined
}
