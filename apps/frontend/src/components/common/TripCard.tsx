import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors, spacing, radius, typography } from "@/src/theme";

type TripStatus = "planning" | "voting" | "final";

type Member = {
  id: string;
  initials: string;
  color: string;
};

type TripCardProps = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  members: Member[];
  cardColor: string;
  onPress?: () => void;
};

const STATUS_COLORS: Record<TripStatus, { bg: string; text: string }> = {
  planning: { bg: colors.beachYellow, text: colors.nightBlack },
  voting: { bg: colors.sunsetPink, text: colors.nightBlack },
  final: { bg: colors.neonGreen, text: colors.nightBlack },
};

export function TripCard({
  title,
  destination,
  startDate,
  endDate,
  status,
  members,
  cardColor,
  onPress,
}: TripCardProps) {
  const statusStyle = STATUS_COLORS[status];
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <Pressable
      style={[styles.card, { backgroundColor: cardColor }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${destination}, ${startDate} to ${endDate}, ${statusLabel}`}
      accessibilityHint="Opens trip details"
    >
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <AppText variant="title" style={styles.title} numberOfLines={2}>
            {title}
          </AppText>

          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <AppText
              variant="caption"
              style={[styles.badgeText, { color: statusStyle.text }]}
            >
              {statusLabel}
            </AppText>
          </View>
        </View>

        <AppText variant="caption" style={styles.destination} numberOfLines={1}>
          {destination}
        </AppText>
      </View>

      <View style={styles.footer}>
        <View style={styles.avatars}>
          {members.slice(0, 4).map((member, index) => (
            <View
              key={member.id}
              style={[
                styles.avatar,
                {
                  backgroundColor: member.color,
                  marginLeft: index === 0 ? 0 : -10,
                },
              ]}
            >
              <AppText variant="caption" style={styles.avatarText}>
                {member.initials}
              </AppText>
            </View>
          ))}
        </View>

        <AppText variant="caption" style={styles.date} numberOfLines={1}>
          {startDate} – {endDate}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    minHeight: 148,
  },
  info: {
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  title: {
    flex: 1,
    color: colors.nightBlack,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
  },
  destination: {
    color: colors.nightBlack,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontFamily: typography.fontFamily.body,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  avatars: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarText: {
    color: colors.white,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: typography.fontFamily.bodyBold,
  },
  date: {
    flex: 1,
    textAlign: "right",
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
});
