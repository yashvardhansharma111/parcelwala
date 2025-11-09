/**
 * Customer Home Screen
 * Dashboard with booking shortcuts
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useBooking } from "../../hooks/useBooking";
import { useAuth } from "../../hooks/useAuth";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { Loader } from "../../components/Loader";
import { Header } from "../../components/Header";
import { colors } from "../../theme/colors";
import { formatDate } from "../../utils/formatters";
import { Feather } from "@expo/vector-icons";
import { Alert } from "react-native";

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { bookings, loading, fetchBookings } = useBooking();
  const { logout } = useAuth();

  // Fetch bookings when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchBookings();
      }
    }, [user, fetchBookings])
  );

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: logout,
        },
      ]
    );
  };

  const recentBookings = bookings.slice(0, 5);

  const quickActions = [
    {
      title: "New Booking",
      icon: "plus" as keyof typeof Feather.glyphMap,
      onPress: () => router.push("/(customer)/booking/new"),
      color: colors.primary,
    },
    {
      title: "Track Parcel",
      icon: "truck" as keyof typeof Feather.glyphMap,
      onPress: () => router.push("/(customer)/booking/track"),
      color: colors.info,
    },
    {
      title: "Booking History",
      icon: "clock" as keyof typeof Feather.glyphMap,
      onPress: () => router.push("/(customer)/booking/history"),
      color: colors.success,
    },
  ];

  return (
    <View style={styles.container}>
      <Header
        title="Home"
        rightAction={
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="log-out" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Hi {user?.name || user?.phoneNumber || "User"}
          </Text>
          <Text style={styles.subtitle}>Manage your parcels</Text>
        </View>

        <View style={styles.quickActions}>
          {quickActions.map((action, index) => {
            return (
              <TouchableOpacity
                key={index}
                style={styles.quickActionCard}
                onPress={action.onPress}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${action.color}20` }]}>
                  <Feather name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.quickActionText}>{action.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Bookings</Text>
          {loading ? (
            <Loader color={colors.primary} />
          ) : recentBookings.length === 0 ? (
            <EmptyState
              title="No bookings yet"
              message="Create your first booking to get started"
              icon={<Feather name="package" size={48} color={colors.textLight} />}
            />
          ) : (
            <FlatList
              data={recentBookings}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Card style={styles.bookingCard}>
                  <TouchableOpacity
                    onPress={() =>
                      router.push(`/(customer)/booking/track?id=${item.id}`)
                    }
                  >
                    <View style={styles.bookingHeader}>
                      <Text style={styles.trackingNumber}>
                        {item.trackingNumber || `#${item.id.slice(0, 8)}`}
                      </Text>
                      <StatusBadge status={item.status} />
                    </View>
                    <View style={styles.bookingInfo}>
                      <Text style={styles.bookingRoute}>
                        {item.pickup.city} → {item.drop.city}
                      </Text>
                      <Text style={styles.bookingDate}>
                        {formatDate(item.createdAt)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Card>
              )}
              scrollEnabled={false}
            />
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
  header: {
    padding: 24,
    backgroundColor: colors.background,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  quickActions: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  bookingCard: {
    marginBottom: 12,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  trackingNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  bookingInfo: {
    gap: 4,
  },
  bookingRoute: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  bookingDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  logoutButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});

