/**
 * Payment Success Screen
 * Payment confirmation
 */

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { colors } from "../../../theme/colors";
import { Feather } from "@expo/vector-icons";
import { useBooking } from "../../../hooks/useBooking";

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { transactionId, bookingId, merchantRefId } = useLocalSearchParams<{
    transactionId?: string;
    bookingId?: string;
    merchantRefId?: string;
  }>();
  const { fetchBooking } = useBooking();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    // Refresh booking data to get updated payment status
    if (bookingId) {
      fetchBooking(bookingId);
      setVerifying(false);
    } else {
      setVerifying(false);
    }
  }, [bookingId]);

  if (verifying) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.verifyingText}>Verifying payment...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.successCard}>
          <View style={styles.iconContainer}>
            <Feather name="check-circle" size={64} color={colors.success} />
          </View>
          <Text style={styles.title}>Payment Successful!</Text>
          <Text style={styles.message}>
            Your payment has been processed successfully.
          </Text>
          {(transactionId || merchantRefId) && (
            <Text style={styles.transactionId}>
              Transaction ID: {(transactionId || merchantRefId || "").slice(0, 12)}...
            </Text>
          )}
        </Card>

        <Button
          title="View Booking"
          onPress={() => {
            if (bookingId) {
              router.push(`/(customer)/booking/track?id=${bookingId}`);
            } else {
              router.push("/(customer)/home");
            }
          }}
          style={styles.button}
        />

        <Button
          title="Go to Home"
          variant="outline"
          onPress={() => router.push("/(customer)/home")}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  successCard: {
    alignItems: "center",
    paddingVertical: 32,
    marginBottom: 24,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  transactionId: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: "center",
    marginTop: 8,
  },
  button: {
    marginBottom: 12,
  },
  verifyingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

