// src/components/itinerary/VotingSlotCard.tsx
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import type { Activity } from "@/src/types/itinerary";

import LocationIcon from "@/assets/icons/location.svg";
import GoogleIcon from "@/assets/icons/google.svg";
import VoteIcon from "@/assets/icons/voting.svg";

type Props = {
  activity: Activity;
  onAddVote: (activityId: string) => void;
};

export function VotingSlotCard({ activity, onAddVote }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.card}>
        {/* Time label */}
        <View style={styles.timeRow}>
          <LocationIcon width={16} height={16} />
          <AppText variant="body" style={styles.timeLabel}>
            {activity.slotId}
          </AppText>
        </View>

        {/* Activity name */}
        <AppText variant="subtitle" style={styles.name}>
          {activity.name}
        </AppText>

        {/* Address */}
        <View style={styles.addressRow}>
          <LocationIcon width={14} height={14} />
          <AppText variant="caption" style={styles.address}>
            {activity.address}
          </AppText>
        </View>

        {/* Google Link */}
        {activity.googleMapsUrl ? (
          <View style={styles.googleRow}>
            <GoogleIcon width={14} height={14} />
            <AppText variant="caption" style={styles.googleLink}>
              Google-Link
            </AppText>
          </View>
        ) : null}
      </View>

      {/* Vote CTA */}
      <Pressable
        onPress={() => onAddVote(activity.id)}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Vote for ${activity.name}`}
      >
        <VoteIcon width={28} height={28} color={colors.nightBlack} />
        <AppText variant="body" style={styles.ctaText}>
          Add{"\n"}vote
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
  ctaText: {
    color: colors.nightBlack,
    textAlign: "center",
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
});
