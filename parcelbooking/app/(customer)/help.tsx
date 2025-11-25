/**
 * Help & Support Screen
 * Customer support and help information
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { Header } from "../../components/Header";
import { Card } from "../../components/Card";
import { colors } from "../../theme/colors";
import { Feather } from "@expo/vector-icons";

export default function HelpScreen() {
  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleWhatsApp = (phone: string) => {
    Linking.openURL(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`);
  };

  return (
    <View style={styles.container}>
      <Header title="Help & Support" showBack />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Card>
            <Text style={styles.sectionTitle}>Contact Us</Text>
            <Text style={styles.description}>
              We're here to help! Reach out to us through any of the following
              channels.
            </Text>
          </Card>

          <Card>
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => handleCall("+918462044151")}
            >
              <View style={styles.contactIcon}>
                <Feather name="phone" size={24} color={colors.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>+91 84620 44151</Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Card>
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => handleEmail("Help@parcelwalah.in")}
            >
              <View style={styles.contactIcon}>
                <Feather name="mail" size={24} color={colors.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>Help@parcelwalah.in</Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Card>
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => handleWhatsApp("+918462044151")}
            >
              <View style={styles.contactIcon}>
                <Feather name="message-circle" size={24} color={colors.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>WhatsApp</Text>
                <Text style={styles.contactValue}>+91 84620 44151</Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Operating Hours</Text>
            <View style={styles.hoursRow}>
              <Text style={styles.hoursLabel}>Monday - Friday:</Text>
              <Text style={styles.hoursValue}>9:00 AM - 6:00 PM</Text>
            </View>
            <View style={styles.hoursRow}>
              <Text style={styles.hoursLabel}>Saturday:</Text>
              <Text style={styles.hoursValue}>10:00 AM - 4:00 PM</Text>
            </View>
            <View style={styles.hoursRow}>
              <Text style={styles.hoursLabel}>Sunday:</Text>
              <Text style={styles.hoursValue}>Closed</Text>
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            
            <Text style={styles.faqQuestion}>How do I book a parcel?</Text>
            <Text style={styles.faqAnswer}>
              Go to "New Booking" from the home screen, enter pickup and delivery
              addresses, add parcel details, and proceed with payment.
            </Text>

            <Text style={styles.faqQuestion}>How can I track my parcel?</Text>
            <Text style={styles.faqAnswer}>
              Use the "Track Parcel" option from the home screen or go to your
              booking history to view the status of your parcels.
            </Text>

            <Text style={styles.faqQuestion}>What payment methods are accepted?</Text>
            <Text style={styles.faqAnswer}>
              We accept online payments (UPI, cards) and cash on delivery (COD).
            </Text>

            <Text style={styles.faqQuestion}>Can I cancel my booking?</Text>
            <Text style={styles.faqAnswer}>
              Yes, you can cancel bookings before a delivery partner is assigned.
              Check our Terms & Conditions for detailed cancellation policy.
            </Text>

            <Text style={styles.faqQuestion}>How do I request a refund?</Text>
            <Text style={styles.faqAnswer}>
              Contact us at Help@parcelwalah.in with your booking details. Refunds
              are processed within 5-7 business days if approved.
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
    marginBottom: 4,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}20`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  hoursLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  hoursValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginTop: 16,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
});

