import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, spacing, typography } from "@/src/theme";

import CheckIcon from "@/assets/icons/check_mark.svg";
import InfoIcon from "@/assets/icons/info.svg";

type Props = {
  checked: boolean;
  disabled?: boolean;
  onPress: () => void;
  onInfoPress: () => void;
};

export function PlanningDoneBar({
  checked,
  disabled = false,
  onPress,
  onInfoPress,
}: Props) {
  const isDisabled = checked || disabled;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.footer}>
        <Pressable
          style={[styles.doneButton, checked && styles.doneButtonChecked]}
          onPress={onPress}
          disabled={isDisabled}
          accessibilityRole="button"
          accessibilityLabel={
            checked ? "Planning already submitted" : "Submit planning"
          }
          accessibilityState={{ disabled: isDisabled }}
        >
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
            {checked && (
              <CheckIcon width={14} height={14} color={colors.nightBlack} />
            )}
          </View>

          <AppText variant="body" style={styles.doneText}>
            {checked ? "Planning submitted" : "Planning done"}
          </AppText>
        </Pressable>

        <Pressable
          style={styles.infoButton}
          onPress={onInfoPress}
          accessibilityRole="button"
          accessibilityLabel="Show planning submission info"
        >
          <InfoIcon width={24} height={24} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  footer: {
    width: "100%",
    minHeight: 96,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  doneButton: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: colors.beachYellow,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  doneButtonChecked: {
    opacity: 0.7,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.nightBlack,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    backgroundColor: colors.beachYellow,
    borderColor: colors.nightBlack,
  },
  doneText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 18,
  },
  infoButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
