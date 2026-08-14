/**
 * Step 2 of 3: Delivery Address
 */

import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useBookingDraftStore } from "../../../store/bookingDraftStore";
import { AddressForm } from "../../../components/AddressForm";
import { Button } from "../../../components/Button";
import { Header } from "../../../components/Header";
import { StepIndicator } from "../../../components/StepIndicator";
import { colors } from "../../../theme/colors";
import { validateAddress } from "../../../utils/validators";

export default function DeliveryAddressScreen() {
  const router = useRouter();
  const drop = useBookingDraftStore((s) => s.drop);
  const dropCoords = useBookingDraftStore((s) => s.dropCoords);
  const setDrop = useBookingDraftStore((s) => s.setDrop);

  const handleNext = () => {
    const v = validateAddress(drop);
    if (!v.isValid) {
      Alert.alert("Validation Error", v.errors.join("\n"));
      return;
    }
    if (!dropCoords) {
      Alert.alert(
        "Pin location required",
        "Select an address suggestion or tap “Use current location” so the rider gets an accurate drop pin."
      );
      return;
    }
    router.push("/(customer)/booking/parcel");
  };

  return (
    <View style={styles.container}>
      <Header title="Delivery Address (2/3)" showBack />
      <StepIndicator current={2} total={3} />
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
            <AddressForm
              sectionTitle="Delivery Address"
              initial={drop}
              initialCoords={dropCoords}
              onChange={setDrop}
              enableCurrentLocation
            />
            <Button
              title="Next: Parcel & Payment"
              onPress={handleNext}
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
  submitButton: { marginTop: 24, marginBottom: 32 },
});
