/**
 * Booking History Screen
 * View all past bookings
 */

import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useBooking } from "../../../hooks/useBooking";
import { useAuthStore } from "../../../store/authStore";
import { Card } from "../../../components/Card";
import { StatusBadge } from "../../../components/StatusBadge";
import { Header } from "../../../components/Header";
import { EmptyState } from "../../../components/EmptyState";
import { Loader } from "../../../components/Loader";
import { colors } from "../../../theme/colors";
import { formatDate } from "../../../utils/formatters";
import { Booking } from "../../../utils/types";
import { Feather } from "@expo/vector-icons";
import { cancelBooking } from "../../../services/bookingService";

export default function BookingHistoryScreen() {
  const router = useRouter();
  const { paymentFailed } = useLocalSearchParams<{ paymentFailed?: string }>();
  const { user } = useAuthStore();
  const { bookings, loading, loadingMore, hasMore, fetchBookings, loadMoreBookings } = useBooking();
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [shownFailAlert, setShownFailAlert] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchBookings();
      }
      if (paymentFailed === "true" && !shownFailAlert) {
        setShownFailAlert(true);
        Alert.alert(
          "Payment failed",
          "Your payment did not complete. Tap Pay again on the pending booking to retry."
        );
      }
    }, [user, fetchBookings, paymentFailed, shownFailAlert])
  );

  const handleCancelBooking = async (bookingId: string) => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              setCancellingBookingId(bookingId);
              await cancelBooking(bookingId);
              Alert.alert("Success", "Booking cancelled successfully");
              await fetchBookings();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to cancel booking");
            } finally {
              setCancellingBookingId(null);
            }
          },
        },
      ]
    );
  };

  const renderBookingItem = ({ item }: { item: Booking }) => {
    const canCancel = item.status === "Created" || item.status === "PendingPayment";
    const needsPayment =
      item.paymentMethod === "online" &&
      (item.status === "PendingPayment" ||
        item.paymentStatus === "pending" ||
        item.paymentStatus === "failed");
    const isCancelling = cancellingBookingId === item.id;
    return (
      <Card style={styles.bookingCard}>
        <TouchableOpacity
          onPress={() =>
            router.push(`/(customer)/booking/track?id=${item.id}`)
          }
        >
          <View style={styles.bookingHeader}>
            <View style={styles.bookingInfo}>
              <Text style={styles.trackingNumber}>
                {item.trackingNumber || `#${item.id.slice(0, 8)}`}
              </Text>
              <Text style={styles.route}>
                {item.pickup.city} → {item.drop.city}
              </Text>
            </View>
            <StatusBadge status={item.status} />
          </View>
          {item.riderName ? (
            <Text style={styles.riderChip}>Rider: {item.riderName}</Text>
          ) : item.assignmentStatus === "no_rider" ? (
            <Text style={styles.noRiderText}>No rider available — please try again</Text>
          ) : item.assignmentStatus === "offered" ||
            (item.status === "Created" && !item.riderId) ? (
            <Text style={styles.riderPending}>Finding a rider…</Text>
          ) : null}
          <View style={styles.bookingFooter}>
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            {item.fare && (
              <Text style={styles.fare}>₹{item.fare.toFixed(0)}</Text>
            )}
          </View>
        </TouchableOpacity>
        {(needsPayment || canCancel) && (
          <View style={styles.actionRow}>
            {needsPayment && (
              <TouchableOpacity
                style={styles.payAgainButton}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(`/(customer)/payment?id=${item.id}` as any);
                }}
              >
                <Feather name="credit-card" size={16} color={colors.primary} />
                <Text style={styles.payAgainText}>Pay again</Text>
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleCancelBooking(item.id);
                }}
                disabled={isCancelling}
              >
                <Feather name="x-circle" size={16} color={colors.error} />
                <Text style={styles.cancelButtonText}>
                  {isCancelling ? "Cancelling..." : "Cancel"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Booking History" showBack />
      {loading ? (
        <Loader fullScreen color={colors.primary} />
      ) : bookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          message="Your booking history will appear here"
          icon={<Feather name="package" size={48} color={colors.textLight} />}
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          onEndReached={() => {
            if (hasMore && !loadingMore) {
              loadMoreBookings();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          scrollEventThrottle={16}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  listContent: {
    padding: 16,
  },
  bookingCard: {
    marginBottom: 12,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
    marginRight: 12,
  },
  trackingNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  route: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  riderChip: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600",
    marginBottom: 8,
  },
  riderPending: {
    fontSize: 13,
    color: colors.warning,
    marginBottom: 8,
  },
  noRiderText: {
    fontSize: 13,
    color: colors.error,
    marginBottom: 8,
    fontWeight: "500",
  },
  bookingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  fare: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  footerLoader: {
    padding: 20,
    alignItems: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  payAgainButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.primary + "12",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  payAgainText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  cancelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.error + "10",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.error,
  },
});

