/**
 * Settings Screen
 * Customer settings and legal pages
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../../components/Header";
import { Card } from "../../components/Card";
import { colors } from "../../theme/colors";
import { Feather } from "@expo/vector-icons";

export default function SettingsScreen() {
  const router = useRouter();

  const settingsItems = [
    {
      title: "About Us",
      icon: "info" as keyof typeof Feather.glyphMap,
      onPress: () => router.push("/(customer)/about"),
    },
    {
      title: "Privacy Policy",
      icon: "shield" as keyof typeof Feather.glyphMap,
      onPress: () => router.push("/(customer)/privacy"),
    },
    {
      title: "Terms & Conditions",
      icon: "file-text" as keyof typeof Feather.glyphMap,
      onPress: () => router.push("/(customer)/terms"),
    },
    {
      title: "Help & Support",
      icon: "help-circle" as keyof typeof Feather.glyphMap,
      onPress: () => router.push("/(customer)/help"),
    },
  ];

  return (
    <View style={styles.container}>
      <Header title="Settings" showBack />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Card>
            <Text style={styles.sectionTitle}>Legal & Information</Text>
            <Text style={styles.description}>
              View our policies, terms, and get help when you need it.
            </Text>
          </Card>

          {settingsItems.map((item, index) => (
            <Card key={index} style={styles.itemCard}>
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={item.onPress}
              >
                <View style={styles.itemIcon}>
                  <Feather name={item.icon} size={24} color={colors.primary} />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.textLight} />
              </TouchableOpacity>
            </Card>
          ))}
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
  },
  itemCard: {
    marginTop: 12,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}20`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
});

