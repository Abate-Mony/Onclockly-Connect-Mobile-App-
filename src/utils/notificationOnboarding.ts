import * as SecureStore from "expo-secure-store"

const KEY = "notificationOnboardingComplete"

export async function hasCompletedNotificationOnboarding(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEY).catch(() => null)) === "1"
}

export async function markNotificationOnboardingComplete(): Promise<void> {
  await SecureStore.setItemAsync(KEY, "1").catch(() => undefined)
}
