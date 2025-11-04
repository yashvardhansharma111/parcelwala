/**
 * Admin Reports Screen
 * View booking reports and analytics
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Header } from "../../components/Header";
import { Card } from "../../components/Card";
import { colors } from "../../theme/colors";
import { useBookingStore } from "../../store/bookingStore";
import { formatCurrency } from "../../utils/formatters";

export default function AdminReportsScreen() {
  const { bookings } = useBookingStore();

  const totalBookings = bookings.length;
  const deliveredBookings = bookings.filter(
    (b) => b.status === "Delivered"
  ).length;
  const pendingBookings = bookings.filter(
    (b) => b.status !== "Delivered"
  ).length;
  const paidBookings = bookings.filter(
    (b) => b.paymentStatus === "paid"
  ).length;
  const totalRevenue = bookings
    .filter((b) => b.paymentStatus === "paid" && b.fare)
    .reduce((sum, b) => sum + (b.fare || 0), 0);

  const statusDistribution = {
    Created: bookings.filter((b) => b.status === "Created").length,
    Picked: bookings.filter((b) => b.status === "Picked").length,
    Shipped: bookings.filter((b) => b.status === "Shipped").length,
    Delivered: bookings.filter((b) => b.status === "Delivered").length,
  };

  return (
    <View style={styles.container}>
      <Header title="Reports" showBack />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Card>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalBookings}</Text>
                <Text style={styles.statLabel}>Total Bookings</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{deliveredBookings}</Text>
                <Text style={styles.statLabel}>Delivered</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{pendingBookings}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{paidBookings}</Text>
                <Text style={styles.statLabel}>Paid</Text>
              </View>
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Revenue</Text>
            <View style={styles.revenueSection}>
              <Text style={styles.revenueValue}>
                {formatCurrency(totalRevenue)}
              </Text>
              <Text style={styles.revenueLabel}>Total Revenue</Text>
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Status Distribution</Text>
            <View style={styles.distributionList}>
              {Object.entries(statusDistribution).map(([status, count]) => (
                <View key={status} style={styles.distributionItem}>
                  <Text style={styles.distributionLabel}>{status}</Text>
                  <Text style={styles.distributionValue}>{count}</Text>
                </View>
              ))}
            </View>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  revenueSection: {
    alignItems: "center",
    paddingVertical: 16,
  },
  revenueValue: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.success,
    marginBottom: 8,
  },
  revenueLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  distributionList: {
    gap: 12,
  },
  distributionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  distributionLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  distributionValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
});

