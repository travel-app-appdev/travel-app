import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import { useSinglePress } from "@/src/hooks/useSinglePress";
import type { Activity } from "@/src/types/itinerary";

import LocationHeartIcon from "@/assets/icons/location-heart.svg";
import LocationPin from "@/assets/icons/location-pin.svg";
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

const CARD_HEIGHT = 108;

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
            <LocationHeartIcon
              width={20}
              height={20}
              color={colors.textMuted}
            />
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
          <LocationHeartIcon width={24} height={24} />
          <AppText variant="body" style={styles.timeLabel}>
            {slot.label}
          </AppText>
        </View>

        <AppText variant="subtitle" style={styles.name} numberOfLines={2}>
          {activity.name}
        </AppText>

        <View style={styles.addressRow} {...hiddenFromAccessibility}>
          <LocationPin width={16} height={16} />
          <AppText variant="caption" style={styles.address} numberOfLines={1}>
            {activity.address}
          </AppText>
        </View>

        <View style={styles.metaRow} {...hiddenFromAccessibility}>
          {activity.googleMapsUrl ? (
            <View style={styles.googleRow}>
              <GoogleIcon width={14} height={14} />
              <AppText
                variant="caption"
                style={styles.googleLink}
                numberOfLines={1}
              >
                Google Maps link
              </AppText>
            </View>
          ) : (
            <View style={styles.googleRow} />
          )}

          <View style={styles.joinedRow}>
            <MembersIcon width={14} height={14} />
            <AppText
              variant="caption"
              style={styles.joinedCount}
              numberOfLines={1}
            >
              {activity.joinedCount ?? 0} joined
            </AppText>
          </View>
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
            <CheckIcon width={24} height={24} color={colors.nightBlack} />
          ) : (
            <JoinGroup width={24} height={24} />
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
    minHeight: CARD_HEIGHT,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: "space-between",
    overflow: "hidden",
    opacity: 0.6,
  },
  emptyTimeLabel: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
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
    minHeight: CARD_HEIGHT,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.nightBlack,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.9,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 2,
  },
  timeLabel: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
  name: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    marginBottom: 2,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 1,
  },
  address: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  googleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  googleLink: {
    flexShrink: 1,
    color: colors.seaBlue,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
  joinedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 0,
  },
  joinedCount: {
    color: colors.textMuted,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  cta: {
    width: 92,
    minHeight: CARD_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: colors.neonGreen,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  joinIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: colors.nightBlack,
    textAlign: "center",
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.xs,
  },
});
