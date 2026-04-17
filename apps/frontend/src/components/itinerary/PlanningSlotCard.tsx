import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import type { TimeSlot } from "@/src/types/itinerary";

type Props = {
  slot: TimeSlot;
  onAddActivity: (slotId: string) => void;
};

export function PlanningSlotCard({ slot, onAddActivity }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.card}>
        <AppText variant="body" style={styles.timeLabel}>
          {slot.label}
        </AppText>

        <View style={styles.emptyContent}>
          <AppText variant="subtitle" style={styles.emptyTitle}>
            Empty Activity
          </AppText>
        </View>
      </View>

      <Pressable
        onPress={() => onAddActivity(slot.id)}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Add activity for ${slot.label}`}
        accessibilityHint="Opens activity creation for this time slot"
      >
        <AppText variant="body" style={styles.ctaPlus}>
          +
        </AppText>
        <AppText variant="body" style={styles.ctaText}>
          Add activity
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "stretch",
  },
  card: {
    flex: 1,
    minHeight: 110,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    justifyContent: "space-between",
  },
  timeLabel: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily.bodyBold,
  },
  emptyContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: colors.textMuted,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
  },
  cta: {
    width: 92,
    minHeight: 110,
    borderRadius: radius.xl,
    backgroundColor: colors.beachYellow,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaPlus: {
    color: colors.textPrimary,
    fontSize: 28,
    lineHeight: 28,
    fontFamily: typography.fontFamily.bodyBold,
  },
  ctaText: {
    color: colors.textPrimary,
    textAlign: "center",
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
});
