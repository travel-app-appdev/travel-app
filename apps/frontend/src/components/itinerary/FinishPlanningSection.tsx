import { StyleSheet, View } from "react-native";
import { AppButton } from "@/src/components/common/AppButton";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";

type Props = {
  completedCount: number;
  totalCount: number;
  hasCurrentUserFinished: boolean;
  onFinishPlanning: () => void;
};

export function FinishPlanningSection({
  completedCount,
  totalCount,
  hasCurrentUserFinished,
  onFinishPlanning,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <AppText variant="body" style={styles.progressText}>
        {completedCount} of {totalCount} members finished planning
      </AppText>

      <AppButton
        title={hasCurrentUserFinished ? "Planning done" : "Finish planning"}
        onPress={onFinishPlanning}
        disabled={hasCurrentUserFinished}
        style={styles.button}
        textStyle={styles.buttonText}
        accessibilityLabel={
          hasCurrentUserFinished
            ? "Planning completed for current user"
            : "Finish planning"
        }
      />

      <AppText variant="caption" style={styles.hint}>
        When all members finish planning, the itinerary can move to voting.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.lightWhite,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  progressText: {
    textAlign: "center",
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
  },
  button: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 260,
    backgroundColor: colors.beachYellow,
  },
  buttonText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
  },
  hint: {
    textAlign: "center",
    color: colors.textMuted,
  },
});
