/**
 * Step 3 of 3: Parcel Details + Fare + Coupon + Payment Method + Submit
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useBooking } from "../../../hooks/useBooking";
import { useBookingDraftStore } from "../../../store/bookingDraftStore";
import { Input } from "../../../components/Input";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Header } from "../../../components/Header";
import { StepIndicator } from "../../../components/StepIndicator";
import { colors } from "../../../theme/colors";
import { calculateFare } from "../../../services/addressService";
import { validateAddress } from "../../../utils/validators";

const PARCEL_TYPES = ["Document", "Package", "Electronics", "Fragile", "Other"];

type FareResult = {
  distanceInKm: number;
  baseFare: number;
  baseKmIncluded?: number;
  extraKm?: number;
  perKmRate?: number;
  perKmCharge?: number;
  waitingMinutes?: number;
  waitingCharge?: number;
  handlingFee?: number;
  gst: number;
  totalFare: number;
  finalFare?: number;
  discountAmount?: number;
  couponApplied?: { code: string; discountAmount: number };
};

export default function ParcelPaymentScreen() {
  const router = useRouter();
  const { createBooking, loading } = useBooking();

  const pickup = useBookingDraftStore((s) => s.pickup);
  const pickupCoords = useBookingDraftStore((s) => s.pickupCoords);
  const drop = useBookingDraftStore((s) => s.drop);
  const dropCoords = useBookingDraftStore((s) => s.dropCoords);
  const parcelDetails = useBookingDraftStore((s) => s.parcelDetails);
  const setParcelDetails = useBookingDraftStore((s) => s.setParcelDetails);
  const couponCode = useBookingDraftStore((s) => s.couponCode);
  const setCouponCode = useBookingDraftStore((s) => s.setCouponCode);
  const paymentMethod = useBookingDraftStore((s) => s.paymentMethod);
  const setPaymentMethod = useBookingDraftStore((s) => s.setPaymentMethod);
  const resetDraft = useBookingDraftStore((s) => s.resetDraft);

  const [fare, setFare] = useState<FareResult | null>(null);
  const [loadingFare, setLoadingFare] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);

  // Guard: if user landed here without completing previous steps, bounce them back.
  useEffect(() => {
    if (!validateAddress(pickup).isValid || !pickupCoords) {
      router.replace("/(customer)/booking/new");
    } else if (!validateAddress(drop).isValid || !dropCoords) {
      router.replace("/(customer)/booking/drop");
    }
  }, []);

  // Recalculate fare whenever inputs change — requires real pinned coords.
  useEffect(() => {
    const run = async () => {
      const hasWeight =
        parcelDetails.weight && parcelDetails.weight > 0 && parcelDetails.weight <= 5;

      if (!hasWeight || !pickupCoords || !dropCoords) {
        if (parcelDetails.weight > 5) setWeightError("Maximum weight allowed is 5 kg");
        setFare(null);
        return;
      }

      setLoadingFare(true);
      try {
        const result = await calculateFare(
          pickupCoords,
          dropCoords,
          parcelDetails.weight,
          pickup.pincode && pickup.pincode.length === 6 ? pickup.pincode : undefined,
          drop.pincode && drop.pincode.length === 6 ? drop.pincode : undefined,
          couponCode.trim() || undefined,
          pickup.city,
          drop.city,
          parcelDetails.type
        );
        setFare(result);
      } catch (e) {
        setFare(null);
      } finally {
        setLoadingFare(false);
      }
    };
    run();
  }, [
    pickupCoords,
    dropCoords,
    parcelDetails.weight,
    parcelDetails.type,
    pickup.pincode,
    drop.pincode,
    pickup.city,
    drop.city,
    couponCode,
  ]);

  const updateParcel = (patch: Partial<typeof parcelDetails>) => {
    setParcelDetails({ ...parcelDetails, ...patch });
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }
    if (!fare || !fare.totalFare) {
      setCouponError("Please wait for fare calculation");
      return;
    }
    if (!pickupCoords || !dropCoords) {
      setCouponError("Pinned pickup and drop locations are required");
      return;
    }
    setCouponValidating(true);
    setCouponError(null);
    try {
      const result = await calculateFare(
        pickupCoords,
        dropCoords,
        parcelDetails.weight,
        pickup.pincode || undefined,
        drop.pincode || undefined,
        couponCode.trim(),
        pickup.city,
        drop.city,
        parcelDetails.type
      );
      if (result.couponApplied) {
        setFare(result);
      } else {
        setCouponError("Invalid or expired coupon code");
      }
    } catch (e: any) {
      setCouponError(e.message || "Failed to validate coupon");
    } finally {
      setCouponValidating(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponCode("");
    setCouponError(null);
    if (!pickupCoords || !dropCoords) return;
    try {
      const result = await calculateFare(
        pickupCoords,
        dropCoords,
        parcelDetails.weight,
        pickup.pincode || undefined,
        drop.pincode || undefined,
        undefined,
        pickup.city,
        drop.city,
        parcelDetails.type
      );
      setFare(result);
    } catch (e) {
      // silently ignore — fare just stays as-is
    }
  };

  const handleSubmit = async () => {
    if (!parcelDetails.type || !parcelDetails.weight || parcelDetails.weight <= 0) {
      Alert.alert("Validation Error", "Please enter valid parcel details");
      return;
    }
    if (parcelDetails.weight > 5) {
      Alert.alert("Validation Error", "Maximum weight allowed is 5 kg");
      setWeightError("Maximum weight allowed is 5 kg");
      return;
    }
    if (!fare || !fare.totalFare) {
      Alert.alert("Validation Error", "Please wait for fare calculation");
      return;
    }
    if (!pickupCoords || !dropCoords) {
      Alert.alert(
        "Pin location required",
        "Go back and select address suggestions or use current location."
      );
      return;
    }

    const finalFare = fare.finalFare ?? fare.totalFare;

    const pickupWithCoords = {
      ...pickup,
      ...(pickupCoords
        ? { lat: pickupCoords.lat, lon: pickupCoords.lon }
        : {}),
    };
    const dropWithCoords = {
      ...drop,
      ...(dropCoords ? { lat: dropCoords.lat, lon: dropCoords.lon } : {}),
    };

    try {
      if (paymentMethod === "cod") {
        const booking = await createBooking({
          pickup: pickupWithCoords,
          drop: dropWithCoords,
          parcelDetails,
          fare: finalFare,
          paymentMethod,
          couponCode: fare.couponApplied?.code || undefined,
        });
        resetDraft();
        router.replace({
          pathname: "/(customer)/booking/waiting",
          params: { id: booking.id },
        } as any);
      } else {
        router.push({
          pathname: "/(customer)/payment",
          params: {
            bookingData: JSON.stringify({
              pickup: pickupWithCoords,
              drop: dropWithCoords,
              parcelDetails,
              fare: finalFare,
              couponCode: fare.couponApplied?.code || undefined,
            }),
          },
        });
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to create booking");
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Parcel & Payment (3/3)" showBack />
      <StepIndicator current={3} total={3} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Card>
              <Text style={styles.routeLabel}>Route</Text>
              <Text style={styles.routeText} numberOfLines={2}>
                {pickup.city || "—"} → {drop.city || "—"}
              </Text>
            </Card>

            <Card>
              <Text style={styles.sectionTitle}>Parcel Details</Text>
              <Text style={styles.label}>Parcel Type *</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowTypeModal(true)}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    !parcelDetails.type && styles.placeholderText,
                  ]}
                >
                  {parcelDetails.type || "Select parcel type"}
                </Text>
                <Feather name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <Input
                label="Weight (kg) - Max 5 kg"
                value={parcelDetails.weight ? parcelDetails.weight.toString() : ""}
                onChangeText={(text) => {
                  const w = parseFloat(text) || 0;
                  updateParcel({ weight: w });
                  if (w > 5) setWeightError("Maximum weight allowed is 5 kg");
                  else if (w <= 0 && text.trim() !== "")
                    setWeightError("Weight must be greater than 0");
                  else setWeightError(null);
                }}
                placeholder="0.5"
                keyboardType="decimal-pad"
                error={weightError || undefined}
              />
            </Card>

            <Modal
              visible={showTypeModal}
              transparent
              animationType="slide"
              onRequestClose={() => setShowTypeModal(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowTypeModal(false)}
              >
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select Parcel Type</Text>
                  {PARCEL_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={styles.modalOption}
                      onPress={() => {
                        updateParcel({ type });
                        setShowTypeModal(false);
                      }}
                    >
                      <Text style={styles.modalOptionText}>{type}</Text>
                      {parcelDetails.type === type && (
                        <Feather name="check" size={20} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>

            {fare && (
              <Card style={styles.fareCard}>
                <Text style={styles.sectionTitle}>Estimated Fare</Text>
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Distance:</Text>
                  <Text style={styles.fareValue}>
                    {fare.distanceInKm != null ? `${fare.distanceInKm} km` : "0 km"}
                  </Text>
                </View>
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>
                    Base Fare (up to {fare.baseKmIncluded ?? 2} km):
                  </Text>
                  <Text style={styles.fareValue}>₹{fare.baseFare ?? 0}</Text>
                </View>
                {(fare.perKmCharge ?? 0) > 0 && (
                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>
                      Per KM ({fare.extraKm ?? 0} × ₹{fare.perKmRate ?? 8}):
                    </Text>
                    <Text style={styles.fareValue}>₹{fare.perKmCharge}</Text>
                  </View>
                )}
                {(fare.handlingFee ?? 0) > 0 && (
                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>Handling Fee:</Text>
                    <Text style={styles.fareValue}>₹{fare.handlingFee}</Text>
                  </View>
                )}
                {(fare.waitingCharge ?? 0) > 0 && (
                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>
                      Waiting ({fare.waitingMinutes ?? 0} min):
                    </Text>
                    <Text style={styles.fareValue}>₹{fare.waitingCharge}</Text>
                  </View>
                )}
                {fare.discountAmount != null && fare.discountAmount > 0 && (
                  <View style={styles.fareRow}>
                    <Text style={[styles.fareLabel, { color: colors.success }]}>
                      Discount
                      {fare.couponApplied?.code ? ` (${fare.couponApplied.code})` : ""}:
                    </Text>
                    <Text
                      style={[
                        styles.fareValue,
                        { color: colors.success, fontWeight: "600" },
                      ]}
                    >
                      -₹{fare.discountAmount}
                    </Text>
                  </View>
                )}
                <View style={[styles.fareRow, styles.totalFareRow]}>
                  <Text style={styles.totalFareLabel}>Total Fare:</Text>
                  <Text style={styles.totalFareValue}>
                    ₹{fare.finalFare != null ? fare.finalFare : fare.totalFare ?? 0}
                  </Text>
                </View>
                {loadingFare && (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={styles.fareLoading}
                  />
                )}
              </Card>
            )}

            {fare && (
              <Card>
                <Text style={styles.sectionTitle}>Coupon Code (Optional)</Text>
                <View style={styles.couponContainer}>
                  <Input
                    label="Enter Coupon Code"
                    value={couponCode}
                    onChangeText={(t) => {
                      setCouponCode(t.toUpperCase());
                      setCouponError(null);
                    }}
                    placeholder="COUPON123"
                    autoCapitalize="characters"
                    editable={!couponValidating}
                  />
                  {couponError && <Text style={styles.couponError}>{couponError}</Text>}
                  {fare.couponApplied && (
                    <View style={styles.couponApplied}>
                      <Feather name="check-circle" size={16} color={colors.success} />
                      <Text style={styles.couponAppliedText}>
                        Coupon {fare.couponApplied?.code} applied! Save ₹
                        {fare.discountAmount ?? 0}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.applyCouponButton}
                    onPress={handleApplyCoupon}
                    disabled={couponValidating || !couponCode.trim()}
                  >
                    {couponValidating ? (
                      <ActivityIndicator size="small" color={colors.background} />
                    ) : (
                      <Text style={styles.applyCouponButtonText}>Apply Coupon</Text>
                    )}
                  </TouchableOpacity>
                  {fare.couponApplied && (
                    <TouchableOpacity
                      style={styles.removeCouponButton}
                      onPress={handleRemoveCoupon}
                    >
                      <Text style={styles.removeCouponButtonText}>Remove Coupon</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            )}

            {fare && (
              <Card>
                <Text style={styles.sectionTitle}>Payment Method</Text>
                <View style={styles.paymentMethodContainer}>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodOption,
                      paymentMethod === "cod" && styles.paymentMethodSelected,
                    ]}
                    onPress={() => setPaymentMethod("cod")}
                  >
                    <Text
                      style={[
                        styles.paymentMethodText,
                        paymentMethod === "cod" && styles.paymentMethodTextSelected,
                      ]}
                    >
                      Cash on Delivery
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodOption,
                      paymentMethod === "online" && styles.paymentMethodSelected,
                    ]}
                    onPress={() => setPaymentMethod("online")}
                  >
                    <Text
                      style={[
                        styles.paymentMethodText,
                        paymentMethod === "online" && styles.paymentMethodTextSelected,
                      ]}
                    >
                      Online Payment (Paygic)
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}

            <Button
              title={paymentMethod === "online" ? "Proceed to Pay" : "Create Booking"}
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 24 },
  content: { padding: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  routeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  routeText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    marginBottom: 16,
  },
  dropdownText: { fontSize: 16, color: colors.text, flex: 1 },
  placeholderText: { color: colors.textLight },
  documentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary + "15",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 16,
  },
  documentBadgeText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "500",
  },
  fareCard: {
    backgroundColor: colors.primary + "10",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fareLabel: { fontSize: 14, color: colors.text },
  fareValue: { fontSize: 14, fontWeight: "500", color: colors.text },
  totalFareRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalFareLabel: { fontSize: 16, fontWeight: "600", color: colors.text },
  totalFareValue: { fontSize: 18, fontWeight: "700", color: colors.primary },
  fareLoading: { marginTop: 8 },
  paymentMethodContainer: { flexDirection: "row", gap: 12, marginTop: 8 },
  paymentMethodOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentMethodSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  paymentMethodText: { fontSize: 14, fontWeight: "500", color: colors.text },
  paymentMethodTextSelected: { color: colors.primary, fontWeight: "600" },
  submitButton: { marginTop: 24, marginBottom: 32 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "80%",
    minHeight: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionText: { fontSize: 16, color: colors.text },
  couponContainer: { gap: 12 },
  couponError: { fontSize: 12, color: colors.error, marginTop: -8 },
  couponApplied: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: colors.success + "10",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.success,
  },
  couponAppliedText: { fontSize: 14, color: colors.success, fontWeight: "500" },
  applyCouponButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  applyCouponButtonText: { color: colors.background, fontSize: 16, fontWeight: "600" },
  removeCouponButton: { paddingVertical: 8, paddingHorizontal: 16, alignItems: "center" },
  removeCouponButtonText: { color: colors.error, fontSize: 14, fontWeight: "500" },
});
