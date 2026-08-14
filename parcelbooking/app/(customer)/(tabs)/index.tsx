/**
 * Customer Home — Intercity + Hyperlocal
 */

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "../../../store/authStore";
import { useBooking } from "../../../hooks/useBooking";
import { useBookingDraftStore } from "../../../store/bookingDraftStore";
import { StatusBadge } from "../../../components/StatusBadge";
import { EmptyState } from "../../../components/EmptyState";
import { Loader } from "../../../components/Loader";
import { colors } from "../../../theme/colors";
import { formatDate } from "../../../utils/formatters";

export default function CustomerHomeTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { bookings, loading, fetchBookings } = useBooking();
  const resetDraft = useBookingDraftStore((s) => s.resetDraft);
  const setServiceType = useBookingDraftStore((s) => s.setServiceType);
  const [trackId, setTrackId] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (user) fetchBookings().catch(() => {});
    }, [user, fetchBookings])
  );

  const startHyperlocal = () => {
    resetDraft(user?.phoneNumber || "");
    setServiceType("hyperlocal");
    router.push("/(customer)/booking/hyperlocal" as any);
  };

  const startIntercity = () => {
    resetDraft(user?.phoneNumber || "");
    setServiceType("intercity");
    router.push("/(customer)/booking/new" as any);
  };

  const recent = (bookings || []).slice(0, 5);
  const firstName = (user?.name || "there").split(" ")[0];

  const activeBooking = (bookings || []).find(
    (b) => !["Delivered", "Cancelled", "Returned", "Failed"].includes(b.status)
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.logo}>PARCELWALAH</Text>
          <Text style={styles.tagline}>SEND ANYTHING, ANYWHERE</Text>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/(customer)/booking/track" as any)}
          >
            <Feather name="bell" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => router.push("/(customer)/(tabs)/profile" as any)}
          >
            <Feather name="user" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {activeBooking && (
        <TouchableOpacity
          style={styles.activeBanner}
          onPress={() =>
            router.push({
              pathname: "/(customer)/booking/waiting",
              params: { id: activeBooking.id },
            } as any)
          }
          activeOpacity={0.85}
        >
          <View style={styles.activeBannerDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.activeBannerTitle}>Active delivery in progress</Text>
            <Text style={styles.activeBannerSub} numberOfLines={1}>
              {activeBooking.pickup?.city || "—"} → {activeBooking.drop?.city || "—"}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color="#fff" />
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hello}>Hi {firstName}! 👋</Text>

        <View style={styles.serviceRow}>
          <TouchableOpacity
            style={[styles.serviceCard, styles.hyperCard]}
            activeOpacity={0.9}
            onPress={startHyperlocal}
          >
            <View style={styles.pillLight}>
              <Text style={styles.pillLightText}>Within City</Text>
            </View>
            <Text style={styles.serviceTitleLight}>Instant Delivery</Text>
            <Text style={styles.serviceSubLight}>
              Doorstep pickup in 30 mins*
            </Text>
            <View style={styles.bookPill}>
              <Text style={styles.bookPillText}>Book Now</Text>
              <Feather name="arrow-right" size={14} color={colors.primary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.serviceCard, styles.interCard]}
            activeOpacity={0.9}
            onPress={startIntercity}
          >
            <View style={styles.pillDark}>
              <Text style={styles.pillDarkText}>Across Cities</Text>
            </View>
            <Text style={styles.serviceTitleLight}>Intercity Delivery</Text>
            <Text style={styles.serviceSubLight}>
              Doorstep to doorstep, safe & reliable
            </Text>
            <View style={styles.bookPill}>
              <Text style={[styles.bookPillText, { color: colors.intercity }]}>
                Book Now
              </Text>
              <Feather name="arrow-right" size={14} color={colors.intercity} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.trackCard}>
          <View style={styles.trackHeader}>
            <Feather name="map-pin" size={18} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.trackTitle}>Track Shipment</Text>
              <Text style={styles.trackSub}>
                Enter Tracking ID to track your parcel
              </Text>
            </View>
          </View>
          <View style={styles.trackRow}>
            <TextInput
              style={styles.trackInput}
              placeholder="Enter ID"
              placeholderTextColor={colors.textLight}
              value={trackId}
              onChangeText={setTrackId}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() => {
                const q = trackId.trim();
                if (!q) {
                  Alert.alert("Track", "Enter a tracking ID");
                  return;
                }
                router.push({
                  pathname: "/(customer)/booking/track",
                  params: { id: q },
                } as any);
              }}
            >
              <Feather name="arrow-right" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <TouchableOpacity
            onPress={() => router.push("/(customer)/(tabs)/orders" as any)}
          >
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {loading && recent.length === 0 ? (
          <Loader />
        ) : recent.length === 0 ? (
          <EmptyState
            title="No orders yet"
            message="Book Instant or Intercity delivery to get started."
          />
        ) : (
          recent.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={styles.orderCard}
              onPress={() =>
                router.push({
                  pathname: "/(customer)/booking/track",
                  params: { id: b.trackingNumber || b.id },
                } as any)
              }
            >
              <View style={styles.orderIcon}>
                <Feather name="package" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderRoute}>
                  {b.pickup?.city || "—"} → {b.drop?.city || "—"}
                </Text>
                <Text style={styles.orderId}>
                  Order ID: {b.trackingNumber || b.id.slice(0, 8)}
                </Text>
                <Text style={styles.orderTime}>
                  {formatDate(b.createdAt as any)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <StatusBadge status={b.status} />
                <Text style={styles.orderFare}>₹{b.fare ?? "—"}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.promo}>
          <View style={{ flex: 1 }}>
            <Text style={styles.promoTitle}>Send More, Save More!</Text>
            <View style={styles.promoCode}>
              <Text style={styles.promoCodeText}>Use Code: SAVE50</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.promoBtn}
            onPress={() =>
              Alert.alert("Offers", "Apply SAVE50 on the fare screen when booking.")
            }
          >
            <Text style={styles.promoBtnText}>View Offers →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: { fontSize: 16, fontWeight: "800", color: colors.primary, letterSpacing: 0.5 },
  tagline: { fontSize: 9, color: colors.textSecondary, marginTop: 2, letterSpacing: 0.3 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF3E6",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, paddingBottom: 32 },
  hello: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 14,
  },
  serviceRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  serviceCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    minHeight: 170,
    justifyContent: "space-between",
  },
  hyperCard: { backgroundColor: colors.primary },
  interCard: { backgroundColor: colors.intercity },
  pillLight: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillLightText: { fontSize: 10, fontWeight: "700", color: colors.primary },
  pillDark: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillDarkText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  serviceTitleLight: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
  },
  serviceSubLight: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
    marginBottom: 12,
  },
  bookPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bookPillText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  trackCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  trackHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  trackTitle: { fontWeight: "700", color: colors.text, fontSize: 15 },
  trackSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  trackRow: { flexDirection: "row", gap: 8 },
  trackInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  trackBtn: {
    width: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  viewAll: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF3E6",
    alignItems: "center",
    justifyContent: "center",
  },
  orderRoute: { fontWeight: "700", color: colors.text },
  orderId: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  orderTime: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  orderFare: { fontWeight: "800", color: colors.text },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  activeBannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    opacity: 0.9,
  },
  activeBannerTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  activeBannerSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    marginTop: 1,
  },
  promo: {
    marginTop: 8,
    backgroundColor: "#EEF3FA",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  promoTitle: { fontWeight: "700", color: colors.intercity, marginBottom: 6 },
  promoCode: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF3E6",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  promoCodeText: { color: colors.primary, fontWeight: "700", fontSize: 11 },
  promoBtn: {
    backgroundColor: colors.intercity,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  promoBtnText: { color: "#fff", fontWeight: "700", fontSize: 11 },
});
