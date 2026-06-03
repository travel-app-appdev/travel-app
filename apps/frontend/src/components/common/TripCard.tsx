import { Platform, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors, spacing, radius, typography } from "@/src/theme";
import { useSinglePress } from "@/src/hooks/useSinglePress";
import CardArrow from "@/assets/icons/card_arrow.svg";

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
  onStatusPress?: (status: TripStatus) => void;
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
  onStatusPress,
}: TripCardProps) {
  const statusStyle = STATUS_COLORS[status];
  const statusLabel = STATUS_LABELS[status];

  const handleCardPress = useSinglePress(onPress ?? (() => {}));
  const handleStatusPress = useSinglePress(() => onStatusPress?.(status));
  const webStatusButtonProps =
    Platform.OS === "web"
      ? ({
          tabIndex: 0,
          onKeyDown: (event: {
            key?: string;
            preventDefault?: () => void;
            stopPropagation?: () => void;
          }) => {
            if (event.key !== "Enter" && event.key !== " ") return;

            event.preventDefault?.();
            event.stopPropagation?.();
            handleStatusPress();
          },
          onClick: (event: {
            preventDefault?: () => void;
            stopPropagation?: () => void;
          }) => {
            event.preventDefault?.();
            event.stopPropagation?.();
            handleStatusPress();
          },
        } as const)
      : {};

  const badgeContent = (
    <>
      <AppText variant="caption" style={styles.badgeText}>
        {statusLabel}
      </AppText>
      <CardArrow width={14} height={14} />
    </>
  );

  return (
    <Pressable
      style={[styles.card, { backgroundColor: cardColor }]}
      onPress={handleCardPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${destination}, ${startDate} to ${endDate}, ${statusLabel}`}
      accessibilityHint="Opens trip overview"
    >
      <View style={styles.titleRow}>
        <AppText variant="title" style={styles.title} numberOfLines={2}>
          {title}
        </AppText>

        {Platform.OS === "web" ? (
          <View
            style={[styles.badge, { backgroundColor: statusStyle.bg }]}
            accessibilityRole="button"
            accessibilityLabel={`${statusLabel} phase`}
            accessibilityHint="Opens the itinerary at this phase"
            {...webStatusButtonProps}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(e) => {
              e.stopPropagation();
            }}
          >
            {badgeContent}
          </View>
        ) : (
          <Pressable
            style={[styles.badge, { backgroundColor: statusStyle.bg }]}
            onPress={(e) => {
              e.stopPropagation();
              handleStatusPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={`${statusLabel} phase`}
            accessibilityHint="Opens the itinerary at this phase"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {badgeContent}
          </Pressable>
        )}
      </View>

      <View style={styles.middleRow}>
        <AppText variant="caption" style={styles.destination} numberOfLines={1}>
          {destination}
        </AppText>
      </View>

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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignSelf: "flex-start",
    // drop shadow
    shadowColor: colors.nightBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
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
  },
  destination: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    flex: 1,
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
  date: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    textAlign: "right",
  },
});