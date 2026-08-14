/**
 * Booking Layout
 * Booking routes layout
 */

import { Stack } from 'expo-router';

export default function BookingLayout() {
  return (
    <Stack>
      <Stack.Screen name="new" options={{ headerShown: false }} />
      <Stack.Screen name="drop" options={{ headerShown: false }} />
      <Stack.Screen name="parcel" options={{ headerShown: false }} />
      <Stack.Screen name="hyperlocal" options={{ headerShown: false }} />
      <Stack.Screen name="hyperlocal-confirm" options={{ headerShown: false }} />
      <Stack.Screen name="waiting" options={{ headerShown: false }} />
      <Stack.Screen name="track" options={{ headerShown: false }} />
      <Stack.Screen name="history" options={{ headerShown: false }} />
      <Stack.Screen name="invoice" options={{ headerShown: false }} />
    </Stack>
  );
}

