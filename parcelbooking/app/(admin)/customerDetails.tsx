/**
 * Customer Details Screen
 * View customer lifetime spend, complaints, and booking history
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../components/Card";
import { Header } from "../../components/Header";
import { Loader } from "../../components/Loader";
import { StatusBadge } from "../../components/StatusBadge";
import { colors } from "../../theme/colors";
import { formatCurrency, formatDate, displayPhoneNumber } from "../../utils/formatters";
import * as analyticsService from "../../services/analyticsService";
import { Booking } from "../../utils/types";

export default function CustomerDetailsScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<analyticsService.CustomerAnalytics | null>(null);

  useEffect(() => {
    if (userId) {
      fetchCustomerData();
    }
  }, [userId]);

  const fetchCustomerData = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const data = await analyticsService.getCustomerAnalytics(userId);
      setCustomerData(data);
    } catch (error: any) {
      console.error("Error fetching customer data:", error);
      Alert.alert("Error", error.message || "Failed to fetch customer data");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !customerData) {
    return (
      <View style={styles.container}>
        <Header title="Customer Details" showBack />
        <Loader fullScreen />
      </View>
    );
  }

  const renderBookingItem = ({ item }: { item: Booking }) => (
    <Card style={styles.bookingCard}>
      <TouchableOpacity
        onPress={() => router.push(`/(admin)/bookingDetails?id=${item.id}`)}
        activeOpacity={0.7}
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
          <View style={styles.badges}>
            <StatusBadge status={item.status} style={styles.badge} />
            <StatusBadge
              status={item.paymentStatus as any}
              type="payment"
              style={styles.badge}
            />
          </View>
        </View>
        <View style={styles.bookingFooter}>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          {item.fare && (
            <Text style={styles.fare}>{formatCurrency(item.fare)}</Text>
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Header title="Customer Details" showBack />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Customer Info */}
          <Card>
            <View style={styles.customerHeader}>
              <View style={styles.avatar}>
                <Feather name="user" size={32} color={colors.primary} />
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>
                  {customerData.name || "Unknown User"}
                </Text>
                <Text style={styles.customerPhone}>
                  {displayPhoneNumber(customerData.phoneNumber)}
                </Text>
              </View>
            </View>
          </Card>

          {/* Statistics */}
          <Card>
            <Text style={styles.sectionTitle}>Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{customerData.totalBookings}</Text>
                <Text style={styles.statLabel}>Total Bookings</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatCurrency(customerData.lifetimeSpend)}
                </Text>
                <Text style={styles.statLabel}>Lifetime Spend</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{customerData.complaints}</Text>
                <Text style={styles.statLabel}>Complaints</Text>
              </View>
            </View>
          </Card>

          {/* Booking History */}
          <Card>
            <Text style={styles.sectionTitle}>Booking History</Text>
            {customerData.bookings.length > 0 ? (
              <FlatList
                data={customerData.bookings}
                keyExtractor={(item) => item.id}
                renderItem={renderBookingItem}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No bookings found</Text>
              </View>
            )}
          </Card>
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
  customerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  bookingCard: {
    marginBottom: 0,
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
  badges: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    marginLeft: 4,
  },
  bookingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  separator: {
    height: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

