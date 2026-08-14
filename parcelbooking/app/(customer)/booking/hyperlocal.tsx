/**
 * Hyperlocal Instant Delivery — Pickup + Drop on one screen (auto GPS pickup)
 * Saved locations: home location cached in AsyncStorage to skip GPS API calls.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../../../components/Header";
import { Button } from "../../../components/Button";
import { LocationField } from "../../../components/LocationField";
import { Input } from "../../../components/Input";
import { colors } from "../../../theme/colors";
import { useAuthStore } from "../../../store/authStore";
import { useBookingDraftStore } from "../../../store/bookingDraftStore";
import { getAddressDetails } from "../../../services/addressService";
import {
  getSavedLocations,
  saveHomeLocation,
  upsertSavedLocation,
  deleteSavedLocation,
  SavedLocation,
} from "../../../services/savedLocationsService";

const CITY = "Ujjain";

const ICONS: Record<SavedLocation["icon"], keyof typeof Feather.glyphMap> = {
  home: "home",
  briefcase: "briefcase",
  "map-pin": "map-pin",
};

export default function HyperlocalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const pickup = useBookingDraftStore((s) => s.pickup);
  const pickupCoords = useBookingDraftStore((s) => s.pickupCoords);
  const drop = useBookingDraftStore((s) => s.drop);
  const dropCoords = useBookingDraftStore((s) => s.dropCoords);
  const setPickup = useBookingDraftStore((s) => s.setPickup);
  const setDrop = useBookingDraftStore((s) => s.setDrop);

  const [pickupText, setPickupText] = useState(pickup.address || "");
  const [dropText, setDropText] = useState(drop.address || "");
  const [pickupName, setPickupName] = useState(pickup.name || user?.name || "");
  const [pickupPhone, setPickupPhone] = useState(
    pickup.phone || user?.phoneNumber || ""
  );
  const [dropName, setDropName] = useState(drop.name || "");
  const [dropPhone, setDropPhone] = useState(drop.phone || "");
  const [locating, setLocating] = useState(false);

  // Saved locations state
  const [savedLocs, setSavedLocs] = useState<SavedLocation[]>([]);
  const [saveModal, setSaveModal] = useState(false);
  const [saveLabel, setSaveLabel] = useState("Home");
  const [saveTarget, setSaveTarget] = useState<"pickup" | "drop">("pickup");

  const loadSaved = useCallback(async () => {
    const list = await getSavedLocations();
    setSavedLocs(list);
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  // On mount: if no pickup set, try saved home location first (no GPS call needed)
  useEffect(() => {
    if (pickupCoords) return;
    (async () => {
      const list = await getSavedLocations();
      const home = list.find((l) => l.id === "home");
      if (home) {
        const addr = {
          name: pickupName || user?.name || "Pickup",
          phone: pickupPhone || user?.phoneNumber || "",
          address: home.address,
          city: home.city,
          state: home.state,
          pincode: home.pincode,
        };
        setPickupText(home.address);
        setPickup(addr, { lat: home.lat, lon: home.lon });
      } else {
        applyGps();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyGps = async () => {
    try {
      setLocating(true);
      const Location = await import("expo-location");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location", "Allow location to auto-fill pickup.");
        return;
      }

      // Step 1: Use last known position for an instant rough pin while GPS warms up
      const last = await Location.getLastKnownPositionAsync({});

      // Step 2: Watch with High accuracy; stop when accuracy < 30m or after 8s
      const bestPos = await new Promise<{
        latitude: number;
        longitude: number;
        accuracy: number | null;
      }>((resolve) => {
        let sub: { remove: () => void } | null = null;
        let resolved = false;

        const done = (lat: number, lon: number, acc: number | null) => {
          if (resolved) return;
          resolved = true;
          sub?.remove();
          clearTimeout(timer);
          resolve({ latitude: lat, longitude: lon, accuracy: acc });
        };

        // Fallback: resolve with last known or a low-accuracy fix after 8s
        const timer = setTimeout(async () => {
          if (resolved) return;
          try {
            const fallback = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Low,
            });
            done(fallback.coords.latitude, fallback.coords.longitude, fallback.coords.accuracy);
          } catch {
            if (last) done(last.coords.latitude, last.coords.longitude, last.coords.accuracy);
          }
        }, 8000);

        Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 0 },
          (pos) => {
            const acc = pos.coords.accuracy;
            // Accept fix once accuracy is good enough (≤30m) or it's the first result
            if (!resolved) {
              if (acc !== null && acc <= 30) {
                done(pos.coords.latitude, pos.coords.longitude, acc);
              } else if (last === null) {
                // No last-known — show whatever we have immediately as rough pin
                done(pos.coords.latitude, pos.coords.longitude, acc);
              }
            }
          }
        ).then((s) => { sub = s; });
      });

      const details = await getAddressDetails(bestPos.latitude, bestPos.longitude);
      const addr = {
        name: pickupName || user?.name || "Pickup",
        phone: pickupPhone || user?.phoneNumber || "",
        address: details.address || pickupText,
        city: details.city || CITY,
        state: details.state || "Madhya Pradesh",
        pincode: details.pincode || "",
        street: details.street,
        houseNumber: details.houseNumber,
        landmark: details.landmark,
      };
      setPickupText(addr.address);
      setPickup(addr, { lat: bestPos.latitude, lon: bestPos.longitude });

      // Offer to save as home if none saved
      const home = savedLocs.find((l) => l.id === "home");
      if (!home) {
        Alert.alert(
          "Save as Home?",
          "Save this location as your home for faster pickup next time?",
          [
            {
              text: "Save",
              onPress: async () => {
                await saveHomeLocation({
                  address: addr.address,
                  city: addr.city,
                  state: addr.state,
                  pincode: addr.pincode,
                  lat: bestPos.latitude,
                  lon: bestPos.longitude,
                });
                loadSaved();
              },
            },
            { text: "Skip", style: "cancel" },
          ]
        );
      }
    } catch (e: any) {
      Alert.alert("Location", e.message || "Could not fetch current location");
    } finally {
      setLocating(false);
    }
  };

  const applySavedToPickup = (loc: SavedLocation) => {
    const addr = {
      name: pickupName || user?.name || "Pickup",
      phone: pickupPhone || user?.phoneNumber || "",
      address: loc.address,
      city: loc.city,
      state: loc.state,
      pincode: loc.pincode,
    };
    setPickupText(loc.address);
    setPickup(addr, { lat: loc.lat, lon: loc.lon });
  };

  const applySavedToDrop = (loc: SavedLocation) => {
    const addr = {
      name: dropName,
      phone: dropPhone,
      address: loc.address,
      city: loc.city,
      state: loc.state,
      pincode: loc.pincode,
    };
    setDropText(loc.address);
    setDrop(addr, { lat: loc.lat, lon: loc.lon });
  };

  const openSaveModal = (target: "pickup" | "drop") => {
    setSaveTarget(target);
    setSaveLabel(target === "pickup" ? "Home" : "Work");
    setSaveModal(true);
  };

  const handleSaveLocation = async () => {
    const isPickup = saveTarget === "pickup";
    const coords = isPickup ? pickupCoords : dropCoords;
    const address = isPickup ? pickupText : dropText;
    const city = isPickup ? pickup.city : drop.city;
    const state = isPickup ? pickup.state : drop.state;
    const pincode = isPickup ? pickup.pincode : drop.pincode;

    if (!coords || !address.trim()) {
      Alert.alert("Save location", "Set a location first before saving.");
      return;
    }

    const label = saveLabel.trim() || (saveTarget === "pickup" ? "Home" : "Work");
    const icon: SavedLocation["icon"] =
      label.toLowerCase() === "home"
        ? "home"
        : label.toLowerCase().includes("work") ||
          label.toLowerCase().includes("office")
        ? "briefcase"
        : "map-pin";

    await upsertSavedLocation({
      label,
      icon,
      address,
      city: city || CITY,
      state: state || "Madhya Pradesh",
      pincode: pincode || "",
      lat: coords.lat,
      lon: coords.lon,
    });
    setSaveModal(false);
    loadSaved();
  };

  const handleDeleteSaved = (loc: SavedLocation) => {
    Alert.alert("Delete", `Remove "${loc.label}" from saved locations?`, [
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteSavedLocation(loc.id);
          loadSaved();
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const continueNext = () => {
    if (!pickupCoords || !pickupText.trim()) {
      Alert.alert("Pickup", "Set a pickup location (or use GPS).");
      return;
    }
    if (!dropCoords || !dropText.trim()) {
      Alert.alert("Drop", "Select a drop location.");
      return;
    }
    if (!pickupName.trim() || !pickupPhone.trim()) {
      Alert.alert("Pickup contact", "Enter pickup name and phone.");
      return;
    }
    if (!dropName.trim() || !dropPhone.trim()) {
      Alert.alert("Drop contact", "Enter receiver name and phone.");
      return;
    }

    setPickup(
      {
        ...pickup,
        name: pickupName.trim(),
        phone: pickupPhone.trim(),
        address: pickupText.trim(),
        city: pickup.city || CITY,
        state: pickup.state || "Madhya Pradesh",
      },
      pickupCoords
    );
    setDrop(
      {
        ...drop,
        name: dropName.trim(),
        phone: dropPhone.trim(),
        address: dropText.trim(),
        city: drop.city || CITY,
        state: drop.state || "Madhya Pradesh",
      },
      dropCoords
    );
    router.push("/(customer)/booking/hyperlocal-confirm" as any);
  };

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <Header title="Instant Delivery" showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "android" ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Text style={styles.badge}>Within City · {CITY}</Text>

          {/* Saved locations strip */}
          {savedLocs.length > 0 && (
            <View style={styles.savedSection}>
              <Text style={styles.savedTitle}>Saved locations</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.savedRow}>
                  {savedLocs.map((loc) => (
                    <View key={loc.id} style={styles.savedChipWrap}>
                      <TouchableOpacity
                        style={styles.savedChip}
                        onPress={() => applySavedToPickup(loc)}
                        onLongPress={() => handleDeleteSaved(loc)}
                      >
                        <Feather
                          name={ICONS[loc.icon]}
                          size={13}
                          color={colors.primary}
                        />
                        <Text style={styles.savedChipLabel}>{loc.label}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.savedChipDrop}
                        onPress={() => applySavedToDrop(loc)}
                      >
                        <Text style={styles.savedChipDropText}>→ Drop</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
              <Text style={styles.savedHint}>Tap = set as pickup · → Drop = set as drop · Long press = delete</Text>
            </View>
          )}

          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}>
              <LocationField
                label="Pickup Location"
                pinColor={colors.success}
                value={pickupText}
                onChangeText={setPickupText}
                cityBias={CITY}
                locating={locating}
                onLocate={applyGps}
                onSelect={(address, coords) => {
                  setPickup(
                    {
                      ...address,
                      name: pickupName || address.name,
                      phone: pickupPhone || user?.phoneNumber || "",
                      city: CITY,
                    },
                    coords
                  );
                }}
              />
            </View>
            {pickupCoords && (
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => openSaveModal("pickup")}
              >
                <Feather name="bookmark" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}>
              <LocationField
                label="Drop Location"
                pinColor={colors.primary}
                value={dropText}
                onChangeText={setDropText}
                cityBias={CITY}
                placeholder="Where should we deliver?"
                onSelect={(address, coords) => {
                  setDrop(
                    {
                      ...address,
                      name: dropName || address.name,
                      phone: dropPhone,
                      city: CITY,
                    },
                    coords
                  );
                }}
              />
            </View>
            {dropCoords && (
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => openSaveModal("drop")}
              >
                <Feather name="bookmark" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.section}>Pickup contact</Text>
          <Input
            label="Name"
            value={pickupName}
            onChangeText={setPickupName}
            placeholder="Sender name"
          />
          <Input
            label="Phone"
            value={pickupPhone}
            onChangeText={setPickupPhone}
            keyboardType="phone-pad"
            placeholder="Sender phone"
          />

          <Text style={styles.section}>Drop contact</Text>
          <Input
            label="Name"
            value={dropName}
            onChangeText={setDropName}
            placeholder="Receiver name"
          />
          <Input
            label="Phone"
            value={dropPhone}
            onChangeText={setDropPhone}
            keyboardType="phone-pad"
            placeholder="Receiver phone"
          />

          <Button title="Continue →" onPress={continueNext} style={{ marginTop: 8 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save location modal */}
      <Modal visible={saveModal} transparent animationType="fade" onRequestClose={() => setSaveModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSaveModal(false)}>
          <Pressable style={styles.modal}>
            <Text style={styles.modalTitle}>Save {saveTarget === "pickup" ? "pickup" : "drop"} location</Text>
            <TextInput
              style={styles.labelInput}
              value={saveLabel}
              onChangeText={setSaveLabel}
              placeholder="Label (e.g. Home, Work)"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <View style={styles.iconRow}>
              {(["home", "briefcase", "map-pin"] as const).map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconChip,
                    saveLabel.toLowerCase() === icon && styles.iconChipOn,
                  ]}
                  onPress={() => {
                    setSaveLabel(
                      icon === "home" ? "Home" : icon === "briefcase" ? "Work" : saveLabel
                    );
                  }}
                >
                  <Feather name={ICONS[icon]} size={18} color={
                    saveLabel.toLowerCase() === icon ? colors.primary : colors.textSecondary
                  } />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSaveModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveLocation}>
                <Text style={styles.confirmBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 120 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF3E6",
    color: colors.primary,
    fontWeight: "700",
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 14,
  },
  savedSection: {
    marginBottom: 16,
  },
  savedTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  savedRow: { flexDirection: "row", gap: 8 },
  savedChipWrap: { alignItems: "center", gap: 4 },
  savedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFF3E6",
    borderWidth: 1,
    borderColor: colors.primary + "44",
  },
  savedChipLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  savedChipDrop: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  savedChipDropText: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  savedHint: { fontSize: 10, color: colors.textLight, marginTop: 6 },
  fieldRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  saveBtn: {
    marginTop: 28,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FFF3E6",
    borderWidth: 1,
    borderColor: colors.primary + "44",
  },
  section: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
    marginBottom: 8,
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    width: "100%",
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  labelInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  iconRow: { flexDirection: "row", gap: 12 },
  iconChip: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  iconChipOn: {
    borderColor: colors.primary,
    backgroundColor: "#FFF3E6",
  },
  modalBtns: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelBtnText: { fontWeight: "700", color: colors.textSecondary },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  confirmBtnText: { fontWeight: "700", color: "#fff" },
});
