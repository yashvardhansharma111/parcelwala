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
import { useRouter, useFocusEffect } from "expo-router";
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
  const { user } = useAuthStore();
  const { bookings, loading, loadingMore, hasMore, fetchBookings, loadMoreBookings } = useBooking();
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

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

  // Fetch bookings when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchBookings();
      }
    }, [user, fetchBookings])
  );

  const renderBookingItem = ({ item }: { item: Booking }) => {
    const canCancel = item.status === "Created" || item.status === "PendingPayment";
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
          <View style={styles.bookingFooter}>
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            {item.fare && (
              <Text style={styles.fare}>₹{item.fare.toFixed(0)}</Text>
            )}
          </View>
        </TouchableOpacity>
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={(e) => {
              e.stopPropagation();
              handleCancelBooking(item.id);
            }}
            disabled={isCancelling}
          >
            <Feather 
              name="x-circle" 
              size={16} 
              color={colors.error} 
            />
            <Text style={styles.cancelButtonText}>
              {isCancelling ? "Cancelling..." : "Cancel"}
            </Text>
          </TouchableOpacity>
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
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
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

