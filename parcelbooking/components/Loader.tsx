/**
 * Loader Component
 * Loading indicator
 */

import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

interface LoaderProps {
  size?: "small" | "large";
  color?: string;
  fullScreen?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({
  size = "large",
  color = colors.primary, // Default to orange
  fullScreen = false,
}) => {
  return (
    <View style={fullScreen ? styles.fullScreen : styles.container}>
      <ActivityIndicator size={size} color={color || colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  fullScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});

