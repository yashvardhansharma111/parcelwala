/**
 * Status Badge Component
 * Displays status with color coding
 */

import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { BookingStatus, PaymentStatus } from "../utils/types";
import { STATUS_COLORS, PAYMENT_STATUS_COLORS } from "../utils/constants";

interface StatusBadgeProps {
  status: BookingStatus | PaymentStatus;
  type?: "booking" | "payment";
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = "booking",
  style,
}) => {
  const statusColors =
    type === "booking" ? STATUS_COLORS : PAYMENT_STATUS_COLORS;
  const statusColor = statusColors[status] || colors.textLight;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: `${statusColor}20`, borderColor: statusColor },
        style,
      ]}
    >
      <Text style={[styles.text, { color: statusColor }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});

