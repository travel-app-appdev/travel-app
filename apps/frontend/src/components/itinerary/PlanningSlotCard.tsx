import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import type { Activity, TimeSlot } from "@/src/types/itinerary";
import LocationHeart from "@/assets/icons/location-heart.svg";
import LocationPin from "@/assets/icons/location-pin.svg";
import GoogleIcon from "@/assets/icons/google.svg";
import AddIcon from "@/assets/icons/add.svg";
import EditIcon from "@/assets/icons/edit.svg";

type Props = {
  slot: TimeSlot;
  activity?: Activity;
  onAddActivity: (slotId: string) => void;
  onEditActivity: (activity: Activity) => void;
  disabled?: boolean;
};

export function PlanningSlotCard({
  slot,
  activity,
  onAddActivity,
  onEditActivity,
  disabled = false,
}: Props) {
  const hasActivity = Boolean(activity);

  function handlePress() {
    if (disabled) return;

    if (activity) {
      onEditActivity(activity);
      return;
    }

    onAddActivity(slot.id);
  }

  return (
    <View style={styles.row}>
      <View style={styles.card}>
        {hasActivity ? (
          <View style={styles.filledContent}>
            <View style={styles.timeRow}>
              <LocationPin width={18} height={18} />
              <AppText variant="body" style={styles.filledTimeLabel}>
                {slot.label}
              </AppText>
            </View>

            <AppText
              variant="subtitle"
              style={styles.activityTitle}
              numberOfLines={2}
            >
              {activity?.name}
            </AppText>

            {!!activity?.address && (
              <View style={styles.infoRow}>
                <LocationPin width={16} height={16} />
                <AppText
                  variant="body"
                  style={styles.infoText}
                  numberOfLines={1}
                >
                  {activity.address}
                </AppText>
              </View>
            )}

            {!!activity?.googleMapsUrl && (
              <View style={styles.infoRow}>
                <GoogleIcon width={16} height={16} />
                <AppText
                  variant="body"
                  style={styles.linkText}
                  numberOfLines={1}
                >
                  Google-Link
                </AppText>
              </View>
            )}
          </View>
        ) : (
          <>
            <AppText variant="body" style={styles.timeLabel}>
              {slot.label}
            </AppText>

            <View style={styles.emptyContent}>
              <View style={styles.emptyIconWrapper}>
                <LocationHeart width={20} height={20} />
              </View>
              <AppText variant="subtitle" style={styles.emptyTitle}>
                Empty Activity
              </AppText>
            </View>
          </>
        )}
      </View>

      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.cta,
          hasActivity ? styles.editCta : styles.addCta,
          pressed && styles.ctaPressed,
          disabled && styles.ctaDisabled,
        ]}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={
          disabled
            ? "Planning locked"
            : hasActivity
              ? `Edit activity for ${slot.label}`
              : `Add activity for ${slot.label}`
        }
        accessibilityHint={
          disabled
            ? "You already submitted your planning"
            : hasActivity
              ? "Opens activity editing for this time slot"
              : "Opens activity creation for this time slot"
        }
      >
        {hasActivity ? (
          <EditIcon width={28} height={28} />
        ) : (
          <AddIcon width={28} height={28} />
        )}

        <AppText variant="body" style={styles.ctaText}>
          {hasActivity ? "Edit activity" : "Add activity"}
        </AppText>
      </Pressable>
    </View>
  );
}

const CARD_HEIGHT = 108;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "stretch",
  },
  card: {
    flex: 1,
    height: CARD_HEIGHT,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    overflow: "hidden",
  },
  timeLabel: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily.bodyBold,
  },
  filledTimeLabel: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  emptyContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  emptyIconWrapper: {
    opacity: 0.35,
  },
  emptyTitle: {
    color: colors.textMuted,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
  },
  filledContent: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  activityTitle: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
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
    flex: 1,
  },
  cta: {
    width: 92,
    height: CARD_HEIGHT,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  addCta: {
    backgroundColor: colors.beachYellow,
  },
  editCta: {
    backgroundColor: colors.border,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: colors.textPrimary,
    textAlign: "center",
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
});
