/**
 * Compact location field with autocomplete + optional GPS
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import {
  getAutocompleteSuggestions,
  resolvePlaceDetails,
  debounce,
  AddressSuggestion,
} from "../services/addressService";
import { Address } from "../utils/types";
import { Coords } from "../store/bookingDraftStore";

type Props = {
  label: string;
  pinColor: string;
  value: string;
  onChangeText: (t: string) => void;
  onSelect: (address: Address, coords: Coords) => void;
  onLocate?: () => void;
  locating?: boolean;
  placeholder?: string;
  cityBias?: string;
};

export function LocationField({
  label,
  pinColor,
  value,
  onChangeText,
  onSelect,
  onLocate,
  locating,
  placeholder,
  cityBias = "",
}: Props) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const search = useMemo(
    () =>
      debounce(async (q: string) => {
        if (q.trim().length < 3) {
          setSuggestions([]);
          setOpen(false);
          return;
        }
        setLoading(true);
        try {
          const list = await getAutocompleteSuggestions(q, 6, cityBias);
          setSuggestions(list);
          setOpen(true);
        } catch {
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 400),
    [cityBias]
  );

  const pick = async (s: AddressSuggestion) => {
    setOpen(false);
    setLoading(true);
    try {
      let resolved = s;
      if (s.placeId && !s.coordinates) {
        resolved = await resolvePlaceDetails(s.placeId);
      }
      if (!resolved.coordinates) return;
      onChangeText(resolved.displayName);
      onSelect(
        {
          name: resolved.address?.name || label,
          phone: "",
          address: resolved.displayName,
          city: resolved.address?.city || cityBias,
          state: resolved.address?.state || "Madhya Pradesh",
          pincode: resolved.address?.postcode || "",
          street: resolved.address?.street,
          houseNumber: resolved.address?.houseNumber,
        },
        resolved.coordinates
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Feather name="map-pin" size={18} color={pinColor} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(t) => {
            onChangeText(t);
            search(t);
          }}
          placeholder={placeholder || "Search address"}
          placeholderTextColor={colors.textLight}
        />
        {loading || locating ? (
          <ActivityIndicator color={colors.primary} />
        ) : onLocate ? (
          <TouchableOpacity onPress={onLocate} hitSlop={10}>
            <Feather name="crosshair" size={20} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
      {open && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {suggestions.map((item, i) => (
              <TouchableOpacity
                key={item.placeId || `${item.displayName}-${i}`}
                style={styles.item}
                onPress={() => pick(item)}
              >
                <Text style={styles.itemText} numberOfLines={2}>
                  {item.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12, zIndex: 1 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  input: { flex: 1, color: colors.text, fontSize: 14, padding: 0 },
  dropdown: {
    marginTop: 6,
    maxHeight: 160,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemText: { color: colors.text, fontSize: 13 },
});
