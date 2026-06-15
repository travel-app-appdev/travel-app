import { useCallback } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityRole,
} from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import { PressLock } from "@/src/utils/PressLock";

import CheckIcon from "@/assets/icons/check_mark.svg";
import InfoIcon from "@/assets/icons/info.svg";

type Props = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  docked?: boolean;
  accentColor: string;
  shadowColor: string;
  shadow: string;
  accessibilityLabel: string;
  accessibilityCheckedLabel: string;
  infoAccessibilityLabel: string;
  accessibilityRole?: AccessibilityRole;
  onPress: () => void;
  onInfoPress: () => void;
};

export function ItineraryDoneBar({
  label,
  checked,
  disabled = false,
  docked = false,
  accentColor,
  shadowColor,
  shadow,
  accessibilityLabel,
  accessibilityCheckedLabel,
  infoAccessibilityLabel,
  accessibilityRole = "checkbox",
  onPress,
  onInfoPress,
}: Props) {
  const isDisabled = disabled;

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    if (!PressLock.acquire()) return;
    Promise.resolve()
      .then(() => onPress())
      .finally(() => setTimeout(() => PressLock.release(), 500));
  }, [onPress, isDisabled]);

  const handleInfoPress = useCallback(() => {
    if (!PressLock.acquire()) return;
    Promise.resolve()
      .then(() => onInfoPress())
      .finally(() => setTimeout(() => PressLock.release(), 300));
  }, [onInfoPress]);

  return (
    <View
      style={[styles.wrapper, docked && styles.dockedWrapper]}
      testID="done-bar-wrapper"
    >
      <View
        style={[
          styles.footer,
          docked && styles.dockedFooter,
          { shadowColor, boxShadow: shadow },
        ]}
        testID="done-bar-footer"
      >
        <Pressable
          style={[styles.doneButton, { backgroundColor: accentColor }]}
          onPress={handlePress}
          disabled={isDisabled}
          hitSlop={8}
          testID="done-bar-submit-button"
          accessibilityRole={accessibilityRole}
          accessibilityLabel={
            checked ? accessibilityCheckedLabel : accessibilityLabel
          }
          accessibilityState={{ checked, disabled: isDisabled }}
        >
          {checked ? (
            <CheckIcon
              width={22}
              height={22}
              color={colors.nightBlack}
              testID="done-bar-checked-icon"
            />
          ) : (
            <View style={styles.checkbox} testID="done-bar-unchecked-icon" />
          )}

          <AppText variant="body" style={styles.doneText}>
            {label}
          </AppText>
        </Pressable>

        <Pressable
          style={styles.infoButton}
          onPress={handleInfoPress}
          hitSlop={8}
          testID="done-bar-info-button"
          accessibilityRole="button"
          accessibilityLabel={infoAccessibilityLabel}
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
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.xl,
    zIndex: 10,
    elevation: 10,
  },
  dockedWrapper: {
    left: 0,
    right: 0,
    bottom: 0,
  },
  footer: {
    width: "100%",
    minHeight: 96,
    backgroundColor: colors.lightWhite,
    borderRadius: 23,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    elevation: 6,
  },
  dockedFooter: {
    borderTopLeftRadius: 23,
    borderTopRightRadius: 23,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  doneButton: {
    minHeight: 56,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
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
  doneText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
  },
  infoButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
