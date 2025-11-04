/**
 * Admin Booking Details Screen
 * View and update booking status
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
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

  const handleStatusUpdate = async (newStatus: BookingStatus) => {
    if (!selectedBooking || !id) return;

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

          <Card>
            <Text style={styles.sectionTitle}>Status Timeline</Text>
            <View style={styles.statusList}>
              {STATUS_TYPES.map((status, index) => {
                const isCompleted = index <= currentStatusIndex;
                return (
                  <TouchableOpacity
                    key={status}
                    style={styles.statusItem}
                    onPress={() => handleStatusUpdate(status)}
                    disabled={updating || index > currentStatusIndex + 1}
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
                    {index === currentStatusIndex && (
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
        </View>
      </ScrollView>

      {/* Fare Update Modal */}
      <Modal
        visible={showFareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFareModal(false)}
      >
        <View style={styles.modalOverlay}>
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

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Fare Amount (₹)</Text>
              <View style={styles.fareInputRow}>
                <Input
                  value={newFare}
                  onChangeText={setNewFare}
                  placeholder="Enter fare amount"
                  keyboardType="decimal-pad"
                  style={styles.fareInput}
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
            </View>

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
    paddingBottom: 32,
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
  fareInput: {
    flex: 1,
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
});

