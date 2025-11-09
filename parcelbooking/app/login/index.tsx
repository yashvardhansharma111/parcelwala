/**
 * Login Screen
 * OTP-based authentication with Firebase
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { colors } from "../../theme/colors";
import { validatePhoneNumber } from "../../utils/validators";
import { formatPhoneNumber } from "../../utils/formatters";

export default function LoginScreen() {
  const router = useRouter();
  const { sendOTP, verifyOTP, loading, otpSent, error, resetOTP } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [needsName, setNeedsName] = useState(false); // New user needs to provide name

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert("Error", "Please enter your phone number");
      return;
    }

    // Extract only digits from phone number
    const digits = phoneNumber.replace(/\D/g, "");
    
    // Ensure we have exactly 10 digits (after removing country code if present)
    let phoneDigits: string;
    if (digits.startsWith("91") && digits.length === 12) {
      phoneDigits = digits.slice(2);
    } else if (digits.length === 10) {
      phoneDigits = digits;
    } else {
      Alert.alert("Error", "Please enter a valid 10-digit Indian phone number");
      return;
    }

    // Validate: Indian mobile numbers start with 6, 7, 8, or 9
    if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
      Alert.alert("Error", "Please enter a valid Indian phone number (should start with 6, 7, 8, or 9)");
      return;
    }

    // Format as +91XXXXXXXXXX for sending
    const formattedPhone = `+91${phoneDigits}`;

    try {
      await sendOTP(formattedPhone);
      Alert.alert("Success", "OTP sent to your phone number");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send OTP");
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) {
      setOtpError("Please enter the OTP");
      return;
    }

    if (otpCode.length !== 6) {
      setOtpError("OTP must be 6 digits");
      return;
    }

    try {
      setOtpError("");
      const result = await verifyOTP(otpCode);
      
      // Check if name is required (new user)
      if (result.requiresName) {
        setNeedsName(true);
      }
      // Otherwise navigation handled in useAuth hook
    } catch (err: any) {
      setOtpError(err.message || "Invalid OTP");
    }
  };

  const handleSubmitName = async () => {
    if (!name.trim()) {
      setOtpError("Please enter your name");
      return;
    }

    try {
      setOtpError("");
      await verifyOTP(otpCode, name.trim());
      // Navigation handled in useAuth hook
    } catch (err: any) {
      setOtpError(err.message || "Failed to complete signup");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Parcel Booking</Text>
          <Text style={styles.subtitle}>
            {otpSent
              ? "Enter the OTP sent to your phone"
              : "Enter your phone number to get started"}
          </Text>

          {!otpSent && !needsName ? (
            <View style={styles.form}>
              <Input
                label="Phone Number"
                placeholder="+91 12345 67890"
                value={phoneNumber}
                onChangeText={(text) => {
                  // Remove all non-digits except +
                  const cleaned = text.replace(/[^\d+]/g, "");
                  
                  // If user starts typing digits, auto-add +91
                  if (cleaned.length > 0 && !cleaned.startsWith("+")) {
                    // If starts with 91, add + prefix
                    if (cleaned.startsWith("91") && cleaned.length >= 2) {
                      const digits = cleaned.slice(2);
                      if (digits.length <= 10) {
                        setPhoneNumber(`+91 ${digits.slice(0, 5)}${digits.length > 5 ? " " + digits.slice(5) : ""}`.trim());
                        return;
                      }
                    } else if (cleaned.length <= 10) {
                      // Just digits, add +91 and format
                      setPhoneNumber(`+91 ${cleaned.slice(0, 5)}${cleaned.length > 5 ? " " + cleaned.slice(5) : ""}`.trim());
                      return;
                    }
                  }
                  
                  // If already has +91, format it
                  if (cleaned.startsWith("+91") || cleaned.startsWith("91")) {
                    const digits = cleaned.replace(/^\+?91/, "");
                    if (digits.length <= 10) {
                      setPhoneNumber(`+91 ${digits.slice(0, 5)}${digits.length > 5 ? " " + digits.slice(5) : ""}`.trim());
                      return;
                    }
                  }
                  
                  // Default: keep as is but format
                  if (cleaned.startsWith("+")) {
                    setPhoneNumber(cleaned);
                  } else {
                    setPhoneNumber(text);
                  }
                }}
                keyboardType="phone-pad"
                maxLength={17}
                autoFocus
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Button
                title="Send OTP"
                onPress={handleSendOTP}
                loading={loading}
                style={styles.button}
              />

              <View style={styles.linkContainer}>
                <Text style={styles.linkText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/login/signup")}>
                  <Text style={styles.link}>Sign up</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : needsName ? (
            <View style={styles.form}>
              <Text style={styles.subtitle}>
                Welcome! Please enter your name to complete signup
              </Text>
              <Input
                label="Name"
                placeholder="Enter your name"
                value={name}
                onChangeText={(text) => setName(text)}
                autoFocus
              />

              {(error || otpError) && (
                <Text style={styles.errorText}>{error || otpError}</Text>
              )}

              <Button
                title="Complete Signup"
                onPress={handleSubmitName}
                loading={loading}
                style={styles.button}
              />

              <Button
                title="Back"
                variant="outline"
                onPress={() => {
                  setNeedsName(false);
                  setName("");
                  setOtpError("");
                }}
                style={styles.button}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setOtpCode("");
                  setOtpError("");
                  setPhoneNumber("");
                  setNeedsName(false);
                  // Reset OTP sent status to go back to phone input
                  resetOTP();
                }}
              >
                <Feather name="arrow-left" size={20} color={colors.text} />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>

              <Input
                label="Enter OTP"
                placeholder="000000"
                value={otpCode}
                onChangeText={(text) => {
                  setOtpCode(text.replace(/\D/g, ""));
                  setOtpError("");
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />

              {(error || otpError) && (
                <Text style={styles.errorText}>{error || otpError}</Text>
              )}

              <Button
                title="Verify OTP"
                onPress={handleVerifyOTP}
                loading={loading}
                style={styles.button}
              />

              <Button
                title="Change Phone Number"
                variant="outline"
                onPress={() => {
                  // Reset all local state
                  setOtpCode("");
                  setOtpError("");
                  setPhoneNumber("");
                  setNeedsName(false);
                  // Reset OTP sent status from auth hook
                  resetOTP();
                }}
                style={styles.button}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },
  form: {
    width: "100%",
  },
  button: {
    marginTop: 8,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 8,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginBottom: 16,
    textAlign: "center",
  },
  linkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  linkText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  link: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
});

