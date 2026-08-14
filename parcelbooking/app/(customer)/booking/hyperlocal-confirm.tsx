/**
 * Hyperlocal fare estimate + map + confirm booking
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Header } from "../../../components/Header";
import { Button } from "../../../components/Button";
import { LiveTrackingMap } from "../../../components/LiveTrackingMap";
import { colors } from "../../../theme/colors";
import { useBooking } from "../../../hooks/useBooking";
import { useBookingDraftStore } from "../../../store/bookingDraftStore";
import { calculateFare } from "../../../services/addressService";

const CATEGORIES = ["Documents", "Food", "Electronics", "Clothes", "Others"];
const WEIGHTS = [
  { label: "Up to 1 kg", value: 1 },
  { label: "1–5 kg", value: 3 },
];

type FareResult = {
  distanceInKm: number;
  baseFare: number;
  perKmCharge?: number;
  handlingFee?: number;
  gst: number;
  totalFare: number;
  finalFare?: number;
  discountAmount?: number;
};

export default function HyperlocalConfirmScreen() {
  const router = useRouter();
  const { createBooking, loading } = useBooking();
  const pickup = useBookingDraftStore((s) => s.pickup);
  const pickupCoords = useBookingDraftStore((s) => s.pickupCoords);
  const drop = useBookingDraftStore((s) => s.drop);
  const dropCoords = useBookingDraftStore((s) => s.dropCoords);
  const parcelDetails = useBookingDraftStore((s) => s.parcelDetails);
  const setParcelDetails = useBookingDraftStore((s) => s.setParcelDetails);
  const paymentMethod = useBookingDraftStore((s) => s.paymentMethod);
  const setPaymentMethod = useBookingDraftStore((s) => s.setPaymentMethod);
  const resetDraft = useBookingDraftStore((s) => s.resetDraft);

  const [fare, setFare] = useState<FareResult | null>(null);
  const [loadingFare, setLoadingFare] = useState(false);
  const [category, setCategory] = useState(
    parcelDetails.type === "Package" ? "Others" : parcelDetails.type || "Others"
  );
  const [weight, setWeight] = useState(parcelDetails.weight || 1);

  useEffect(() => {
    if (!pickupCoords || !dropCoords) {
      router.replace("/(customer)/booking/hyperlocal" as any);
    }
  }, []);

  useEffect(() => {
    const typeMap: Record<string, string> = {
      Documents: "Document",
      Food: "Package",
      Electronics: "Electronics",
      Clothes: "Package",
      Others: "Other",
    };
    setParcelDetails({
      ...parcelDetails,
      type: typeMap[category] || "Other",
      weight,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, weight]);

  useEffect(() => {
    const run = async () => {
      if (!pickupCoords || !dropCoords || !weight) {
        setFare(null);
        return;
      }
      setLoadingFare(true);
      try {
        const result = await calculateFare(
          pickupCoords,
          dropCoords,
          weight,
          pickup.pincode || undefined,
          drop.pincode || undefined,
          undefined,
          pickup.city,
          drop.city,
          parcelDetails.type
        );
        setFare(result);
      } catch {
        setFare(null);
      } finally {
        setLoadingFare(false);
      }
    };
    run();
  }, [pickupCoords, dropCoords, weight, category, pickup.city, drop.city]);

  const handleBook = async () => {
    if (!pickupCoords || !dropCoords || !fare) {
      Alert.alert("Fare", "Wait for fare estimation or fix addresses.");
      return;
    }
    const finalFare = fare.finalFare ?? fare.totalFare;
    const pickupWithCoords = {
      ...pickup,
      lat: pickupCoords.lat,
      lon: pickupCoords.lon,
      city: pickup.city || "Ujjain",
    };
    const dropWithCoords = {
      ...drop,
      lat: dropCoords.lat,
      lon: dropCoords.lon,
      city: drop.city || "Ujjain",
    };
    const parcel = { ...parcelDetails, weight, type: parcelDetails.type || "Other" };

    try {
      if (paymentMethod === "cod") {
        const booking = await createBooking({
          pickup: pickupWithCoords,
          drop: dropWithCoords,
          parcelDetails: parcel,
          fare: finalFare,
          paymentMethod: "cod",
          deliveryType: "sameDay",
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
              parcelDetails: parcel,
              fare: finalFare,
              paymentMethod: "online",
              deliveryType: "sameDay",
            }),
          },
        } as any);
      }
    } catch (e: any) {
      Alert.alert("Booking failed", e.message || "Try again");
    }
  };

  const etaMins = fare
    ? Math.max(15, Math.round((fare.distanceInKm || 0) * 3 + 12))
    : null;

  return (
    <View style={styles.root}>
      <Header title="Review & Confirm" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        {(pickupCoords || dropCoords) && (
          <View style={styles.mapWrap}>
            <LiveTrackingMap
              height={180}
              pickup={
                pickupCoords
                  ? {
                      latitude: pickupCoords.lat,
                      longitude: pickupCoords.lon,
                      title: "Pickup",
                    }
                  : null
              }
              drop={
                dropCoords
                  ? {
                      latitude: dropCoords.lat,
                      longitude: dropCoords.lon,
                      title: "Drop",
                    }
                  : null
              }
            />
          </View>
        )}

        {fare && (
          <View style={styles.summaryBar}>
            <Text style={styles.summaryText}>
              Distance: {fare.distanceInKm.toFixed(1)} km
            </Text>
            {etaMins ? (
              <Text style={styles.summaryText}>Est. {etaMins - 4} – {etaMins} mins</Text>
            ) : null}
          </View>
        )}

        <Text style={styles.section}>Parcel category</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, category === c && styles.chipOn]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextOn]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>Approx. weight</Text>
        <View style={styles.chips}>
          {WEIGHTS.map((w) => (
            <TouchableOpacity
              key={w.value}
              style={[styles.chip, weight === w.value && styles.chipOn]}
              onPress={() => setWeight(w.value)}
            >
              <Text
                style={[styles.chipText, weight === w.value && styles.chipTextOn]}
              >
                {w.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Pickup & Drop</Text>
          <Text style={styles.addr}>🟢 {pickup.address}</Text>
          <Text style={[styles.addr, { marginTop: 8 }]}>🟠 {drop.address}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Fare details</Text>
          {loadingFare ? (
            <ActivityIndicator color={colors.primary} />
          ) : fare ? (
            <>
              <Row label="Base fare" value={`₹${fare.baseFare}`} />
              {!!fare.perKmCharge && (
                <Row
                  label={`Distance (${fare.distanceInKm.toFixed(1)} km)`}
                  value={`₹${fare.perKmCharge}`}
                />
              )}
              {!!fare.handlingFee && (
                <Row label="Handling" value={`₹${fare.handlingFee}`} />
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Fare</Text>
                <Text style={styles.totalValue}>
                  ₹{fare.finalFare ?? fare.totalFare}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.muted}>Unable to estimate fare</Text>
          )}
        </View>

        <Text style={styles.section}>Payment</Text>
        <View style={styles.payRow}>
          {(["cod", "online"] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.payChip, paymentMethod === m && styles.chipOn]}
              onPress={() => setPaymentMethod(m)}
            >
              <Text
                style={[
                  styles.chipText,
                  paymentMethod === m && styles.chipTextOn,
                ]}
              >
                {m === "cod" ? "Cash on Delivery" : "UPI / Online"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.trust}>
          <Feather name="shield" size={14} color={colors.success} />
          <Text style={styles.trustText}>Safe delivery with verified captains</Text>
        </View>

        <Button
          title={
            fare
              ? `Confirm Booking · ₹${fare.finalFare ?? fare.totalFare}`
              : "Confirm Booking"
          }
          onPress={handleBook}
          loading={loading || loadingFare}
          disabled={!fare}
        />
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.rowVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  mapWrap: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryBar: {
    backgroundColor: "#FFF3E6",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  summaryText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  section: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: {
    borderColor: colors.primary,
    backgroundColor: "#FFF3E6",
  },
  chipText: { color: colors.textSecondary, fontWeight: "600", fontSize: 13 },
  chipTextOn: { color: colors.primary },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    backgroundColor: colors.surface,
  },
  addr: { color: colors.text, fontSize: 13, lineHeight: 18 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  muted: { color: colors.textSecondary, fontSize: 13 },
  rowVal: { color: colors.text, fontWeight: "600" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: { fontWeight: "800", color: colors.text, fontSize: 16 },
  totalValue: { fontWeight: "800", color: colors.primary, fontSize: 18 },
  payRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  payChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  trust: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  trustText: { color: colors.textSecondary, fontSize: 12 },
});
