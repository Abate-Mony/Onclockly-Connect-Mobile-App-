import type { ComponentProps } from "react"
import { Pressable as NativePressable } from "react-native"

export type StyledPressableProps = Omit<
  ComponentProps<typeof NativePressable>,
  "className" | "cssInterop"
>

// NativeWind 4's native interop treats function-valued styles as objects and
// drops their background, layout and pressed-state styles. This StyleSheet-only
// boundary keeps React Native in charge of callbacks while NativeWind remains
// available to components that use className. React 19 forwards ref in props.
export function StyledPressable(props: StyledPressableProps) {
  return <NativePressable {...props} cssInterop={false} />
}
