import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import { useSinglePress } from "@/src/hooks/useSinglePress";
import type { Activity } from "@/src/types/itinerary";

import LocationIcon from "@/assets/icons/location.svg";
import GoogleIcon from "@/assets/icons/google.svg";
import VoteIcon from "@/assets/icons/voting.svg";
import CheckIcon from "@/assets/icons/check_mark.svg";
import { hiddenFromAccessibility } from "@/src/utils/accessibility";

type Props = {
  activity: Activity;
  onAddVote: (activityId: string) => void;
  onPressDetails?: (activity: Activity) => void;
  selected?: boolean;
};

export function VotingSlotCard({
  activity,
  onAddVote,
  onPressDetails,
  selected = false,
}: Props) {
  const handleVote = useSinglePress(() => onAddVote(activity.id));
  const handleOpenDetails = useSinglePress(() => onPressDetails?.(activity));

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
            {activity.slotId}
          </AppText>
        </View>

        <AppText variant="subtitle" style={styles.name}>
          {activity.name}
        </AppText>

        <View
          style={styles.addressRow}
          accessible={true}
          accessibilityLabel={`Address: ${activity.address}`}
        >
          <LocationIcon width={14} height={14} {...hiddenFromAccessibility} />
          <AppText variant="caption" style={styles.address} accessible={false}>
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

        <View
          accessibilityLiveRegion="polite"
          accessible={true}
          accessibilityLabel={`${activity.voteCount ?? 0} ${activity.voteCount === 1 ? "vote" : "votes"}`}
        >
          <AppText variant="caption" style={styles.voteCount}>
            {activity.voteCount ?? 0}{" "}
            {activity.voteCount === 1 ? "vote" : "votes"}
          </AppText>
        </View>
      </Pressable>

      <Pressable
        onPress={handleVote}
        style={({ pressed }) => [
          styles.cta,
          selected && styles.ctaSelected,
          pressed && styles.ctaPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          selected
            ? `Remove vote for ${activity.name}`
            : `Vote for ${activity.name}`
        }
        accessibilityHint={
          selected
            ? "Removes your vote for this activity"
            : "Adds your vote for this activity"
        }
        accessibilityState={{ selected }}
      >
        <View {...hiddenFromAccessibility}>
          {selected ? (
            <CheckIcon width={28} height={28} color={colors.nightBlack} />
          ) : (
            <VoteIcon width={28} height={28} color={colors.nightBlack} />
          )}
        </View>

        <AppText variant="body" style={styles.ctaText} accessible={false}>
          {selected ? "Added\nvote" : "Add\nvote"}
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
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.xs,
    justifyContent: "center",
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
  voteCount: {
    color: colors.textMuted,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    marginTop: spacing.xs,
  },
  cta: {
    width: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.sunsetPink,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaSelected: {
    backgroundColor: colors.sunsetPink,
  },
  ctaText: {
    color: colors.nightBlack,
    textAlign: "center",
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
});
