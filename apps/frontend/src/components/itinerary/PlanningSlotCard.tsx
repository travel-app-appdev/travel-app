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
import { hiddenFromAccessibility } from "@/src/utils/accessibility";

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

  const handleAddPressRaw = useCallback(() => {
    if (disabled) return;
    onAddActivity(slot.id);
  }, [disabled, onAddActivity, slot.id]);

  const handleEditPressRaw = useCallback(() => {
    if (disabled || !activity) return;
    onEditActivity(activity);
  }, [disabled, activity, onEditActivity]);

  const handleAddPress = useSinglePress(handleAddPressRaw);
  const handleEditPress = useSinglePress(handleEditPressRaw);

  if (!hasActivity) {
    return (
      <Pressable
        onPress={handleAddPress}
        style={({ pressed }) => [
          styles.emptyCard,
          pressed && styles.cardPressed,
          disabled && styles.cardDisabled,
        ]}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Add activity at ${slot.label}`}
        accessibilityHint="Opens the add activity screen"
        accessibilityState={{ disabled }}
      >
        <AppText variant="body" style={styles.emptyTimeLabel}>
          {slot.label}
        </AppText>

        <View style={styles.emptyContent}>
          <View {...hiddenFromAccessibility}>
            <AddIcon width={32} height={32} color={colors.nightBlack} />
          </View>

          <AppText variant="body" style={styles.emptyTitle}>
            Empty Activity
          </AppText>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.row}>
      <View style={[styles.card, styles.filledCard]}>
        <View style={styles.timeRow} {...hiddenFromAccessibility}>
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
              {...hiddenFromAccessibility}
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
              {...hiddenFromAccessibility}
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
      </View>

      <Pressable
        onPress={handleEditPress}
        style={({ pressed }) => [
          styles.cta,
          styles.editCta,
          pressed && styles.ctaPressed,
          disabled && styles.ctaDisabled,
        ]}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Edit activity ${activity?.name} at ${slot.label}`}
        accessibilityHint="Opens the edit activity screen"
        accessibilityState={{ disabled }}
      >
        <View {...hiddenFromAccessibility}>
          <EditIcon width={24} height={24} />
        </View>

        <AppText variant="body" style={styles.ctaText} accessible={false}>
          Edit{"\n"}activity
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
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: "hidden",
  },
  emptyCard: {
    alignSelf: "stretch",
    minHeight: 90,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.nightBlack,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  filledCard: {
    borderColor: colors.nightBlack,
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
  emptyTimeLabel: {
    color: colors.nightBlack,
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
  emptyTitle: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
  },
  cta: {
    width: 92,
    minHeight: CARD_HEIGHT,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
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
    lineHeight: typography.lineHeight.xs,
  },
});
