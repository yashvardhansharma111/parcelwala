import React from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

interface StepIndicatorProps {
  current: number;
  total: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ current, total }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, idx) => {
        const stepNum = idx + 1;
        const reached = stepNum <= current;
        return (
          <React.Fragment key={stepNum}>
            <View style={[styles.dot, reached && styles.dotActive]} />
            {stepNum < total && (
              <View
                style={[styles.line, stepNum < current && styles.lineActive]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  line: {
    width: 60,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  lineActive: {
    backgroundColor: colors.primary,
  },
});
