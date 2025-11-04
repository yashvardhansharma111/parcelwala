/**
 * Admin Settings Screen - Pricing Management
 * Manage fare calculation tiers and GST settings
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Header } from "../../components/Header";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { Loader } from "../../components/Loader";
import { colors } from "../../theme/colors";
import { mapApi } from "../../services/apiClient";
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

export default function AdminSettingsScreen() {
  const [pricing, setPricing] = useState<PricingSettings>({
    baseRates: [
      { minKm: 0, maxKm: 40, maxWeight: 3, fare: 50, applyGst: false },
      { minKm: 41, maxKm: 60, maxWeight: 5, fare: 70, applyGst: true },
    ],
    gstPercent: 18,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPricing();
  }, []);

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

  const handleSave = async () => {
    // Validate all tiers
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

    // Validate GST
    if (pricing.gstPercent < 0 || pricing.gstPercent > 100) {
      Alert.alert("Error", "GST percentage must be between 0 and 100");
      return;
    }

    try {
      setSaving(true);
      await mapApi.updatePricing(pricing);
      Alert.alert("Success", "Pricing settings updated successfully");
      await loadPricing(); // Reload to get updated data
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update pricing settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Pricing Settings" showBack />
        <Loader fullScreen />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Pricing Settings" showBack />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Card>
            <View style={styles.headerSection}>
              <Text style={styles.sectionTitle}>Fare Calculation Tiers</Text>
              <Text style={styles.description}>
                Configure pricing tiers based on distance and weight. Each tier defines a fare for a specific distance range and weight limit.
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
                    onPress={() =>
                      handleUpdateTier(index, "applyGst", !rate.applyGst)
                    }
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        rate.applyGst && styles.toggleThumbActive,
                      ]}
                    />
                  </TouchableOpacity>
                  <Text style={styles.gstToggleText}>
                    {rate.applyGst ? "Yes" : "No"}
                  </Text>
                </View>

                <View style={styles.tierExample}>
                  <Text style={styles.tierExampleText}>
                    Example: {rate.minKm}-{rate.maxKm} km, up to {rate.maxWeight} kg = ₹{rate.fare}
                    {rate.applyGst
                      ? ` + ${pricing.gstPercent}% GST = ₹${Math.round(rate.fare + (rate.fare * pricing.gstPercent) / 100)}`
                      : " (No GST)"}
                  </Text>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addTierButton}
              onPress={handleAddTier}
            >
              <Feather name="plus" size={20} color={colors.primary} />
              <Text style={styles.addTierText}>Add New Tier</Text>
            </TouchableOpacity>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>GST Settings</Text>
            <Text style={styles.description}>
              Set the GST percentage applied to tiers where GST is enabled.
            </Text>
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

          <Card>
            <Text style={styles.sectionTitle}>Current Pricing Rules</Text>
            <View style={styles.rulesContainer}>
              {pricing.baseRates.map((rate, index) => (
                <View key={index} style={styles.ruleItem}>
                  <Text style={styles.ruleText}>
                    <Text style={styles.ruleBold}>Tier {index + 1}:</Text>{" "}
                    {rate.minKm}-{rate.maxKm} km, up to {rate.maxWeight} kg = ₹{rate.fare}
                    {rate.applyGst
                      ? ` + ${pricing.gstPercent}% GST (Total: ₹${Math.round(rate.fare + (rate.fare * pricing.gstPercent) / 100)})`
                      : " (No GST)"}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          <Button
            title="Save Pricing Settings"
            onPress={handleSave}
            loading={saving}
            style={styles.saveButton}
          />
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
  scrollView: {
    flex: 1,
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
  tierExample: {
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.primary + "10",
    borderRadius: 8,
  },
  tierExampleText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: "italic",
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
  rulesContainer: {
    gap: 12,
    marginTop: 12,
  },
  ruleItem: {
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  ruleText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  ruleBold: {
    fontWeight: "600",
    color: colors.primary,
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 24,
  },
});
