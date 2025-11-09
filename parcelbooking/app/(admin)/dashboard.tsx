/**
 * Admin Dashboard Screen
 * View all bookings with filters
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useBookingStore } from "../../store/bookingStore";
import { useAuthStore } from "../../store/authStore";
import { useAuth } from "../../hooks/useAuth";
import { useBooking } from "../../hooks/useBooking";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { Header } from "../../components/Header";
import { EmptyState } from "../../components/EmptyState";
import { Loader } from "../../components/Loader";
import { colors } from "../../theme/colors";
import { formatDate, displayPhoneNumber } from "../../utils/formatters";
import { Booking, BookingStatus } from "../../utils/types";
import { STATUS_TYPES, PAYMENT_STATUS_TYPES } from "../../utils/constants";
import { Feather } from "@expo/vector-icons";
import { cancelBooking } from "../../services/bookingService";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const { bookings, filters, setFilters, clearFilters, loading, loadingMore, hasMore } =
    useBookingStore();
  const { fetchBookings, loadMoreBookings } = useBooking();

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Refresh bookings when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchBookings();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setFilters({ searchQuery: text });
  };

  const handleFilterApply = (status?: BookingStatus, paymentStatus?: string) => {
    setFilters({ status, paymentStatus });
    setShowFilterModal(false);
  };

  const handleClearFilters = () => {
    clearFilters();
    setSearchQuery("");
    setShowFilterModal(false);
  };

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

  const filteredBookings = bookings.filter((booking) => {
    if (filters.status && booking.status !== filters.status) return false;
    if (filters.paymentStatus && booking.paymentStatus !== filters.paymentStatus)
      return false;
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchTracking =
        booking.trackingNumber?.toLowerCase().includes(query) ||
        booking.id.toLowerCase().includes(query);
      const matchPickup = booking.pickup.city?.toLowerCase().includes(query) || 
                         booking.pickup.address?.toLowerCase().includes(query);
      const matchDrop = booking.drop.city?.toLowerCase().includes(query) ||
                       booking.drop.address?.toLowerCase().includes(query);
      if (!matchTracking && !matchPickup && !matchDrop) return false;
    }
    return true;
  });

  const renderBookingItem = ({ item }: { item: Booking }) => {
    const canCancel = item.status !== "Cancelled" && item.status !== "Delivered" && item.status !== "Returned";
    const isCancelling = cancellingBookingId === item.id;

    return (
      <Card style={styles.bookingCard}>
        <TouchableOpacity
          onPress={() =>
            router.push(`/(admin)/bookingDetails?id=${item.id}`)
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
            <View style={styles.footerLeft}>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
              {item.paymentMethod && (
                <Text style={styles.paymentMethod}>
                  {item.paymentMethod === "online" ? "💳 Online" : "💵 Cash"}
                </Text>
              )}
            </View>
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
      <Header
        title="Admin Dashboard"
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push("/(admin)/analytics")}
              style={styles.settingsButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="bar-chart-2" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(admin)/settings")}
              style={styles.settingsButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="settings" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="log-out" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by tracking, city, or address..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            (filters.status || filters.paymentStatus) && styles.filterButtonActive,
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <Feather
            name="filter"
            size={18}
            color={(filters.status || filters.paymentStatus) ? colors.background : colors.text}
          />
          {(filters.status || filters.paymentStatus) && (
            <View style={styles.filterBadge} />
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filters Display */}
      {(filters.status || filters.paymentStatus) && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filters.status && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  Status: {filters.status}
                </Text>
                <TouchableOpacity
                  onPress={() => setFilters({ status: undefined })}
                  style={styles.removeFilterButton}
                >
                  <Feather name="x" size={14} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}
            {filters.paymentStatus && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  Payment: {filters.paymentStatus}
                </Text>
                <TouchableOpacity
                  onPress={() => setFilters({ paymentStatus: undefined })}
                  style={styles.removeFilterButton}
                >
                  <Feather name="x" size={14} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={handleClearFilters}
            >
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{bookings.length}</Text>
          <Text style={styles.statLabel}>Total Bookings</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>
            {bookings.filter((b) => b.status === "Delivered").length}
          </Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>
            {bookings.filter((b) => b.paymentStatus === "paid").length}
          </Text>
          <Text style={styles.statLabel}>Paid</Text>
        </Card>
      </View>

      {loading ? (
        <Loader fullScreen />
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          title="No bookings found"
          message="There are no bookings matching your filters"
          icon={<Feather name="package" size={48} color={colors.textLight} />}
        />
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
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

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Bookings</Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.modalCloseButton}
              >
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Status Filters */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Booking Status</Text>
                <View style={styles.filterOptions}>
                  {STATUS_TYPES.map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        filters.status === status && styles.filterOptionActive,
                      ]}
                      onPress={() =>
                        handleFilterApply(
                          filters.status === status ? undefined : status,
                          filters.paymentStatus
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          filters.status === status &&
                            styles.filterOptionTextActive,
                        ]}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Payment Status Filters */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Payment Status</Text>
                <View style={styles.filterOptions}>
                  {PAYMENT_STATUS_TYPES.map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        filters.paymentStatus === status &&
                          styles.filterOptionActive,
                      ]}
                      onPress={() =>
                        handleFilterApply(
                          filters.status,
                          filters.paymentStatus === status ? undefined : status
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          filters.paymentStatus === status &&
                            styles.filterOptionTextActive,
                        ]}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={handleClearFilters}
              >
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyFiltersButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyFiltersText}>Apply Filters</Text>
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
  headerActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  settingsButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background,
  },
  activeFiltersContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    gap: 8,
  },
  activeFilterText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  removeFilterButton: {
    padding: 2,
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
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
    borderTopColor: colors.borderLight,
  },
  footerLeft: {
    gap: 4,
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  paymentMethod: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  fare: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
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
    maxHeight: "80%",
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
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  filterOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 100,
    alignItems: "center",
  },
  filterOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  filterOptionTextActive: {
    color: colors.background,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clearFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  clearFiltersText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  applyFiltersText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.background,
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

