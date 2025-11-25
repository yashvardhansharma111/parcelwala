/**
 * Terms & Conditions Screen
 * Terms, cancellation, and refund policies
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView, Linking } from "react-native";
import { Header } from "../../components/Header";
import { Card } from "../../components/Card";
import { colors } from "../../theme/colors";

export default function TermsScreen() {
  const handleEmail = () => {
    Linking.openURL("mailto:Help@parcelwalah.in");
  };

  return (
    <View style={styles.container}>
      <Header title="Terms & Conditions" showBack />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Card>
            <Text style={styles.title}>Terms & Conditions</Text>
            <Text style={styles.lastUpdated}>Last Updated: 14 November 2025</Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Cancellation Policy</Text>
            <Text style={styles.paragraph}>
              You may cancel a parcel pickup request before the pickup has been
              assigned to a delivery partner.
            </Text>
            <Text style={styles.paragraph}>
              Once a rider/partner is assigned or dispatched, cancellations may not
              be allowed.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>ParcelWallah reserves the right to cancel orders in case of:</Text>
            </Text>
            <Text style={styles.bulletPoint}>
              • Incorrect or incomplete address
            </Text>
            <Text style={styles.bulletPoint}>
              • Unsafe pickup/drop location
            </Text>
            <Text style={styles.bulletPoint}>
              • Unavailable delivery partner
            </Text>
            <Text style={styles.bulletPoint}>
              • Violation of app terms
            </Text>
            <Text style={styles.paragraph}>
              For cancellation support, contact:{" "}
              <Text style={styles.link} onPress={handleEmail}>
                Help@parcelwalah.in
              </Text>
            </Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Refund Policy</Text>
            <Text style={styles.paragraph}>
              ParcelWallah follows a simple and transparent refund process:
            </Text>

            <Text style={styles.subsectionTitle}>1. Before Assignment</Text>
            <Text style={styles.paragraph}>
              If you cancel before a delivery partner is assigned, a full refund (if
              any payment was made) will be issued.
            </Text>

            <Text style={styles.subsectionTitle}>2. After Assignment</Text>
            <Text style={styles.paragraph}>
              If a partner is already assigned or has reached the pickup location,
              refund may not be applicable, as operational charges may already be
              incurred.
            </Text>

            <Text style={styles.subsectionTitle}>3. Failed Delivery</Text>
            <Text style={styles.paragraph}>
              Refunds may be provided if the failure is due to:
            </Text>
            <Text style={styles.bulletPoint}>
              • System/technical issue
            </Text>
            <Text style={styles.bulletPoint}>
              • Non-availability of delivery partner
            </Text>
            <Text style={styles.bulletPoint}>
              • Operational fault on ParcelWallah's side
            </Text>

            <Text style={styles.subsectionTitle}>4. User-Caused Failures</Text>
            <Text style={styles.paragraph}>
              Refunds will not be provided if delivery fails due to:
            </Text>
            <Text style={styles.bulletPoint}>
              • Wrong address
            </Text>
            <Text style={styles.bulletPoint}>
              • Recipient unavailable
            </Text>
            <Text style={styles.bulletPoint}>
              • Non-permissible items
            </Text>
            <Text style={styles.bulletPoint}>
              • Cancellation after dispatch
            </Text>

            <Text style={styles.paragraph}>
              Refunds (if approved) are processed within 5–7 business days to the
              original payment method.
            </Text>
            <Text style={styles.paragraph}>
              For refund requests, contact:{" "}
              <Text style={styles.link} onPress={handleEmail}>
                Help@parcelwalah.in
              </Text>
            </Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>General Terms</Text>
            <Text style={styles.paragraph}>
              By using ParcelWallah, you agree to comply with all applicable terms
              and conditions. We reserve the right to modify these terms at any time.
            </Text>
            <Text style={styles.paragraph}>
              For any questions or concerns, please contact us at:{" "}
              <Text style={styles.link} onPress={handleEmail}>
                Help@parcelwalah.in
              </Text>
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
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 6,
    marginLeft: 8,
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

