/**
 * Orders tab — booking history list
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "../../../store/authStore";
import { useBooking } from "../../../hooks/useBooking";
import { StatusBadge } from "../../../components/StatusBadge";
import { EmptyState } from "../../../components/EmptyState";
import { Loader } from "../../../components/Loader";
import { colors } from "../../../theme/colors";
import { formatDate } from "../../../utils/formatters";

export default function OrdersTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const { bookings, loading, fetchBookings } = useBooking();

  useFocusEffect(
    useCallback(() => {
      if (user) fetchBookings().catch(() => {});
    }, [user, fetchBookings])
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Orders</Text>
      {loading && (!bookings || bookings.length === 0) ? (
        <Loader fullScreen />
      ) : (
        <FlatList
          data={bookings || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="No orders"
              message="Your Instant and Intercity bookings will appear here."
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/(customer)/booking/track",
                  params: { id: item.trackingNumber || item.id },
                } as any)
              }
            >
              <View style={styles.icon}>
                <Feather name="package" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.route}>
                  {item.pickup?.city || "—"} → {item.drop?.city || "—"}
                </Text>
                <Text style={styles.meta}>
                  {item.trackingNumber || item.id.slice(0, 8)}
                </Text>
                <Text style={styles.meta}>{formatDate(item.createdAt as any)}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <StatusBadge status={item.status} />
                <Text style={styles.fare}>₹{item.fare ?? "—"}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.background,
  },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF3E6",
    alignItems: "center",
    justifyContent: "center",
  },
  route: { fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  fare: { fontWeight: "800", color: colors.text },
});
