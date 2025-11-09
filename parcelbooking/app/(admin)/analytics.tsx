/**
 * Analytics Screen
 * Admin dashboard analytics with charts and customer insights
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../components/Card";
import { Header } from "../../components/Header";
import { Loader } from "../../components/Loader";
import { colors } from "../../theme/colors";
import { formatCurrency, formatDate } from "../../utils/formatters";
import * as analyticsService from "../../services/analyticsService";
import { useAuth } from "../../hooks/useAuth";

interface DashboardAnalytics {
  userCount: number;
  totalBookings: number;
  todayBookings: number;
  inTransitBookings: number;
  deliveredBookings: number;
  cancelledBookings: number;
  dailyRevenue: number;
  monthlyRevenue: number;
  totalRevenue: number;
}

interface CustomerSummary {
  userId: string;
  phoneNumber: string;
  name?: string;
  totalBookings: number;
  lifetimeSpend: number;
  complaints: number;
  lastBookingDate?: string;
}

interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
}

interface FailedDelivery {
  bookingId: string;
  trackingNumber?: string;
  customerPhone: string;
  customerName: string;
  status: string;
  fare?: number;
  createdAt: string;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "customers" | "failed">("overview");
  
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [failedDeliveries, setFailedDeliveries] = useState<FailedDelivery[]>([]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardData, customersData, revenueDataResult, failedData] = await Promise.all([
        analyticsService.getDashboardAnalytics(),
        analyticsService.getAllCustomers(),
        analyticsService.getRevenueAnalytics(30),
        analyticsService.getFailedDeliveries(),
      ]);
      
      setAnalytics(dashboardData);
      setCustomers(customersData);
      setRevenueData(revenueDataResult);
      setFailedDeliveries(failedData);
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      Alert.alert("Error", error.message || "Failed to fetch analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [fetchAnalytics])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const handleCustomerPress = (userId: string) => {
    router.push(`/(admin)/customerDetails?userId=${userId}`);
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: logout },
      ]
    );
  };

  if (loading && !analytics) {
    return (
      <View style={styles.container}>
        <Header
          title="Analytics"
          rightAction={
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Feather name="log-out" size={22} color={colors.text} />
            </TouchableOpacity>
          }
        />
        <Loader fullScreen />
      </View>
    );
  }

  const renderOverview = () => {
    // Calculate pie chart data for booking status
    const statusData = [
      { label: "Today", value: analytics?.todayBookings || 0, color: colors.primary },
      { label: "In Transit", value: analytics?.inTransitBookings || 0, color: "#FFA500" },
      { label: "Delivered", value: analytics?.deliveredBookings || 0, color: "#4CAF50" },
      { label: "Cancelled", value: analytics?.cancelledBookings || 0, color: colors.error },
    ];
    const totalStatus = statusData.reduce((sum, item) => sum + item.value, 0);

    return (
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.content}>
          {/* Key Metrics Row */}
          <View style={styles.metricsRow}>
            <Card style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <Feather name="users" size={28} color={colors.primary} />
              </View>
              <Text style={styles.metricValue}>{analytics?.userCount || 0}</Text>
              <Text style={styles.metricLabel}>User Count</Text>
            </Card>
            <Card style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <Feather name="package" size={28} color={colors.primary} />
              </View>
              <Text style={styles.metricValue}>{analytics?.totalBookings || 0}</Text>
              <Text style={styles.metricLabel}>Total Bookings</Text>
            </Card>
          </View>

          {/* Daily Revenue Card */}
          <Card style={styles.revenueCard}>
            <View style={styles.revenueHeader}>
              <View>
                <Text style={styles.revenueCardLabel}>Daily Revenue</Text>
                <Text style={styles.revenueCardValue}>
                  {formatCurrency(analytics?.dailyRevenue || 0)}
                </Text>
              </View>
              <View style={styles.revenueIconContainer}>
                <Feather name="trending-up" size={32} color={colors.primary} />
              </View>
            </View>
            <View style={styles.revenueSubRow}>
              <View>
                <Text style={styles.revenueSubLabel}>Monthly</Text>
                <Text style={styles.revenueSubValue}>
                  {formatCurrency(analytics?.monthlyRevenue || 0)}
                </Text>
              </View>
              <View>
                <Text style={styles.revenueSubLabel}>Total</Text>
                <Text style={styles.revenueSubValue}>
                  {formatCurrency(analytics?.totalRevenue || 0)}
                </Text>
              </View>
            </View>
          </Card>

          {/* Booking Status Breakdown with Pie Chart */}
          <Card>
            <Text style={styles.sectionTitle}>Booking Status Breakdown</Text>
            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.statusValue}>{analytics?.todayBookings || 0}</Text>
                <Text style={styles.statusLabel}>Today</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: "#FFA500" }]} />
                <Text style={styles.statusValue}>{analytics?.inTransitBookings || 0}</Text>
                <Text style={styles.statusLabel}>In Transit</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: "#4CAF50" }]} />
                <Text style={styles.statusValue}>{analytics?.deliveredBookings || 0}</Text>
                <Text style={styles.statusLabel}>Delivered</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: colors.error }]} />
                <Text style={styles.statusValue}>{analytics?.cancelledBookings || 0}</Text>
                <Text style={styles.statusLabel}>Cancelled</Text>
              </View>
            </View>
            
            {/* Pie Chart Visualization */}
            {totalStatus > 0 && (
              <View style={styles.pieChartContainer}>
                <View style={styles.pieChart}>
                  {statusData.map((item, index) => {
                    const percentage = (item.value / totalStatus) * 100;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.pieSegment,
                          {
                            backgroundColor: item.color,
                            width: `${percentage}%`,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
                <View style={styles.pieLegend}>
                  {statusData.map((item, index) => (
                    <View key={index} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Text style={styles.legendText}>
                        {item.label}: {item.value} ({totalStatus > 0 ? Math.round((item.value / totalStatus) * 100) : 0}%)
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Card>

          {/* Revenue Trend Chart */}
          <Card>
            <Text style={styles.sectionTitle}>Revenue Trend (Last 30 Days)</Text>
            {revenueData.length > 0 ? (
              <View style={styles.chartContainer}>
                <View style={styles.chartBars}>
                  {revenueData.slice(-14).map((item, index) => {
                    const maxRevenue = Math.max(...revenueData.map((r) => r.revenue));
                    const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                    const date = new Date(item.date);
                    return (
                      <View key={index} style={styles.chartBarContainer}>
                        <View style={styles.chartBarWrapper}>
                          <View style={[styles.chartBar, { height: `${Math.max(height, 5)}%` }]} />
                          {item.revenue > 0 && (
                            <Text style={styles.chartBarValue}>
                              ₹{Math.round(item.revenue)}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.chartBarLabel}>
                          {date.getDate()}/{date.getMonth() + 1}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.emptyChartContainer}>
                <Text style={styles.emptyText}>No revenue data available</Text>
              </View>
            )}
          </Card>

          {/* Failed Deliveries Section */}
          <Card>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Failed Deliveries & Returns</Text>
              <TouchableOpacity
                onPress={() => setActiveTab("failed")}
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Feather name="chevron-right" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {failedDeliveries.length > 0 ? (
              <View>
                {failedDeliveries.slice(0, 3).map((item) => (
                  <TouchableOpacity
                    key={item.bookingId}
                    style={styles.failedItem}
                    onPress={() => router.push(`/(admin)/bookingDetails?id=${item.bookingId}`)}
                  >
                    <View style={styles.failedItemHeader}>
                      <Text style={styles.failedTracking}>
                        {item.trackingNumber || `#${item.bookingId.slice(0, 8)}`}
                      </Text>
                      <View style={[styles.statusBadge, styles.failedBadge]}>
                        <Text style={styles.statusBadgeText}>{item.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.failedCustomer}>
                      {item.customerName} - {item.customerPhone}
                    </Text>
                    {item.fare && (
                      <Text style={styles.failedFare}>{formatCurrency(item.fare)}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No failed deliveries</Text>
            )}
          </Card>

          {/* Customers Section */}
          <Card>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Customers</Text>
              <TouchableOpacity
                onPress={() => setActiveTab("customers")}
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Feather name="chevron-right" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {customers.length > 0 ? (
              <View>
                {customers.slice(0, 5).map((customer) => (
                  <TouchableOpacity
                    key={customer.userId}
                    style={styles.customerItem}
                    onPress={() => handleCustomerPress(customer.userId)}
                  >
                    <View style={styles.customerItemHeader}>
                      <View>
                        <Text style={styles.customerItemName}>
                          {customer.name || "Unknown User"}
                        </Text>
                        <Text style={styles.customerItemPhone}>{customer.phoneNumber}</Text>
                      </View>
                      <Feather name="chevron-right" size={20} color={colors.textSecondary} />
                    </View>
                    <View style={styles.customerItemStats}>
                      <View style={styles.customerItemStat}>
                        <Text style={styles.customerItemStatLabel}>Bookings</Text>
                        <Text style={styles.customerItemStatValue}>{customer.totalBookings}</Text>
                      </View>
                      <View style={styles.customerItemStat}>
                        <Text style={styles.customerItemStatLabel}>Spend</Text>
                        <Text style={styles.customerItemStatValue}>
                          {formatCurrency(customer.lifetimeSpend)}
                        </Text>
                      </View>
                      <View style={styles.customerItemStat}>
                        <Text style={styles.customerItemStatLabel}>Complaints</Text>
                        <Text style={styles.customerItemStatValue}>{customer.complaints}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No customers found</Text>
            )}
          </Card>
        </View>
      </ScrollView>
    );
  };

  const renderCustomers = () => (
    <View style={styles.listContainer}>
      <FlatList
        data={customers}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <Card style={styles.customerCard}>
            <TouchableOpacity
              onPress={() => handleCustomerPress(item.userId)}
              activeOpacity={0.7}
            >
              <View style={styles.customerHeader}>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>
                    {item.name || "Unknown User"}
                  </Text>
                  <Text style={styles.customerPhone}>{item.phoneNumber}</Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.customerStats}>
                <View style={styles.customerStatItem}>
                  <Text style={styles.customerStatLabel}>Bookings</Text>
                  <Text style={styles.customerStatValue}>{item.totalBookings}</Text>
                </View>
                <View style={styles.customerStatItem}>
                  <Text style={styles.customerStatLabel}>Spend</Text>
                  <Text style={styles.customerStatValue}>
                    {formatCurrency(item.lifetimeSpend)}
                  </Text>
                </View>
                <View style={styles.customerStatItem}>
                  <Text style={styles.customerStatLabel}>Complaints</Text>
                  <Text style={styles.customerStatValue}>{item.complaints}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Card>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No customers found</Text>
          </View>
        }
      />
    </View>
  );

  const renderFailedDeliveries = () => (
    <View style={styles.listContainer}>
      <FlatList
        data={failedDeliveries}
        keyExtractor={(item) => item.bookingId}
        renderItem={({ item }) => (
          <Card style={styles.failedCard}>
            <TouchableOpacity
              onPress={() => router.push(`/(admin)/bookingDetails?id=${item.bookingId}`)}
              activeOpacity={0.7}
            >
              <View style={styles.failedHeader}>
                <View style={styles.failedInfo}>
                  <Text style={styles.failedTracking}>
                    {item.trackingNumber || `#${item.bookingId.slice(0, 8)}`}
                  </Text>
                  <Text style={styles.failedCustomer}>
                    {item.customerName} - {item.customerPhone}
                  </Text>
                </View>
                <View style={[styles.statusBadge, styles.failedBadge]}>
                  <Text style={styles.statusBadgeText}>{item.status}</Text>
                </View>
              </View>
              <View style={styles.failedFooter}>
                <Text style={styles.failedDate}>
                  {formatDate(new Date(item.createdAt))}
                </Text>
                {item.fare && (
                  <Text style={styles.failedFare}>
                    {formatCurrency(item.fare)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </Card>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No failed deliveries</Text>
          </View>
        }
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Analytics"
        rightAction={
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Feather name="log-out" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "overview" && styles.tabActive]}
          onPress={() => setActiveTab("overview")}
        >
          <Feather
            name="bar-chart-2"
            size={18}
            color={activeTab === "overview" ? colors.background : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "overview" && styles.tabTextActive,
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "customers" && styles.tabActive]}
          onPress={() => setActiveTab("customers")}
        >
          <Feather
            name="users"
            size={18}
            color={activeTab === "customers" ? colors.background : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "customers" && styles.tabTextActive,
            ]}
          >
            Customers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "failed" && styles.tabActive]}
          onPress={() => setActiveTab("failed")}
        >
          <Feather
            name="alert-circle"
            size={18}
            color={activeTab === "failed" ? colors.background : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "failed" && styles.tabTextActive,
            ]}
          >
            Failed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === "overview" && renderOverview()}
      {activeTab === "customers" && renderCustomers()}
      {activeTab === "failed" && renderFailedDeliveries()}
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
  logoutButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    margin: 4,
  },
  tabText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  tabTextActive: {
    color: colors.background,
    fontWeight: "600",
  },
  statCard: {
    marginBottom: 12,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    alignItems: "center",
    padding: 20,
    backgroundColor: colors.primary + "10",
    borderWidth: 2,
    borderColor: colors.primary + "30",
  },
  metricIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
    textAlign: "center",
  },
  revenueCard: {
    marginBottom: 12,
    backgroundColor: colors.primary + "10",
    borderWidth: 2,
    borderColor: colors.primary + "30",
  },
  revenueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  revenueCardLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  revenueCardValue: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.primary,
  },
  revenueIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  revenueSubRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  revenueSubLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  revenueSubValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statusItem: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginLeft: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: "auto",
  },
  pieChartContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pieChart: {
    flexDirection: "row",
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    marginBottom: 16,
  },
  pieSegment: {
    height: "100%",
  },
  pieLegend: {
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
  failedItem: {
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  failedItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  customerItem: {
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  customerItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  customerItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  customerItemPhone: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  customerItemStats: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  customerItemStat: {
    flex: 1,
  },
  customerItemStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  customerItemStatValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  emptyChartContainer: {
    padding: 40,
    alignItems: "center",
  },
  revenueRow: {
    flexDirection: "row",
    gap: 12,
  },
  revenueItem: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  revenueLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  revenueValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  chartContainer: {
    marginTop: 16,
    minHeight: 200,
  },
  chartPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 200,
    paddingHorizontal: 8,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
    marginHorizontal: 2,
  },
  chartBarWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
    position: "relative",
  },
  chartBar: {
    width: "70%",
    backgroundColor: colors.primary,
    borderRadius: 4,
    minHeight: 4,
    position: "absolute",
    bottom: 20,
  },
  chartBarLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  chartBarValue: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: "600",
    position: "absolute",
    top: -18,
    textAlign: "center",
    width: "100%",
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  customerCard: {
    marginBottom: 12,
  },
  customerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  customerStats: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  customerStatItem: {
    flex: 1,
  },
  customerStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  customerStatValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  failedCard: {
    marginBottom: 12,
  },
  failedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  failedInfo: {
    flex: 1,
    marginRight: 12,
  },
  failedTracking: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  failedCustomer: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.error + "20",
  },
  failedBadge: {
    backgroundColor: colors.error + "20",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.error,
  },
  failedFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  failedDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  failedFare: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
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

