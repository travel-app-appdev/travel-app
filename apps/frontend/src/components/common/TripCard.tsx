// src/components/common/TripCard.tsx
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing, radius } from '@/src/theme';

type TripStatus = 'planning' | 'voting';

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
    <Pressable style={[styles.card, { backgroundColor: cardColor }]} onPress={onPress}>
      
      {/* Trip info */}
      <View style={styles.info}>
        
        {/* Title + badge row */}
        <View style={styles.titleRow}>
          <AppText variant="title" style={styles.title}>
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

        <AppText variant="caption" style={styles.destination}>
          {destination}
        </AppText>
      </View>

      {/* Footer: avatars + date */}
      <View style={styles.footer}>
        <View style={styles.avatars}>
          {members.slice(0, 4).map((member, index) => (
            <View
              key={member.id}
              style={[
                styles.avatar,
                { backgroundColor: member.color, marginLeft: index === 0 ? 0 : -10 },
              ]}
            >
              <AppText variant="caption" style={styles.avatarText}>
                {member.initials}
              </AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" style={styles.date}>
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
    paddingVertical: spacing.xxl,
    gap: spacing.lg,
    minHeight: 160,
  },

  info: {
    gap: spacing.xs,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },

  badgeText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
  },

  title: {
    fontSize: 28,
    lineHeight: 36,
    color: colors.nightBlack,
    flex: 1,
    flexWrap: 'wrap',
  },

  destination: {
    color: colors.nightBlack,
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },

  avatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },

  avatarText: {
    color: colors.white,
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },

  date: {
    color: colors.nightBlack,
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
  },
});