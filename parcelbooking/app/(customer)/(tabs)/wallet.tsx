/**
 * Customer Wallet tab (MVP)
 */

import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useAuthStore } from "../../../store/authStore";
import { useBooking } from "../../../hooks/useBooking";
import { Button } from "../../../components/Button";
import { colors } from "../../../theme/colors";

export default function WalletTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { bookings, fetchBookings } = useBooking();

  useFocusEffect(
    useCallback(() => {
      if (user) fetchBookings().catch(() => {});
    }, [user, fetchBookings])
  );

  const paidOnline = useMemo(
    () =>
      (bookings || []).filter(
        (b) => b.paymentMethod === "online" && b.paymentStatus === "paid"
      ),
    [bookings]
  );
  const spent = paidOnline.reduce((s, b) => s + (b.fare || 0), 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Wallet</Text>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Wallet balance</Text>
          <Text style={styles.balance}>₹0</Text>
          <Text style={styles.hint}>Add money to pay faster at checkout</Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statLabel}>Paid online (all time)</Text>
          <Text style={styles.statValue}>₹{spent.toFixed(0)}</Text>
        </View>

        <Button
          title="Add money"
          onPress={() =>
            Alert.alert(
              "Coming soon",
              "Wallet top-up will be available in a future update. Use UPI/COD for now."
            )
          }
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.background,
  },
  content: { padding: 16 },
  card: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  label: { color: "rgba(255,255,255,0.9)", fontWeight: "600" },
  balance: { color: "#fff", fontSize: 40, fontWeight: "800", marginTop: 8 },
  hint: { color: "rgba(255,255,255,0.85)", marginTop: 6, fontSize: 13 },
  stat: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statLabel: { color: colors.textSecondary, fontWeight: "600" },
  statValue: { color: colors.text, fontWeight: "800", fontSize: 16 },
});
