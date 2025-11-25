/**
 * Payment Success Screen
 * Payment confirmation
 */

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams, usePathname } from "expo-router";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { colors } from "../../../theme/colors";
import { Feather } from "@expo/vector-icons";
import { useBooking } from "../../../hooks/useBooking";
import { apiRequest } from "../../../services/apiClient";

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { transactionId, bookingId, merchantRefId } = useLocalSearchParams<{
    transactionId?: string;
    bookingId?: string;
    merchantRefId?: string;
  }>();
  const { fetchBooking, fetchBookings } = useBooking();
  const [verifying, setVerifying] = useState(true);
  const [resolvedBookingId, setResolvedBookingId] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false); // Prevent multiple fetches

  // Log when we're on this screen to help debug navigation issues
  useEffect(() => {
    // Prevent multiple runs
    if (hasFetched) {
      return;
    }
    
    setHasFetched(true); // Mark as fetched immediately to prevent re-runs
    
    // If we have merchantRefId but no bookingId, try to get bookingId from backend
    const fetchBookingFromMerchantRef = async () => {
      try {
        let finalBookingId = bookingId || null;

        // Set a timeout to prevent getting stuck in verification (reduced to 5 seconds)
        const timeoutId = setTimeout(() => {
            setVerifying(false);
          // Still try to refresh bookings even if we don't have bookingId (in background)
            fetchBookings().catch((err) => {
            if (__DEV__) console.error('[PaymentSuccess] Error refreshing bookings on timeout:', err);
            });
          // Don't auto-navigate - let user see the success message and click button
        }, 5000); // 5 second timeout (reduced from 10s)

        if (merchantRefId && !bookingId) {
          try {
            const apiUrl = `/api/payments/success?merchantRefId=${encodeURIComponent(merchantRefId)}`;
            
            // Call backend to get bookingId from merchantRefId
            const response = await apiRequest<{ success: boolean; bookingId?: string; message?: string }>(
              apiUrl,
              { method: "GET" }
            );
            
            if (response.success && response.bookingId) {
              finalBookingId = response.bookingId;
              setResolvedBookingId(finalBookingId);
              await fetchBooking(finalBookingId);
            }
          } catch (error) {
            if (__DEV__) {
              console.error('[PaymentSuccess] Error fetching booking from merchantRefId:', error);
            }
            // Continue even if this fails
          }
        } else if (bookingId) {
          finalBookingId = bookingId;
          setResolvedBookingId(finalBookingId);
          await fetchBooking(bookingId);
        }

        // Refresh all bookings once in background (don't wait for it)
        fetchBookings().catch((error) => {
          if (__DEV__) console.error('[PaymentSuccess] Background refresh failed:', error);
          });

        clearTimeout(timeoutId);
        setVerifying(false);
        } catch (error) {
        // Log error but don't show to user - payment was successful, just couldn't fetch booking details
        if (__DEV__) {
          console.warn('[PaymentSuccess] Error in booking resolution (non-critical):', error);
        }
        setVerifying(false);
        // On error, still show success screen but user can navigate manually
        // Payment was successful, so we show success even if booking fetch failed
      }
    };

    fetchBookingFromMerchantRef();
    // Only depend on initial params, not functions or state that changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, merchantRefId]); // Removed verifying, fetchBooking, fetchBookings, router to prevent loops

  if (verifying) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.verifyingText}>Processing payment...</Text>
          <Text style={styles.verifyingSubtext}>Please wait while we confirm your booking</Text>
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
          <Text style={styles.title}>
            {resolvedBookingId ? "Booking Successful!" : "Payment Successful!"}
          </Text>
          <Text style={styles.message}>
            {resolvedBookingId 
              ? "Your booking has been confirmed and payment processed successfully!" 
              : "Your payment has been processed successfully."}
          </Text>
          {resolvedBookingId && (
            <Text style={styles.successSubtext}>
              Booking Confirmed ✓
            </Text>
          )}
          {(transactionId || merchantRefId) && (
            <Text style={styles.transactionId}>
              Transaction ID: {(transactionId || merchantRefId || "").slice(0, 12)}...
            </Text>
          )}
        </Card>

        {resolvedBookingId && (
          <Text style={styles.bookingIdText}>
            Booking ID: {resolvedBookingId}
          </Text>
        )}

        <Button
          title="Go to Home"
          onPress={() => {
                    try {
                      router.replace("/(customer)/home" as any);
                    } catch (error) {
                      if (__DEV__) console.error('[PaymentSuccess] Error navigating to home:', error);
                      try {
                        router.push("/(customer)/home" as any);
                      } catch (pushError) {
                        if (__DEV__) console.error('[PaymentSuccess] Push also failed:', pushError);
                      }
            }
          }}
          style={styles.button}
        />

        {resolvedBookingId && (
        <Button
            title="View Booking Details"
          variant="outline"
                    onPress={async () => {
                      try {
                        router.push(`/(customer)/booking/track?id=${resolvedBookingId}` as any);
                      } catch (error) {
                        if (__DEV__) console.error('[PaymentSuccess] Error navigating to booking details:', error);
                      }
                    }}
          style={styles.button}
        />
        )}

        <Text style={styles.redirectingMessage}>
          Please wait while redirecting to home page...
        </Text>
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
    fontWeight: "600",
  },
  verifyingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textLight,
    textAlign: "center",
  },
  bookingIdText: {
    fontSize: 14,
    color: colors.primary,
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "600",
  },
  successSubtext: {
    fontSize: 18,
    color: colors.success,
    textAlign: "center",
    marginTop: 8,
    fontWeight: "700",
  },
  redirectingMessage: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 16,
    lineHeight: 18,
    fontStyle: "italic",
  },
});

