import { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import { PressLock } from "@/src/utils/PressLock";

import InfoIcon from "@/assets/icons/info.svg";

type Props = {
  disabled?: boolean;
  onPress: () => void;
  onInfoPress: () => void;
};

export function VotingDoneBar({
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
    <View style={styles.wrapper}>
      <View style={styles.footer}>
        <Pressable
          style={styles.doneButton}
          onPress={handlePress}
          disabled={isDisabled}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="End voting for everyone"
          accessibilityState={{ disabled: isDisabled }}
        >
          <AppText variant="body" style={styles.doneText}>
            Submit Voting
          </AppText>
        </Pressable>

        <Pressable
          style={styles.infoButton}
          onPress={handleInfoPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Show voting done info"
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
    shadowColor: colors.sunsetPink,
    boxShadow: `0px -10px ${radius.lg}px rgba(229, 130, 251, 0.18)`,
    elevation: 6,
  },
  doneButton: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: colors.sunsetPink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
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
