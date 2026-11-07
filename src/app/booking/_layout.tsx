import { Stack } from "expo-router"

export default function BookingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" options={{ title: "Booking" }} />
      <Stack.Screen name="request/[id]" options={{ title: "Booking request" }} />
      <Stack.Screen
        name="booking-confirmation-success"
        options={{ title: "Booking Confirmation", gestureEnabled: false }}
      />
    </Stack>
  )
}
