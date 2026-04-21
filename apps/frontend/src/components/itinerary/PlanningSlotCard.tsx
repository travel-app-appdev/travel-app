import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import type { Activity, TimeSlot } from "@/src/types/itinerary";
import LocationHeart from "@/assets/icons/location-heart.svg";
import LocationPin from "@/assets/icons/location-pin.svg";
import GoogleIcon from "@/assets/icons/google.svg";

type Props = {
  slot: TimeSlot;
  activity?: Activity;
  onAddActivity: (slotId: string) => void;
};

export function PlanningSlotCard({ slot, activity, onAddActivity }: Props) {
  const hasActivity = Boolean(activity);

  return (
    <View style={styles.row}>
      <View style={styles.card}>
        <AppText variant="body" style={styles.timeLabel}>
          {slot.label}
        </AppText>

        {hasActivity ? (
          <View style={styles.filledContent}>
            <AppText variant="subtitle" style={styles.activityTitle}>
              {activity?.name}
            </AppText>

            {!!activity?.address && (
              <View style={styles.infoRow}>
                <LocationPin width={18} height={18} />
                <AppText variant="body" style={styles.infoText}>
                  {activity.address}
                </AppText>
              </View>
            )}

            {!!activity?.googleMapsUrl && (
              <View style={styles.infoRow}>
                <GoogleIcon width={18} height={18} />
                <AppText variant="body" style={styles.linkText}>
                  Google-Link
                </AppText>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyContent}>
            <LocationHeart width={20} height={20} style={styles.emptyIcon} />
            <AppText variant="subtitle" style={styles.emptyTitle}>
              Empty Activity
            </AppText>
          </View>
        )}
      </View>

      {!hasActivity && (
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
      )}
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
  emptyIcon: {
    marginBottom: spacing.xs,
  },
  filledContent: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  activityTitle: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  infoText: {
    flex: 1,
    color: colors.nightBlack,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
  linkText: {
    color: colors.nightBlack,
    textDecorationLine: "underline",
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
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
