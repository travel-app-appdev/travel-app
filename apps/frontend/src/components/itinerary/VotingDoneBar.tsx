import { StyleSheet, TouchableOpacity, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, spacing, typography } from "@/src/theme";

type Props = {
  disabled?: boolean;
  onPress: () => void;
};

export function VotingDoneBar({ disabled = false, onPress }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.doneButton, disabled && styles.doneButtonDisabled]}
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="End voting for everyone"
        >
          <AppText variant="body" style={styles.doneText}>
            End Voting
          </AppText>
        </TouchableOpacity>
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
    backgroundColor: colors.sunsetPink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  doneButtonDisabled: {
    opacity: 0.7,
  },
  doneText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 18,
  },
});