import "../../global.css"
import { QueryClientProvider } from "@tanstack/react-query"
import { DefaultTheme, SplashScreen, Stack, ThemeProvider } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import Toast from "react-native-toast-message"
import { NotificationRuntime } from "../components/NotificationRuntime"
import { AuthProvider, useAuth } from "../context/AuthContext"
import { queryClient } from "../lib/queryClient"
import { colors } from "../utils/theme"

SplashScreen.preventAutoHideAsync()

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.canvas,
    card: colors.surface,
    text: colors.ink,
    border: colors.border,
    notification: colors.danger,
  },
}

function SplashScreenController() {
  const { loading } = useAuth()

  useEffect(() => {
    if (!loading) SplashScreen.hide()
  }, [loading])

  return null
}

function RootNavigator() {
  const { accessToken, loading } = useAuth()
  const authenticated = !!accessToken

  if (loading) {
    return null
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ contentStyle: { backgroundColor: colors.canvas } }}>
          <Stack.Protected guard={!authenticated}>
            <Stack.Screen name="login" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={authenticated}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="quote/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="invoice/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="bookings" options={{ headerShown: false }} />
            <Stack.Screen name="booking/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="sites" options={{ headerShown: false }} />
            <Stack.Screen name="site/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="documents" options={{ headerShown: false }} />
            <Stack.Screen name="request-booking" options={{ headerShown: false, presentation: "modal" }} />
          </Stack.Protected>
        </Stack>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <SplashScreenController />
      <NotificationRuntime />
      <RootNavigator />
      <Toast />
    </AuthProvider>
  )
}
