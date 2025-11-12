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
import { apiRequest } from "../../../services/apiClient";

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { transactionId, bookingId, merchantRefId } = useLocalSearchParams<{
    transactionId?: string;
    bookingId?: string;
    merchantRefId?: string;
  }>();
  const { fetchBooking, fetchBookings } = useBooking();
  const [verifying, setVerifying] = useState(true);
  const [resolvedBookingId, setResolvedBookingId] = useState<string | null>(null);

  useEffect(() => {
    console.log('[PaymentSuccess] 🔵 ========== PAYMENT SUCCESS SCREEN ==========');
    console.log('[PaymentSuccess] 📥 Initial params:', {
      transactionId: transactionId,
      bookingId: bookingId,
      merchantRefId: merchantRefId,
    });
    
    // If we have merchantRefId but no bookingId, try to get bookingId from backend
    const fetchBookingFromMerchantRef = async () => {
      try {
        let finalBookingId = bookingId || null;

        console.log('[PaymentSuccess] 🔍 Starting booking resolution process...');

        // Set a timeout to prevent getting stuck
        const timeoutId = setTimeout(() => {
          if (verifying) {
            console.warn('[PaymentSuccess] ⏰ Payment verification timeout (10s) - proceeding anyway');
            setVerifying(false);
            // Still try to refresh bookings even if we don't have bookingId
            fetchBookings().catch((err) => {
              console.error('[PaymentSuccess] ❌ Error refreshing bookings on timeout:', err);
            });
            // Navigate to home after timeout
            setTimeout(() => {
              console.log('[PaymentSuccess] 🏠 Navigating to home screen (timeout)');
              router.replace("/(customer)/home");
            }, 1000);
          }
        }, 10000); // 10 second timeout

        if (merchantRefId && !bookingId) {
          console.log('[PaymentSuccess] 🔍 merchantRefId provided but no bookingId, fetching from backend...');
          try {
            console.log('[PaymentSuccess] 📞 Calling backend API to resolve bookingId...');
            const apiUrl = `/api/payments/success?merchantRefId=${encodeURIComponent(merchantRefId)}`;
            console.log('[PaymentSuccess] 🌐 API URL:', apiUrl);
            
            // Call backend to get bookingId from merchantRefId
            const response = await apiRequest<{ success: boolean; bookingId?: string; message?: string }>(
              apiUrl,
              { method: "GET" }
            );
            
            console.log('[PaymentSuccess] 📥 Backend API response:', response);
            
            if (response.success && response.bookingId) {
              finalBookingId = response.bookingId;
              console.log('[PaymentSuccess] ✅ Resolved bookingId:', finalBookingId);
              setResolvedBookingId(finalBookingId);
              
              // Fetch the specific booking
              console.log('[PaymentSuccess] 📥 Fetching booking details...');
              await fetchBooking(finalBookingId);
              console.log('[PaymentSuccess] ✅ Booking details fetched');
              
              // Wait a bit and fetch again to ensure we have the latest status
              // (Status update might be in progress)
              console.log('[PaymentSuccess] ⏳ Waiting 500ms and fetching booking again to get updated status...');
              await new Promise(resolve => setTimeout(resolve, 500));
              await fetchBooking(finalBookingId);
              console.log('[PaymentSuccess] ✅ Booking details refreshed with latest status');
              
              // Update URL with bookingId
              router.setParams({ bookingId: finalBookingId });
              console.log('[PaymentSuccess] ✅ URL updated with bookingId');
            } else {
              console.warn('[PaymentSuccess] ⚠️  Backend response missing bookingId:', response);
            }
          } catch (error) {
            console.error('[PaymentSuccess] ❌ Error fetching booking from merchantRefId:', {
              error: error,
              message: error instanceof Error ? error.message : String(error),
              merchantRefId: merchantRefId,
            });
            // Continue even if this fails
          }
        } else if (bookingId) {
          console.log('[PaymentSuccess] ✅ bookingId already provided:', bookingId);
          finalBookingId = bookingId;
          setResolvedBookingId(finalBookingId);
          
          console.log('[PaymentSuccess] 📥 Fetching booking details...');
          await fetchBooking(bookingId);
          console.log('[PaymentSuccess] ✅ Booking details fetched');
          
          // Wait a bit and fetch again to ensure we have the latest status
          console.log('[PaymentSuccess] ⏳ Waiting 500ms and fetching booking again to get updated status...');
          await new Promise(resolve => setTimeout(resolve, 500));
          await fetchBooking(bookingId);
          console.log('[PaymentSuccess] ✅ Booking details refreshed with latest status');
        } else {
          console.warn('[PaymentSuccess] ⚠️  No merchantRefId or bookingId provided');
        }

        // Refresh all bookings to show the new booking in the list
        console.log('[PaymentSuccess] 🔄 Refreshing all bookings...');
        try {
          await fetchBookings();
          console.log('[PaymentSuccess] ✅ All bookings refreshed');
        } catch (error) {
          console.error('[PaymentSuccess] ❌ Error refreshing bookings:', {
            error: error,
            message: error instanceof Error ? error.message : String(error),
          });
          // Continue even if refresh fails
        }

        clearTimeout(timeoutId);
        setVerifying(false);
        console.log('[PaymentSuccess] ✅ Verification complete, finalBookingId:', finalBookingId);

        // Refresh bookings one more time to ensure we have the latest status
        console.log('[PaymentSuccess] 🔄 Final refresh of bookings to get updated status...');
        try {
          await fetchBookings();
          console.log('[PaymentSuccess] ✅ Final bookings refresh complete');
        } catch (error) {
          console.error('[PaymentSuccess] ⚠️  Final refresh failed, but continuing:', error);
        }

        // Auto-navigate to home immediately to show the booking
        // Reduced delay so user sees the booking faster
        if (finalBookingId) {
          console.log('[PaymentSuccess] 🏠 Auto-navigating to home in 1 second...');
          setTimeout(() => {
            router.replace("/(customer)/home");
          }, 1000);
        } else {
          console.log('[PaymentSuccess] 🏠 Auto-navigating to home in 2 seconds (no bookingId)...');
          setTimeout(() => {
            router.replace("/(customer)/home");
          }, 2000);
        }
      } catch (error) {
        console.error('[PaymentSuccess] ❌ ========== ERROR IN PAYMENT SUCCESS FLOW ==========');
        console.error('[PaymentSuccess] ❌ Error details:', {
          error: error,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          bookingId: bookingId,
          merchantRefId: merchantRefId,
          transactionId: transactionId,
        });
        setVerifying(false);
        // Navigate to home even on error
        setTimeout(() => {
          console.log('[PaymentSuccess] 🏠 Navigating to home screen (error fallback)');
          router.replace("/(customer)/home");
        }, 2000);
      }
    };

    fetchBookingFromMerchantRef();
  }, [bookingId, merchantRefId, fetchBooking, fetchBookings, router, verifying]);

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
            {resolvedBookingId 
              ? "Your booking has been confirmed and payment processed successfully!" 
              : "Your payment has been processed successfully."}
          </Text>
          {resolvedBookingId && (
            <Text style={styles.successSubtext}>
              Booking Done ✓
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
          title={resolvedBookingId ? "View Booking" : "Go to Home"}
          onPress={() => {
            if (resolvedBookingId) {
              router.push(`/(customer)/booking/track?id=${resolvedBookingId}`);
            } else {
              router.replace("/(customer)/home");
            }
          }}
          style={styles.button}
        />

        <Button
          title="Go to Home"
          variant="outline"
          onPress={() => router.replace("/(customer)/home")}
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
});

