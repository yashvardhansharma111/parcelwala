/**
 * Invoice Screen
 * Display invoice for completed booking with payment
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useBooking } from "../../../hooks/useBooking";
import { Card } from "../../../components/Card";
import { Header } from "../../../components/Header";
import { Loader } from "../../../components/Loader";
import { colors } from "../../../theme/colors";
import { formatDateTime, displayPhoneNumber } from "../../../utils/formatters";
import { Feather } from "@expo/vector-icons";

export default function InvoiceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { selectedBooking, fetchBooking, loading } = useBooking();

  useEffect(() => {
    if (id) {
      fetchBooking(id);
    }
  }, [id]);

  if (loading || !selectedBooking) {
    return (
      <View style={styles.container}>
        <Header title="Invoice" showBack />
        <Loader fullScreen color={colors.primary} />
      </View>
    );
  }

  // Calculate GST (assuming 18%)
  const baseFare = selectedBooking.fare ? selectedBooking.fare / 1.18 : 0;
  const gst = selectedBooking.fare ? selectedBooking.fare - baseFare : 0;
  const totalFare = selectedBooking.fare || 0;

  const handlePrint = () => {
    Alert.alert(
      "Print Invoice",
      "To print this invoice, use your device's print functionality or take a screenshot.",
      [{ text: "OK" }]
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Invoice" showBack />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Invoice Header */}
          <View style={styles.invoiceHeader}>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>Parcel Booking</Text>
              <Text style={styles.companyAddress}>
                Your Company Address Here
              </Text>
              <Text style={styles.companyAddress}>
                City, State - Pincode
              </Text>
              <Text style={styles.companyAddress}>
                Phone: +91-XXXXXXXXXX
              </Text>
              <Text style={styles.companyAddress}>
                Email: info@parcelbooking.com
              </Text>
            </View>
            <View style={styles.invoiceTitle}>
              <Text style={styles.invoiceTitleText}>TAX INVOICE</Text>
            </View>
          </View>

          {/* Invoice Details */}
          <Card style={styles.invoiceCard}>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Invoice Number:</Text>
              <Text style={styles.invoiceValue}>
                {selectedBooking.trackingNumber || selectedBooking.id}
              </Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Invoice Date:</Text>
              <Text style={styles.invoiceValue}>
                {formatDateTime(selectedBooking.createdAt)}
              </Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Booking ID:</Text>
              <Text style={styles.invoiceValue}>
                {selectedBooking.trackingNumber || selectedBooking.id}
              </Text>
            </View>
            {selectedBooking.deliveryType && (
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>Delivery Type:</Text>
                <Text style={styles.invoiceValue}>
                  {selectedBooking.deliveryType === "sameDay" ? "Same Day" : "Scheduled"}
                </Text>
              </View>
            )}
            {selectedBooking.deliveryDate && (
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>Scheduled Date:</Text>
                <Text style={styles.invoiceValue}>
                  {formatDateTime(selectedBooking.deliveryDate)}
                </Text>
              </View>
            )}
          </Card>

          {/* Customer Details */}
          <Card style={styles.invoiceCard}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{selectedBooking.pickup.name}</Text>
              <Text style={styles.customerAddress}>{selectedBooking.pickup.address}</Text>
              <Text style={styles.customerAddress}>
                {selectedBooking.pickup.city}, {selectedBooking.pickup.state} - {selectedBooking.pickup.pincode}
              </Text>
              <Text style={styles.customerAddress}>
                Phone: {displayPhoneNumber(selectedBooking.pickup.phone)}
              </Text>
            </View>
          </Card>

          {/* Service Details */}
          <Card style={styles.invoiceCard}>
            <Text style={styles.sectionTitle}>Service Details</Text>
            <View style={styles.serviceRow}>
              <Text style={styles.serviceLabel}>From:</Text>
              <Text style={styles.serviceValue}>
                {selectedBooking.pickup.city}, {selectedBooking.pickup.state}
              </Text>
            </View>
            <View style={styles.serviceRow}>
              <Text style={styles.serviceLabel}>To:</Text>
              <Text style={styles.serviceValue}>
                {selectedBooking.drop.city}, {selectedBooking.drop.state}
              </Text>
            </View>
            <View style={styles.serviceRow}>
              <Text style={styles.serviceLabel}>Parcel Type:</Text>
              <Text style={styles.serviceValue}>
                {selectedBooking.parcelDetails.type}
              </Text>
            </View>
            <View style={styles.serviceRow}>
              <Text style={styles.serviceLabel}>Weight:</Text>
              <Text style={styles.serviceValue}>
                {selectedBooking.parcelDetails.weight} kg
              </Text>
            </View>
            {selectedBooking.parcelDetails.description && (
              <View style={styles.serviceRow}>
                <Text style={styles.serviceLabel}>Description:</Text>
                <Text style={styles.serviceValue}>
                  {selectedBooking.parcelDetails.description}
                </Text>
              </View>
            )}
          </Card>

          {/* Payment Details */}
          <Card style={styles.invoiceCard}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payment Method:</Text>
              <Text style={styles.paymentValue}>
                {selectedBooking.paymentMethod === "online" ? "Online Payment" : "Cash on Delivery"}
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payment Status:</Text>
              <Text style={[styles.paymentValue, styles.paidStatus]}>
                {selectedBooking.paymentStatus === "paid" ? "Paid" : "Pending"}
              </Text>
            </View>
            {selectedBooking.paymentStatus === "paid" && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payment Date:</Text>
                <Text style={styles.paymentValue}>
                  {formatDateTime(selectedBooking.updatedAt)}
                </Text>
              </View>
            )}
          </Card>

          {/* Amount Breakdown */}
          <Card style={styles.invoiceCard}>
            <Text style={styles.sectionTitle}>Amount Breakdown</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Base Fare:</Text>
              <Text style={styles.amountValue}>₹{baseFare.toFixed(2)}</Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>GST (18%):</Text>
              <Text style={styles.amountValue}>₹{gst.toFixed(2)}</Text>
            </View>
            <View style={[styles.amountRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalValue}>₹{totalFare.toFixed(2)}</Text>
            </View>
          </Card>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Thank you for choosing Parcel Booking!
            </Text>
            <Text style={styles.footerText}>
              This is a computer-generated invoice and does not require a signature.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Print Button */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
          <Feather name="printer" size={20} color={colors.background} />
          <Text style={styles.printButtonText}>Print Invoice</Text>
        </TouchableOpacity>
      </View>
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
  invoiceHeader: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  companyInfo: {
    marginBottom: 16,
  },
  companyName: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 8,
  },
  companyAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  invoiceTitle: {
    alignItems: "center",
    marginTop: 8,
  },
  invoiceTitleText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 2,
  },
  invoiceCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
  },
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  invoiceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    flex: 1,
  },
  invoiceValue: {
    fontSize: 14,
    color: colors.text,
    flex: 2,
    textAlign: "right",
  },
  customerInfo: {
    gap: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  customerAddress: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  serviceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    flex: 1,
  },
  serviceValue: {
    fontSize: 14,
    color: colors.text,
    flex: 2,
    textAlign: "right",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    flex: 1,
  },
  paymentValue: {
    fontSize: 14,
    color: colors.text,
    flex: 2,
    textAlign: "right",
  },
  paidStatus: {
    color: colors.success,
    fontWeight: "700",
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  amountValue: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    textAlign: "right",
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 4,
  },
  actionBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  printButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  printButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.background,
  },
});

