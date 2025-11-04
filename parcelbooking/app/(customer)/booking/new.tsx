/**
 * New Booking Screen
 * Create a new parcel booking with address autocomplete and fare calculation
 */

import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { useBooking } from "../../../hooks/useBooking";
import { useAuthStore } from "../../../store/authStore";
import { Input } from "../../../components/Input";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Header } from "../../../components/Header";
import { colors } from "../../../theme/colors";
import { Address, ParcelDetails, PaymentMethod } from "../../../utils/types";
import { validateAddress } from "../../../utils/validators";
import {
  getAutocompleteSuggestions,
  getAddressDetails,
  calculateFare,
  debounce,
  AddressSuggestion,
} from "../../../services/addressService";

export default function NewBookingScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { createBooking, loading } = useBooking();

  // Address coordinates for fare calculation
  const [pickupCoordinates, setPickupCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [dropCoordinates, setDropCoordinates] = useState<{ lat: number; lon: number } | null>(null);

  // Autocomplete state
  const [pickupSuggestions, setPickupSuggestions] = useState<AddressSuggestion[]>([]);
  const [dropSuggestions, setDropSuggestions] = useState<AddressSuggestion[]>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropSuggestions, setShowDropSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [pickupSearchQuery, setPickupSearchQuery] = useState("");
  const [dropSearchQuery, setDropSearchQuery] = useState("");

  // Fare calculation state
  const [fareCalculation, setFareCalculation] = useState<{
    distanceInKm: number;
    baseFare: number;
    gst: number;
    totalFare: number;
  } | null>(null);
  const [loadingFare, setLoadingFare] = useState(false);

  const [pickup, setPickup] = useState<Address>({
    name: "",
    phone: user?.phoneNumber || "",
    houseNumber: "",
    street: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
  });

  const [drop, setDrop] = useState<Address>({
    name: "",
    phone: "",
    houseNumber: "",
    street: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
  });

  const [parcelDetails, setParcelDetails] = useState<ParcelDetails>({
    type: "",
    weight: 0,
    description: "",
    value: 0,
  });

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");

  // Debounced search function for pickup address
  const debouncedPickupSearch = useCallback(
    debounce(async (query: string) => {
      if (query.trim().length < 3) {
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
        return;
      }

      setLoadingSuggestions(true);
      try {
        const suggestions = await getAutocompleteSuggestions(query, 5);
        setPickupSuggestions(suggestions);
        setShowPickupSuggestions(true);
      } catch (error: any) {
        console.error("Error fetching pickup suggestions:", error);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 500),
    []
  );

  // Debounced search function for drop address
  const debouncedDropSearch = useCallback(
    debounce(async (query: string) => {
      if (query.trim().length < 3) {
        setDropSuggestions([]);
        setShowDropSuggestions(false);
        return;
      }

      setLoadingSuggestions(true);
      try {
        const suggestions = await getAutocompleteSuggestions(query, 5);
        setDropSuggestions(suggestions);
        setShowDropSuggestions(true);
      } catch (error: any) {
        console.error("Error fetching drop suggestions:", error);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 500),
    []
  );

  // Handle pickup address input change
  const handlePickupAddressChange = (text: string) => {
    setPickupSearchQuery(text);
    updatePickup("address", text);
    debouncedPickupSearch(text);
  };

  // Handle drop address input change
  const handleDropAddressChange = (text: string) => {
    setDropSearchQuery(text);
    updateDrop("address", text);
    debouncedDropSearch(text);
  };

  // Handle pickup suggestion selection
  const handlePickupSuggestionSelect = async (suggestion: AddressSuggestion) => {
    try {
      setLoadingSuggestions(true);
      setShowPickupSuggestions(false); // Hide suggestions immediately
      
      console.log("[Pickup] Selected suggestion:", suggestion.displayName);
      
      // Only fill the address field with the full address string
      setPickup((prev) => ({
        ...prev,
        address: suggestion.displayName, // Use the full display name as address
      }));

      // Store coordinates for fare calculation
      setPickupCoordinates(suggestion.coordinates);

      setPickupSearchQuery("");
    } catch (error: any) {
      console.error("[Pickup] Error selecting suggestion:", error);
      Alert.alert("Error", error.message || "Failed to select address");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Handle drop suggestion selection
  const handleDropSuggestionSelect = async (suggestion: AddressSuggestion) => {
    try {
      setLoadingSuggestions(true);
      setShowDropSuggestions(false); // Hide suggestions immediately
      
      console.log("[Drop] Selected suggestion:", suggestion.displayName);
      
      // Only fill the address field with the full address string
      setDrop((prev) => ({
        ...prev,
        address: suggestion.displayName, // Use the full display name as address
      }));

      // Store coordinates for fare calculation
      setDropCoordinates(suggestion.coordinates);

      setDropSearchQuery("");
    } catch (error: any) {
      console.error("[Drop] Error selecting suggestion:", error);
      Alert.alert("Error", error.message || "Failed to select address");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Calculate fare when both addresses and weight are available
  useEffect(() => {
    const calculateFareAsync = async () => {
      if (
        pickupCoordinates &&
        dropCoordinates &&
        parcelDetails.weight &&
        parcelDetails.weight > 0
      ) {
        setLoadingFare(true);
        try {
          const fare = await calculateFare(
            pickupCoordinates,
            dropCoordinates,
            parcelDetails.weight
          );
          setFareCalculation(fare);
        } catch (error: any) {
          console.error("Error calculating fare:", error);
          setFareCalculation(null);
        } finally {
          setLoadingFare(false);
        }
      } else {
        setFareCalculation(null);
      }
    };

    calculateFareAsync();
  }, [pickupCoordinates, dropCoordinates, parcelDetails.weight]);

  const updatePickup = (field: keyof Address, value: string) => {
    setPickup((prev) => ({ ...prev, [field]: value }));
    // Clear coordinates if address is manually changed
    if (field === "address" && value !== pickupSearchQuery) {
      setPickupCoordinates(null);
    }
  };

  const updateDrop = (field: keyof Address, value: string) => {
    setDrop((prev) => ({ ...prev, [field]: value }));
    // Clear coordinates if address is manually changed
    if (field === "address" && value !== dropSearchQuery) {
      setDropCoordinates(null);
    }
  };

  const handleSubmit = async () => {
    const pickupValidation = validateAddress(pickup);
    if (!pickupValidation.isValid) {
      Alert.alert("Validation Error", pickupValidation.errors.join("\n"));
      return;
    }

    const dropValidation = validateAddress(drop);
    if (!dropValidation.isValid) {
      Alert.alert("Validation Error", dropValidation.errors.join("\n"));
      return;
    }

    if (!parcelDetails.type || !parcelDetails.weight || parcelDetails.weight <= 0) {
      Alert.alert("Validation Error", "Please enter valid parcel details");
      return;
    }

    if (!fareCalculation || !fareCalculation.totalFare) {
      Alert.alert("Validation Error", "Please wait for fare calculation");
      return;
    }

    try {
      const booking = await createBooking({
        pickup,
        drop,
        parcelDetails,
        fare: fareCalculation.totalFare,
        paymentMethod,
      });

      if (paymentMethod === "cod") {
        // Cash on Delivery - booking confirmed immediately
        Alert.alert("Success", "Booking created successfully! Pay on delivery.", [
          {
            text: "OK",
            onPress: () => router.push("/(customer)/booking/history"),
          },
        ]);
      } else {
        // Online payment - booking is PendingPayment, redirect to payment screen
        Alert.alert(
          "Booking Created",
          "Please complete the payment to confirm your booking.",
          [
            {
              text: "Pay Now",
              onPress: () => router.push(`/(customer)/payment?id=${booking.id}`),
            },
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => router.push("/(customer)/booking/history"),
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create booking");
    }
  };

  return (
    <View style={styles.container}>
      <Header title="New Booking" showBack />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            <Card>
              <Text style={styles.sectionTitle}>Pickup Address</Text>
              <View style={styles.autocompleteContainer}>
                <Input
                  label="Address (Start typing to search)"
                  value={pickup.address}
                  onChangeText={handlePickupAddressChange}
                  placeholder="Type address to search..."
                  multiline
                  numberOfLines={2}
                />
                {showPickupSuggestions && pickupSuggestions.length > 0 && (
                  <View style={styles.suggestionsList}>
                    {loadingSuggestions && (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    )}
                    {pickupSuggestions.map((item, index) => (
                      <TouchableOpacity
                        key={`${item.displayName}-${index}`}
                        style={styles.suggestionItem}
                        onPress={() => handlePickupSuggestionSelect(item)}
                      >
                        <Text style={styles.suggestionText}>{item.displayName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <Input
                label="Name"
                value={pickup.name}
                onChangeText={(text) => updatePickup("name", text)}
                placeholder="Enter name"
              />
              <Input
                label="Phone"
                value={pickup.phone}
                onChangeText={(text) => {
                  // Auto-add +91 prefix if not present
                  const cleaned = text.replace(/\D/g, "");
                  if (cleaned.length > 0 && !text.startsWith("+91")) {
                    if (cleaned.length <= 10) {
                      updatePickup("phone", `+91 ${cleaned}`);
                    } else if (cleaned.startsWith("91")) {
                      updatePickup("phone", `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7, 12)}`);
                    } else {
                      updatePickup("phone", text);
                    }
                  } else {
                    updatePickup("phone", text);
                  }
                }}
                placeholder="+91 12345 67890"
                keyboardType="phone-pad"
                maxLength={17}
              />
              <Input
                label="House/Flat Number (Optional)"
                value={pickup.houseNumber || ""}
                onChangeText={(text) => updatePickup("houseNumber", text)}
                placeholder="e.g., 123, Flat 4B"
              />
              <Input
                label="Street/Road (Optional)"
                value={pickup.street || ""}
                onChangeText={(text) => updatePickup("street", text)}
                placeholder="e.g., Main Street, MG Road"
              />
              <Input
                label="City"
                value={pickup.city}
                onChangeText={(text) => updatePickup("city", text)}
                placeholder="Enter city"
                editable={!!pickup.address}
              />
              <Input
                label="State"
                value={pickup.state}
                onChangeText={(text) => updatePickup("state", text)}
                placeholder="Enter state"
                editable={!!pickup.address}
              />
              <Input
                label="PIN Code"
                value={pickup.pincode}
                onChangeText={(text) => updatePickup("pincode", text)}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                editable={!!pickup.address}
              />
              <Input
                label="Landmark (Optional)"
                value={pickup.landmark || ""}
                onChangeText={(text) => updatePickup("landmark", text)}
                placeholder="Near landmark"
              />
            </Card>

            <Card>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <View style={styles.autocompleteContainer}>
                <Input
                  label="Address (Start typing to search)"
                  value={drop.address}
                  onChangeText={handleDropAddressChange}
                  placeholder="Type address to search..."
                  multiline
                  numberOfLines={2}
                />
                {showDropSuggestions && dropSuggestions.length > 0 && (
                  <View style={styles.suggestionsList}>
                    {loadingSuggestions && (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    )}
                    {dropSuggestions.map((item, index) => (
                      <TouchableOpacity
                        key={`${item.displayName}-${index}`}
                        style={styles.suggestionItem}
                        onPress={() => handleDropSuggestionSelect(item)}
                      >
                        <Text style={styles.suggestionText}>{item.displayName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <Input
                label="Name"
                value={drop.name}
                onChangeText={(text) => updateDrop("name", text)}
                placeholder="Enter name"
              />
              <Input
                label="Phone"
                value={drop.phone}
                onChangeText={(text) => {
                  // Auto-add +91 prefix if not present
                  const cleaned = text.replace(/\D/g, "");
                  if (cleaned.length > 0 && !text.startsWith("+91")) {
                    if (cleaned.length <= 10) {
                      updateDrop("phone", `+91 ${cleaned}`);
                    } else if (cleaned.startsWith("91")) {
                      updateDrop("phone", `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7, 12)}`);
                    } else {
                      updateDrop("phone", text);
                    }
                  } else {
                    updateDrop("phone", text);
                  }
                }}
                placeholder="+91 12345 67890"
                keyboardType="phone-pad"
                maxLength={17}
              />
              <Input
                label="House/Flat Number (Optional)"
                value={drop.houseNumber || ""}
                onChangeText={(text) => updateDrop("houseNumber", text)}
                placeholder="e.g., 123, Flat 4B"
              />
              <Input
                label="Street/Road (Optional)"
                value={drop.street || ""}
                onChangeText={(text) => updateDrop("street", text)}
                placeholder="e.g., Main Street, MG Road"
              />
              <Input
                label="City"
                value={drop.city}
                onChangeText={(text) => updateDrop("city", text)}
                placeholder="Enter city"
                editable={!!drop.address}
              />
              <Input
                label="State"
                value={drop.state}
                onChangeText={(text) => updateDrop("state", text)}
                placeholder="Enter state"
                editable={!!drop.address}
              />
              <Input
                label="PIN Code"
                value={drop.pincode}
                onChangeText={(text) => updateDrop("pincode", text)}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                editable={!!drop.address}
              />
              <Input
                label="Landmark (Optional)"
                value={drop.landmark || ""}
                onChangeText={(text) => updateDrop("landmark", text)}
                placeholder="Near landmark"
              />
            </Card>

            <Card>
              <Text style={styles.sectionTitle}>Parcel Details</Text>
              <Input
                label="Parcel Type"
                value={parcelDetails.type}
                onChangeText={(text) =>
                  setParcelDetails((prev) => ({ ...prev, type: text }))
                }
                placeholder="e.g., Document, Package, Electronics"
              />
              <Input
                label="Weight (kg)"
                value={parcelDetails.weight?.toString() || ""}
                onChangeText={(text) =>
                  setParcelDetails((prev) => ({
                    ...prev,
                    weight: parseFloat(text) || 0,
                  }))
                }
                placeholder="0.5"
                keyboardType="decimal-pad"
              />
              <Input
                label="Description (Optional)"
                value={parcelDetails.description || ""}
                onChangeText={(text) =>
                  setParcelDetails((prev) => ({ ...prev, description: text }))
                }
                placeholder="Additional details about the parcel"
                multiline
                numberOfLines={3}
              />
              <Input
                label="Declared Value (Optional)"
                value={parcelDetails.value?.toString() || ""}
                onChangeText={(text) =>
                  setParcelDetails((prev) => ({
                    ...prev,
                    value: parseFloat(text) || 0,
                  }))
                }
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </Card>

            {/* Fare Display Card */}
            {fareCalculation && (
              <Card style={styles.fareCard}>
                <Text style={styles.sectionTitle}>Estimated Fare</Text>
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Distance:</Text>
                  <Text style={styles.fareValue}>{fareCalculation.distanceInKm} km</Text>
                </View>
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Base Fare:</Text>
                  <Text style={styles.fareValue}>₹{fareCalculation.baseFare}</Text>
                </View>
                {fareCalculation.gst > 0 && (
                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>GST:</Text>
                    <Text style={styles.fareValue}>₹{fareCalculation.gst}</Text>
                  </View>
                )}
                <View style={[styles.fareRow, styles.totalFareRow]}>
                  <Text style={styles.totalFareLabel}>Total Fare:</Text>
                  <Text style={styles.totalFareValue}>₹{fareCalculation.totalFare}</Text>
                </View>
                {loadingFare && (
                  <ActivityIndicator size="small" color={colors.primary} style={styles.fareLoading} />
                )}
              </Card>
            )}

            {/* Payment Method Selection */}
            {fareCalculation && (
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
              title="Create Booking"
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
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  keyboardView: {
    flex: 1,
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
  autocompleteContainer: {
    position: "relative",
    zIndex: 10,
  },
  suggestionsList: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.text,
  },
  loadingContainer: {
    padding: 12,
    alignItems: "center",
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
  fareLabel: {
    fontSize: 14,
    color: colors.text,
  },
  fareValue: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  totalFareRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalFareLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  totalFareValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  fareLoading: {
    marginTop: 8,
  },
  paymentMethodContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
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
    backgroundColor: `${colors.primary}15`, // 15% opacity
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  paymentMethodTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 32,
  },
});
