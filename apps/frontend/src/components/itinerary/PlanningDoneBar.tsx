// src/components/itinerary/PlanningDoneBar.tsx
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";

import CheckIcon from "@/assets/icons/check_mark.svg";
import InfoIcon from "@/assets/icons/info.svg";

type Props = {
  checked: boolean;
  onPress: () => void;
  onInfoPress: () => void;
};

export function PlanningDoneBar({ checked, onPress, onInfoPress }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        <Pressable
          style={[styles.doneButton, checked && styles.doneButtonChecked]}
          onPress={onPress}
          disabled={checked}
          accessibilityRole="button"
          accessibilityLabel={
            checked ? "Planning already submitted" : "Submit planning"
          }
        >
          <CheckIcon width={18} height={18} />
          <AppText variant="body" style={styles.doneText}>
            {checked ? "Planning submitted" : "Done planning"}
          </AppText>
        </Pressable>

        <Pressable
          style={styles.infoButton}
          onPress={onInfoPress}
          accessibilityRole="button"
          accessibilityLabel="Show planning submission info"
        >
          <InfoIcon width={20} height={20} />
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  bar: {
    backgroundColor: colors.white,
    borderRadius: radius.xxl,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  doneButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.xl,
    backgroundColor: colors.beachYellow,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  doneButtonChecked: {
    opacity: 0.7,
  },
  doneText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  infoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.lightWhite,
  },
});
