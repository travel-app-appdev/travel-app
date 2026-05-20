import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import { useSinglePress } from "@/src/hooks/useSinglePress";
import type { Activity } from "@/src/types/itinerary";

import LocationIcon from "@/assets/icons/location.svg";
import GoogleIcon from "@/assets/icons/google.svg";
import MembersIcon from "@/assets/icons/members.svg";
import JoinGroup from "@/assets/icons/join-group.svg";
import CheckIcon from "@/assets/icons/check_mark.svg";
import { hiddenFromAccessibility } from "@/src/utils/accessibility";

type Props = {
  slot: { id: string; label: string };
  activity?: Activity;
  onJoinGroup?: (activityId: string) => void;
  onPressDetails?: (activity: Activity, slotLabel: string) => void;
};

export function FinalSlotCard({
  slot,
  activity,
  onJoinGroup,
  onPressDetails,
}: Props) {
  const handleJoin = useSinglePress(() => onJoinGroup?.(activity!.id));
  const handleOpenDetails = useSinglePress(() => {
    if (activity) {
      onPressDetails?.(activity, slot.label);
    }
  });

  if (!activity) {
    return (
      <View style={styles.emptyRow}>
        <View style={styles.emptyCard}>
          <AppText variant="body" style={styles.emptyTimeLabel}>
            {slot.label}
          </AppText>
          <View style={styles.emptyContent} {...hiddenFromAccessibility}>
            <LocationIcon width={20} height={20} color={colors.textMuted} />
            <AppText variant="subtitle" style={styles.emptyTitle}>
              Empty Activity
            </AppText>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Pressable
        onPress={handleOpenDetails}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open details for ${activity.name}`}
        accessibilityHint="Shows more information about this activity"
      >
        <View style={styles.timeRow} {...hiddenFromAccessibility}>
          <LocationIcon width={16} height={16} />
          <AppText variant="body" style={styles.timeLabel}>
            {slot.label}
          </AppText>
        </View>

        <AppText variant="subtitle" style={styles.name}>
          {activity.name}
        </AppText>

        <View style={styles.addressRow} {...hiddenFromAccessibility}>
          <LocationIcon width={14} height={14} />
          <AppText variant="caption" style={styles.address}>
            {activity.address}
          </AppText>
        </View>

        {activity.googleMapsUrl ? (
          <View style={styles.googleRow} {...hiddenFromAccessibility}>
            <GoogleIcon width={14} height={14} />
            <AppText variant="caption" style={styles.googleLink}>
              Google Maps link
            </AppText>
          </View>
        ) : null}

        <View style={styles.joinedRow} {...hiddenFromAccessibility}>
          <MembersIcon width={14} height={14} />
          <AppText variant="caption" style={styles.joinedCount}>
            {activity.joinedCount ?? 0} joined
          </AppText>
        </View>
      </Pressable>

      <Pressable
        onPress={handleJoin}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        accessibilityRole="button"
        accessibilityLabel={
          activity.hasCurrentUserJoined
            ? `Leave group for ${activity.name}`
            : `Join group for ${activity.name}`
        }
        accessibilityHint={
          activity.hasCurrentUserJoined
            ? "Removes you from this activity group"
            : "Adds you to this activity group"
        }
        accessibilityState={{ checked: activity.hasCurrentUserJoined }}
      >
        <View style={styles.joinIcon} {...hiddenFromAccessibility}>
          {activity.hasCurrentUserJoined ? (
            <CheckIcon width={36} height={36} color={colors.nightBlack} />
          ) : (
            <JoinGroup width={36} height={36} />
          )}
        </View>
        <AppText variant="body" style={styles.ctaText} accessible={false}>
          {activity.hasCurrentUserJoined ? "Joined\ngroup" : "Join\ngroup"}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyRow: {
    flexDirection: "row",
  },
  emptyCard: {
    flex: 1,
    minHeight: 90,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    justifyContent: "space-between",
    opacity: 0.6,
  },
  emptyTimeLabel: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily.bodyBold,
  },
  emptyContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  emptyTitle: {
    color: colors.textMuted,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "stretch",
  },
  card: {
    flex: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardPressed: {
    opacity: 0.9,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  timeLabel: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  address: {
    color: colors.textMuted,
    flexShrink: 1,
  },
  googleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  googleLink: {
    color: colors.seaBlue,
    fontFamily: typography.fontFamily.bodySemiBold,
  },
  joinedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  joinedCount: {
    color: colors.textMuted,
  },
  cta: {
    width: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.plantGreen,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  joinIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  joinPlus: {
    fontSize: 28,
    color: colors.nightBlack,
    lineHeight: 32,
  },
  ctaText: {
    color: colors.nightBlack,
    textAlign: "center",
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
});
