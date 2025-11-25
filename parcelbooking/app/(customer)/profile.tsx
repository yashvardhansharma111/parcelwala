/**
 * Customer Profile Screen
 * View and edit user profile
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
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { Header } from "../../components/Header";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Loader } from "../../components/Loader";
import { colors } from "../../theme/colors";
import { Feather } from "@expo/vector-icons";
import { userApi } from "../../services/apiClient";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhoneNumber(user.phoneNumber || "");
    }
  }, [user]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      return;
    }

    if (name.trim() === user?.name) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);
      const updatedUser = await userApi.updateProfile({ name: name.trim() });
      setUser(updatedUser);
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(user?.name || "");
    setIsEditing(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Profile" showBack />
        <Loader fullScreen />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Profile" showBack />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Card style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Feather name="user" size={48} color={colors.primary} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.phoneContainer}>
              <Text style={styles.phoneValue}>{phoneNumber}</Text>
              <Feather name="phone" size={16} color={colors.textSecondary} />
            </View>
            <Text style={styles.hint}>Phone number cannot be changed</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            {isEditing ? (
              <>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  autoFocus
                  maxLength={50}
                />
                <View style={styles.editActions}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={handleCancel}
                    style={styles.cancelButton}
                    disabled={saving}
                  />
                  <Button
                    title={saving ? "Saving..." : "Save"}
                    onPress={handleSave}
                    style={styles.saveButton}
                    loading={saving}
                    disabled={saving}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.valueContainer}>
                  <Text style={styles.value}>{name || "Not set"}</Text>
                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    style={styles.editButton}
                  >
                    <Feather name="edit-2" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Account Type</Text>
            <View style={styles.roleContainer}>
              <Text style={styles.roleValue}>
                {user?.role === "admin" ? "Administrator" : "Customer"}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Feather name="info" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              Your profile information is used to personalize your experience
            </Text>
          </View>
        </Card>

        <Card style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => router.push("/(customer)/settings")}
          >
            <View style={styles.settingsIcon}>
              <Feather name="settings" size={20} color={colors.primary} />
            </View>
            <Text style={styles.settingsText}>Settings</Text>
            <Feather name="chevron-right" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  profileCard: {
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.primary}20`,
    justifyContent: "center",
    alignItems: "center",
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  value: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phoneValue: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  input: {
    fontSize: 16,
    color: colors.text,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  editButton: {
    padding: 4,
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  roleContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleValue: {
    fontSize: 16,
    color: colors.text,
    textTransform: "capitalize",
  },
  infoCard: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  settingsCard: {
    marginTop: 16,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}20`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settingsText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
});

