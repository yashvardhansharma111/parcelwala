/**
 * Privacy Policy Screen
 * Privacy policy for ParcelWalah
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView, Linking } from "react-native";
import { Header } from "../../components/Header";
import { Card } from "../../components/Card";
import { colors } from "../../theme/colors";

export default function PrivacyScreen() {
  const handleEmail = () => {
    Linking.openURL("mailto:Help@parcelwalah.in");
  };

  return (
    <View style={styles.container}>
      <Header title="Privacy Policy" showBack />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Card>
            <Text style={styles.title}>Privacy Policy</Text>
            <Text style={styles.lastUpdated}>Last Updated: 14 November 2025</Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>App Information</Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>App Name:</Text> ParcelWalah
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Developer:</Text> Finnpays Technology
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Email:</Text>{" "}
              <Text style={styles.link} onPress={handleEmail}>
                Help@parcelwalah.in
              </Text>
            </Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Information We Collect</Text>
            <Text style={styles.paragraph}>
              ParcelWalah collects limited information to provide parcel booking
              and delivery services.
            </Text>
            <Text style={styles.paragraph}>
              We collect location, pickup/drop addresses, and notification permission
              only for booking and service updates. We do not offer real-time driver
              tracking.
            </Text>
            <Text style={styles.paragraph}>
              We may collect basic device information (like crash logs and app usage)
              to improve performance.
            </Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Data Usage</Text>
            <Text style={styles.paragraph}>
              Your data is not sold, shared unlawfully, or misused.
            </Text>
            <Text style={styles.paragraph}>
              We use trusted third-party services such as Google Maps and Firebase
              for location selection and app analytics.
            </Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Your Rights</Text>
            <Text style={styles.paragraph}>
              You may request access, correction, or deletion of your data at:{" "}
              <Text style={styles.link} onPress={handleEmail}>
                Help@parcelwalah.in
              </Text>
            </Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Age Restriction</Text>
            <Text style={styles.paragraph}>
              ParcelWalah is not intended for children under 13.
            </Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Agreement</Text>
            <Text style={styles.paragraph}>
              By using the app, you agree to this Privacy Policy.
            </Text>
          </Card>
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
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
    marginTop: 4,
  },
  paragraph: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  bold: {
    fontWeight: "600",
    color: colors.text,
  },
  link: {
    color: colors.primary,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});

