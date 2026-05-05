import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import type { Activity } from "@/src/types/itinerary";

import LocationIcon from "@/assets/icons/location.svg";
import GoogleIcon from "@/assets/icons/google.svg";
import VoteIcon from "@/assets/icons/voting.svg";
import CheckIcon from "@/assets/icons/check_mark.svg";

type Props = {
  activity: Activity;
  onAddVote: (activityId: string) => void;
  selected?: boolean;
};

export function VotingSlotCard({ activity, onAddVote, selected = false }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.card}>

        {/* Time label — icon is decorative */}
        <View
          style={styles.timeRow}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <LocationIcon width={16} height={16} />
          <AppText variant="body" style={styles.timeLabel}>
            {activity.slotId}
          </AppText>
        </View>

        {/* Activity name */}
        <AppText variant="subtitle" style={styles.name}>
          {activity.name}
        </AppText>

        {/* Address — icon is decorative */}
        <View
          style={styles.addressRow}
          accessible={true}
          accessibilityLabel={`Address: ${activity.address}`}
        >
          <LocationIcon
            width={14}
            height={14}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          />
          <AppText
            variant="caption"
            style={styles.address}
            accessible={false}
          >
            {activity.address}
          </AppText>
        </View>

        {/* Google Link — icon is decorative */}
        {activity.googleMapsUrl ? (
          <View
            style={styles.googleRow}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <GoogleIcon width={14} height={14} />
            <AppText variant="caption" style={styles.googleLink}>
              Google Maps link
            </AppText>
          </View>
        ) : null}

        {/* Vote count — live region so screen readers announce changes */}
        <View
          accessibilityLiveRegion="polite"
          accessible={true}
          accessibilityLabel={`${activity.voteCount ?? 0} ${activity.voteCount === 1 ? "vote" : "votes"}`}
        >
          <AppText variant="caption" style={styles.voteCount}>
            {activity.voteCount ?? 0} {activity.voteCount === 1 ? "vote" : "votes"}
          </AppText>
        </View>
      </View>

      {/* Vote CTA */}
      <Pressable
        onPress={() => onAddVote(activity.id)}
        style={({ pressed }) => [
          styles.cta,
          selected && styles.ctaSelected,
          pressed && styles.ctaPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={selected ? `Remove vote for ${activity.name}` : `Vote for ${activity.name}`}
        accessibilityHint={selected ? "Removes your vote for this activity" : "Adds your vote for this activity"}
        accessibilityState={{ selected }}
      >
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          {selected ? (
            <CheckIcon width={28} height={28} color={colors.nightBlack} />
          ) : (
            <VoteIcon width={28} height={28} color={colors.nightBlack} />
          )}
        </View>
        <AppText
          variant="body"
          style={styles.ctaText}
          accessible={false}
        >
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