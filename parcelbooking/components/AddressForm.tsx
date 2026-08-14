/**
 * Address form with dynamic autocomplete, city list, and GPS "use current location"
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Input } from "./Input";
import { Card } from "./Card";
import { colors } from "../theme/colors";
import { Address } from "../utils/types";
import {
  getAutocompleteSuggestions,
  getAddressDetails,
  searchIndiaCities,
  resolvePlaceDetails,
  debounce,
  AddressSuggestion,
} from "../services/addressService";
import { Coords } from "../store/bookingDraftStore";

export type City = {
  id: string;
  name: string;
  state?: string;
  lat?: number;
  lon?: number;
};

interface AddressFormProps {
  sectionTitle: string;
  initial: Address;
  initialCoords: Coords | null;
  /** Optional admin city list — India search works without it */
  cities?: City[];
  loadingCities?: boolean;
  onChange: (address: Address, coords: Coords | null) => void;
  enableCurrentLocation?: boolean;
}

const formatPhone = (text: string): string => {
  const cleaned = text.replace(/\D/g, "");
  if (cleaned.length === 0) return text;
  if (text.startsWith("+91")) return text;
  if (cleaned.length <= 10) return `+91 ${cleaned}`;
  if (cleaned.startsWith("91")) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7, 12)}`;
  }
  return text;
};

const AddressFormInner = function AddressForm({
  sectionTitle,
  initial,
  initialCoords,
  cities = [],
  onChange,
  enableCurrentLocation = false,
}: AddressFormProps) {
  const [addr, setAddr] = useState<Address>(initial);
  const [coords, setCoords] = useState<Coords | null>(initialCoords);
  const [addressInput, setAddressInput] = useState(initial.address || "");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [cityQuery, setCityQuery] = useState(initial.city || "");
  const [citySuggestions, setCitySuggestions] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [locating, setLocating] = useState(false);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const cityRef = useRef(addr.city);
  cityRef.current = addr.city;

  useEffect(() => {
    onChangeRef.current(addr, coords);
  }, [addr, coords]);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string, city?: string) => {
        if (query.trim().length < 3) {
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }
        setLoadingSuggestions(true);
        try {
          const result = await getAutocompleteSuggestions(query, 8, city);
          setSuggestions(result);
          setShowSuggestions(true);
        } catch (error) {
          console.error("Error fetching suggestions:", error);
        } finally {
          setLoadingSuggestions(false);
        }
      }, 500),
    []
  );

  const debouncedCitySearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (query.trim().length < 2) {
          setCitySuggestions([]);
          setLoadingCities(false);
          return;
        }
        setLoadingCities(true);
        try {
          const list = await searchIndiaCities(query, 12);
          setCitySuggestions(
            list.map((c) => ({
              id: c.id,
              name: c.name,
              state: c.state,
              lat: c.lat,
              lon: c.lon,
            }))
          );
        } catch (error) {
          console.error("Error searching cities:", error);
          setCitySuggestions([]);
        } finally {
          setLoadingCities(false);
        }
      }, 400),
    []
  );

  const handleAddressChange = (text: string) => {
    setAddressInput(text);
    setAddr((prev) => ({ ...prev, address: text }));
    // Manual edit invalidates previous pin — must re-select or use GPS
    setCoords(null);
    if (text.trim().length === 0) {
      setShowSuggestions(false);
    } else if (text.trim().length >= 3) {
      debouncedSearch(text, cityRef.current);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = async (s: AddressSuggestion) => {
    setShowSuggestions(false);
    setAddressInput(s.displayName);

    let resolved = s;
    if (s.placeId && !s.coordinates) {
      try {
        setLoadingSuggestions(true);
        resolved = await resolvePlaceDetails(s.placeId);
      } catch (e) {
        console.error("Place details failed:", e);
        Alert.alert(
          "Location",
          "Could not pin this address. Try another suggestion."
        );
        setLoadingSuggestions(false);
        return;
      } finally {
        setLoadingSuggestions(false);
      }
    }

    if (!resolved.coordinates) {
      Alert.alert(
        "Location",
        "No coordinates for this address. Try another suggestion."
      );
      return;
    }

    const matchedCity =
      cities.find(
        (c) =>
          c.name.toLowerCase() ===
            (resolved.address?.city || "").toLowerCase() ||
          (resolved.address?.city || "")
            .toLowerCase()
            .includes(c.name.toLowerCase())
      )?.name ||
      resolved.address?.city ||
      cityRef.current ||
      "";
    const matchedState =
      cities.find((c) => c.name === matchedCity)?.state ||
      resolved.address?.state ||
      "";

    setAddressInput(resolved.displayName);
    setAddr((prev) => ({
      ...prev,
      address: resolved.displayName,
      city: matchedCity,
      state: matchedState,
      pincode: resolved.address?.postcode || prev.pincode,
      street: resolved.address?.street || prev.street,
      houseNumber: resolved.address?.houseNumber || prev.houseNumber,
    }));
    if (matchedCity) setCityQuery(matchedCity);
    setCoords(resolved.coordinates);
  };

  const updateField = (field: keyof Address, value: string) => {
    setAddr((prev) => ({ ...prev, [field]: value }));
  };

  const selectCity = (city: City) => {
    setAddr((prev) => ({
      ...prev,
      city: city.name,
      state: city.state || prev.state || "",
    }));
    setCityQuery(city.name);
    setShowCityDropdown(false);
    setCitySuggestions([]);
    if (addressInput.trim().length >= 3) {
      debouncedSearch(addressInput, city.name);
    }
  };

  const handleCityQueryChange = (text: string) => {
    setCityQuery(text);
    setShowCityDropdown(true);
    if (addr.city && text.trim().toLowerCase() !== addr.city.toLowerCase()) {
      setAddr((prev) => ({ ...prev, city: "", state: "" }));
    }
    if (text.trim().length < 2) {
      setCitySuggestions([]);
      setLoadingCities(false);
      return;
    }
    setLoadingCities(true);
    debouncedCitySearch(text);
  };

  const useCurrentLocation = async () => {
    try {
      setLocating(true);
      let Location: typeof import("expo-location");
      try {
        Location = await import("expo-location");
      } catch {
        Alert.alert(
          "Rebuild required",
          "Location module is not in this app build. Stop Metro, then run:\n\nnpx expo run:android\n\nA JS reload is not enough after adding expo-location."
        );
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location permission",
          "Allow location access to fill your address automatically."
        );
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      const details = await getAddressDetails(latitude, longitude);

      const matched =
        cities.find(
          (c) =>
            c.name.toLowerCase() === (details.city || "").toLowerCase() ||
            (details.city || "").toLowerCase().includes(c.name.toLowerCase()) ||
            (details.address || "")
              .toLowerCase()
              .includes(c.name.toLowerCase())
        ) || null;

      if (cities.length > 0 && !matched) {
        Alert.alert(
          "Outside service area?",
          `Detected "${details.city || "unknown city"}". Pick a service city from the list, or continue if correct.`,
          [{ text: "OK" }]
        );
      }

      const nextAddress: Address = {
        ...addr,
        address: details.address || details.name || addr.address,
        city: matched?.name || details.city || addr.city,
        state: matched?.state || details.state || addr.state,
        pincode: details.pincode || addr.pincode,
        street: details.street || addr.street,
        houseNumber: details.houseNumber || addr.houseNumber,
        landmark: details.landmark || addr.landmark,
      };

      setAddressInput(nextAddress.address);
      setAddr(nextAddress);
      setCoords({ lat: latitude, lon: longitude });
      setShowSuggestions(false);
    } catch (e: any) {
      const msg = String(e?.message || e || "");
      if (msg.includes("ExpoLocation") || msg.includes("native module")) {
        Alert.alert(
          "Rebuild required",
          "Location native code is missing from this APK. Stop the app, then run:\n\nnpx expo run:android"
        );
      } else {
        Alert.alert(
          "Location error",
          e?.message ||
            "Could not get current location. Try again or search address."
        );
      }
    } finally {
      setLocating(false);
    }
  };

  return (
    <Card>
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>

      {enableCurrentLocation && (
        <TouchableOpacity
          style={styles.gpsButton}
          onPress={useCurrentLocation}
          disabled={locating}
          activeOpacity={0.7}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="navigation" size={18} color={colors.primary} />
          )}
          <Text style={styles.gpsButtonText}>
            {locating ? "Getting location…" : "Use current location"}
          </Text>
        </TouchableOpacity>
      )}

      {/* City first so autocomplete can bias to it — searchable */}
      <View style={styles.cityContainer}>
        <Text style={styles.label}>City *</Text>
        <View
          style={[
            styles.citySearchWrap,
            showCityDropdown && styles.cityButtonOpen,
          ]}
        >
          <Feather
            name="search"
            size={18}
            color={colors.textSecondary}
            style={styles.citySearchIcon}
          />
          <TextInput
            style={styles.citySearchInput}
            value={cityQuery}
            onChangeText={handleCityQueryChange}
            onFocus={() => setShowCityDropdown(true)}
            placeholder="Type city name (all India)…"
            placeholderTextColor={colors.textLight}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {loadingCities ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : cityQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                setCityQuery("");
                setAddr((prev) => ({ ...prev, city: "", state: "" }));
                setCitySuggestions([]);
                setShowCityDropdown(false);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {showCityDropdown && (
          <View style={styles.dropdownList}>
            {loadingCities && citySuggestions.length === 0 ? (
              <View style={styles.dropdownLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.dropdownOptionText, { marginTop: 8 }]}>
                  Searching cities…
                </Text>
              </View>
            ) : citySuggestions.length > 0 ? (
              <ScrollView
                style={styles.cityListScroll}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {citySuggestions.map((city) => (
                  <TouchableOpacity
                    key={city.id}
                    style={[
                      styles.dropdownOption,
                      addr.city === city.name && styles.dropdownOptionSelected,
                    ]}
                    onPress={() => selectCity(city)}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        addr.city === city.name &&
                          styles.dropdownOptionTextSelected,
                      ]}
                    >
                      {city.name}
                      {city.state ? `, ${city.state}` : ""}
                    </Text>
                    {addr.city === city.name && (
                      <Feather name="check" size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : cityQuery.trim().length >= 2 ? (
              <View style={styles.dropdownLoading}>
                <Text style={styles.dropdownOptionText}>
                  No cities found for “{cityQuery}”
                </Text>
              </View>
            ) : (
              <View style={styles.dropdownLoading}>
                <Text style={styles.dropdownOptionText}>
                  Type at least 2 letters (e.g. Indore, Mumbai)
                </Text>
              </View>
            )}
          </View>
        )}
        {addr.city ? (
          <Text style={styles.citySelectedHint}>Selected: {addr.city}</Text>
        ) : (
          <Text style={styles.pinWarn}>
            Search and select a city from suggestions
          </Text>
        )}
      </View>

      <View style={styles.autocompleteContainer}>
        <Input
          label="Search address *"
          value={addressInput}
          onChangeText={handleAddressChange}
          placeholder={
            addr.city
              ? `Search in ${addr.city}…`
              : "Select city, then search address"
          }
          multiline
          numberOfLines={2}
        />
        {coords ? (
          <Text style={styles.pinOk}>
            <Feather name="map-pin" size={12} color={colors.success} /> Location
            pinned for fare & rider map
          </Text>
        ) : (
          <Text style={styles.pinWarn}>
            Select a suggestion or use current location so rider gets exact pin
          </Text>
        )}
        {showSuggestions && (suggestions.length > 0 || loadingSuggestions) && (
          <View style={styles.suggestionsListContainer}>
            <View style={styles.suggestionsHeader}>
              <Text style={styles.suggestionsHeaderText}>
                Tap a suggestion to pin location
              </Text>
              <TouchableOpacity
                onPress={() => setShowSuggestions(false)}
                style={styles.closeButton}
              >
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
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews
              >
                {suggestions.map((item, idx) => (
                  <TouchableOpacity
                    key={`${item.displayName}-${idx}`}
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionSelect(item)}
                  >
                    <Feather
                      name="map-pin"
                      size={16}
                      color={colors.primary}
                      style={{ marginRight: 8 }}
                    />
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
        value={addr.name}
        onChangeText={(t: string) => updateField("name", t)}
        placeholder="Enter name"
      />

      <Input
        label="Phone"
        value={addr.phone}
        onChangeText={(t: string) => updateField("phone", formatPhone(t))}
        placeholder="+91 12345 67890"
        keyboardType="phone-pad"
        maxLength={17}
      />
    </Card>
  );
};

export const AddressForm = React.memo(AddressFormInner, (prev, next) => {
  return (
    prev.sectionTitle === next.sectionTitle &&
    prev.enableCurrentLocation === next.enableCurrentLocation
  );
});

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary + "12",
    borderWidth: 1,
    borderColor: colors.primary + "40",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  gpsButtonText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  autocompleteContainer: {
    marginBottom: 8,
  },
  pinOk: {
    fontSize: 12,
    color: colors.success,
    marginTop: 4,
    marginBottom: 8,
  },
  pinWarn: {
    fontSize: 12,
    color: colors.warning,
    marginTop: 4,
    marginBottom: 8,
  },
  suggestionsListContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
    marginBottom: 16,
    maxHeight: 220,
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
    maxHeight: 180,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  loadingContainer: {
    padding: 12,
    alignItems: "center",
  },
  cityContainer: {
    marginBottom: 8,
  },
  citySearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    minHeight: 48,
  },
  citySearchIcon: {
    marginRight: 8,
  },
  citySearchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 12,
  },
  cityListScroll: {
    maxHeight: 200,
  },
  citySelectedHint: {
    fontSize: 12,
    color: colors.success,
    marginTop: 6,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 8,
  },
  cityButton: {
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
  cityButtonOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  cityButtonText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  placeholderText: {
    color: colors.textLight,
  },
  dropdownList: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: colors.background,
    overflow: "hidden",
    marginBottom: 8,
  },
  dropdownLoading: {
    padding: 16,
    alignItems: "center",
  },
  dropdownOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
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
});
