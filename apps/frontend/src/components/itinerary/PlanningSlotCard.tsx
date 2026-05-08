import { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import { useSinglePress } from "@/src/hooks/useSinglePress";
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

  const handlePressRaw = useCallback(() => {
    if (disabled) return;
    if (activity) {
      onEditActivity(activity);
      return;
    }
    onAddActivity(slot.id);
  }, [disabled, activity, onEditActivity, onAddActivity, slot.id]);

  const handlePress = useSinglePress(handlePressRaw);

  return (
    <View style={styles.row}>
      <View style={[styles.card, hasActivity && styles.filledCard]}>
        {hasActivity ? (
          <>
            <View
              style={styles.timeRow}
              accessible={false}
              importantForAccessibility="no-hide-descendants"
            >
              <LocationHeart width={24} height={24} />
              <AppText variant="body" style={styles.filledTimeLabel}>
                {slot.label}
              </AppText>
            </View>

            <AppText
              variant="body"
              style={styles.activityTitle}
              numberOfLines={2}
            >
              {activity?.name}
            </AppText>

            {!!activity?.address && (
              <View
                style={styles.infoRow}
                accessible={true}
                accessibilityLabel={`Address: ${activity.address}`}
              >
                <LocationPin
                  width={20}
                  height={20}
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                />
                <AppText
                  variant="body"
                  style={styles.infoText}
                  numberOfLines={1}
                  accessible={false}
                >
                  {activity.address}
                </AppText>
              </View>
            )}

            {!!activity?.googleMapsUrl && (
              <View
                style={styles.infoRow}
                accessible={true}
                accessibilityLabel="Google Maps link available"
              >
                <GoogleIcon
                  width={20}
                  height={20}
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                />
                <AppText
                  variant="body"
                  style={styles.linkText}
                  numberOfLines={1}
                  accessible={false}
                >
                  {activity.googleMapsUrl}
                </AppText>
              </View>
            )}
          </>
        ) : (
          <>
            <AppText variant="body" style={styles.timeLabel}>
              {slot.label}
            </AppText>

            <View style={styles.emptyContent}>
              <View
                style={styles.emptyIconWrapper}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              >
                <LocationHeart width={24} height={24} />
              </View>

              <AppText variant="body" style={styles.emptyTitle}>
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
          hasActivity
            ? `Edit activity ${activity?.name} at ${slot.label}`
            : `Add activity at ${slot.label}`
        }
        accessibilityHint={
          hasActivity
            ? "Opens the edit activity screen"
            : "Opens the add activity screen"
        }
        accessibilityState={{ disabled }}
      >
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          {hasActivity ? (
            <EditIcon width={36} height={36} />
          ) : (
            <AddIcon width={36} height={36} />
          )}
        </View>

        <AppText
          variant="body"
          style={styles.ctaText}
          accessible={false}
        >
          {hasActivity ? "Edit\nactivity" : "Add\nactivity"}
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
    minHeight: CARD_HEIGHT,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: "hidden",
  },
  filledCard: {
    borderColor: colors.nightBlack,
  },
  filledContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 2,
  },
  filledTimeLabel: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
  activityTitle: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
  linkText: {
    flex: 1,
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.body,
    textDecorationLine: "underline",
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
  timeLabel: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
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
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
  },
  cta: {
    width: 92,
    minHeight: CARD_HEIGHT,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
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
    color: colors.nightBlack,
    textAlign: "center",
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
});