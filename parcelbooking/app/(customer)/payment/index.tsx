/**
 * Payment Screen
 * PayGIC payment initiation
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  AppState,
  Platform,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams, usePathname, useFocusEffect } from "expo-router";
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
  const pathname = usePathname();
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
  const [hasNavigatedToSuccess, setHasNavigatedToSuccess] = useState(false);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Track screen focus to prevent AppState listener from running when screen is not focused
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        // When screen loses focus, clear transaction ID and mark as navigated to prevent any redirects
        setIsScreenFocused(false);
        setTransactionId(null);
        setHasNavigatedToSuccess(true);
      };
    }, [])
  );

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
    // Don't set up listener if we've already navigated to success, if we're on success screen, or if screen is not focused
    // Also check if we have no transaction ID (means we've already processed or cleared)
    if (hasNavigatedToSuccess || pathname?.includes("payment/success") || !isScreenFocused || !transactionId) {
      return;
    }

    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      // Only verify if we have transaction ID and user just returned to app
      // Skip if we've already navigated to success, screen is not focused, or we're on success screen
      // Also check current pathname again (it might have changed)
      const currentPath = pathname;
      if (nextAppState === "active" && transactionId && !processing && !hasNavigatedToSuccess && isScreenFocused) {
        // Double-check if we're on success screen, screen lost focus, or pathname changed
        if (currentPath?.includes("payment/success") || !isScreenFocused || hasNavigatedToSuccess) {
          setTransactionId(null);
          setHasNavigatedToSuccess(true);
          return;
        }
        
        // Triple-check: if we don't have transactionId anymore, exit
        if (!transactionId) {
          setIsRedirecting(false);
          return;
        }
        
        // Show redirecting overlay
        setIsRedirecting(true);
        
        // Wait a bit for webhook to process (reduced from 3000ms to 2000ms for faster response)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          // Check payment status first
          const status = await paymentService.checkPaymentStatus(transactionId);
          
          if (status.status === "SUCCESS") {
            // Payment successful - navigate to success page
            // Pass merchantRefId (which is the transactionId) so success screen can fetch booking
            const bookingId = selectedBooking?.id || null;
            setHasNavigatedToSuccess(true); // Mark as navigated to prevent further checks
            setTransactionId(null); // Clear transaction ID
            setIsRedirecting(false); // Hide redirecting overlay
            router.replace(
              `/(customer)/payment/success?merchantRefId=${encodeURIComponent(transactionId)}${bookingId ? `&bookingId=${bookingId}` : ""}`
            );
            return; // Exit early to prevent further processing
          } else if (status.status === "FAILED") {
            // Payment failed
            setIsRedirecting(false); // Hide redirecting overlay
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
            setIsRedirecting(false);
          }
        } catch (error: any) {
          if (__DEV__) console.error("[PaymentScreen] Payment verification error:", error);
          setIsRedirecting(false); // Hide redirecting overlay on error
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
  }, [transactionId, processing, pathname, router, selectedBooking, hasNavigatedToSuccess, isScreenFocused]);

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
      
      const paymentResult = await initiatePayment(
        booking || null,
        user.phoneNumber,
        booking?.pickup?.name || bookingData?.pickup?.name || user.name || "Customer",
        `${user.phoneNumber.replace(/\D/g, "")}@parcelapp.com`,
        bookingData
      );

      if (!paymentResult || !paymentResult.paymentUrl || !paymentResult.transactionId) {
        if (__DEV__) console.error("[PaymentScreen] Invalid payment result:", paymentResult);
        Alert.alert("Error", "Invalid payment response received from server");
        return;
      }

      const { paymentUrl, transactionId: txId } = paymentResult;

      // Store transaction ID for verification when user returns
      setTransactionId(txId);
      
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
          "Redirecting to Payment",
          "You'll be redirected to the payment page. After completing payment, you'll be automatically redirected back to the app.",
          [{ text: "OK" }]
        );
      } catch (error: any) {
        if (__DEV__) console.error("[PaymentScreen] Error opening payment URL:", error);
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
          <Text style={styles.waitMessage}>
            After redirecting to payment gateway, please wait some time. You'll be automatically redirected back to the app.
          </Text>
        </View>
      </ScrollView>
      {/* Redirecting Overlay - Outside ScrollView to cover entire screen */}
      {isRedirecting && (
        <View style={styles.redirectingOverlay}>
          <View style={styles.redirectingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.redirectingTitle}>Redirecting...</Text>
            <Text style={styles.redirectingMessage}>
              Please wait while we process your payment and redirect you to the success page.
            </Text>
          </View>
        </View>
      )}
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
  redirectingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  redirectingCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginHorizontal: 24,
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  redirectingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  redirectingMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  waitMessage: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
});

