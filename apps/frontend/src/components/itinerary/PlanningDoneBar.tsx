import { Pressable, StyleSheet, View, Alert } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";

type Props = {
  checked: boolean;
  onPress: () => void;
};

export function PlanningDoneBar({ checked, onPress }: Props) {
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.bar}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.button,
            checked && styles.buttonChecked,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            checked ? "Planning completed" : "Mark planning as done"
          }
          accessibilityState={{ checked, disabled: checked }}
          disabled={checked}
        >
          <View style={[styles.checkbox, checked && styles.checkboxChecked]} />
          <AppText variant="body" style={styles.buttonText}>
            Planning done
          </AppText>
        </Pressable>

        <Pressable
          onPress={() =>
            Alert.alert(
              "Planning info",
              "You can no longer add activities after submitting."
            )
          }
          style={({ pressed }) => [
            styles.infoCircle,
            pressed && styles.infoCirclePressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Show planning submission info"
        >
          <AppText variant="caption" style={styles.infoText}>
            i
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
  },
  bar: {
    backgroundColor: colors.lightWhite,
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.beachYellow,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  buttonChecked: {
    opacity: 0.7,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.nightBlack,
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    backgroundColor: colors.nightBlack,
  },
  buttonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
  infoCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.nightBlack,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCirclePressed: {
    opacity: 0.85,
  },
  infoText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
});
