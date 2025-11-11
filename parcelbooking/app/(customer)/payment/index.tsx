/**
 * Payment Screen
 * PayGIC payment initiation
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  AppState,
  Platform,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Linking } from "react-native";
import { usePayments } from "../../../hooks/usePayments";
import { useBooking } from "../../../hooks/useBooking";
import { useAuthStore } from "../../../store/authStore";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { Header } from "../../../components/Header";
import { Loader } from "../../../components/Loader";
import { colors } from "../../../theme/colors";
import { formatCurrency } from "../../../utils/formatters";
import * as paymentService from "../../../services/paymentService";

export default function PaymentScreen() {
  const router = useRouter();
  const { id, bookingData: bookingDataParam } = useLocalSearchParams<{ 
    id?: string;
    bookingData?: string;
  }>();
  const { user } = useAuthStore();
  const { selectedBooking, fetchBooking } = useBooking();
  const { initiatePayment, loading, verifyAndCompletePayment } = usePayments();
  const [processing, setProcessing] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [newBookingData, setNewBookingData] = useState<any>(null);

  useEffect(() => {
    if (id) {
      // Existing booking - fetch it
      fetchBooking(id);
    } else if (bookingDataParam) {
      // New booking - parse booking data
      try {
        const parsed = JSON.parse(bookingDataParam);
        setNewBookingData(parsed);
      } catch (error) {
        console.error("Error parsing booking data:", error);
        Alert.alert("Error", "Invalid booking data");
        router.back();
      }
    }
  }, [id, bookingDataParam]);

  // Poll payment status when transaction ID is set
  useEffect(() => {
    if (!transactionId || processing) return;

    let pollInterval: NodeJS.Timeout | null = null;
    let pollCount = 0;
    const maxPolls = 20; // Poll for up to 2 minutes (20 * 6 seconds)
    const pollIntervalMs = 6000; // Poll every 6 seconds

    const checkPaymentStatus = async () => {
      pollCount++;
      console.log(`[PaymentScreen] Polling payment status (attempt ${pollCount}/${maxPolls})...`);
      
      try {
        const status = await paymentService.checkPaymentStatus(transactionId!);
        console.log("[PaymentScreen] Payment status:", status);
        
        if (status.status === "SUCCESS") {
          // Payment successful - navigate to success page
          const bookingId = selectedBooking?.id || null;
          const merchantRefId = status.merchantReferenceId || transactionId;
          
          // Stop polling
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          
          setTransactionId(null);
          
          // Navigate to success page
          const params = new URLSearchParams();
          params.append('merchantRefId', merchantRefId);
          if (bookingId) params.append('bookingId', bookingId);
          
          router.push(`/(customer)/payment/success?${params.toString()}`);
        } else if (status.status === "FAILED") {
          // Payment failed - stop polling
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          
          setTransactionId(null);
          
          Alert.alert(
            "Payment Failed",
            "The payment could not be processed. Please try again.",
            [
              {
                text: "Try Again",
                onPress: () => {
                  // Allow user to retry
                },
              },
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => router.push("/(customer)/booking/history"),
              },
            ]
          );
        } else if (pollCount >= maxPolls) {
          // Max polls reached - stop polling
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          
          setTransactionId(null);
          
          Alert.alert(
            "Payment Status Unknown",
            "We couldn't verify your payment status automatically. Please check your bookings or contact support.",
            [
              {
                text: "Check Bookings",
                onPress: () => router.push("/(customer)/booking/history"),
              },
              {
                text: "OK",
                style: "default",
              },
            ]
          );
        }
        // If still pending, continue polling
      } catch (error: any) {
        console.log("[PaymentScreen] Payment verification error:", error.message);
        // Continue polling on error (might be temporary network issue)
        if (pollCount >= maxPolls) {
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          setTransactionId(null);
        }
      }
    };

    // Start polling after initial delay (wait for webhook to process)
    const initialDelay = setTimeout(() => {
      checkPaymentStatus();
      // Continue polling
      pollInterval = setInterval(checkPaymentStatus, pollIntervalMs);
    }, 5000); // Wait 5 seconds before first check

    return () => {
      if (initialDelay) clearTimeout(initialDelay);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [transactionId, processing, selectedBooking, router]);

  // Listen for app state changes to verify payment when user returns from external browser
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      // When app becomes active, trigger immediate payment check
      if (nextAppState === "active" && transactionId && !processing) {
        console.log("[PaymentScreen] App became active, checking payment status immediately...");
        
        try {
          const status = await paymentService.checkPaymentStatus(transactionId);
          console.log("[PaymentScreen] Payment status on app resume:", status);
          
          if (status.status === "SUCCESS") {
            const bookingId = selectedBooking?.id || null;
            const merchantRefId = status.merchantReferenceId || transactionId;
            
            setTransactionId(null);
            
            const params = new URLSearchParams();
            params.append('merchantRefId', merchantRefId);
            if (bookingId) params.append('bookingId', bookingId);
            
            router.push(`/(customer)/payment/success?${params.toString()}`);
          }
        } catch (error) {
          console.log("[PaymentScreen] Error checking payment on app resume:", error);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [transactionId, processing, selectedBooking, router]);

  const handlePayment = async () => {
    if (!user) {
      Alert.alert("Error", "User information not found");
      return;
    }

    // Check if we have existing booking or new booking data
    const booking = selectedBooking;
    const bookingData = newBookingData;
    
    if (!booking && !bookingData) {
      Alert.alert("Error", "Booking information not found");
      return;
    }

    const fare = booking?.fare || bookingData?.fare;
    if (!fare || fare <= 0) {
      Alert.alert("Error", "Booking fare not calculated");
      return;
    }

    try {
      setProcessing(true);
      
      if (booking) {
        // Existing booking
        console.log("[PaymentScreen] Starting payment for booking:", booking.id);
      } else {
        // New booking - will be created after payment success
        console.log("[PaymentScreen] Starting payment for new booking");
      }
      
      const paymentResult = await initiatePayment(
        booking || null,
        user.phoneNumber,
        booking?.pickup?.name || bookingData?.pickup?.name || user.name || "Customer",
        `${user.phoneNumber.replace(/\D/g, "")}@parcelapp.com`,
        bookingData
      );

      console.log("[PaymentScreen] Payment result received:", {
        hasPaymentUrl: !!paymentResult?.paymentUrl,
        hasTransactionId: !!paymentResult?.transactionId,
        paymentUrl: paymentResult?.paymentUrl?.substring(0, 50) + "...",
      });

      if (!paymentResult || !paymentResult.paymentUrl || !paymentResult.transactionId) {
        console.error("[PaymentScreen] Invalid payment result:", paymentResult);
        Alert.alert("Error", "Invalid payment response received from server");
        return;
      }

      const { paymentUrl, transactionId: txId } = paymentResult;

      // Store transaction ID for verification when user returns
      setTransactionId(txId);

      console.log("[PaymentScreen] Opening payment URL in external browser:", paymentUrl);
      
      try {
        // Open payment URL in external browser (PayGIC UPI payment page)
        const canOpen = await Linking.canOpenURL(paymentUrl);
        
        if (!canOpen) {
          Alert.alert("Error", "Cannot open payment URL. Please check your browser settings.");
          setTransactionId(null);
          return;
        }

        await Linking.openURL(paymentUrl);
        
        // Show instruction to user
        Alert.alert(
          "Payment Page Opened",
          "Complete your payment in the browser. Return to the app when done. We'll verify your payment automatically.",
          [
            {
              text: "OK",
              onPress: () => {
                // Transaction ID is already set, AppState listener will handle verification
              },
            },
          ]
        );
      } catch (error: any) {
        console.error("[PaymentScreen] Error opening browser:", error);
        Alert.alert(
          "Error", 
          `Cannot open payment page: ${error.message || "Unknown error"}`
        );
        setTransactionId(null);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to initiate payment");
      setTransactionId(null);
    } finally {
      setProcessing(false);
    }
  };

  // Show loading if fetching existing booking or if we don't have booking data yet
  if (loading || (id && !selectedBooking) || (!id && !newBookingData)) {
    return (
      <View style={styles.container}>
        <Header title="Payment" showBack />
        <Loader fullScreen color={colors.primary} />
      </View>
    );
  }

  // Get booking info from either selectedBooking or newBookingData
  const bookingInfo = selectedBooking || {
    fare: newBookingData?.fare,
    pickup: newBookingData?.pickup,
    drop: newBookingData?.drop,
    parcelDetails: newBookingData?.parcelDetails,
    id: "pending",
    trackingNumber: undefined,
  };

  return (
    <View style={styles.container}>
      <Header title="Payment" showBack />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Card>
            <Text style={styles.sectionTitle}>Booking Summary</Text>
            {selectedBooking && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tracking Number:</Text>
                <Text style={styles.summaryValue}>
                  {selectedBooking.trackingNumber || `#${selectedBooking.id.slice(0, 8)}`}
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Route:</Text>
              <Text style={styles.summaryValue}>
                {bookingInfo.pickup?.city || "N/A"} → {bookingInfo.drop?.city || "N/A"}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Weight:</Text>
              <Text style={styles.summaryValue}>
                {bookingInfo.parcelDetails?.weight || 0} kg
              </Text>
            </View>
          </Card>

          <Card>
            <View style={styles.amountSection}>
              <Text style={styles.amountLabel}>Total Amount</Text>
              <Text style={styles.amountValue}>
                {bookingInfo.fare ? formatCurrency(bookingInfo.fare) : "₹0"}
              </Text>
            </View>
          </Card>

          <Card>
            <Text style={styles.paymentInfo}>
              You will be redirected to PayGIC payment gateway to complete the
              payment via UPI.
            </Text>
          </Card>

          <Button
            title={processing ? "Processing..." : "Pay Now"}
            onPress={handlePayment}
            loading={processing}
            disabled={processing || !bookingInfo.fare}
            style={styles.payButton}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
    textAlign: "right",
  },
  amountSection: {
    alignItems: "center",
    paddingVertical: 8,
  },
  amountLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.primary,
  },
  paymentInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
  },
  payButton: {
    marginTop: 24,
    marginBottom: 32,
  },
});

