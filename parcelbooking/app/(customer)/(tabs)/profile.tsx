/**
 * Profile tab
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "../../../store/authStore";
import { useAuth } from "../../../hooks/useAuth";
import { Button } from "../../../components/Button";
import { colors } from "../../../theme/colors";
import { userApi } from "../../../services/apiClient";
import { setUser as persistUser } from "../../../services/tokenStorage";

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
  }, [user]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      return;
    }
    try {
      setSaving(true);
      const updatedUser = await userApi.updateProfile({ name: name.trim() });
      await persistUser(updatedUser);
      setUser(updatedUser);
      setIsEditing(false);
      Alert.alert("Success", "Profile updated");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const links = [
    { label: "Help & Support", href: "/(customer)/help", icon: "help-circle" as const },
    { label: "About", href: "/(customer)/about", icon: "info" as const },
    { label: "Privacy", href: "/(customer)/privacy", icon: "shield" as const },
    { label: "Terms", href: "/(customer)/terms", icon: "file-text" as const },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Profile</Text>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Feather name="user" size={28} color={colors.primary} />
          </View>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textLight}
            />
          ) : (
            <Text style={styles.name}>{user?.name || "Customer"}</Text>
          )}
          <Text style={styles.phone}>{user?.phoneNumber}</Text>
          {isEditing ? (
            <View style={styles.row}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setName(user?.name || "");
                  setIsEditing(false);
                }}
                style={{ flex: 1 }}
              />
              <Button
                title="Save"
                onPress={handleSave}
                loading={saving}
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <Button
              title="Edit profile"
              variant="outline"
              onPress={() => setIsEditing(true)}
              style={{ marginTop: 12 }}
            />
          )}
        </View>

        {links.map((l) => (
          <TouchableOpacity
            key={l.href}
            style={styles.link}
            onPress={() => router.push(l.href as any)}
          >
            <Feather name={l.icon} size={18} color={colors.text} />
            <Text style={styles.linkText}>{l.label}</Text>
            <Feather name="chevron-right" size={18} color={colors.textLight} />
          </TouchableOpacity>
        ))}

        <Button
          title="Logout"
          variant="outline"
          onPress={() =>
            Alert.alert("Logout", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Logout",
                style: "destructive",
                onPress: () => logout(),
              },
            ])
          }
          style={{ marginTop: 20, borderColor: colors.error } as any}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.background,
  },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF3E6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  name: { fontSize: 20, fontWeight: "700", color: colors.text },
  phone: { color: colors.textSecondary, marginTop: 4 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    textAlign: "center",
    fontWeight: "600",
  },
  row: { flexDirection: "row", gap: 10, marginTop: 12, width: "100%" },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkText: { flex: 1, fontWeight: "600", color: colors.text },
});
