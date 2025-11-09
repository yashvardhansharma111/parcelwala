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

  // Listen for app state changes to verify payment when user returns from external browser
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      // Only verify if we have transaction ID and user just returned to app
      // For new bookings, we don't have selectedBooking yet, so check transactionId only
      if (nextAppState === "active" && transactionId && !processing) {
        console.log("[PaymentScreen] App became active, checking payment status...");
        
        // Wait a bit for webhook to process
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          // Check payment status first
          const status = await paymentService.checkPaymentStatus(transactionId);
          console.log("[PaymentScreen] Payment status:", status);
          
          if (status.status === "SUCCESS") {
            // Payment successful - navigate to success page
            // For new bookings, bookingId will be extracted from merchantReferenceId in success handler
            const bookingId = selectedBooking?.id || null;
            router.push(
              `/(customer)/payment/success?transactionId=${transactionId}${bookingId ? `&bookingId=${bookingId}` : ""}`
            );
            setTransactionId(null);
          } else if (status.status === "FAILED") {
            // Payment failed
            Alert.alert(
              "Payment Failed",
              "The payment could not be processed. Please try again.",
              [
                {
                  text: "Try Again",
                  onPress: () => {
                    setTransactionId(null);
                  },
                },
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => router.push("/(customer)/booking/history"),
                },
              ]
            );
            setTransactionId(null);
          } else {
            // Payment is still pending
            Alert.alert(
              "Payment Pending",
              "Your payment is being processed. We'll update your booking status once the payment is confirmed. You can check your booking status in the bookings section.",
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
            setTransactionId(null);
          }
        } catch (error: any) {
          console.log("[PaymentScreen] Payment verification error:", error.message);
          // Don't assume success on error - ask user to check status
          Alert.alert(
            "Payment Status Unknown",
            "We couldn't verify your payment status. Please check your bookings or try again.",
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
          setTransactionId(null);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [transactionId, processing]);

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

