/**
 * Admin Settings Screen
 * Manage pricing, notifications, and co-admins (Super admin only)
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Header } from "../../components/Header";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { Loader } from "../../components/Loader";
import { colors } from "../../theme/colors";
import { mapApi, adminApi, couponApi } from "../../services/apiClient";
import { useAuthStore } from "../../store/authStore";
import { ADMIN_PHONE_NUMBER } from "../../utils/constants";
import { Feather } from "@expo/vector-icons";

interface BaseRate {
  minKm: number;
  maxKm: number;
  maxWeight: number;
  fare: number;
  applyGst?: boolean;
}

interface PricingSettings {
  baseRates: BaseRate[];
  gstPercent: number;
}

interface CoAdmin {
  id: string;
  phoneNumber: string;
  name: string;
  role: "admin";
  createdAt: string;
}

type Tab = "pricing" | "notifications" | "coadmins" | "coupons" | "cities";

export default function AdminSettingsScreen() {
  const { user } = useAuthStore();
  
  // Hardcoded super admin phone number
  const SUPER_ADMIN_PHONE = "8462044151";
  
  // Normalize phone numbers for comparison (remove spaces, country code, etc.)
  const normalizePhone = (phone: string | undefined): string => {
    if (!phone) return "";
    // Remove all spaces, +, -, and country code
    let normalized = phone.trim().replace(/\s+/g, "").replace(/[+\-]/g, "");
    // Remove +91 or 91 prefix if present
    if (normalized.startsWith("91") && normalized.length === 12) {
      normalized = normalized.substring(2);
    }
    return normalized;
  };
  
  const userPhone = normalizePhone(user?.phoneNumber);
  const superAdminPhone = normalizePhone(SUPER_ADMIN_PHONE);
  const isSuperAdmin = userPhone === superAdminPhone;
  
  // Debug logging removed - only log errors in production
  
  const [activeTab, setActiveTab] = useState<Tab>("pricing");

  // Pricing state
  const [pricing, setPricing] = useState<PricingSettings>({
    baseRates: [
      { minKm: 0, maxKm: 40, maxWeight: 3, fare: 50, applyGst: false },
      { minKm: 41, maxKm: 60, maxWeight: 5, fare: 70, applyGst: true },
    ],
    gstPercent: 18,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Notification state
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [sendingNotification, setSendingNotification] = useState(false);

  // Co-admin state
  const [coAdmins, setCoAdmins] = useState<CoAdmin[]>([]);
  const [loadingCoAdmins, setLoadingCoAdmins] = useState(false);
  const [newCoAdminPhone, setNewCoAdminPhone] = useState("");
  const [newCoAdminName, setNewCoAdminName] = useState("");
  const [addingCoAdmin, setAddingCoAdmin] = useState(false);

  // Coupon state
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [loadingMoreCoupons, setLoadingMoreCoupons] = useState(false);
  const [couponsHasMore, setCouponsHasMore] = useState(false);
  const [couponsLastDocId, setCouponsLastDocId] = useState<string | undefined>(undefined);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: "",
    minOrderAmount: "",
    maxDiscountAmount: "",
    maxUsage: "",
    validFrom: "",
    validUntil: "",
  });
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  // City state
  const [cities, setCities] = useState<Array<{ id: string; name: string; state?: string; isActive: boolean }>>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [newCity, setNewCity] = useState({ name: "", state: "" });
  const [creatingCity, setCreatingCity] = useState(false);
  
  // City route state
  const [cityRoutes, setCityRoutes] = useState<Array<{
    id: string;
    fromCity: string;
    toCity: string;
    baseFare: number;
    heavyFare: number;
    gstPercent: number;
  }>>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [newRoute, setNewRoute] = useState({
    fromCity: "",
    toCity: "",
    baseFare: "",
    heavyFare: "",
    gstPercent: "18",
  });
  const [creatingRoute, setCreatingRoute] = useState(false);

  useEffect(() => {
    if (activeTab === "pricing") {
      loadPricing();
    } else if (activeTab === "coadmins" && isSuperAdmin) {
      loadCoAdmins();
    } else if (activeTab === "coupons") {
      loadCoupons();
    } else if (activeTab === "cities" && isSuperAdmin) {
      loadCities();
      loadCityRoutes();
    }
  }, [activeTab, isSuperAdmin]);

  const loadPricing = async () => {
    try {
      setLoading(true);
      const response = await mapApi.getPricing();
      if (response.pricing) {
        setPricing({
          baseRates: response.pricing.baseRates || [],
          gstPercent: response.pricing.gstPercent || 18,
        });
      }
    } catch (error: any) {
      console.error("Error loading pricing:", error);
      Alert.alert("Error", error.message || "Failed to load pricing settings");
    } finally {
      setLoading(false);
    }
  };

  const loadCoAdmins = async () => {
    try {
      setLoadingCoAdmins(true);
      const response = await adminApi.getCoAdmins();
      // Ensure response is an array
      if (Array.isArray(response)) {
        setCoAdmins(response);
      } else {
        console.error("Invalid co-admins response:", response);
        setCoAdmins([]);
      }
    } catch (error: any) {
      console.error("Error loading co-admins:", error);
      Alert.alert("Error", error.message || "Failed to load co-admins");
      setCoAdmins([]); // Set empty array on error
    } finally {
      setLoadingCoAdmins(false);
    }
  };

  const loadCities = async () => {
    try {
      setLoadingCities(true);
      const response = await mapApi.getCities();
      setCities(response.cities || []);
    } catch (error: any) {
      console.error("Error loading cities:", error);
      Alert.alert("Error", error.message || "Failed to load cities");
    } finally {
      setLoadingCities(false);
    }
  };

  const loadCityRoutes = async () => {
    try {
      setLoadingRoutes(true);
      const response = await mapApi.getCityRoutes();
      setCityRoutes(response.routes || []);
    } catch (error: any) {
      console.error("Error loading city routes:", error);
      Alert.alert("Error", error.message || "Failed to load city routes");
    } finally {
      setLoadingRoutes(false);
    }
  };

  const handleCreateCity = async () => {
    if (!newCity.name.trim()) {
      Alert.alert("Error", "City name is required");
      return;
    }

    try {
      setCreatingCity(true);
      await mapApi.createCity({
        name: newCity.name.trim(),
        state: newCity.state.trim() || undefined,
      });
      Alert.alert("Success", "City created successfully");
      setNewCity({ name: "", state: "" });
      await loadCities();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create city");
    } finally {
      setCreatingCity(false);
    }
  };

  const handleCreateRoute = async () => {
    if (!newRoute.fromCity || !newRoute.toCity) {
      Alert.alert("Error", "From city and to city are required");
      return;
    }

    if (!newRoute.baseFare || !newRoute.heavyFare) {
      Alert.alert("Error", "Base fare and heavy fare are required");
      return;
    }

    try {
      setCreatingRoute(true);
      await mapApi.upsertCityRoute({
        fromCity: newRoute.fromCity,
        toCity: newRoute.toCity,
        baseFare: parseFloat(newRoute.baseFare),
        heavyFare: parseFloat(newRoute.heavyFare),
        gstPercent: parseFloat(newRoute.gstPercent) || 18,
      });
      Alert.alert("Success", "City route pricing updated successfully");
      setNewRoute({ fromCity: "", toCity: "", baseFare: "", heavyFare: "", gstPercent: "18" });
      await loadCityRoutes();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create city route");
    } finally {
      setCreatingRoute(false);
    }
  };

  const loadCoupons = async (append = false) => {
    try {
      if (append) {
        setLoadingMoreCoupons(true);
      } else {
        setLoadingCoupons(true);
      }
      
      const response = await couponApi.getAllCoupons({
        limit: 20,
        lastDocId: append ? couponsLastDocId : undefined,
      });
      
      if (append) {
        setCoupons((prev) => [...prev, ...response.coupons]);
      } else {
        setCoupons(response.coupons);
      }
      
      setCouponsHasMore(response.hasMore);
      setCouponsLastDocId(response.lastDocId);
    } catch (error: any) {
      console.error("Error loading coupons:", error);
      Alert.alert("Error", error.message || "Failed to load coupons");
      if (!append) {
        setCoupons([]); // Set empty array on error only for initial load
      }
    } finally {
      setLoadingCoupons(false);
      setLoadingMoreCoupons(false);
    }
  };

  const handleSavePricing = async () => {
    for (let i = 0; i < pricing.baseRates.length; i++) {
      const rate = pricing.baseRates[i];
      if (rate.minKm < 0 || rate.maxKm < rate.minKm) {
        Alert.alert("Error", `Tier ${i + 1}: Invalid distance range`);
        return;
      }
      if (rate.maxWeight <= 0 || rate.fare < 0) {
        Alert.alert("Error", `Tier ${i + 1}: Weight and fare must be positive`);
        return;
      }
    }

    if (pricing.gstPercent < 0 || pricing.gstPercent > 100) {
      Alert.alert("Error", "GST percentage must be between 0 and 100");
      return;
    }

    try {
      setSaving(true);
      await mapApi.updatePricing(pricing);
      Alert.alert("Success", "Pricing settings updated successfully");
      await loadPricing();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update pricing settings");
    } finally {
      setSaving(false);
    }
  };

  const handleBroadcastNotification = async () => {
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      Alert.alert("Error", "Please enter both title and body");
      return;
    }

    try {
      setSendingNotification(true);
      const result = await adminApi.broadcastNotification(
        notificationTitle.trim(),
        notificationBody.trim()
      );
      Alert.alert(
        "Success",
        `Notification sent to ${result.sent} users${result.failed > 0 ? ` (${result.failed} failed)` : ""}`
      );
      setNotificationTitle("");
      setNotificationBody("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send notification");
    } finally {
      setSendingNotification(false);
    }
  };

  const handleAddCoAdmin = async () => {
    if (!newCoAdminPhone.trim() || !newCoAdminName.trim()) {
      Alert.alert("Error", "Please enter both phone number and name");
      return;
    }

    // Validate phone number format
    const phoneRegex = /^\+91[6-9]\d{9}$/;
    if (!phoneRegex.test(newCoAdminPhone.trim())) {
      Alert.alert("Error", "Please enter a valid Indian phone number (+91XXXXXXXXXX)");
      return;
    }

    try {
      setAddingCoAdmin(true);
      await adminApi.appointCoAdmin(newCoAdminPhone.trim(), newCoAdminName.trim());
      Alert.alert("Success", "Co-admin appointed successfully");
      setNewCoAdminPhone("");
      setNewCoAdminName("");
      await loadCoAdmins();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to appoint co-admin");
    } finally {
      setAddingCoAdmin(false);
    }
  };

  const handleRemoveCoAdmin = async (coAdminId: string, name: string) => {
    Alert.alert(
      "Remove Co-Admin",
      `Are you sure you want to remove ${name} as co-admin?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await adminApi.removeCoAdmin(coAdminId);
              Alert.alert("Success", "Co-admin removed successfully");
              await loadCoAdmins();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to remove co-admin");
            }
          },
        },
      ]
    );
  };

  const handleCreateCoupon = async () => {
    if (!newCoupon.code.trim()) {
      Alert.alert("Error", "Coupon code is required");
      return;
    }

    if (!newCoupon.discountValue || parseFloat(newCoupon.discountValue) <= 0) {
      Alert.alert("Error", "Discount value must be greater than 0");
      return;
    }

    if (newCoupon.discountType === "percentage" && parseFloat(newCoupon.discountValue) > 100) {
      Alert.alert("Error", "Percentage discount cannot exceed 100%");
      return;
    }

    if (!newCoupon.validFrom || !newCoupon.validUntil) {
      Alert.alert("Error", "Valid from and valid until dates are required");
      return;
    }

    try {
      setCreatingCoupon(true);
      await couponApi.createCoupon({
        code: newCoupon.code.trim().toUpperCase(),
        discountType: newCoupon.discountType,
        discountValue: parseFloat(newCoupon.discountValue),
        minOrderAmount: newCoupon.minOrderAmount ? parseFloat(newCoupon.minOrderAmount) : undefined,
        maxDiscountAmount: newCoupon.maxDiscountAmount ? parseFloat(newCoupon.maxDiscountAmount) : undefined,
        maxUsage: newCoupon.maxUsage ? parseInt(newCoupon.maxUsage) : undefined,
        validFrom: new Date(newCoupon.validFrom).toISOString(),
        validUntil: new Date(newCoupon.validUntil).toISOString(),
      });
      Alert.alert("Success", "Coupon created successfully");
      setNewCoupon({
        code: "",
        discountType: "percentage",
        discountValue: "",
        minOrderAmount: "",
        maxDiscountAmount: "",
        maxUsage: "",
        validFrom: "",
        validUntil: "",
      });
      await loadCoupons();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create coupon");
    } finally {
      setCreatingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (couponId: string, code: string) => {
    Alert.alert(
      "Delete Coupon",
      `Are you sure you want to delete coupon ${code}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await couponApi.deleteCoupon(couponId);
              Alert.alert("Success", "Coupon deleted successfully");
              await loadCoupons();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete coupon");
            }
          },
        },
      ]
    );
  };

  const handleToggleCouponStatus = async (couponId: string, currentStatus: boolean) => {
    try {
      await couponApi.updateCoupon(couponId, { isActive: !currentStatus });
      Alert.alert("Success", `Coupon ${!currentStatus ? "activated" : "deactivated"} successfully`);
      await loadCoupons();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update coupon");
    }
  };

  const handleAddTier = () => {
    const lastTier = pricing.baseRates[pricing.baseRates.length - 1];
    const newTier: BaseRate = {
      minKm: lastTier ? lastTier.maxKm + 1 : 0,
      maxKm: lastTier ? lastTier.maxKm + 20 : 20,
      maxWeight: lastTier ? lastTier.maxWeight + 2 : 5,
      fare: lastTier ? lastTier.fare + 20 : 70,
      applyGst: true,
    };
    setPricing({
      ...pricing,
      baseRates: [...pricing.baseRates, newTier],
    });
  };

  const handleRemoveTier = (index: number) => {
    if (pricing.baseRates.length <= 1) {
      Alert.alert("Error", "At least one pricing tier is required");
      return;
    }
    const newRates = pricing.baseRates.filter((_, i) => i !== index);
    setPricing({ ...pricing, baseRates: newRates });
  };

  const handleUpdateTier = (index: number, field: keyof BaseRate, value: string | boolean) => {
    const newRates = [...pricing.baseRates];
    if (typeof value === "boolean") {
      newRates[index] = { ...newRates[index], [field]: value };
    } else {
      const numValue = parseFloat(value) || 0;
      newRates[index] = { ...newRates[index], [field]: numValue };
    }
    setPricing({ ...pricing, baseRates: newRates });
  };

  if (loading && activeTab === "pricing") {
    return (
      <View style={styles.container}>
        <Header title="Settings" showBack />
        <Loader fullScreen />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Settings" showBack />
      
      {/* Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
        bounces={false}
        alwaysBounceHorizontal={false}
      >
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "pricing" && styles.tabActive]}
            onPress={() => setActiveTab("pricing")}
          >
            <Text style={[styles.tabText, activeTab === "pricing" && styles.tabTextActive]}>
              Pricing
            </Text>
          </TouchableOpacity>
          {isSuperAdmin && (
            <>
              <TouchableOpacity
                style={[styles.tab, activeTab === "notifications" && styles.tabActive]}
                onPress={() => setActiveTab("notifications")}
              >
                <Text style={[styles.tabText, activeTab === "notifications" && styles.tabTextActive]}>
                  Notifications
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "coadmins" && styles.tabActive]}
                onPress={() => setActiveTab("coadmins")}
              >
                <Text style={[styles.tabText, activeTab === "coadmins" && styles.tabTextActive]}>
                  Co-Admins
                </Text>
              </TouchableOpacity>
            </>
          )}
          {/* Coupons tab - visible to all admins */}
          <TouchableOpacity
            style={[styles.tab, activeTab === "coupons" && styles.tabActive]}
            onPress={() => setActiveTab("coupons")}
          >
            <Text style={[styles.tabText, activeTab === "coupons" && styles.tabTextActive]}>
              Coupons
            </Text>
          </TouchableOpacity>
          {isSuperAdmin && (
            <TouchableOpacity
              style={[styles.tab, activeTab === "cities" && styles.tabActive]}
              onPress={() => setActiveTab("cities")}
            >
              <Text style={[styles.tabText, activeTab === "cities" && styles.tabTextActive]}>
                Cities
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.content}>
          {/* Pricing Tab */}
          {activeTab === "pricing" && (
            <>
              <Card>
                <View style={styles.headerSection}>
                  <Text style={styles.sectionTitle}>Fare Calculation Tiers</Text>
                  <Text style={styles.description}>
                    Configure pricing tiers based on distance and weight.
                  </Text>
                </View>

                {pricing.baseRates.map((rate, index) => (
                  <View key={index} style={styles.tierCard}>
                    <View style={styles.tierHeader}>
                      <Text style={styles.tierTitle}>Tier {index + 1}</Text>
                      {pricing.baseRates.length > 1 && (
                        <TouchableOpacity
                          onPress={() => handleRemoveTier(index)}
                          style={styles.removeButton}
                        >
                          <Feather name="trash-2" size={18} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.tierRow}>
                      <View style={styles.tierInputGroup}>
                        <Input
                          label="Min Distance (km)"
                          value={rate.minKm.toString()}
                          onChangeText={(text) => handleUpdateTier(index, "minKm", text)}
                          keyboardType="decimal-pad"
                          style={styles.tierInput}
                        />
                      </View>
                      <View style={styles.tierInputGroup}>
                        <Input
                          label="Max Distance (km)"
                          value={rate.maxKm.toString()}
                          onChangeText={(text) => handleUpdateTier(index, "maxKm", text)}
                          keyboardType="decimal-pad"
                          style={styles.tierInput}
                        />
                      </View>
                    </View>

                    <View style={styles.tierRow}>
                      <View style={styles.tierInputGroup}>
                        <Input
                          label="Max Weight (kg)"
                          value={rate.maxWeight.toString()}
                          onChangeText={(text) => handleUpdateTier(index, "maxWeight", text)}
                          keyboardType="decimal-pad"
                          style={styles.tierInput}
                        />
                      </View>
                      <View style={styles.tierInputGroup}>
                        <Input
                          label="Base Fare (₹)"
                          value={rate.fare.toString()}
                          onChangeText={(text) => handleUpdateTier(index, "fare", text)}
                          keyboardType="decimal-pad"
                          style={styles.tierInput}
                        />
                      </View>
                    </View>

                    <View style={styles.gstToggle}>
                      <Text style={styles.gstToggleLabel}>Apply GST:</Text>
                      <TouchableOpacity
                        style={[
                          styles.toggleSwitch,
                          rate.applyGst && styles.toggleSwitchActive,
                        ]}
                        onPress={() => handleUpdateTier(index, "applyGst", !rate.applyGst)}
                      >
                        <View
                          style={[
                            styles.toggleThumb,
                            rate.applyGst && styles.toggleThumbActive,
                          ]}
                        />
                      </TouchableOpacity>
                      <Text style={styles.gstToggleText}>{rate.applyGst ? "Yes" : "No"}</Text>
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={styles.addTierButton} onPress={handleAddTier}>
                  <Feather name="plus" size={20} color={colors.primary} />
                  <Text style={styles.addTierText}>Add New Tier</Text>
                </TouchableOpacity>
              </Card>

              <Card>
                <Text style={styles.sectionTitle}>GST Settings</Text>
                <Input
                  label="GST Percentage (%)"
                  value={pricing.gstPercent.toString()}
                  onChangeText={(text) =>
                    setPricing({
                      ...pricing,
                      gstPercent: parseFloat(text) || 0,
                    })
                  }
                  keyboardType="decimal-pad"
                  placeholder="18"
                />
              </Card>

              <Button
                title="Save Pricing Settings"
                onPress={handleSavePricing}
                loading={saving}
                style={styles.saveButton}
              />
            </>
          )}

          {/* Notifications Tab (Super Admin Only) */}
          {activeTab === "notifications" && isSuperAdmin && (
            <Card>
              <Text style={styles.sectionTitle}>Broadcast Notification</Text>
              <Text style={styles.description}>
                Send a push notification to all users at once.
              </Text>
              <Input
                label="Title"
                value={notificationTitle}
                onChangeText={setNotificationTitle}
                placeholder="Enter notification title"
              />
              <Input
                label="Message"
                value={notificationBody}
                onChangeText={setNotificationBody}
                placeholder="Enter notification message"
                multiline
                numberOfLines={4}
                style={styles.textArea}
              />
              <Button
                title="Send to All Users"
                onPress={handleBroadcastNotification}
                loading={sendingNotification}
                style={styles.saveButton}
              />
            </Card>
          )}

          {/* Co-Admins Tab (Super Admin Only) */}
          {activeTab === "coadmins" && isSuperAdmin && (
            <>
              <Card>
                <Text style={styles.sectionTitle}>Appoint Co-Admin</Text>
                <Text style={styles.description}>
                  Add a new co-admin. Co-admins have the same dashboard access but cannot appoint other admins.
                </Text>
                <Input
                  label="Phone Number"
                  value={newCoAdminPhone}
                  onChangeText={setNewCoAdminPhone}
                  placeholder="+91XXXXXXXXXX"
                  keyboardType="phone-pad"
                />
                <Input
                  label="Name"
                  value={newCoAdminName}
                  onChangeText={setNewCoAdminName}
                  placeholder="Enter name"
                />
                <Button
                  title="Appoint Co-Admin"
                  onPress={handleAddCoAdmin}
                  loading={addingCoAdmin}
                  style={styles.saveButton}
                />
              </Card>

              <Card>
                <Text style={styles.sectionTitle}>Co-Admins List</Text>
                {loadingCoAdmins ? (
                  <Loader />
                ) : !coAdmins || !Array.isArray(coAdmins) || coAdmins.length === 0 ? (
                  <Text style={styles.emptyText}>No co-admins appointed yet</Text>
                ) : (
                  coAdmins.map((admin) => (
                    <View key={admin.id} style={styles.coAdminItem}>
                      <View style={styles.coAdminInfo}>
                        <Text style={styles.coAdminName}>{admin.name}</Text>
                        <Text style={styles.coAdminPhone}>{admin.phoneNumber}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveCoAdmin(admin.id, admin.name)}
                        style={styles.removeCoAdminButton}
                      >
                        <Feather name="trash-2" size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </Card>
            </>
          )}

          {/* Coupons Tab (Admin Only) */}
          {activeTab === "coupons" && (
            <>
              <Card>
                <Text style={styles.sectionTitle}>Create New Coupon</Text>
                <Text style={styles.description}>
                  Create discount coupons for users. Coupons can be percentage or fixed amount discounts.
                </Text>
                <Input
                  label="Coupon Code"
                  value={newCoupon.code}
                  onChangeText={(text) => setNewCoupon({ ...newCoupon, code: text.toUpperCase() })}
                  placeholder="SAVE50"
                  autoCapitalize="characters"
                />
                <View style={styles.discountTypeContainer}>
                  <Text style={styles.label}>Discount Type</Text>
                  <View style={styles.discountTypeOptions}>
                    <TouchableOpacity
                      style={[
                        styles.discountTypeOption,
                        newCoupon.discountType === "percentage" && styles.discountTypeOptionActive,
                      ]}
                      onPress={() => setNewCoupon({ ...newCoupon, discountType: "percentage" })}
                    >
                      <Text
                        style={[
                          styles.discountTypeText,
                          newCoupon.discountType === "percentage" && styles.discountTypeTextActive,
                        ]}
                      >
                        Percentage
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.discountTypeOption,
                        newCoupon.discountType === "fixed" && styles.discountTypeOptionActive,
                      ]}
                      onPress={() => setNewCoupon({ ...newCoupon, discountType: "fixed" })}
                    >
                      <Text
                        style={[
                          styles.discountTypeText,
                          newCoupon.discountType === "fixed" && styles.discountTypeTextActive,
                        ]}
                      >
                        Fixed Amount
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Input
                  label={newCoupon.discountType === "percentage" ? "Discount (%)" : "Discount Amount (₹)"}
                  value={newCoupon.discountValue}
                  onChangeText={(text) => setNewCoupon({ ...newCoupon, discountValue: text })}
                  placeholder={newCoupon.discountType === "percentage" ? "10" : "50"}
                  keyboardType="decimal-pad"
                />
                {newCoupon.discountType === "percentage" && (
                  <Input
                    label="Max Discount Amount (₹) - Optional"
                    value={newCoupon.maxDiscountAmount}
                    onChangeText={(text) => setNewCoupon({ ...newCoupon, maxDiscountAmount: text })}
                    placeholder="100"
                    keyboardType="decimal-pad"
                  />
                )}
                <Input
                  label="Minimum Order Amount (₹) - Optional"
                  value={newCoupon.minOrderAmount}
                  onChangeText={(text) => setNewCoupon({ ...newCoupon, minOrderAmount: text })}
                  placeholder="100"
                  keyboardType="decimal-pad"
                />
                <Input
                  label="Max Usage - Optional"
                  value={newCoupon.maxUsage}
                  onChangeText={(text) => setNewCoupon({ ...newCoupon, maxUsage: text })}
                  placeholder="100"
                  keyboardType="number-pad"
                />
                <View style={styles.dateRow}>
                  <View style={styles.dateInput}>
                    <Text style={styles.label}>Valid From</Text>
                    <Input
                      value={newCoupon.validFrom}
                      onChangeText={(text) => setNewCoupon({ ...newCoupon, validFrom: text })}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                  <View style={styles.dateInput}>
                    <Text style={styles.label}>Valid Until</Text>
                    <Input
                      value={newCoupon.validUntil}
                      onChangeText={(text) => setNewCoupon({ ...newCoupon, validUntil: text })}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                </View>
                <Button
                  title="Create Coupon"
                  onPress={handleCreateCoupon}
                  loading={creatingCoupon}
                  style={styles.saveButton}
                />
              </Card>

              <Card>
                <Text style={styles.sectionTitle}>All Coupons</Text>
                {loadingCoupons ? (
                  <Loader />
                ) : coupons.length === 0 ? (
                  <Text style={styles.emptyText}>No coupons created yet</Text>
                ) : (
                  <ScrollView
                    style={styles.couponsList}
                    onScroll={(e) => {
                      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                      const paddingToBottom = 20;
                      if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
                        if (couponsHasMore && !loadingMoreCoupons) {
                          loadCoupons(true);
                        }
                      }
                    }}
                    scrollEventThrottle={400}
                  >
                    {coupons.map((coupon) => (
                      <View key={coupon.id} style={styles.couponItem}>
                        <View style={styles.couponInfo}>
                          <View style={styles.couponHeader}>
                            <Text style={styles.couponCode}>{coupon.code}</Text>
                            <View style={[styles.couponStatus, coupon.isActive && styles.couponStatusActive]}>
                              <Text style={styles.couponStatusText}>
                                {coupon.isActive ? "Active" : "Inactive"}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.couponDetails}>
                            {coupon.discountType === "percentage"
                              ? `${coupon.discountValue}% off`
                              : `₹${coupon.discountValue} off`}
                            {coupon.minOrderAmount && ` • Min: ₹${coupon.minOrderAmount}`}
                            {coupon.maxUsage && ` • Usage: ${coupon.currentUsage}/${coupon.maxUsage}`}
                          </Text>
                          <Text style={styles.couponDates}>
                            Valid: {new Date(coupon.validFrom).toLocaleDateString()} -{" "}
                            {new Date(coupon.validUntil).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={styles.couponActions}>
                          <TouchableOpacity
                            onPress={() => handleToggleCouponStatus(coupon.id, coupon.isActive)}
                            style={styles.toggleCouponButton}
                          >
                            <Feather
                              name={coupon.isActive ? "eye-off" : "eye"}
                              size={18}
                              color={coupon.isActive ? colors.warning : colors.success}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteCoupon(coupon.id, coupon.code)}
                            style={styles.removeCouponButton}
                          >
                            <Feather name="trash-2" size={18} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    {loadingMoreCoupons && (
                      <View style={styles.footerLoader}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    )}
                  </ScrollView>
                )}
              </Card>
            </>
          )}

          {/* Cities Tab (Super Admin Only) */}
          {activeTab === "cities" && isSuperAdmin && (
            <>
              <Card>
                <Text style={styles.sectionTitle}>Manage Cities</Text>
                <Text style={styles.sectionDescription}>
                  Add and manage cities for ParcelWalah. Cities can be selected in the booking form.
                </Text>

                <Input
                  label="City Name *"
                  value={newCity.name}
                  onChangeText={(text) => setNewCity({ ...newCity, name: text })}
                  placeholder="e.g., Ratlam"
                />

                <Input
                  label="State (Optional)"
                  value={newCity.state}
                  onChangeText={(text) => setNewCity({ ...newCity, state: text })}
                  placeholder="e.g., MP"
                />

                <Button
                  title={creatingCity ? "Creating..." : "Create City"}
                  onPress={handleCreateCity}
                  loading={creatingCity}
                  style={styles.button}
                />
              </Card>

              <Card>
                <Text style={styles.sectionTitle}>All Cities</Text>
                {loadingCities ? (
                  <Loader color={colors.primary} />
                ) : cities.length === 0 ? (
                  <Text style={styles.emptyText}>No cities found</Text>
                ) : (
                  cities.map((city) => (
                    <View key={city.id} style={styles.couponItem}>
                      <View style={styles.couponInfo}>
                        <View style={styles.couponHeader}>
                          <Text style={styles.couponCode}>
                            {city.name}{city.state ? `, ${city.state}` : ""}
                          </Text>
                          <View style={[styles.couponStatus, city.isActive && styles.couponStatusActive]}>
                            <Text style={styles.couponStatusText}>
                              {city.isActive ? "Active" : "Inactive"}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={async () => {
                          Alert.alert(
                            "Delete City",
                            `Are you sure you want to delete ${city.name}?`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Delete",
                                style: "destructive",
                                onPress: async () => {
                                  try {
                                    await mapApi.deleteCity(city.id);
                                    Alert.alert("Success", "City deleted successfully");
                                    await loadCities();
                                  } catch (error: any) {
                                    Alert.alert("Error", error.message || "Failed to delete city");
                                  }
                                },
                              },
                            ]
                          );
                        }}
                        style={styles.removeCouponButton}
                      >
                        <Feather name="trash-2" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </Card>

              <Card>
                <Text style={styles.sectionTitle}>City Route Pricing</Text>
                <Text style={styles.sectionDescription}>
                  Set pricing for routes between cities. Base fare applies to weight ≤ 3kg, heavy fare applies to weight ≥ 5kg.
                </Text>

                <View style={styles.dateRow}>
                  <View style={styles.dateInput}>
                    <Input
                      label="From City *"
                      value={newRoute.fromCity}
                      onChangeText={(text) => setNewRoute({ ...newRoute, fromCity: text })}
                      placeholder="e.g., Ratlam"
                    />
                  </View>

                  <View style={styles.dateInput}>
                    <Input
                      label="To City *"
                      value={newRoute.toCity}
                      onChangeText={(text) => setNewRoute({ ...newRoute, toCity: text })}
                      placeholder="e.g., Jaora"
                    />
                  </View>
                </View>

                <View style={styles.dateRow}>
                  <View style={styles.dateInput}>
                    <Input
                      label="Base Fare (≤3kg) *"
                      value={newRoute.baseFare}
                      onChangeText={(text) => setNewRoute({ ...newRoute, baseFare: text })}
                      placeholder="50"
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={styles.dateInput}>
                    <Input
                      label="Heavy Fare (≥5kg) *"
                      value={newRoute.heavyFare}
                      onChangeText={(text) => setNewRoute({ ...newRoute, heavyFare: text })}
                      placeholder="70"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <Input
                  label="GST % (Optional)"
                  value={newRoute.gstPercent}
                  onChangeText={(text) => setNewRoute({ ...newRoute, gstPercent: text })}
                  placeholder="18"
                  keyboardType="decimal-pad"
                />

                <Button
                  title={creatingRoute ? "Saving..." : "Save Route Pricing"}
                  onPress={handleCreateRoute}
                  loading={creatingRoute}
                  style={styles.button}
                />
              </Card>

              <Card>
                <Text style={styles.sectionTitle}>All City Routes</Text>
                {loadingRoutes ? (
                  <Loader color={colors.primary} />
                ) : cityRoutes.length === 0 ? (
                  <Text style={styles.emptyText}>No city routes found</Text>
                ) : (
                  cityRoutes.map((route) => (
                    <View key={route.id} style={styles.couponItem}>
                      <View style={styles.couponInfo}>
                        <View style={styles.couponHeader}>
                          <Text style={styles.couponCode}>
                            {route.fromCity} → {route.toCity}
                          </Text>
                        </View>
                        <Text style={styles.couponDetails}>
                          Base: ₹{route.baseFare} (≤3kg) • Heavy: ₹{route.heavyFare} (≥5kg) • GST: {route.gstPercent}%
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={async () => {
                          Alert.alert(
                            "Delete Route",
                            `Are you sure you want to delete route ${route.fromCity} → ${route.toCity}?`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Delete",
                                style: "destructive",
                                onPress: async () => {
                                  try {
                                    await mapApi.deleteCityRoute(route.id);
                                    Alert.alert("Success", "Route deleted successfully");
                                    await loadCityRoutes();
                                  } catch (error: any) {
                                    Alert.alert("Error", error.message || "Failed to delete route");
                                  }
                                },
                              },
                            ]
                          );
                        }}
                        style={styles.removeCouponButton}
                      >
                        <Feather name="trash-2" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </Card>
            </>
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
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    maxHeight: 48,
  },
  tabsContent: {
    paddingHorizontal: 0,
    flexGrow: 0,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    alignItems: "stretch",
    height: 48,
  },
  tab: {
    paddingVertical: 0,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    height: 48,
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  content: {
    padding: 16,
  },
  headerSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  tierCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tierHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  removeButton: {
    padding: 4,
  },
  tierRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  tierInputGroup: {
    flex: 1,
  },
  tierInput: {
    marginBottom: 0,
  },
  gstToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
    gap: 12,
  },
  gstToggleLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    flex: 1,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: "center",
  },
  toggleSwitchActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignSelf: "flex-start",
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  gstToggleText: {
    fontSize: 14,
    color: colors.textSecondary,
    minWidth: 30,
  },
  addTierButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: 12,
    gap: 8,
  },
  addTierText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  coAdminItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  coAdminInfo: {
    flex: 1,
  },
  coAdminName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  coAdminPhone: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  removeCoAdminButton: {
    padding: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    padding: 20,
  },
  discountTypeContainer: {
    marginBottom: 16,
  },
  discountTypeOptions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  discountTypeOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  discountTypeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  discountTypeText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  discountTypeTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  couponItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  couponInfo: {
    flex: 1,
    marginRight: 12,
  },
  couponHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  couponCode: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  couponStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.error + "20",
  },
  couponStatusActive: {
    backgroundColor: colors.success + "20",
  },
  couponStatusText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  couponDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  couponDates: {
    fontSize: 12,
    color: colors.textLight,
  },
  couponActions: {
    flexDirection: "row",
    gap: 8,
  },
  toggleCouponButton: {
    padding: 8,
  },
  removeCouponButton: {
    padding: 8,
  },
  couponsList: {
    maxHeight: 400,
  },
  footerLoader: {
    padding: 20,
    alignItems: "center",
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
});
