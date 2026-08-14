/**
 * Track Booking Screen
 * Track parcel status
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useBooking } from "../../../hooks/useBooking";
import { Card } from "../../../components/Card";
import { StatusBadge } from "../../../components/StatusBadge";
import { Header } from "../../../components/Header";
import { Loader } from "../../../components/Loader";
import { EmptyState } from "../../../components/EmptyState";
import { colors } from "../../../theme/colors";
import { formatDateTime } from "../../../utils/formatters";  
import { STATUS_TYPES, STATUS_COLORS } from "../../../utils/constants";
import { Feather } from "@expo/vector-icons";
import { BookingStatus } from "../../../utils/types";
import * as bookingService from "../../../services/bookingService";
import { useFocusRefresh } from "../../../hooks/useFocusRefresh";
import { LiveTrackingMap } from "../../../components/LiveTrackingMap";

export default function TrackBookingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { selectedBooking, fetchBooking, trackBooking, loading } = useBooking();
  const [trackingNumber, setTrackingNumber] = useState(id || "");
  const [tracking, setTracking] = useState<bookingService.BookingTracking | null>(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (id) {
      // If it looks like a tracking number (contains PBS or is longer), use trackBooking
      // Otherwise, assume it's a booking ID
      if (id.includes("PBS") || id.length > 20) {
        trackBooking(id);
      } else {
        fetchBooking(id);
      }
    }
  }, [id]);

  // Refresh booking when screen is focused (only once per focus, not on every render)
  useFocusEffect(
    React.useCallback(() => {
      if (id && !id.includes("PBS") && id.length <= 20) {
        fetchBooking(id).catch((error) => {
          if (__DEV__) console.error('[TrackBooking] Error refreshing booking:', error);
        });
      }
    }, [id]) // Removed fetchBooking from dependencies - it should be stable
  );

  // Auto-refresh booking if status is PendingPayment but payment is paid
  useEffect(() => {
    if (id && selectedBooking && !id.includes("PBS") && id.length <= 20) {
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
            if (__DEV__) console.error('[TrackBooking] Error refreshing booking:', error);
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

  // Auto-refresh booking + rider location every 8s while this screen is open
  useFocusRefresh(
    async () => {
      if (!id || id.includes("PBS") || id.length > 20) return;
      try {
        await fetchBooking(id);
      } catch {
        /* ignore */
      }
      try {
        const t = await bookingService.getBookingTracking(id);
        setTracking(t);
      } catch {
        setTracking(null);
      }
    },
    8000,
    !!id
  );

  const submitCancel = async () => {
    if (!selectedBooking) return;
    try {
      setCancelling(true);
      await bookingService.cancelBooking(selectedBooking.id, cancelReason.trim() || "Customer requested cancellation");
      setCancelModal(false);
      setCancelReason("");
      await fetchBooking(selectedBooking.id);
      Alert.alert("Cancelled", "Your booking has been cancelled.");
    } catch (e: any) {
      Alert.alert("Cannot cancel", e.message || "Failed to cancel booking");
    } finally {
      setCancelling(false);
    }
  };

  const getStatusIcon = (status: BookingStatus): keyof typeof Feather.glyphMap => {
    switch (status) {
      case "Created":
        return "package";
      case "Picked":
        return "truck";
      case "Shipped":
        return "truck";
      case "Delivered":
        return "check-circle";
      default:
        return "package";
    }
  };

  const getStatusIndex = (status: BookingStatus): number => {
    return STATUS_TYPES.indexOf(status);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Track Parcel" showBack />
        <Loader fullScreen color={colors.primary} />
      </View>
    );
  }

  if (!selectedBooking && !id) {
    return (
      <View style={styles.container}>
        <Header title="Track Parcel" showBack />
        <View style={styles.searchContainer}>
          <Text style={styles.label}>Enter Tracking Number</Text>
          <TextInput
            style={styles.trackingInput}
            value={trackingNumber}
            onChangeText={setTrackingNumber}
            placeholder="e.g. PW-27-07-2026-001"
            placeholderTextColor={colors.textLight}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => {
              const q = trackingNumber.trim();
              if (q) trackBooking(q);
            }}
          />
          <TouchableOpacity
            style={[
              styles.searchButton,
              !trackingNumber.trim() && styles.searchButtonDisabled,
            ]}
            disabled={!trackingNumber.trim()}
            onPress={() => {
              const q = trackingNumber.trim();
              if (q) trackBooking(q);
            }}
          >
            <Text style={styles.searchButtonText}>Track</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!selectedBooking) {
    return (
      <View style={styles.container}>
        <Header title="Track Parcel" showBack />
        <EmptyState
          title="Booking not found"
          message="Please check your tracking number"
        />
      </View>
    );
  }

  const statusIndex = getStatusIndex(selectedBooking.status);
  const statusIcon = getStatusIcon(selectedBooking.status);

  return (
    <View style={styles.container}>
      <Header title="Track Parcel" showBack />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Card>
            <View style={styles.trackingHeader}>
              <Text style={styles.trackingNumber}>
                {selectedBooking.trackingNumber || `#${selectedBooking.id.slice(0, 8)}`}
              </Text>
              <StatusBadge status={selectedBooking.status} />
            </View>
            <Text style={styles.trackingDate}>
              Created: {formatDateTime(selectedBooking.createdAt)}
            </Text>
          </Card>

          {(selectedBooking.pickup?.lat != null ||
            selectedBooking.drop?.lat != null ||
            tracking?.rider?.location) && (
            <Card>
              <Text style={styles.sectionTitle}>Live Map</Text>
              <LiveTrackingMap
                height={260}
                pickup={
                  selectedBooking.pickup?.lat != null &&
                  selectedBooking.pickup?.lon != null
                    ? {
                        latitude: selectedBooking.pickup.lat,
                        longitude: selectedBooking.pickup.lon,
                        title: "Pickup",
                        description: selectedBooking.pickup.address,
                      }
                    : null
                }
                drop={
                  selectedBooking.drop?.lat != null &&
                  selectedBooking.drop?.lon != null
                    ? {
                        latitude: selectedBooking.drop.lat,
                        longitude: selectedBooking.drop.lon,
                        title: "Drop",
                        description: selectedBooking.drop.address,
                      }
                    : null
                }
                rider={
                  tracking?.rider?.location
                    ? {
                        latitude: tracking.rider.location.lat,
                        longitude: tracking.rider.location.lon,
                        title: tracking.rider.name || "Rider",
                        description: "Live location",
                      }
                    : null
                }
              />
              {tracking?.rider?.location?.updatedAt ? (
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>
                  Rider updated {formatDateTime(tracking.rider.location.updatedAt as any)}
                </Text>
              ) : null}
            </Card>
          )}

          {(selectedBooking.riderId || tracking?.rider) && (
            <Card>
              <Text style={styles.sectionTitle}>Your Rider</Text>
              <Text style={{ fontWeight: "600", color: colors.text, marginBottom: 4 }}>
                {tracking?.rider?.name || selectedBooking.riderName || "Assigned"}
              </Text>
              {(selectedBooking as any).pickupOtp || (selectedBooking as any).dropOtp ? (
                <View style={{ marginTop: 12, padding: 12, backgroundColor: "#FFF3E6", borderRadius: 12 }}>
                  <Text style={{ fontWeight: "700", color: colors.primary, marginBottom: 6 }}>
                    Share OTP with rider
                  </Text>
                  {(selectedBooking as any).pickupOtp &&
                    !["Picked", "Shipped", "Delivered"].includes(selectedBooking.status) && (
                      <Text style={{ color: colors.text, marginBottom: 4 }}>
                        Pickup OTP:{" "}
                        <Text style={{ fontWeight: "800", letterSpacing: 2 }}>
                          {(selectedBooking as any).pickupOtp}
                        </Text>
                      </Text>
                    )}
                  {(selectedBooking as any).dropOtp &&
                    ["Picked", "Shipped"].includes(selectedBooking.status) && (
                      <Text style={{ color: colors.text }}>
                        Drop OTP:{" "}
                        <Text style={{ fontWeight: "800", letterSpacing: 2 }}>
                          {(selectedBooking as any).dropOtp}
                        </Text>
                      </Text>
                    )}
                </View>
              ) : null}
              {(tracking?.rider?.phone || selectedBooking.riderPhone) && (
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL(
                      `tel:${(tracking?.rider?.phone || selectedBooking.riderPhone || "").replace(/\s/g, "")}`
                    )
                  }
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}
                >
                  <Feather name="phone" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary }}>
                    {tracking?.rider?.phone || selectedBooking.riderPhone}
                  </Text>
                </TouchableOpacity>
              )}
              {!tracking?.rider?.location && ["Picked", "Shipped"].includes(selectedBooking.status) && (
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  Waiting for rider location…
                </Text>
              )}
            </Card>
          )}

          {selectedBooking.status === "DeliveryFailed" && (
            <Card style={{ backgroundColor: "#FEE2E2", borderColor: "#DC2626" }}>
              <Text style={{ fontWeight: "700", color: "#DC2626", fontSize: 15 }}>
                Delivery Attempt Failed
              </Text>
              <Text style={{ color: "#7F1D1D", marginTop: 4, fontSize: 13 }}>
                Your rider attempted delivery but couldn't complete it. Another attempt will be made or the parcel may be returned.
              </Text>
            </Card>
          )}

          {selectedBooking.status === "ReturnInProgress" && (
            <Card style={{ backgroundColor: "#FFF7ED", borderColor: "#F97316" }}>
              <Text style={{ fontWeight: "700", color: "#C2410C", fontSize: 15 }}>
                Parcel Being Returned
              </Text>
              <Text style={{ color: "#7C2D12", marginTop: 4, fontSize: 13 }}>
                The rider is returning your parcel. A refund will be processed if payment was made online.
              </Text>
            </Card>
          )}

          {!["Delivered", "Cancelled", "Returned", "DeliveryFailed", "ReturnInProgress"].includes(selectedBooking.status) && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setCancelModal(true)}
            >
              <Feather name="x-circle" size={16} color="#DC2626" />
              <Text style={styles.cancelBtnText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}

          <Card>
            <Text style={styles.sectionTitle}>Status Timeline</Text>
            <View style={styles.timeline}>
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
                const visibleStatusIndex = visibleStatuses.indexOf(selectedBooking.status);
                
                const statusIconName = getStatusIcon(status);
                const isCompleted = visibleIndex <= visibleStatusIndex;
                const isCurrent = visibleIndex === visibleStatusIndex;

                return (
                  <View key={status} style={styles.timelineItem}>
                    <View style={styles.timelineContent}>
                      <View
                        style={[
                          styles.timelineIcon,
                          isCompleted && { backgroundColor: STATUS_COLORS[status] },
                        ]}
                      >
                        <Feather
                          name={statusIconName}
                          size={20}
                          color={isCompleted ? colors.background : colors.textLight}
                        />
                      </View>
                      <View style={styles.timelineText}>
                        <Text
                          style={[
                            styles.timelineStatus,
                            isCompleted && { color: colors.text },
                          ]}
                        >
                          {status}
                        </Text>
                        {isCurrent && (
                          <Text style={styles.currentStatus}>Current Status</Text>
                        )}
                      </View>
                    </View>
                    {visibleIndex < visibleStatuses.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          isCompleted && { backgroundColor: STATUS_COLORS[status] },
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Pickup Address</Text>
            <View style={styles.address}>
              <Text style={styles.addressName}>{selectedBooking.pickup.name}</Text>
              <Text style={styles.addressText}>{selectedBooking.pickup.address}</Text>
              <Text style={styles.addressText}>
                {selectedBooking.pickup.city}, {selectedBooking.pickup.state} -{" "}
                {selectedBooking.pickup.pincode}
              </Text>
              <Text style={styles.addressPhone}>
                Phone: {selectedBooking.pickup.phone}
              </Text>
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <View style={styles.address}>
              <Text style={styles.addressName}>{selectedBooking.drop.name}</Text>
              <Text style={styles.addressText}>{selectedBooking.drop.address}</Text>
              <Text style={styles.addressText}>
                {selectedBooking.drop.city}, {selectedBooking.drop.state} -{" "}
                {selectedBooking.drop.pincode}
              </Text>
              <Text style={styles.addressPhone}>
                Phone: {selectedBooking.drop.phone}
              </Text>
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Parcel Details</Text>
            <View style={styles.parcelDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>{selectedBooking.parcelDetails.type}</Text>
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
              {selectedBooking.fare && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fare:</Text>
                  <Text style={[styles.detailValue, styles.fareValue]}>
                    ₹{selectedBooking.fare.toFixed(0)}
                  </Text>
                </View>
              )}
            </View>
          </Card>

          {/* Invoice Button - Show only if payment is completed */}
          {selectedBooking.paymentStatus === "paid" && (
            <Card>
              <TouchableOpacity
                style={styles.invoiceButton}
                onPress={() => router.push(`/(customer)/booking/invoice?id=${selectedBooking.id}`)}
              >
                <Feather name="file-text" size={24} color={colors.primary} />
                <Text style={styles.invoiceButtonText}>View Invoice</Text>
                <Feather name="chevron-right" size={24} color={colors.primary} />
              </TouchableOpacity>
            </Card>
          )}
        </View>
      </ScrollView>

      <Modal visible={cancelModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Cancel Booking</Text>
            {selectedBooking?.riderId && (
              <Text style={styles.modalWarning}>
                A rider is already assigned. A cancellation fee of ₹30 may apply.
              </Text>
            )}
            <TextInput
              style={styles.modalInput}
              placeholder="Reason for cancellation (optional)"
              placeholderTextColor={colors.textLight}
              value={cancelReason}
              onChangeText={setCancelReason}
            />
            <TouchableOpacity
              style={[styles.modalConfirmBtn, cancelling && { opacity: 0.6 }]}
              onPress={submitCancel}
              disabled={cancelling}
            >
              <Text style={styles.modalConfirmText}>
                {cancelling ? "Cancelling…" : "Confirm Cancel"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalDismissBtn}
              onPress={() => setCancelModal(false)}
              disabled={cancelling}
            >
              <Text style={styles.modalDismissText}>Keep Booking</Text>
            </TouchableOpacity>
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
  searchContainer: {
    padding: 24,
    alignItems: "stretch",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  trackingInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: 16,
  },
  searchButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "600",
  },
  trackingHeader: {
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
  trackingDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  timeline: {
    paddingVertical: 8,
  },
  timelineItem: {
    marginBottom: 16,
  },
  timelineContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  timelineText: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textLight,
  },
  currentStatus: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: colors.borderLight,
    marginLeft: 19,
    marginTop: 4,
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
  fareValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  cancelBtnText: {
    color: "#DC2626",
    fontWeight: "600",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  modalWarning: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    marginBottom: 16,
  },
  modalConfirmBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  modalConfirmText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalDismissBtn: { paddingVertical: 10, alignItems: "center" },
  modalDismissText: { color: colors.textSecondary, fontSize: 15 },
  invoiceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.primary + "10",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  invoiceButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
    marginLeft: 12,
  },
});

