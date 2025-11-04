/**
 * Booking History Screen
 * View all past bookings
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useBookingStore } from "../../../store/bookingStore";
import { Card } from "../../../components/Card";
import { StatusBadge } from "../../../components/StatusBadge";
import { Header } from "../../../components/Header";
import { EmptyState } from "../../../components/EmptyState";
import { Loader } from "../../../components/Loader";
import { colors } from "../../../theme/colors";
import { formatDate } from "../../../utils/formatters";
import { Booking } from "../../../utils/types";
import { Feather } from "@expo/vector-icons";

export default function BookingHistoryScreen() {
  const router = useRouter();
  const { bookings, loading } = useBookingStore();

  const renderBookingItem = ({ item }: { item: Booking }) => {
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
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Booking History" showBack />
      {loading ? (
        <Loader fullScreen />
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
});

