/**
 * Admin Booking Details Screen
 * View and update booking status
 */

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useBooking } from "../../hooks/useBooking";
import * as bookingService from "../../services/bookingService";
import * as addressService from "../../services/addressService";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { Button } from "../../components/Button";
import { Header } from "../../components/Header";
import { Loader } from "../../components/Loader";
import { Input } from "../../components/Input";
import { colors } from "../../theme/colors";
import { Feather } from "@expo/vector-icons";
import { formatDateTime, displayPhoneNumber } from "../../utils/formatters";
import { STATUS_TYPES, STATUS_COLORS } from "../../utils/constants";
import { BookingStatus } from "../../utils/types";

export default function AdminBookingDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { selectedBooking, fetchBooking, updateStatus, loading } = useBooking();
  const [updating, setUpdating] = useState(false);
  const [showFareModal, setShowFareModal] = useState(false);
  const [newFare, setNewFare] = useState("");
  const [updatingFare, setUpdatingFare] = useState(false);
  const [calculatingFare, setCalculatingFare] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [showPODModal, setShowPODModal] = useState(false);
  const [podSignature, setPodSignature] = useState("");
  const [podSignedBy, setPodSignedBy] = useState("");
  const [savingPOD, setSavingPOD] = useState(false);
  const [downloadingPOD, setDownloadingPOD] = useState(false);
  const podReceiptRef = useRef<View>(null);
  const [fareBreakdown, setFareBreakdown] = useState<{
    distanceInKm: number;
    baseFare: number;
    gst: number;
    totalFare: number;
  } | null>(null);

  useEffect(() => {
    if (id) {
      fetchBooking(id);
    }
  }, [id]);

  // Refresh booking when screen is focused (only once per focus, not on every render)
  useFocusEffect(
    React.useCallback(() => {
      if (id) {
        fetchBooking(id).catch((error) => {
          if (__DEV__) console.error('[AdminBookingDetails] Error refreshing booking:', error);
        });
      }
    }, [id]) // Removed fetchBooking from dependencies - it should be stable
  );

  // Auto-refresh booking if status is PendingPayment but payment is paid
  useEffect(() => {
    if (id && selectedBooking) {
      // If booking is PendingPayment but paymentStatus is paid, refresh more frequently
      const needsRefresh = selectedBooking.status === "PendingPayment" && selectedBooking.paymentStatus === "paid";
      
      if (needsRefresh) {
        let refreshCount = 0;
        const maxRefreshes = 5; // Only refresh 5 times (10 seconds total)
        
        const refreshInterval = setInterval(() => {
          refreshCount++;
          if (refreshCount > maxRefreshes) {
            clearInterval(refreshInterval);
            return;
          }
          fetchBooking(id).catch((error) => {
            if (__DEV__) console.error('[AdminBookingDetails] Error refreshing booking:', error);
          });
        }, 2000); // Refresh every 2 seconds

        // Clear interval after 10 seconds
        const timeoutId = setTimeout(() => {
          clearInterval(refreshInterval);
        }, 10000);

        return () => {
          clearInterval(refreshInterval);
          clearTimeout(timeoutId);
        };
      }
    }
  }, [id, selectedBooking?.status, selectedBooking?.paymentStatus]); // Removed fetchBooking from dependencies

  const handleStatusUpdate = async (newStatus: BookingStatus) => {
    if (!selectedBooking || !id) return;

    // If status is "Returned", show modal to enter return reason
    if (newStatus === "Returned") {
      setShowReturnModal(true);
      return;
    }

    Alert.alert(
      "Update Status",
      `Are you sure you want to update status to "${newStatus}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async () => {
            try {
              setUpdating(true);
              await updateStatus(id, newStatus);
              Alert.alert("Success", "Status updated successfully");
              await fetchBooking(id);
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to update status");
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleReturnParcel = async () => {
    if (!selectedBooking || !id || !returnReason.trim()) {
      Alert.alert("Error", "Please enter a return reason");
      return;
    }

    try {
      setUpdating(true);
      setShowReturnModal(false);
      
      // Call updateStatus with return reason
      await bookingService.updateBookingStatus(id, "Returned", returnReason);
      
      Alert.alert("Success", "Parcel marked as returned");
      setReturnReason("");
      await fetchBooking(id);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to return parcel");
    } finally {
      setUpdating(false);
    }
  };

  const handleCalculateFare = async () => {
    if (!selectedBooking) return;

    try {
      setCalculatingFare(true);
      
      // Get coordinates from addresses (we'll need to geocode them)
      // For now, let's use a simple calculation if we have coordinates stored
      // Otherwise, we'll need to get address details first
      
      // Try to get coordinates from address details
      const pickupDetails = await addressService.getAddressDetails(
        selectedBooking.pickup.address
      );
      const dropDetails = await addressService.getAddressDetails(
        selectedBooking.drop.address
      );

      if (pickupDetails.coordinates && dropDetails.coordinates) {
        const calculation = await addressService.calculateFare(
          pickupDetails.coordinates,
          dropDetails.coordinates,
          selectedBooking.parcelDetails.weight
        );
        setFareBreakdown(calculation);
        setNewFare(calculation.totalFare.toString());
      } else {
        Alert.alert("Error", "Could not get coordinates for addresses");
      }
    } catch (error: any) {
      console.error("Error calculating fare:", error);
      Alert.alert("Error", "Failed to calculate fare. Please enter manually.");
    } finally {
      setCalculatingFare(false);
    }
  };

  const handleUpdateFare = async () => {
    if (!selectedBooking || !id) return;
    
    const fare = parseFloat(newFare);
    if (isNaN(fare) || fare < 0) {
      Alert.alert("Error", "Please enter a valid fare amount");
      return;
    }

    try {
      setUpdatingFare(true);
      await bookingService.updateFare(id, fare);
      Alert.alert("Success", "Fare updated successfully");
      setShowFareModal(false);
      setNewFare("");
      setFareBreakdown(null);
      await fetchBooking(id);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update fare");
    } finally {
      setUpdatingFare(false);
    }
  };

  if (loading || !selectedBooking) {
    return (
      <View style={styles.container}>
        <Header title="Booking Details" showBack />
        <Loader fullScreen />
      </View>
    );
  }

  const currentStatusIndex = STATUS_TYPES.indexOf(selectedBooking.status);
  const nextStatusIndex = currentStatusIndex + 1;
  const nextStatus =
    nextStatusIndex < STATUS_TYPES.length
      ? STATUS_TYPES[nextStatusIndex]
      : null;

  return (
    <View style={styles.container}>
      <Header title="Booking Details" showBack />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Card>
            <View style={styles.header}>
              <Text style={styles.trackingNumber}>
                {selectedBooking.trackingNumber || `#${selectedBooking.id.slice(0, 8)}`}
              </Text>
              <StatusBadge status={selectedBooking.status} />
            </View>
            <Text style={styles.date}>
              Created: {formatDateTime(selectedBooking.createdAt)}
            </Text>
            <Text style={styles.date}>
              Updated: {formatDateTime(selectedBooking.updatedAt)}
            </Text>
          </Card>

          {/* Payment Status Card - Prominent Display */}
          <Card style={styles.paymentStatusCard}>
            <View style={styles.paymentStatusHeader}>
              <View style={styles.paymentStatusTitleRow}>
                <Feather 
                  name={selectedBooking.paymentStatus === "paid" ? "check-circle" : selectedBooking.paymentStatus === "pending" ? "clock" : "x-circle"} 
                  size={24} 
                  color={
                    selectedBooking.paymentStatus === "paid" ? "#10B981" : 
                    selectedBooking.paymentStatus === "pending" ? "#F59E0B" : 
                    "#EF4444"
                  } 
                />
                <Text style={styles.paymentStatusTitle}>Payment Status</Text>
              </View>
              <StatusBadge 
                status={selectedBooking.paymentStatus as any} 
                type="payment"
                style={styles.paymentStatusBadge}
              />
            </View>
            <View style={styles.paymentDetails}>
              <View style={styles.paymentDetailRow}>
                <Text style={styles.paymentDetailLabel}>Payment Method:</Text>
                <Text style={styles.paymentDetailValue}>
                  {selectedBooking.paymentMethod === "online" ? "💳 Online Payment" : "💵 Cash on Delivery"}
                </Text>
              </View>
              {selectedBooking.fare && (
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Amount:</Text>
                  <Text style={[styles.paymentDetailValue, styles.paymentAmount]}>
                    ₹{selectedBooking.fare.toFixed(0)}
                  </Text>
                </View>
              )}
              {selectedBooking.paymentStatus === "paid" && selectedBooking.updatedAt && (
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Paid On:</Text>
                  <Text style={styles.paymentDetailValue}>
                    {formatDateTime(selectedBooking.updatedAt)}
                  </Text>
                </View>
              )}
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Status Timeline</Text>
            <View style={styles.statusList}>
              {STATUS_TYPES.map((status, index) => {
                // Skip PendingPayment if payment is already paid
                if (status === "PendingPayment" && selectedBooking.paymentStatus === "paid") {
                  return null;
                }
                
                // Calculate which statuses to show (filter out PendingPayment if paid)
                const visibleStatuses = STATUS_TYPES.filter(s => 
                  !(s === "PendingPayment" && selectedBooking.paymentStatus === "paid")
                );
                const visibleIndex = visibleStatuses.indexOf(status);
                const visibleCurrentIndex = visibleStatuses.indexOf(selectedBooking.status);
                
                const isCompleted = visibleIndex <= visibleCurrentIndex;
                const isCurrent = visibleIndex === visibleCurrentIndex;
                
                return (
                  <TouchableOpacity
                    key={status}
                    style={styles.statusItem}
                    onPress={() => handleStatusUpdate(status)}
                    disabled={updating || visibleIndex > visibleCurrentIndex + 1}
                  >
                    <View
                      style={[
                        styles.statusIndicator,
                        isCompleted && {
                          backgroundColor: STATUS_COLORS[status],
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        isCompleted && { color: colors.text },
                      ]}
                    >
                      {status}
                    </Text>
                    {isCurrent && (
                      <Text style={styles.currentLabel}>Current</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {nextStatus && (
            <Card>
              <Button
                title={`Update to ${nextStatus}`}
                onPress={() => handleStatusUpdate(nextStatus)}
                loading={updating}
              />
            </Card>
          )}

          <Card>
            <Text style={styles.sectionTitle}>Pickup Address</Text>
            <View style={styles.address}>
              <Text style={styles.addressName}>
                {selectedBooking.pickup.name}
              </Text>
              <Text style={styles.addressText}>
                {selectedBooking.pickup.address}
              </Text>
              <Text style={styles.addressText}>
                {selectedBooking.pickup.city}, {selectedBooking.pickup.state} -{" "}
                {selectedBooking.pickup.pincode}
              </Text>
              <Text style={styles.addressPhone}>
                Phone: {displayPhoneNumber(selectedBooking.pickup.phone)}
              </Text>
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <View style={styles.address}>
              <Text style={styles.addressName}>
                {selectedBooking.drop.name}
              </Text>
              <Text style={styles.addressText}>
                {selectedBooking.drop.address}
              </Text>
              <Text style={styles.addressText}>
                {selectedBooking.drop.city}, {selectedBooking.drop.state} -{" "}
                {selectedBooking.drop.pincode}
              </Text>
              <Text style={styles.addressPhone}>
                Phone: {displayPhoneNumber(selectedBooking.drop.phone)}
              </Text>
            </View>
          </Card>

          {selectedBooking.returnReason && (
            <Card style={{ backgroundColor: "#FEF2F2", borderColor: colors.error }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <Feather name="alert-circle" size={20} color={colors.error} />
                <Text style={[styles.sectionTitle, { color: colors.error, marginLeft: 8, marginBottom: 0 }]}>
                  Returned Parcel
                </Text>
              </View>
              <Text style={styles.returnReasonText}>
                <Text style={{ fontWeight: "600" }}>Reason: </Text>
                {selectedBooking.returnReason}
              </Text>
              {selectedBooking.returnedAt && (
                <Text style={styles.returnDateText}>
                  Returned on: {formatDateTime(selectedBooking.returnedAt)}
                </Text>
              )}
            </Card>
          )}

          <Card>
            <Text style={styles.sectionTitle}>Parcel Details</Text>
            <View style={styles.parcelDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>
                  {selectedBooking.parcelDetails.type}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Weight:</Text>
                <Text style={styles.detailValue}>
                  {selectedBooking.parcelDetails.weight} kg
                </Text>
              </View>
              {selectedBooking.parcelDetails.description && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description:</Text>
                  <Text style={styles.detailValue}>
                    {selectedBooking.parcelDetails.description}
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method:</Text>
                <Text style={styles.detailValue}>
                  {selectedBooking.paymentMethod === "online" ? "💳 Online" : "💵 Cash on Delivery"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fare:</Text>
                <View style={styles.fareRow}>
                  {selectedBooking.fare ? (
                    <>
                      <View style={styles.fareDetails}>
                        <Text style={[styles.detailValue, styles.fare]}>
                          ₹{selectedBooking.fare.toFixed(0)}
                        </Text>
                        {/* Calculate GST from fare if possible */}
                        {(() => {
                          // Try to estimate GST (assuming 18% if fare > 50)
                          const estimatedGst = selectedBooking.fare > 50 
                            ? Math.round((selectedBooking.fare * 18) / 118)
                            : 0;
                          const estimatedBase = selectedBooking.fare - estimatedGst;
                          return estimatedGst > 0 ? (
                            <Text style={styles.fareBreakdown}>
                              (Base: ₹{estimatedBase.toFixed(0)} + GST: ₹{estimatedGst.toFixed(0)})
                            </Text>
                          ) : null;
                        })()}
                      </View>
                    </>
                  ) : (
                    <Text style={styles.detailValue}>Not set</Text>
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      setNewFare(selectedBooking.fare?.toString() || "");
                      setFareBreakdown(null);
                      setShowFareModal(true);
                    }}
                    style={styles.editButton}
                  >
                    <Feather name="edit-2" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Card>

          {/* POD Receipt Section */}
          {selectedBooking.status === "Delivered" && (
            <Card>
              <Text style={styles.sectionTitle}>Proof of Delivery (POD)</Text>
              {selectedBooking.podSignature ? (
                <View style={styles.podContainer}>
                  <View style={styles.podInfo}>
                    <Text style={styles.podLabel}>Signed by:</Text>
                    <Text style={styles.podValue}>
                      {selectedBooking.podSignedBy || "Customer"}
                    </Text>
                  </View>
                  {selectedBooking.podSignedAt && (
                    <View style={styles.podInfo}>
                      <Text style={styles.podLabel}>Signed on:</Text>
                      <Text style={styles.podValue}>
                        {formatDateTime(selectedBooking.podSignedAt)}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.podButton}
                    onPress={() => setShowPODModal(true)}
                  >
                    <Feather name="printer" size={20} color={colors.primary} />
                    <Text style={styles.podButtonText}>View/Print POD Receipt</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.podContainer}>
                  <Text style={styles.podPlaceholder}>
                    POD receipt not yet generated. Generate it when customer signs for delivery.
                  </Text>
                  <TouchableOpacity
                    style={styles.podButton}
                    onPress={() => setShowPODModal(true)}
                  >
                    <Feather name="file-text" size={20} color={colors.primary} />
                    <Text style={styles.podButtonText}>Generate POD Receipt</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Fare Update Modal */}
      <Modal
        visible={showFareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFareModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowFareModal(false)}
            style={styles.modalOverlay}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Update Fare</Text>
                  <TouchableOpacity
                    onPress={() => setShowFareModal(false)}
                    style={styles.modalCloseButton}
                  >
                    <Feather name="x" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalBody}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
              <Text style={styles.modalLabel}>Fare Amount (₹)</Text>
              <View style={styles.fareInputRow}>
                <Input
                  value={newFare}
                  onChangeText={setNewFare}
                  placeholder="Enter fare amount"
                  keyboardType="decimal-pad"
                  style={styles.fareInput}
                  containerStyle={styles.fareInputContainer}
                />
                <TouchableOpacity
                  style={styles.calculateButton}
                  onPress={handleCalculateFare}
                  disabled={calculatingFare || !selectedBooking}
                >
                  <Feather 
                    name="calculator" 
                    size={20} 
                    color={colors.background} 
                  />
                  <Text style={styles.calculateButtonText}>
                    {calculatingFare ? "Calculating..." : "Auto"}
                  </Text>
                </TouchableOpacity>
              </View>

              {selectedBooking.parcelDetails && (
                <View style={styles.fareInfo}>
                  <Text style={styles.fareInfoTitle}>Booking Details:</Text>
                  <Text style={styles.fareInfoText}>
                    Route: {selectedBooking.pickup.city} → {selectedBooking.drop.city}
                  </Text>
                  <Text style={styles.fareInfoText}>
                    Weight: {selectedBooking.parcelDetails.weight} kg
                  </Text>
                  {selectedBooking.fare && (
                    <Text style={styles.fareInfoText}>
                      Current Fare: ₹{selectedBooking.fare.toFixed(0)}
                    </Text>
                  )}
                </View>
              )}

              {fareBreakdown && (
                <View style={styles.fareBreakdownContainer}>
                  <Text style={styles.fareBreakdownTitle}>Fare Breakdown:</Text>
                  <View style={styles.fareBreakdownRow}>
                    <Text style={styles.fareBreakdownLabel}>Distance:</Text>
                    <Text style={styles.fareBreakdownValue}>
                      {fareBreakdown.distanceInKm.toFixed(2)} km
                    </Text>
                  </View>
                  <View style={styles.fareBreakdownRow}>
                    <Text style={styles.fareBreakdownLabel}>Base Fare:</Text>
                    <Text style={styles.fareBreakdownValue}>
                      ₹{fareBreakdown.baseFare.toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.fareBreakdownRow}>
                    <Text style={styles.fareBreakdownLabel}>GST (18%):</Text>
                    <Text style={styles.fareBreakdownValue}>
                      ₹{fareBreakdown.gst.toFixed(0)}
                    </Text>
                  </View>
                  <View style={[styles.fareBreakdownRow, styles.fareBreakdownTotal]}>
                    <Text style={styles.fareBreakdownLabel}>Total Fare:</Text>
                    <Text style={[styles.fareBreakdownValue, styles.fareBreakdownTotalValue]}>
                      ₹{fareBreakdown.totalFare.toFixed(0)}
                    </Text>
                  </View>
                </View>
              )}
                </ScrollView>

                <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowFareModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.updateButton}
                onPress={handleUpdateFare}
                disabled={updatingFare}
              >
                <Text style={styles.updateButtonText}>
                  {updatingFare ? "Updating..." : "Update Fare"}
                </Text>
              </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Return Parcel Modal */}
      <Modal
        visible={showReturnModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowReturnModal(false);
          setReturnReason("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Return Parcel</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowReturnModal(false);
                  setReturnReason("");
                }}
              >
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Please provide a reason for returning this parcel. This information will be shared with the customer.
            </Text>

            <Input
              label="Return Reason"
              value={returnReason}
              onChangeText={setReturnReason}
              placeholder="e.g., Wrong address, Customer refused delivery, Damaged package..."
              multiline
              numberOfLines={4}
              style={styles.returnReasonInput}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowReturnModal(false);
                  setReturnReason("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleReturnParcel}
                disabled={updating || !returnReason.trim()}
              >
                <Text style={styles.confirmButtonText}>Mark as Returned</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* POD Receipt Modal */}
      <Modal
        visible={showPODModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPODModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.podModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>POD Receipt</Text>
              <TouchableOpacity
                onPress={() => setShowPODModal(false)}
                style={styles.modalCloseButton}
              >
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.podScrollView}>
              <View ref={podReceiptRef} style={styles.podReceipt} collapsable={false}>
                {/* Company Header */}
                <View style={styles.podHeader}>
                  <Text style={styles.podCompanyName}>ParcelWalah</Text>
                  <Text style={styles.podDocumentTitle}>PROOF OF DELIVERY</Text>
                </View>

                {/* Booking Details */}
                <View style={styles.podSection}>
                  <Text style={styles.podSectionTitle}>Booking Information</Text>
                  <View style={styles.podRow}>
                    <Text style={styles.podRowLabel}>Booking ID:</Text>
                    <Text style={styles.podRowValue}>
                      {selectedBooking.trackingNumber || selectedBooking.id}
                    </Text>
                  </View>
                  <View style={styles.podRow}>
                    <Text style={styles.podRowLabel}>Date:</Text>
                    <Text style={styles.podRowValue}>
                      {formatDateTime(selectedBooking.createdAt)}
                    </Text>
                  </View>
                  {selectedBooking.deliveryType && (
                    <View style={styles.podRow}>
                      <Text style={styles.podRowLabel}>Delivery Type:</Text>
                      <Text style={styles.podRowValue}>
                        {selectedBooking.deliveryType === "sameDay" ? "Same Day" : "Scheduled"}
                      </Text>
                    </View>
                  )}
                  {selectedBooking.deliveryDate && (
                    <View style={styles.podRow}>
                      <Text style={styles.podRowLabel}>Scheduled Date:</Text>
                      <Text style={styles.podRowValue}>
                        {formatDateTime(selectedBooking.deliveryDate)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Pickup Address */}
                <View style={styles.podSection}>
                  <Text style={styles.podSectionTitle}>Pickup Address</Text>
                  <Text style={styles.podAddressText}>
                    {selectedBooking.pickup.name}
                  </Text>
                  <Text style={styles.podAddressText}>
                    {selectedBooking.pickup.address}
                  </Text>
                  <Text style={styles.podAddressText}>
                    {selectedBooking.pickup.city}, {selectedBooking.pickup.state} - {selectedBooking.pickup.pincode}
                  </Text>
                  <Text style={styles.podAddressText}>
                    Phone: {displayPhoneNumber(selectedBooking.pickup.phone)}
                  </Text>
                </View>

                {/* Delivery Address */}
                <View style={styles.podSection}>
                  <Text style={styles.podSectionTitle}>Delivery Address</Text>
                  <Text style={styles.podAddressText}>
                    {selectedBooking.drop.name}
                  </Text>
                  <Text style={styles.podAddressText}>
                    {selectedBooking.drop.address}
                  </Text>
                  <Text style={styles.podAddressText}>
                    {selectedBooking.drop.city}, {selectedBooking.drop.state} - {selectedBooking.drop.pincode}
                  </Text>
                  <Text style={styles.podAddressText}>
                    Phone: {displayPhoneNumber(selectedBooking.drop.phone)}
                  </Text>
                </View>

                {/* Parcel Details */}
                <View style={styles.podSection}>
                  <Text style={styles.podSectionTitle}>Parcel Details</Text>
                  <View style={styles.podRow}>
                    <Text style={styles.podRowLabel}>Type:</Text>
                    <Text style={styles.podRowValue}>
                      {selectedBooking.parcelDetails.type}
                    </Text>
                  </View>
                  <View style={styles.podRow}>
                    <Text style={styles.podRowLabel}>Weight:</Text>
                    <Text style={styles.podRowValue}>
                      {selectedBooking.parcelDetails.weight} kg
                    </Text>
                  </View>
                  {selectedBooking.fare && (
                    <View style={styles.podRow}>
                      <Text style={styles.podRowLabel}>Fare:</Text>
                      <Text style={styles.podRowValue}>
                        ₹{selectedBooking.fare.toFixed(0)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Signature Section */}
                <View style={styles.podSection}>
                  <Text style={styles.podSectionTitle}>Customer Signature</Text>
                  {selectedBooking.podSignature ? (
                    <View style={styles.signatureContainer}>
                      <Text style={styles.signaturePlaceholder}>
                        Signature captured
                      </Text>
                      <View style={styles.signatureBox}>
                        <Text style={styles.signatureText}>[Signature Image]</Text>
                      </View>
                      <Text style={styles.signatureInfo}>
                        Signed by: {selectedBooking.podSignedBy || "Customer"}
                      </Text>
                      {selectedBooking.podSignedAt && (
                        <Text style={styles.signatureInfo}>
                          Date: {formatDateTime(selectedBooking.podSignedAt)}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View style={styles.signatureContainer}>
                      <Text style={styles.signatureLabel}>Recipient Name:</Text>
                      <TextInput
                        style={styles.signatureInput}
                        value={podSignedBy}
                        onChangeText={setPodSignedBy}
                        placeholder="Enter recipient name"
                        placeholderTextColor={colors.textSecondary}
                      />
                      <View style={styles.signatureBox}>
                        <Text style={styles.signaturePlaceholder}>
                          Customer signature will be captured here
                        </Text>
                        <Text style={styles.signatureHint}>
                          (Print this receipt for customer to sign)
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Footer */}
                <View style={styles.podFooter}>
                  <Text style={styles.podFooterText}>
                    This document serves as proof of delivery.
                  </Text>
                  <Text style={styles.podFooterText}>
                    Generated on: {new Date().toLocaleString("en-IN")}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.podModalFooter}>
              <TouchableOpacity
                style={[styles.podActionButton, styles.downloadButton]}
                onPress={async () => {
                  if (!podReceiptRef.current) {
                    Alert.alert("Error", "Unable to capture POD receipt");
                    return;
                  }
                  
                  try {
                    setDownloadingPOD(true);
                    
                    // Capture the POD receipt view as an image
                    const uri = await captureRef(podReceiptRef, {
                      format: "png",
                      quality: 1.0,
                      result: "tmpfile",
                    });

                    // Generate filename
                    const bookingId = selectedBooking.trackingNumber || selectedBooking.id;
                    const timestamp = new Date().toISOString().split("T")[0];
                    const filename = `POD_${bookingId}_${timestamp}.png`;
                    
                    // Check if sharing is available
                    const isAvailable = await Sharing.isAvailableAsync();
                    if (isAvailable) {
                      // Share directly from the captured URI
                      await Sharing.shareAsync(uri, {
                        mimeType: "image/png",
                        dialogTitle: "Download POD Receipt",
                        UTI: "public.png",
                      });
                      Alert.alert("Success", "POD receipt downloaded successfully");
                    } else {
                      // If sharing is not available, save to document directory
                      const fileUri = `${FileSystem.documentDirectory}${filename}`;
                      await FileSystem.copyAsync({
                        from: uri,
                        to: fileUri,
                      });
                      Alert.alert(
                        "Download Complete",
                        `POD receipt saved to: ${fileUri}`,
                        [{ text: "OK" }]
                      );
                    }
                  } catch (error: any) {
                    console.error("Error downloading POD:", error);
                    Alert.alert("Error", error.message || "Failed to download POD receipt");
                  } finally {
                    setDownloadingPOD(false);
                  }
                }}
                disabled={downloadingPOD}
              >
                <Feather name="download" size={20} color={colors.background} />
                <Text style={styles.podActionButtonText}>
                  {downloadingPOD ? "Downloading..." : "Download"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.podActionButton, styles.printButton]}
                onPress={() => {
                  Alert.alert(
                    "Print POD",
                    "To print this receipt, use your device's print functionality or take a screenshot.",
                    [{ text: "OK" }]
                  );
                }}
              >
                <Feather name="printer" size={20} color={colors.background} />
                <Text style={styles.podActionButtonText}>Print</Text>
              </TouchableOpacity>
              {!selectedBooking.podSignature && (
                <TouchableOpacity
                  style={[styles.podActionButton, styles.saveButton]}
                  onPress={async () => {
                    if (!podSignedBy.trim()) {
                      Alert.alert("Error", "Please enter recipient name");
                      return;
                    }
                    try {
                      setSavingPOD(true);
                      // For now, use a placeholder signature (base64 encoded placeholder)
                      // In production, this would be captured from a signature pad
                      const placeholderSignature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
                      await bookingService.updatePODSignature(
                        id!,
                        placeholderSignature,
                        podSignedBy
                      );
                      Alert.alert("Success", "POD receipt saved successfully", [
                        { text: "OK", onPress: () => {
                          setShowPODModal(false);
                          fetchBooking(id!);
                        }},
                      ]);
                    } catch (error: any) {
                      Alert.alert("Error", error.message || "Failed to save POD");
                    } finally {
                      setSavingPOD(false);
                    }
                  }}
                  disabled={savingPOD}
                >
                  <Feather name="save" size={20} color={colors.background} />
                  <Text style={styles.podActionButtonText}>
                    {savingPOD ? "Saving..." : "Save POD"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  trackingNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  date: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  paymentStatusCard: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary + "30",
  },
  paymentStatusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  paymentStatusTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paymentStatusTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  paymentStatusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  paymentDetails: {
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paymentDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentDetailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    flex: 1,
  },
  paymentDetailValue: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    textAlign: "right",
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  statusList: {
    gap: 12,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.borderLight,
    marginRight: 12,
  },
  statusText: {
    fontSize: 16,
    color: colors.textLight,
    flex: 1,
  },
  currentLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  address: {
    gap: 4,
  },
  addressName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  addressText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  addressPhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  parcelDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    flex: 2,
    textAlign: "right",
  },
  fare: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  fareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 32 : 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
  },
  fareInputRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  fareInputContainer: {
    flex: 1,
    marginBottom: 0,
  },
  fareInput: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    minHeight: 50,
  },
  calculateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 100,
    justifyContent: "center",
  },
  calculateButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "600",
  },
  fareInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    gap: 8,
  },
  fareInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  fareInfoText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  fareBreakdownContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.primary + "10",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  fareBreakdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  fareBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fareBreakdownTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.primary + "30",
  },
  fareBreakdownLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  fareBreakdownValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
  },
  fareBreakdownTotalValue: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: "700",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  updateButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.background,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  returnReasonInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  confirmButton: {
    backgroundColor: colors.error,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  modalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  returnReasonText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  returnDateText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  // POD Styles
  podContainer: {
    gap: 12,
  },
  podInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  podLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  podValue: {
    fontSize: 14,
    color: colors.text,
  },
  podButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.primary + "15",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: 8,
  },
  podButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  podPlaceholder: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 16,
  },
  podModalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    flex: 1,
  },
  podScrollView: {
    flex: 1,
  },
  podReceipt: {
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  podHeader: {
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  podCompanyName: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 8,
  },
  podDocumentTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: 1,
  },
  podSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  podSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  podRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  podRowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    flex: 1,
  },
  podRowValue: {
    fontSize: 14,
    color: colors.text,
    flex: 2,
    textAlign: "right",
  },
  podAddressText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  signatureContainer: {
    marginTop: 12,
  },
  signatureLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  signatureInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 16,
    backgroundColor: colors.background,
  },
  signatureBox: {
    minHeight: 120,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.surface,
  },
  signaturePlaceholder: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
  },
  signatureText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  signatureInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  signatureHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: "italic",
  },
  podFooter: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: "center",
  },
  podFooterText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 4,
  },
  podModalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    flexWrap: "wrap",
  },
  podActionButton: {
    flex: 1,
    minWidth: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  downloadButton: {
    backgroundColor: colors.info,
  },
  printButton: {
    backgroundColor: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.success,
  },
  podActionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.background,
  },
});

