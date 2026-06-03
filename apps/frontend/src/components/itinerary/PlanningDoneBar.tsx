import { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import { PressLock } from "@/src/utils/PressLock";

import CheckIcon from "@/assets/icons/check_mark.svg";
import InfoIcon from "@/assets/icons/info.svg";
import { ACTION_CARD_HEIGHT } from "@/src/components/common/ActionCard";

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
    <View style={[styles.wrapper, { pointerEvents: "box-none" }]}>
      <View style={styles.footer}>
        <Pressable
          style={styles.doneButton}
          onPress={handlePress}
          disabled={isDisabled}
          accessibilityRole="checkbox"
          accessibilityLabel={
            checked ? "Mark planning as not done" : "Mark planning as done"
          }
          accessibilityState={{ checked, disabled: isDisabled }}
        >
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
            {checked && (
              <CheckIcon width={14} height={14} color={colors.nightBlack} />
            )}
          </View>

          <AppText variant="body" style={styles.doneText}>
            Planning done
          </AppText>
        </Pressable>

        <Pressable
          style={styles.infoButton}
          onPress={handleInfoPress}
          accessibilityRole="button"
          accessibilityLabel="Show planning done info"
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
    shadowColor: colors.sunsetOrange,
    boxShadow: `0px -10px ${radius.lg}px rgba(255, 107, 53, 0.15)`,
    elevation: 6,
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
