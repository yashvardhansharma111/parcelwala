

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
  Modal,
  Pressable,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
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
import { validateCoupon } from "../../../services/couponService";
import { mapApi } from "../../../services/apiClient";

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
    finalFare?: number;
    discountAmount?: number;
    couponApplied?: {
      code: string;
      discountAmount: number;
    };
  } | null>(null);
  const [loadingFare, setLoadingFare] = useState(false);
  
  // Coupon code state
  const [couponCode, setCouponCode] = useState("");
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  
  // Weight validation state
  const [weightError, setWeightError] = useState<string | null>(null);

  const [pickup, setPickup] = useState<Address>({
    name: "",
    phone: user?.phoneNumber || "",
    houseNumber: "",
    street: "",
    address: "",
    city: "Ratlam", // Default city
    state: "MP", // Default state
    pincode: "",
    landmark: "",
  });

  const [drop, setDrop] = useState<Address>({
    name: "",
    phone: "",
    houseNumber: "",
    street: "",
    address: "",
    city: "Ratlam", // Default city
    state: "MP", // Default state
    pincode: "",
    landmark: "",
  });

  const [parcelDetails, setParcelDetails] = useState<ParcelDetails>({
    type: "",
    weight: 0,
    description: "",
    value: 0,
  });

  // Track if address was selected from suggestions (mandatory)
  const [pickupAddressSelected, setPickupAddressSelected] = useState(false);
  const [dropAddressSelected, setDropAddressSelected] = useState(false);

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");

  // Delivery type state
  const [deliveryType, setDeliveryType] = useState<"sameDay" | "later">("sameDay");
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Parcel type dropdown state
  const [showParcelTypeModal, setShowParcelTypeModal] = useState(false);
  const parcelTypes = ["Document", "Package", "Electronics", "Fragile", "Other"];

  // City dropdown state
  const [showPickupCityDropdown, setShowPickupCityDropdown] = useState(false);
  const [showDropCityDropdown, setShowDropCityDropdown] = useState(false);
  // Default cities - will be replaced by API data if available
  const defaultCities = [
    { id: "1", name: "Ratlam", state: "MP" },
    { id: "2", name: "Jaora", state: "MP" },
  ];
  const [cities, setCities] = useState<Array<{ id: string; name: string; state?: string }>>(defaultCities);
  const [loadingCities, setLoadingCities] = useState(false);

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
    // Update address state directly - always allow typing
    setPickup((prev) => ({ ...prev, address: text }));
    // Reset selected flag if user is typing manually
    if (pickupAddressSelected) {
      setPickupAddressSelected(false);
    }
    // Hide suggestions if text is cleared
    if (text.trim().length === 0) {
      setShowPickupSuggestions(false);
    } else if (text.trim().length >= 3) {
      // Only show suggestions if user types 3+ characters
      debouncedPickupSearch(text);
    } else {
      // Hide suggestions if less than 3 characters
      setShowPickupSuggestions(false);
    }
  };

  // Handle drop address input change
  const handleDropAddressChange = (text: string) => {
    setDropSearchQuery(text);
    // Update address state directly - always allow typing
    setDrop((prev) => ({ ...prev, address: text }));
    // Reset selected flag if user is typing manually
    if (dropAddressSelected) {
      setDropAddressSelected(false);
    }
    // Hide suggestions if text is cleared
    if (text.trim().length === 0) {
      setShowDropSuggestions(false);
    } else if (text.trim().length >= 3) {
      // Only show suggestions if user types 3+ characters
      debouncedDropSearch(text);
    } else {
      // Hide suggestions if less than 3 characters
      setShowDropSuggestions(false);
    }
  };

  // Dismiss pickup suggestions
  const dismissPickupSuggestions = () => {
    setShowPickupSuggestions(false);
  };

  // Dismiss drop suggestions
  const dismissDropSuggestions = () => {
    setShowDropSuggestions(false);
  };

  // Handle pickup suggestion selection
  const handlePickupSuggestionSelect = async (suggestion: AddressSuggestion) => {
    try {
      setLoadingSuggestions(true);
      setShowPickupSuggestions(false); // Hide suggestions immediately
      
      console.log("[Pickup] Selected suggestion:", suggestion.displayName);
      
      // Fill address fields from suggestion
      setPickup((prev) => ({
        ...prev,
        address: suggestion.displayName,
        city: suggestion.address?.city || "Ratlam",
        state: suggestion.address?.state || "MP",
        pincode: suggestion.address?.postcode || prev.pincode,
        // Don't auto-fill houseNumber with name
        houseNumber: prev.houseNumber || "",
      }));

      // Store coordinates for fare calculation
      setPickupCoordinates(suggestion.coordinates);
      setPickupAddressSelected(true); // Mark as selected
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
      
      // Fill address fields from suggestion
      setDrop((prev) => ({
        ...prev,
        address: suggestion.displayName,
        city: suggestion.address?.city || "Ratlam",
        state: suggestion.address?.state || "MP",
        pincode: suggestion.address?.postcode || prev.pincode,
        // Don't auto-fill houseNumber with name
        houseNumber: prev.houseNumber || "",
      }));

      // Store coordinates for fare calculation
      setDropCoordinates(suggestion.coordinates);
      setDropAddressSelected(true); // Mark as selected
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
      // Check if we have required fields for fare calculation
      const hasPickupPincode = pickup.pincode && pickup.pincode.length === 6;
      const hasDropPincode = drop.pincode && drop.pincode.length === 6;
      const hasPickupCity = pickup.city && pickup.city.trim().length > 0;
      const hasDropCity = drop.city && drop.city.trim().length > 0;
      const hasWeight = parcelDetails.weight && parcelDetails.weight > 0 && parcelDetails.weight <= 5;
      
      console.log("[Fare] Calculation check:", {
        hasWeight,
        hasPickupCity,
        hasDropCity,
        pickupCity: pickup.city,
        dropCity: drop.city,
        weight: parcelDetails.weight,
        hasPickupPincode,
        hasDropPincode,
        hasCoordinates: !!(pickupCoordinates && dropCoordinates),
      });
      
      // Need at least weight and both cities to calculate fare
      // Also check weight doesn't exceed 5 kg
      if (!hasWeight || !hasPickupCity || !hasDropCity || parcelDetails.weight > 5) {
        if (parcelDetails.weight > 5) {
          setWeightError("Maximum weight allowed is 5 kg");
        }
        console.log("[Fare] Missing required fields or weight exceeds limit, clearing fare");
        setFareCalculation(null);
        return;
      }

      // Default coordinates (Ratlam approximate) - will be used if coordinates not available
      const defaultCoords = { lat: 23.3308, lon: 75.0403 };
      
      setLoadingFare(true);
      try {
        console.log("[Fare] Calculating fare with:", {
          pickupCoords: pickupCoordinates || defaultCoords,
          dropCoords: dropCoordinates || defaultCoords,
          weight: parcelDetails.weight,
          pickupPincode: hasPickupPincode ? pickup.pincode : undefined,
          dropPincode: hasDropPincode ? drop.pincode : undefined,
          couponCode: couponCode.trim() || undefined,
          pickupCity: pickup.city,
          dropCity: drop.city,
        });
        
        // Use coordinates if available, otherwise use default coordinates
        // The backend will use cities and pincodes for accurate calculation
        const fare = await calculateFare(
          pickupCoordinates || defaultCoords,
          dropCoordinates || defaultCoords,
          parcelDetails.weight,
          hasPickupPincode ? pickup.pincode : undefined,
          hasDropPincode ? drop.pincode : undefined,
          couponCode.trim() || undefined,
          pickup.city,
          drop.city
        );
        
        console.log("[Fare] Calculation result:", fare);
        setFareCalculation(fare);
      } catch (error: any) {
        console.error("[Fare] Error calculating fare:", error);
        console.error("[Fare] Error details:", error.message, error.stack);
        setFareCalculation(null);
      } finally {
        setLoadingFare(false);
      }
    };

    calculateFareAsync();
  }, [pickupCoordinates, dropCoordinates, parcelDetails.weight, pickup.pincode, drop.pincode, couponCode, pickup.city, drop.city]);

  // Load cities function
  const loadCities = useCallback(async () => {
    try {
      setLoadingCities(true);
      console.log("[Cities] Fetching cities from API...");
      const response = await mapApi.getCities();
      console.log("[Cities] API response:", response);
      
      // The API returns { cities: [...] } after apiRequest unwraps the data
      const citiesList = response?.cities || [];
      
      // If cities are loaded from API, use them; otherwise keep defaults
      if (Array.isArray(citiesList) && citiesList.length > 0) {
        // Filter out any invalid cities and ensure all have required fields
        // Also filter to only show active cities
        const validCities = citiesList
          .filter(
            (city: any) => 
              city && 
              typeof city.name === "string" && 
              city.name.trim().length > 0 &&
              (city.isActive !== false) // Only show active cities
          )
          .map((city: any) => ({
            id: city.id || city.name,
            name: city.name.trim(),
            state: city.state || "MP",
          }));
        
        if (validCities.length > 0) {
          console.log("[Cities] Loaded", validCities.length, "cities from API:", validCities.map(c => c.name));
          setCities(validCities);
        } else {
          console.log("[Cities] No valid cities found, using defaults");
          setCities(defaultCities);
        }
      } else {
        console.log("[Cities] API returned empty cities list, using defaults");
        // Keep default cities if API returns empty
        setCities(defaultCities);
      }
    } catch (error: any) {
      console.error("[Cities] Error loading cities:", error);
      console.error("[Cities] Error details:", error.message, error.stack);
      // Fallback to default cities if API fails
      setCities(defaultCities);
    } finally {
      setLoadingCities(false);
    }
  }, []);

  // Load cities on mount and when screen comes into focus
  useEffect(() => {
    loadCities();
  }, [loadCities]);

  // Refresh cities when screen comes into focus (so new cities added by admin appear)
  useFocusEffect(
    useCallback(() => {
      loadCities();
    }, [loadCities])
  );

  const updatePickup = (field: keyof Address, value: string) => {
    setPickup((prev) => ({ ...prev, [field]: value }));
    // If address is manually changed, reset the selected flag
    if (field === "address" && pickupAddressSelected) {
      setPickupAddressSelected(false);
    }
  };

  const updateDrop = (field: keyof Address, value: string) => {
    setDrop((prev) => ({ ...prev, [field]: value }));
    // If address is manually changed, reset the selected flag
    if (field === "address" && dropAddressSelected) {
      setDropAddressSelected(false);
    }
  };

  const handleSubmit = async () => {
    // Validate addresses - allow both selected suggestions and custom addresses
    // If pincode is available, we can calculate fare by pincode
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

    // Validate weight limit (max 5 kg)
    if (parcelDetails.weight > 5) {
      Alert.alert("Validation Error", "Maximum weight allowed is 5 kg. Please reduce the parcel weight.");
      setWeightError("Maximum weight allowed is 5 kg");
      return;
    }

    if (!fareCalculation || !fareCalculation.totalFare) {
      Alert.alert("Validation Error", "Please wait for fare calculation");
      return;
    }

    // Validate delivery date if scheduled later
    if (deliveryType === "later" && !deliveryDate) {
      Alert.alert("Validation Error", "Please select a delivery date");
      return;
    }

    try {
      if (paymentMethod === "cod") {
        // Cash on Delivery - create booking immediately
        const booking = await createBooking({
          pickup,
          drop,
          parcelDetails,
          fare: fareCalculation.finalFare || fareCalculation.totalFare,
          paymentMethod,
          couponCode: fareCalculation.couponApplied?.code || undefined,
          deliveryType,
          deliveryDate: deliveryType === "later" && deliveryDate ? deliveryDate.toISOString() : undefined,
        });

        Alert.alert("Success", "Booking created successfully! Pay on delivery.", [
          {
            text: "OK",
            onPress: () => router.push("/(customer)/booking/history"),
          },
        ]);
      } else {
        // Online payment - don't create booking yet, pass data to payment screen
        // Booking will be created only after payment is successful
        const bookingData = {
          pickup,
          drop,
          parcelDetails,
          fare: fareCalculation.finalFare || fareCalculation.totalFare,
          couponCode: fareCalculation.couponApplied?.code || undefined,
          deliveryType,
          deliveryDate: deliveryType === "later" && deliveryDate ? deliveryDate.toISOString() : undefined,
        };

        // Navigate to payment screen with booking data
        router.push({
          pathname: "/(customer)/payment",
          params: {
            bookingData: JSON.stringify(bookingData),
          },
        });
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create booking");
    }
  };

  return (
    <Pressable 
      style={styles.container}
      onPress={() => {
        // Close dropdowns when clicking outside
        setShowPickupCityDropdown(false);
        setShowDropCityDropdown(false);
      }}
    >
      <Header title="New Booking" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
          scrollEventThrottle={16}
          nestedScrollEnabled={true}
        >
          <View style={styles.content}>
            <Card>
              <Text style={styles.sectionTitle}>Pickup Address</Text>
              <View style={styles.autocompleteContainer}>
                <Input
                  label="Address (Type to search or enter custom address)"
                  value={pickup.address}
                  onChangeText={handlePickupAddressChange}
                  placeholder="Type address to search or enter manually..."
                  multiline
                  numberOfLines={2}
                  editable={true}
                />
                {showPickupSuggestions && pickupSuggestions.length > 0 && (
                  <View style={styles.suggestionsListContainer}>
                    <View style={styles.suggestionsHeader}>
                      <Text style={styles.suggestionsHeaderText}>Select from suggestions (optional)</Text>
                      <TouchableOpacity onPress={dismissPickupSuggestions} style={styles.closeButton}>
                        <Feather name="x" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    {loadingSuggestions ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    ) : (
                      <ScrollView
                        style={styles.suggestionsList}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                        scrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        removeClippedSubviews={true}
                        scrollEventThrottle={16}
                        contentContainerStyle={{ paddingBottom: 8 }}
                      >
                        {pickupSuggestions.map((item, index) => (
                          <TouchableOpacity
                            key={`pickup-${item.displayName}-${index}`}
                            style={styles.suggestionItem}
                            onPress={() => handlePickupSuggestionSelect(item)}
                          >
                            <Text style={styles.suggestionText} numberOfLines={2}>
                              {item.displayName}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
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
              <View style={styles.dropdownContainer}>
                <Text style={styles.label}>City *</Text>
                <View style={styles.dropdownWrapper}>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => {
                      setShowPickupCityDropdown(!showPickupCityDropdown);
                      setShowDropCityDropdown(false); // Close other dropdown
                    }}
                  >
                    <Text style={[styles.dropdownText, !pickup.city && styles.placeholderText]}>
                      {pickup.city || "Select city"}
                    </Text>
                    <Feather 
                      name={showPickupCityDropdown ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                  {showPickupCityDropdown && (
                    <View style={styles.dropdownList}>
                      <ScrollView 
                        nestedScrollEnabled={true} 
                        style={{ maxHeight: 200 }}
                        showsVerticalScrollIndicator={true}
                        removeClippedSubviews={true}
                        scrollEventThrottle={16}
                        keyboardShouldPersistTaps="handled"
                      >
                        {loadingCities ? (
                          <View style={styles.dropdownLoading}>
                            <ActivityIndicator size="small" color={colors.primary} />
                          </View>
                        ) : cities && cities.length > 0 ? (
                          cities.map((city) => {
                            if (!city || !city.name) return null;
                            return (
                              <TouchableOpacity
                                key={city.id || city.name}
                                style={[
                                  styles.dropdownOption,
                                  pickup.city === city.name && styles.dropdownOptionSelected,
                                ]}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  updatePickup("city", city.name);
                                  setShowPickupCityDropdown(false);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.dropdownOptionText,
                                    pickup.city === city.name && styles.dropdownOptionTextSelected,
                                  ]}
                                >
                                  {city.name || ""}
                                </Text>
                                {pickup.city === city.name && (
                                  <Feather name="check" size={16} color={colors.primary} />
                                )}
                              </TouchableOpacity>
                            );
                          })
                        ) : (
                          <View style={styles.dropdownLoading}>
                            <Text style={styles.dropdownOptionText}>No cities available</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
              <Input
                label="State"
                value={pickup.state}
                onChangeText={(text) => updatePickup("state", text)}
                placeholder="Enter state"
                editable={true}
              />
              <Input
                label="PIN Code"
                value={pickup.pincode}
                onChangeText={(text) => updatePickup("pincode", text)}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                editable={true}
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
                  label="Address (Type to search or enter custom address)"
                  value={drop.address}
                  onChangeText={handleDropAddressChange}
                  placeholder="Type address to search or enter manually..."
                  multiline
                  numberOfLines={2}
                  editable={true}
                />
                {showDropSuggestions && dropSuggestions.length > 0 && (
                  <View style={styles.suggestionsListContainer}>
                    <View style={styles.suggestionsHeader}>
                      <Text style={styles.suggestionsHeaderText}>Select from suggestions (optional)</Text>
                      <TouchableOpacity onPress={dismissDropSuggestions} style={styles.closeButton}>
                        <Feather name="x" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    {loadingSuggestions ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    ) : (
                      <ScrollView
                        style={styles.suggestionsList}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                        scrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        removeClippedSubviews={true}
                        scrollEventThrottle={16}
                        contentContainerStyle={{ paddingBottom: 8 }}
                      >
                        {dropSuggestions.map((item, index) => (
                          <TouchableOpacity
                            key={`drop-${item.displayName}-${index}`}
                            style={styles.suggestionItem}
                            onPress={() => handleDropSuggestionSelect(item)}
                          >
                            <Text style={styles.suggestionText} numberOfLines={2}>
                              {item.displayName}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
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
              <View style={styles.dropdownContainer}>
                <Text style={styles.label}>City *</Text>
                <View style={styles.dropdownWrapper}>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      setShowDropCityDropdown(!showDropCityDropdown);
                      setShowPickupCityDropdown(false); // Close other dropdown
                    }}
                  >
                    <Text style={[styles.dropdownText, !drop.city && styles.placeholderText]}>
                      {drop.city || "Select city"}
                    </Text>
                    <Feather 
                      name={showDropCityDropdown ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                  {showDropCityDropdown && (
                    <View style={styles.dropdownList}>
                      <ScrollView 
                        nestedScrollEnabled={true} 
                        style={{ maxHeight: 200 }}
                        showsVerticalScrollIndicator={true}
                        removeClippedSubviews={true}
                        scrollEventThrottle={16}
                        keyboardShouldPersistTaps="handled"
                      >
                        {loadingCities ? (
                          <View style={styles.dropdownLoading}>
                            <ActivityIndicator size="small" color={colors.primary} />
                          </View>
                        ) : cities && cities.length > 0 ? (
                          cities.map((city) => {
                            if (!city || !city.name) return null;
                            return (
                              <TouchableOpacity
                                key={city.id || city.name}
                                style={[
                                  styles.dropdownOption,
                                  drop.city === city.name && styles.dropdownOptionSelected,
                                ]}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  updateDrop("city", city.name);
                                  setShowDropCityDropdown(false);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.dropdownOptionText,
                                    drop.city === city.name && styles.dropdownOptionTextSelected,
                                  ]}
                                >
                                  {city.name || ""}
                                </Text>
                                {drop.city === city.name && (
                                  <Feather name="check" size={16} color={colors.primary} />
                                )}
                              </TouchableOpacity>
                            );
                          })
                        ) : (
                          <View style={styles.dropdownLoading}>
                            <Text style={styles.dropdownOptionText}>No cities available</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
              <Input
                label="State"
                value={drop.state}
                onChangeText={(text) => updateDrop("state", text)}
                placeholder="Enter state"
                editable={true}
              />
              <Input
                label="PIN Code"
                value={drop.pincode}
                onChangeText={(text) => updateDrop("pincode", text)}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                editable={true}
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
              <View style={styles.container}>
                <Text style={styles.label}>Parcel Type *</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowParcelTypeModal(true)}
                >
                  <Text style={[styles.dropdownText, !parcelDetails.type && styles.placeholderText]}>
                    {parcelDetails.type || "Select parcel type"}
                  </Text>
                  <Feather name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Modal
                visible={showParcelTypeModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowParcelTypeModal(false)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowParcelTypeModal(false)}
                >
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Select Parcel Type</Text>
                    {parcelTypes.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={styles.modalOption}
                        onPress={() => {
                          setParcelDetails((prev) => ({ ...prev, type }));
                          setShowParcelTypeModal(false);
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
              <Input
                label="Weight (kg) - Max 5 kg"
                value={parcelDetails.weight?.toString() || ""}
                onChangeText={(text) => {
                  const weight = parseFloat(text) || 0;
                  setParcelDetails((prev) => ({
                    ...prev,
                    weight: weight,
                  }));
                  
                  // Validate weight in real-time
                  if (weight > 5) {
                    setWeightError("Maximum weight allowed is 5 kg");
                  } else if (weight <= 0 && text.trim() !== "") {
                    setWeightError("Weight must be greater than 0");
                  } else {
                    setWeightError(null);
                  }
                }}
                placeholder="0.5"
                keyboardType="decimal-pad"
                error={weightError || undefined}
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
                  <Text style={styles.fareValue}>
                    {fareCalculation.distanceInKm != null ? `${fareCalculation.distanceInKm} km` : "0 km"}
                  </Text>
                </View>
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Base Fare:</Text>
                  <Text style={styles.fareValue}>
                    ₹{fareCalculation.baseFare != null ? fareCalculation.baseFare : 0}
                  </Text>
                </View>
                {fareCalculation.gst != null && fareCalculation.gst > 0 && (
                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>GST:</Text>
                    <Text style={styles.fareValue}>₹{fareCalculation.gst}</Text>
                  </View>
                )}
                {fareCalculation.discountAmount != null && fareCalculation.discountAmount > 0 && (
                  <View style={styles.fareRow}>
                    <Text style={[styles.fareLabel, { color: colors.success }]}>
                      Discount{fareCalculation.couponApplied?.code ? ` (${fareCalculation.couponApplied.code})` : ""}:
                    </Text>
                    <Text style={[styles.fareValue, { color: colors.success, fontWeight: "600" }]}>
                      -₹{fareCalculation.discountAmount}
                    </Text>
                  </View>
                )}
                <View style={[styles.fareRow, styles.totalFareRow]}>
                  <Text style={styles.totalFareLabel}>Total Fare:</Text>
                  <Text style={styles.totalFareValue}>
                    ₹{fareCalculation.finalFare != null ? fareCalculation.finalFare : (fareCalculation.totalFare != null ? fareCalculation.totalFare : 0)}
                  </Text>
                </View>
                {loadingFare && (
                  <ActivityIndicator size="small" color={colors.primary} style={styles.fareLoading} />
                )}
              </Card>
            )}

            {/* Coupon Code Section */}
            {fareCalculation && (
              <Card>
                <Text style={styles.sectionTitle}>Coupon Code (Optional)</Text>
                <View style={styles.couponContainer}>
                  <Input
                    label="Enter Coupon Code"
                    value={couponCode}
                    onChangeText={(text) => {
                      setCouponCode(text.toUpperCase());
                      setCouponError(null);
                    }}
                    placeholder="COUPON123"
                    autoCapitalize="characters"
                    editable={!couponValidating}
                  />
                  {couponError && (
                    <Text style={styles.couponError}>{couponError}</Text>
                  )}
                  {fareCalculation.couponApplied && (
                    <View style={styles.couponApplied}>
                      <Feather name="check-circle" size={16} color={colors.success} />
                      <Text style={styles.couponAppliedText}>
                        Coupon {fareCalculation.couponApplied?.code || ""} applied! 
                        Save ₹{fareCalculation.discountAmount != null ? fareCalculation.discountAmount : 0}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.applyCouponButton}
                    onPress={async () => {
                      if (!couponCode.trim()) {
                        setCouponError("Please enter a coupon code");
                        return;
                      }
                      if (!fareCalculation || !fareCalculation.totalFare) {
                        setCouponError("Please wait for fare calculation");
                        return;
                      }
                      setCouponValidating(true);
                      setCouponError(null);
                      try {
                        // Recalculate fare with coupon code
                        const hasPickupPincode = pickup.pincode && pickup.pincode.length === 6;
                        const hasDropPincode = drop.pincode && drop.pincode.length === 6;
                        
                        let fare;
                        if (hasPickupPincode && hasDropPincode && pickup.pincode === drop.pincode) {
                          fare = await calculateFare(
                            pickupCoordinates || { lat: 23.3308, lon: 75.0403 },
                            dropCoordinates || { lat: 23.3308, lon: 75.0403 },
                            parcelDetails.weight,
                            pickup.pincode,
                            drop.pincode,
                            couponCode.trim()
                          );
                        } else if (pickupCoordinates && dropCoordinates) {
                          fare = await calculateFare(
                            pickupCoordinates,
                            dropCoordinates,
                            parcelDetails.weight,
                            pickup.pincode || undefined,
                            drop.pincode || undefined,
                            couponCode.trim()
                          );
                        } else {
                          setCouponError("Please complete address details first");
                          return;
                        }
                        
                        if (fare.couponApplied) {
                          setFareCalculation(fare);
                          setCouponError(null);
                        } else {
                          setCouponError("Invalid or expired coupon code");
                          // Reset fare calculation to original
                          const originalFare = await calculateFare(
                            pickupCoordinates || { lat: 23.3308, lon: 75.0403 },
                            dropCoordinates || { lat: 23.3308, lon: 75.0403 },
                            parcelDetails.weight,
                            pickup.pincode,
                            drop.pincode
                          );
                          setFareCalculation(originalFare);
                        }
                      } catch (error: any) {
                        setCouponError(error.message || "Failed to validate coupon");
                      } finally {
                        setCouponValidating(false);
                      }
                    }}
                    disabled={couponValidating || !couponCode.trim()}
                  >
                    {couponValidating ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={styles.applyCouponButtonText}>Apply Coupon</Text>
                    )}
                  </TouchableOpacity>
                  {fareCalculation.couponApplied && (
                    <TouchableOpacity
                      style={styles.removeCouponButton}
                      onPress={async () => {
                        setCouponCode("");
                        setCouponError(null);
                        // Recalculate fare without coupon
                        const hasPickupPincode = pickup.pincode && pickup.pincode.length === 6;
                        const hasDropPincode = drop.pincode && drop.pincode.length === 6;
                        
                        let fare;
                        if (hasPickupPincode && hasDropPincode && pickup.pincode === drop.pincode) {
                          fare = await calculateFare(
                            pickupCoordinates || { lat: 23.3308, lon: 75.0403 },
                            dropCoordinates || { lat: 23.3308, lon: 75.0403 },
                            parcelDetails.weight,
                            pickup.pincode,
                            drop.pincode,
                            undefined,
                            pickup.city,
                            drop.city
                          );
                        } else if (pickupCoordinates && dropCoordinates) {
                          fare = await calculateFare(
                            pickupCoordinates,
                            dropCoordinates,
                            parcelDetails.weight,
                            pickup.pincode || undefined,
                            drop.pincode || undefined,
                            undefined,
                            pickup.city,
                            drop.city
                          );
                        }
                        if (fare) {
                          setFareCalculation(fare);
                        }
                      }}
                    >
                      <Text style={styles.removeCouponButtonText}>Remove Coupon</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            )}

            {/* Delivery Date Selection */}
            {fareCalculation && (
              <Card>
                <Text style={styles.sectionTitle}>Delivery Option</Text>
                <View style={styles.deliveryOptionContainer}>
                  <TouchableOpacity
                    style={[
                      styles.deliveryOption,
                      deliveryType === "sameDay" && styles.deliveryOptionSelected,
                    ]}
                    onPress={() => {
                      setDeliveryType("sameDay");
                      setDeliveryDate(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.deliveryOptionText,
                        deliveryType === "sameDay" && styles.deliveryOptionTextSelected,
                      ]}
                    >
                      Same Day Delivery
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.deliveryOption,
                      deliveryType === "later" && styles.deliveryOptionSelected,
                    ]}
                    onPress={() => setDeliveryType("later")}
                  >
                    <Text
                      style={[
                        styles.deliveryOptionText,
                        deliveryType === "later" && styles.deliveryOptionTextSelected,
                      ]}
                    >
                      Schedule Later
                    </Text>
                  </TouchableOpacity>
                </View>
                {deliveryType === "later" && (
                  <View style={styles.datePickerContainer}>
                    <Text style={styles.label}>Select Delivery Date</Text>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={styles.datePickerText}>
                        {deliveryDate
                          ? new Date(deliveryDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "Select date"}
                      </Text>
                      <Feather name="calendar" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}
                {showDatePicker && (
                  <Modal
                    visible={showDatePicker}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowDatePicker(false)}
                  >
                    <View style={styles.modalOverlay}>
                      <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Delivery Date</Text>
                        <View style={styles.dateInputContainer}>
                          <Input
                            label="Date"
                            value={
                              deliveryDate
                                ? new Date(deliveryDate).toISOString().split("T")[0]
                                : ""
                            }
                            onChangeText={(text) => {
                              if (text) {
                                const date = new Date(text);
                                if (!isNaN(date.getTime())) {
                                  setDeliveryDate(date);
                                }
                              }
                            }}
                            placeholder="YYYY-MM-DD"
                            keyboardType="default"
                          />
                          <Text style={styles.dateHint}>
                            Format: YYYY-MM-DD (e.g., 2024-12-25)
                          </Text>
                        </View>
                        <View style={styles.modalButtons}>
                          <TouchableOpacity
                            style={[styles.modalButton, styles.modalButtonCancel]}
                            onPress={() => {
                              setShowDatePicker(false);
                            }}
                          >
                            <Text style={styles.modalButtonText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.modalButton, styles.modalButtonConfirm]}
                            onPress={() => {
                              if (!deliveryDate) {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                setDeliveryDate(tomorrow);
                              }
                              setShowDatePicker(false);
                            }}
                          >
                            <Text style={[styles.modalButtonText, { color: colors.primary }]}>
                              Confirm
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Modal>
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
    </Pressable>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
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
    marginBottom: 8,
  },
  suggestionsListContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
    marginBottom: 16,
    maxHeight: 200,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  suggestionsHeaderText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  closeButton: {
    padding: 4,
  },
  suggestionsList: {
    maxHeight: 160,
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
  deliveryOptionContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  deliveryOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  deliveryOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  deliveryOptionTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  datePickerContainer: {
    marginTop: 16,
  },
  datePickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    marginTop: 8,
  },
  datePickerText: {
    fontSize: 16,
    color: colors.text,
  },
  dateInputContainer: {
    marginTop: 16,
  },
  dateHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: "italic",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: colors.border,
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary + "15",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 32,
  },
  readOnlyInput: {
    backgroundColor: colors.border + "40",
    opacity: 0.7,
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdownWrapper: {
    position: "relative",
    zIndex: 1,
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
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  placeholderText: {
    color: colors.textLight,
  },
  dropdownList: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownLoading: {
    padding: 16,
    alignItems: "center",
  },
  dropdownOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownOptionSelected: {
    backgroundColor: colors.primary + "10",
  },
  dropdownOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  dropdownOptionTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "50%",
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
  modalOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 8,
  },
  couponContainer: {
    gap: 12,
  },
  couponError: {
    fontSize: 12,
    color: colors.error,
    marginTop: -8,
  },
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
  couponAppliedText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: "500",
  },
  applyCouponButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  applyCouponButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "600",
  },
  removeCouponButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  removeCouponButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: "500",
  },
});
