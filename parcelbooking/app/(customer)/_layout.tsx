/**
 * Customer Layout
 * Tabs + stack screens (booking, payment, legal)
 */

import { Stack } from "expo-router";

export default function CustomerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="home" />
      <Stack.Screen name="booking" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="about" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="help" />
    </Stack>
  );
}
