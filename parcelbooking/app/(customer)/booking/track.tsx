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

export default function TrackBookingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { selectedBooking, fetchBooking, trackBooking, loading } = useBooking();
  const [trackingNumber, setTrackingNumber] = useState(id || "");

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
        console.log('[TrackBooking] 🔄 Screen focused, refreshing booking once...');
        fetchBooking(id).catch((error) => {
          console.error('[TrackBooking] ❌ Error refreshing booking:', error);
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
        console.log('[TrackBooking] 🔄 Status mismatch detected (PendingPayment but paid), auto-refreshing...');
        let refreshCount = 0;
        const maxRefreshes = 5; // Only refresh 5 times (10 seconds total)
        
        const refreshInterval = setInterval(() => {
          refreshCount++;
          if (refreshCount > maxRefreshes) {
            clearInterval(refreshInterval);
            console.log('[TrackBooking] ✅ Stopped auto-refresh (max attempts reached)');
            return;
          }
          console.log('[TrackBooking] 🔄 Auto-refreshing booking to get updated status...', refreshCount);
          fetchBooking(id).catch((error) => {
            console.error('[TrackBooking] ❌ Error refreshing booking:', error);
          });
        }, 2000); // Refresh every 2 seconds

        // Clear interval after 10 seconds
        const timeoutId = setTimeout(() => {
          clearInterval(refreshInterval);
          console.log('[TrackBooking] ✅ Stopped auto-refresh (timeout)');
        }, 10000);

        return () => {
          clearInterval(refreshInterval);
          clearTimeout(timeoutId);
        };
      }
    }
  }, [id, selectedBooking?.status, selectedBooking?.paymentStatus]); // Removed fetchBooking from dependencies

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
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => {
              if (trackingNumber) {
                // Use trackBooking for tracking numbers
                trackBooking(trackingNumber);
              }
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
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  searchButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
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

