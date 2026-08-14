/**
 * "Finding Rider" waiting screen.
 * Polls booking every 5 s. Transitions:
 *   unassigned  → animated search
 *   assigned    → rider card + pickup OTP + ETA
 *   reached_drop→ drop OTP
 *   Delivered   → rating modal (skippable) → track screen
 *   Cancelled   → orders screen
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../../theme/colors";
import {
  getBookingById,
  cancelBooking as cancelBookingService,
} from "../../../services/bookingService";
import { apiRequest } from "../../../services/apiClient";

const POLL_MS = 5000;

type Phase =
  | "searching"
  | "assigned"
  | "arrived_pickup"
  | "picked"
  | "reached_drop"
  | "delivered"
  | "cancelled";

function toPhase(
  status: string | undefined,
  riderPhase: string | undefined,
  assignmentStatus: string | undefined
): Phase {
  if (status === "Cancelled") return "cancelled";
  if (status === "Delivered") return "delivered";
  if (riderPhase === "reached_drop" || riderPhase === "drop_verified") return "reached_drop";
  if (status === "Shipped" || riderPhase === "started") return "picked";
  if (riderPhase === "arrived_pickup" || riderPhase === "pickup_verified") return "arrived_pickup";
  if (assignmentStatus === "assigned" || riderPhase === "assigned") return "assigned";
  return "searching";
}

function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function etaText(riderLoc: { lat: number; lon: number } | null, pickup: { lat?: number; lon?: number } | null): string | null {
  if (!riderLoc || pickup?.lat == null || pickup?.lon == null) return null;
  const km = haversineKm(riderLoc.lat, riderLoc.lon, pickup.lat, pickup.lon);
  const mins = Math.max(2, Math.round((km / 25) * 60));
  return `~${mins} min away`;
}

export default function WaitingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [booking, setBooking] = useState<any>(null);
  const [phase, setPhase] = useState<Phase>("searching");
  const [cancelling, setCancelling] = useState(false);

  // Rating state
  const [showRating, setShowRating] = useState(false);
  const [stars, setStars] = useState(0);
  const [ratingNote, setRatingNote] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const ratedRef = useRef(false);

  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const navigateAfterDelivery = useCallback(() => {
    router.replace({
      pathname: "/(customer)/booking/track",
      params: { id },
    } as any);
  }, [id]);

  const fetchBooking = useCallback(async () => {
    if (!id) return;
    try {
      const b = await getBookingById(id as string);
      if (!b) return;
      setBooking(b);
      const p = toPhase(b.status, b.riderPhase, b.assignmentStatus);
      setPhase(p);

      if (p === "delivered" && !ratedRef.current) {
        ratedRef.current = true;
        setShowRating(true);
      }
      if (p === "cancelled") {
        setTimeout(() => router.replace("/(customer)/(tabs)/orders" as any), 2000);
      }
    } catch { /* ignore poll errors */ }
  }, [id]);

  useEffect(() => {
    fetchBooking();
    const interval = setInterval(fetchBooking, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchBooking]);

  const submitRating = async () => {
    if (stars === 0) { navigateAfterDelivery(); return; }
    try {
      setSubmittingRating(true);
      await apiRequest(`/bookings/${id}/rate`, {
        method: "POST",
        body: JSON.stringify({ rating: stars, note: ratingNote.trim() }),
      });
    } catch { /* non-critical */ } finally {
      setSubmittingRating(false);
    }
    setShowRating(false);
    navigateAfterDelivery();
  };

  const skipRating = () => {
    setShowRating(false);
    navigateAfterDelivery();
  };

  const goToTrack = () => {
    router.push({ pathname: "/(customer)/booking/track", params: { id } } as any);
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel booking?",
      "Are you sure you want to cancel this delivery?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, cancel",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelBookingService(id as string, "Cancelled by customer");
              router.replace("/(customer)/(tabs)/orders" as any);
            } catch (e: any) {
              Alert.alert("Error", e.message || "Could not cancel");
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const callRider = () => {
    if (booking?.riderPhone) Linking.openURL(`tel:${booking.riderPhone}`);
  };

  const eta = etaText(booking?.riderLastLocation, booking?.pickup);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Rating Modal (skippable) ── */}
      <Modal visible={showRating} transparent animationType="slide">
        <View style={styles.ratingOverlay}>
          <View style={styles.ratingSheet}>
            <Feather name="check-circle" size={40} color={colors.success} style={{ marginBottom: 12 }} />
            <Text style={styles.ratingTitle}>Delivered!</Text>
            <Text style={styles.ratingSubtitle}>How was your captain?</Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setStars(s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather
                    name="star"
                    size={36}
                    color={s <= stars ? "#F59E0B" : colors.border}
                    style={{ marginHorizontal: 4 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {stars > 0 && (
              <TextInput
                style={styles.ratingInput}
                placeholder="Add a note (optional)"
                placeholderTextColor={colors.textLight}
                value={ratingNote}
                onChangeText={setRatingNote}
                maxLength={200}
              />
            )}

            <TouchableOpacity
              style={[styles.rateBtn, stars === 0 && { opacity: 0.4 }]}
              onPress={submitRating}
              disabled={submittingRating}
            >
              {submittingRating
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.rateBtnText}>{stars > 0 ? "Submit Rating" : "Continue"}</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={skipRating} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.appName}>ParcelWalla</Text>
          {booking?.trackingNumber ? (
            <Text style={styles.trackingNo}>#{booking.trackingNumber}</Text>
          ) : null}
        </View>

        {/* ── Status cards ── */}
        {phase === "searching" && (
          <View style={styles.card}>
            <Animated.View style={{ opacity: pulse }}>
              <Feather name="search" size={48} color={colors.primary} style={styles.bigIcon} />
            </Animated.View>
            <Text style={styles.bigTitle}>Finding a captain…</Text>
            <Text style={styles.subtitle}>
              We're matching your order with a nearby delivery captain.{"\n"}
              This usually takes 1–3 minutes.
            </Text>
            <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
          </View>
        )}

        {(phase === "assigned" || phase === "arrived_pickup") && (
          <View style={styles.card}>
            <View style={styles.riderIconWrap}>
              <Feather name="user" size={36} color={colors.primary} />
            </View>

            {/* ETA pill */}
            {eta && phase === "assigned" && (
              <View style={styles.etaPill}>
                <Feather name="clock" size={12} color={colors.primary} />
                <Text style={styles.etaText}>{eta}</Text>
              </View>
            )}

            <Text style={styles.bigTitle}>
              {phase === "arrived_pickup" ? "Captain arrived!" : "Captain assigned!"}
            </Text>
            <Text style={styles.subtitle}>
              {phase === "arrived_pickup"
                ? "Your captain has arrived at the pickup location."
                : "Your captain is on the way to pick up your parcel."}
            </Text>

            <View style={styles.riderRow}>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{booking?.riderName || "Captain"}</Text>
                {booking?.riderPhone ? (
                  <Text style={styles.riderPhone}>{booking.riderPhone}</Text>
                ) : null}
              </View>
              {booking?.riderPhone ? (
                <TouchableOpacity style={styles.callBtn} onPress={callRider}>
                  <Feather name="phone" size={20} color="#fff" />
                </TouchableOpacity>
              ) : null}
            </View>

            {booking?.pickupOtp ? (
              <View style={styles.otpBox}>
                <Text style={styles.otpLabel}>Pickup OTP</Text>
                <Text style={styles.otpCode}>{booking.pickupOtp}</Text>
                <Text style={styles.otpHint}>Share this code with your captain when they arrive</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.trackLink} onPress={goToTrack}>
              <Feather name="map-pin" size={14} color={colors.primary} />
              <Text style={styles.trackLinkText}>Live tracking</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === "picked" && (
          <View style={styles.card}>
            <Feather name="package" size={48} color={colors.success} style={styles.bigIcon} />
            <Text style={styles.bigTitle}>Parcel picked up!</Text>
            <Text style={styles.subtitle}>Your parcel is on the way to the drop location.</Text>
            <TouchableOpacity style={styles.trackLink} onPress={goToTrack}>
              <Feather name="map-pin" size={14} color={colors.primary} />
              <Text style={styles.trackLinkText}>Track live</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === "reached_drop" && (
          <View style={styles.card}>
            <Feather name="map-pin" size={48} color={colors.warning} style={styles.bigIcon} />
            <Text style={styles.bigTitle}>Captain at delivery!</Text>
            <Text style={styles.subtitle}>Your captain has reached the delivery location.</Text>
            {booking?.dropOtp ? (
              <View style={[styles.otpBox, { borderColor: colors.warning }]}>
                <Text style={styles.otpLabel}>Delivery OTP</Text>
                <Text style={[styles.otpCode, { color: colors.warning }]}>{booking.dropOtp}</Text>
                <Text style={styles.otpHint}>The recipient should share this code with the captain</Text>
              </View>
            ) : null}
            <TouchableOpacity style={styles.trackLink} onPress={goToTrack}>
              <Feather name="map-pin" size={14} color={colors.primary} />
              <Text style={styles.trackLinkText}>Track live</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === "delivered" && (
          <View style={styles.card}>
            <Feather name="check-circle" size={48} color={colors.success} style={styles.bigIcon} />
            <Text style={styles.bigTitle}>Delivered!</Text>
            <Text style={styles.subtitle}>Your parcel has been delivered successfully.</Text>
          </View>
        )}

        {phase === "cancelled" && (
          <View style={styles.card}>
            <Feather name="x-circle" size={48} color={colors.error} style={styles.bigIcon} />
            <Text style={styles.bigTitle}>Booking cancelled</Text>
            <Text style={styles.subtitle}>This booking has been cancelled.</Text>
          </View>
        )}

        {/* ── Address summary ── */}
        {booking && (
          <View style={styles.addrCard}>
            <View style={styles.addrRow}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <Text style={styles.addrText} numberOfLines={2}>
                {booking.pickup?.address || booking.pickup?.name || "Pickup"}
              </Text>
            </View>
            <View style={styles.addrDivider} />
            <View style={styles.addrRow}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={styles.addrText} numberOfLines={2}>
                {booking.drop?.address || booking.drop?.name || "Drop"}
              </Text>
            </View>
          </View>
        )}

        {/* ── Fare ── */}
        {booking?.fare ? (
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>
              {booking.paymentMethod === "cod" ? "Pay on delivery" : "Paid online"}
            </Text>
            <Text style={styles.fareAmt}>₹{booking.fare}</Text>
          </View>
        ) : null}

        {/* ── Actions ── */}
        <View style={styles.actions}>
          {phase === "searching" && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancel}
              disabled={cancelling}
            >
              {cancelling
                ? <ActivityIndicator color={colors.error} />
                : <Text style={styles.cancelBtnText}>Cancel booking</Text>
              }
            </TouchableOpacity>
          )}
          {(phase === "assigned" || phase === "arrived_pickup" || phase === "picked" || phase === "reached_drop") && (
            <TouchableOpacity style={styles.primaryBtn} onPress={goToTrack}>
              <Feather name="map" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Open live tracking</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 24, marginTop: 8 },
  appName: { fontSize: 20, fontWeight: "800", color: colors.primary, letterSpacing: 0.5 },
  trackingNo: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  bigIcon: { marginBottom: 16 },
  riderIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF3E6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  etaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF3E6",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  etaText: { fontSize: 13, fontWeight: "700", color: colors.primary },
  bigTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
  riderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    width: "100%",
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  riderInfo: { flex: 1 },
  riderName: { fontSize: 16, fontWeight: "700", color: colors.text },
  riderPhone: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  otpBox: {
    marginTop: 16,
    width: "100%",
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    backgroundColor: "#FFF8F0",
  },
  otpLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  otpCode: { fontSize: 40, fontWeight: "900", color: colors.primary, letterSpacing: 8 },
  otpHint: { fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: 6, lineHeight: 16 },
  trackLink: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16 },
  trackLinkText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  addrCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addrRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  addrDivider: { width: 1, height: 12, backgroundColor: colors.border, marginLeft: 4, marginVertical: 4 },
  addrText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fareLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  fareAmt: { fontSize: 18, fontWeight: "800", color: colors.text },
  actions: { gap: 12 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelBtn: { borderWidth: 1, borderColor: colors.error, borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  cancelBtnText: { color: colors.error, fontWeight: "700", fontSize: 15 },

  // Rating modal
  ratingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  ratingSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 40,
    alignItems: "center",
  },
  ratingTitle: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 6 },
  ratingSubtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 20 },
  starsRow: { flexDirection: "row", marginBottom: 20 },
  ratingInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    marginBottom: 16,
  },
  rateBtn: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  rateBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  skipBtn: { paddingVertical: 8 },
  skipText: { color: colors.textSecondary, fontSize: 14, fontWeight: "600" },
});
