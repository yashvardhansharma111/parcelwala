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
  Alert,
  AppState,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
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
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuthStore();
  const { selectedBooking, fetchBooking } = useBooking();
  const { initiatePayment, loading, verifyAndCompletePayment } = usePayments();
  const [processing, setProcessing] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchBooking(id);
    }
  }, [id]);

  // Listen for app state changes as backup (in case browser doesn't trigger close callback)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      // Only verify if we have transaction ID and user just returned to app
      if (nextAppState === "active" && transactionId && selectedBooking && !processing) {
        console.log("[PaymentScreen] App became active, verifying payment...");
        try {
          await verifyAndCompletePayment(selectedBooking.id, transactionId);
          router.push(
            `/(customer)/payment/success?transactionId=${transactionId}&bookingId=${selectedBooking.id}`
          );
          setTransactionId(null); // Clear so we don't verify again
        } catch (error: any) {
          console.log("[PaymentScreen] Payment verification on app resume:", error.message);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [transactionId, selectedBooking, processing]);

  const handlePayment = async () => {
    if (!selectedBooking || !user) {
      Alert.alert("Error", "Booking information not found");
      return;
    }

    if (!selectedBooking.fare) {
      Alert.alert("Error", "Booking fare not calculated");
      return;
    }

    try {
      setProcessing(true);
      console.log("[PaymentScreen] Starting payment for booking:", selectedBooking.id);
      
      const paymentResult = await initiatePayment(
        selectedBooking,
        user.phoneNumber,
        selectedBooking.pickup.name,
        `${user.phoneNumber.replace(/\D/g, "")}@parcelapp.com`
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

      console.log("[PaymentScreen] Opening payment URL:", paymentUrl);
      
      try {
        // Open payment URL in in-app browser (PayGIC UPI payment page)
        // This allows the user to complete payment and return to the app
        console.log("[PaymentScreen] Opening WebBrowser with URL:", paymentUrl);
        
        const browserResult = await WebBrowser.openBrowserAsync(paymentUrl, {
          showTitle: true,
          enableBarCollapsing: false,
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          ...(Platform.OS === 'ios' && { 
            controlsColor: colors.primary,
          }),
        });

        console.log("[PaymentScreen] Browser closed with result:", browserResult);

        // When browser is dismissed, verify payment status
        if (txId && selectedBooking) {
          console.log("[PaymentScreen] Verifying payment after browser close...");
          
          try {
            // Wait a moment for webhook to process payment
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verify payment status
            await verifyAndCompletePayment(selectedBooking.id, txId);
            
            // Navigate to success screen
            router.push(
              `/(customer)/payment/success?transactionId=${txId}&bookingId=${selectedBooking.id}`
            );
          } catch (error: any) {
            console.log("[PaymentScreen] Payment verification:", error.message);
            
            // If payment is pending, show message and let user wait or check later
            if (error.message?.toLowerCase().includes("pending")) {
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
            } else if (error.message?.toLowerCase().includes("failed")) {
              Alert.alert(
                "Payment Failed",
                "The payment could not be processed. Please try again.",
                [
                  {
                    text: "Try Again",
                    onPress: () => {
                      // User can click Pay Now again
                    },
                  },
                  {
                    text: "Cancel",
                    style: "cancel",
                    onPress: () => router.push("/(customer)/booking/history"),
                  },
                ]
              );
            } else {
              // Unknown error - still navigate to success screen
              // Webhook might have processed it, or user can check status later
              router.push(
                `/(customer)/payment/success?transactionId=${txId}&bookingId=${selectedBooking.id}`
              );
            }
          }
        }
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

  if (loading || !selectedBooking) {
    return (
      <View style={styles.container}>
        <Header title="Payment" showBack />
        <Loader fullScreen />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Payment" showBack />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Card>
            <Text style={styles.sectionTitle}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tracking Number:</Text>
              <Text style={styles.summaryValue}>
                {selectedBooking.trackingNumber || `#${selectedBooking.id.slice(0, 8)}`}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Route:</Text>
              <Text style={styles.summaryValue}>
                {selectedBooking.pickup.city} → {selectedBooking.drop.city}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Weight:</Text>
              <Text style={styles.summaryValue}>
                {selectedBooking.parcelDetails.weight} kg
              </Text>
            </View>
          </Card>

          <Card>
            <View style={styles.amountSection}>
              <Text style={styles.amountLabel}>Total Amount</Text>
              <Text style={styles.amountValue}>
                {selectedBooking.fare ? formatCurrency(selectedBooking.fare) : "₹0"}
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
            disabled={processing || !selectedBooking.fare}
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

