/**
 * Signup Screen
 * OTP-based signup with name
 */

import React, { useState, useEffect } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { colors } from "../../theme/colors";

export default function SignupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { sendOTP, verifyOTP, loading, otpSent, error, resetOTP } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [fromLogin, setFromLogin] = useState(false);

  // Check if redirected from login page
  useEffect(() => {
    if (params.phoneNumber && params.otpCode && params.fromLogin === "true") {
      setPhoneNumber(params.phoneNumber as string);
      setOtpCode(params.otpCode as string);
      setFromLogin(true);
      // Mark OTP as sent since we already have the OTP
      // We need to manually set this state - but since we can't directly set otpSent,
      // we'll handle the UI differently
    }
  }, [params]);

  const handleSendOTP = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

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
      // Pass name to indicate this is a signup request (not login)
      // This allows backend to send OTP for new users on signup screen
      await sendOTP(formattedPhone, name.trim());
      Alert.alert("Success", "OTP sent to your phone number");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send OTP");
    }
  };

  const handleVerifyOTP = async () => {
    if (!name.trim()) {
      setOtpError("Please enter your name");
      return;
    }

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
      await verifyOTP(otpCode, name.trim());
      // Navigation handled in useAuth hook
    } catch (err: any) {
      setOtpError(err.message || "Invalid OTP");
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            {fromLogin
              ? "Enter your name to complete signup"
              : otpSent
              ? "Enter the OTP sent to your phone"
              : "Enter your details to get started"}
          </Text>

          {!otpSent && !fromLogin ? (
            <View style={styles.form}>
              <Input
                label="Name"
                placeholder="Enter your name"
                value={name}
                onChangeText={(text) => setName(text)}
                autoFocus
              />
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
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Button
                title="Send OTP"
                onPress={handleSendOTP}
                loading={loading}
                style={styles.button}
              />

              <View style={styles.linkContainer}>
                <Text style={styles.linkText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/login")}>
                  <Text style={styles.link}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.form}>
              {fromLogin && (
                <>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                      Account not found. Please enter your name to create a new account.
                    </Text>
                  </View>
                  <Input
                    label="Phone Number"
                    placeholder="+91 12345 67890"
                    value={phoneNumber}
                    editable={false}
                    style={styles.readOnlyInput}
                  />
                </>
              )}
              <Input
                label="Name"
                placeholder="Enter your name"
                value={name}
                onChangeText={(text) => setName(text)}
                editable={fromLogin || !otpSent}
                style={!fromLogin && otpSent ? styles.readOnlyInput : undefined}
                autoFocus={fromLogin}
              />
              {!fromLogin && (
                <Input
                  label="Phone Number"
                  placeholder="+91 12345 67890"
                  value={phoneNumber}
                  editable={false}
                  style={styles.readOnlyInput}
                />
              )}
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
                editable={!fromLogin}
                style={fromLogin ? styles.readOnlyInput : undefined}
                autoFocus={!fromLogin}
              />

              {(error || otpError) && (
                <Text style={styles.errorText}>{error || otpError}</Text>
              )}

              <Button
                title={fromLogin ? "Complete Signup" : "Verify OTP & Signup"}
                onPress={handleVerifyOTP}
                loading={loading}
                style={styles.button}
              />

              <Button
                title={fromLogin ? "Back to Login" : "Change Phone Number"}
                variant="outline"
                onPress={() => {
                  if (fromLogin) {
                    // Go back to login
                    router.back();
                  } else {
                    // Reset form
                    setOtpCode("");
                    setOtpError("");
                    setPhoneNumber("");
                    setName("");
                    resetOTP();
                  }
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
  readOnlyInput: {
    backgroundColor: colors.border + "40",
    opacity: 0.7,
  },
  infoBox: {
    backgroundColor: colors.primary + "20",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: colors.primary,
    textAlign: "center",
    lineHeight: 20,
  },
});

