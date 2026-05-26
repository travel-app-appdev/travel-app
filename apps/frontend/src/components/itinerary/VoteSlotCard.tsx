import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import { useSinglePress } from "@/src/hooks/useSinglePress";
import type { Activity } from "@/src/types/itinerary";
import { formatActivityTimeRange } from "@/src/utils/itinerary/formatActivityTimeRange";

import LocationIcon from "@/assets/icons/location-heart.svg";
import LocationPin from "@/assets/icons/location-pin.svg";
import GoogleIcon from "@/assets/icons/google.svg";
import VoteIcon from "@/assets/icons/voting.svg";
import CheckIcon from "@/assets/icons/check_mark.svg";
import Timer from "@/assets/icons/timer.svg";
import { hiddenFromAccessibility } from "@/src/utils/accessibility";

type Props = {
  activity: Activity;
  onAddVote: (activityId: string) => void;
  onPressDetails?: (activity: Activity) => void;
  selected?: boolean;
};

const CARD_HEIGHT = 108;

export function VotingSlotCard({
  activity,
  onAddVote,
  onPressDetails,
  selected = false,
}: Props) {
  const handleVote = useSinglePress(() => onAddVote(activity.id));
  const handleOpenDetails = useSinglePress(() => onPressDetails?.(activity));
  const activityTimeRange = formatActivityTimeRange(activity);

  const hasAddress = !!activity.address?.trim();
  const hasGoogleMapsUrl = !!activity.googleMapsUrl?.trim();
  const voteCount = activity.voteCount ?? 0;
  const voteLabel = `${voteCount} ${voteCount === 1 ? "vote" : "votes"}`;

  const detailParts = [
    activityTimeRange ? `time ${activityTimeRange}` : null,
    hasAddress ? `address ${activity.address.trim()}` : null,
    hasGoogleMapsUrl ? "Google Maps link available" : null,
  ].filter(Boolean);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={handleOpenDetails}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={
          detailParts.length > 0
            ? `Open details for ${activity.name}, ${detailParts.join(", ")}`
            : `Open details for ${activity.name}`
        }
        accessibilityHint="Shows more information about this activity"
      >
        <View style={styles.timeRow} {...hiddenFromAccessibility}>
          <LocationIcon width={24} height={24} />
          <AppText variant="body" style={styles.timeLabel}>
            {activity.slotId}
          </AppText>
        </View>

        <AppText variant="subtitle" style={styles.name} numberOfLines={2}>
          {activity.name}
        </AppText>

        {hasAddress ? (
          <>
            {!!activityTimeRange && (
              <View
                style={styles.detailRow}
                accessible={true}
                accessibilityLabel={`Activity time: ${activityTimeRange}`}
              >
                <Timer width={16} height={16} {...hiddenFromAccessibility} />
                <AppText
                  variant="caption"
                  style={styles.detailText}
                  accessible={false}
                  numberOfLines={1}
                >
                  {activityTimeRange}
                </AppText>
              </View>
            )}

            <View
              style={styles.detailRow}
              accessible={true}
              accessibilityLabel={`Address: ${activity.address.trim()}, ${voteLabel}`}
            >
              <LocationPin
                width={16}
                height={16}
                {...hiddenFromAccessibility}
              />

              <AppText
                variant="caption"
                style={styles.detailText}
                accessible={false}
                numberOfLines={1}
              >
                {activity.address.trim()}
              </AppText>

              <View
                style={styles.inlineVote}
                accessibilityLiveRegion="polite"
                accessible={false}
              >
                <AppText
                  variant="caption"
                  style={styles.voteCount}
                  numberOfLines={1}
                >
                  {voteLabel}
                </AppText>
              </View>
            </View>
          </>
        ) : !!activityTimeRange ? (
          <View
            style={styles.detailRow}
            accessible={true}
            accessibilityLabel={`Activity time: ${activityTimeRange}, ${voteLabel}`}
          >
            <Timer width={16} height={16} {...hiddenFromAccessibility} />

            <AppText
              variant="caption"
              style={styles.detailText}
              accessible={false}
              numberOfLines={1}
            >
              {activityTimeRange}
            </AppText>

            <View
              style={styles.inlineVote}
              accessibilityLiveRegion="polite"
              accessible={false}
            >
              <AppText
                variant="caption"
                style={styles.voteCount}
                numberOfLines={1}
              >
                {voteLabel}
              </AppText>
            </View>
          </View>
        ) : (
          <View
            style={styles.nameVoteRow}
            accessible={true}
            accessibilityLabel={voteLabel}
          >
            <View style={styles.nameVoteSpacer} />
            <AppText
              variant="caption"
              style={styles.voteCount}
              numberOfLines={1}
            >
              {voteLabel}
            </AppText>
          </View>
        )}

        {hasGoogleMapsUrl && (
          <View
            style={styles.googleRow}
            accessible={true}
            accessibilityLabel="Google Maps link available"
          >
            <GoogleIcon width={14} height={14} {...hiddenFromAccessibility} />
            <AppText
              variant="caption"
              style={styles.googleLink}
              accessible={false}
              numberOfLines={1}
            >
              Google Maps link
            </AppText>
          </View>
        )}
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
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 1,
  },
  detailText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
  inlineVote: {
    flexShrink: 0,
    marginLeft: spacing.sm,
  },
  nameVoteRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
  },
  nameVoteSpacer: {
    flex: 1,
  },
  googleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
    minWidth: 0,
  },
  googleLink: {
    flexShrink: 1,
    color: colors.seaBlue,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
  cta: {
    width: 92,
    minHeight: CARD_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: colors.sunsetPink,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
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
    lineHeight: typography.lineHeight.xs,
  },
  voteCount: {
    color: colors.textMuted,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
});
