/**
 * About Us Screen
 * Information about ParcelWallah
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Header } from "../../components/Header";
import { Card } from "../../components/Card";
import { colors } from "../../theme/colors";

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <Header title="About Us" showBack />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Card>
            <Text style={styles.appName}>ParcelWallah</Text>
            <Text style={styles.version}>Version 1.0.0</Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>About ParcelWallah</Text>
            <Text style={styles.paragraph}>
              ParcelWallah is a comprehensive parcel booking and delivery service
              designed to make shipping easy and convenient. We connect you with
              reliable delivery partners to ensure your parcels reach their
              destination safely and on time.
            </Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Our Mission</Text>
            <Text style={styles.paragraph}>
              To provide fast, reliable, and affordable parcel delivery services
              while maintaining the highest standards of customer satisfaction.
            </Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Developer</Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Finnpays Technology</Text>
            </Text>
            <Text style={styles.paragraph}>
              For inquiries, please contact us at:
            </Text>
            <Text style={[styles.paragraph, styles.email]}>
              Help@parcelwalah.in
            </Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Features</Text>
            <Text style={styles.paragraph}>
              • Easy parcel booking with pickup and delivery address selection
            </Text>
            <Text style={styles.paragraph}>
              • Real-time tracking of your parcels
            </Text>
            <Text style={styles.paragraph}>
              • Multiple payment options including online and cash on delivery
            </Text>
            <Text style={styles.paragraph}>
              • Secure and reliable service
            </Text>
            <Text style={styles.paragraph}>
              • 24/7 customer support
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
  appName: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 4,
    textAlign: "center",
  },
  version: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
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
  email: {
    color: colors.primary,
    fontWeight: "600",
  },
});

