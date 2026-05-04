import { Platform, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors, spacing, radius, typography } from "@/src/theme";
import Edit from "@/assets/icons/edit.svg";
import InfoIcon from "@/assets/icons/info.svg";

type TripStatus = "planning" | "voting" | "final";
type TripRole = "admin" | "member";

type Member = {
  id: string;
  initials: string;
  color: string;
};

type TripCardProps = {
  tripId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  members: Member[];
  cardColor: string;
  role: TripRole;
  onPress?: () => void;
  onIconPress?: () => void;
};

const STATUS_COLORS: Record<TripStatus, { bg: string; text: string }> = {
  planning: { bg: colors.beachYellow, text: colors.nightBlack },
  voting: { bg: colors.sunsetPink, text: colors.nightBlack },
  final: { bg: colors.neonGreen, text: colors.nightBlack },
};

const STATUS_LABELS: Record<TripStatus, string> = {
  planning: "Planning",
  voting: "Voting",
  final: "Final",
};

export function TripCard({
  tripId,
  title,
  destination,
  startDate,
  endDate,
  status,
  members,
  cardColor,
  role,
  onPress,
  onIconPress,
}: TripCardProps) {
  const statusStyle = STATUS_COLORS[status];
  const statusLabel = STATUS_LABELS[status];

  return (
    <Pressable
      style={[styles.card, { backgroundColor: cardColor }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${destination}, ${startDate} to ${endDate}, ${statusLabel}`}
      accessibilityHint={
        role === "admin" ? "Opens trip settings" : "Opens trip information"
      }
    >
      {/* Row 1: title + status badge */}
      <View style={styles.titleRow}>
        <AppText variant="title" style={styles.title} numberOfLines={2}>
          {title}
        </AppText>

        <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
          <AppText variant="caption" style={styles.badgeText}>
            {statusLabel}
          </AppText>
        </View>
      </View>

      {/* Row 2: destination + date */}
      <View style={styles.middleRow}>
        <AppText variant="caption" style={styles.destination} numberOfLines={1}>
          {destination}
        </AppText>

        <AppText variant="caption" style={styles.date} numberOfLines={1}>
          {startDate} – {endDate}
        </AppText>
      </View>

      {/* Row 3: avatars + icon on the same line */}
      <View style={styles.bottomRow}>
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

        {/*accessibilityRole="button" only on mobile, on web it turns
        View into <button> causing nested button error.
        On mobile screen readers correctly announce it as a button. */}
        <View
          style={styles.iconButton}
          {...(Platform.OS !== "web" ? { accessibilityRole: "button" } : {})}
          accessibilityLabel={role === "admin" ? "Edit trip" : "Trip information"}
          accessibilityHint={
            role === "admin"
              ? "Opens trip settings"
              : "Opens trip information screen"
          }
          onStartShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            e.stopPropagation();
            onIconPress?.();
          }}
        >
          {role === "admin" ? (
            <Edit width={22} height={22} />
          ) : (
            <InfoIcon width={22} height={22} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    minHeight: 148,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
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
    color: colors.nightBlack,
  },
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  destination: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    flex: 1,
  },
  date: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    textAlign: "right",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  avatars: {
    flexDirection: "row",
    alignItems: "center",
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
    color: colors.nightBlack,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: typography.fontFamily.bodyBold,
  },
  iconButton: {
    padding: 8,
    marginRight: -8,
  },
});