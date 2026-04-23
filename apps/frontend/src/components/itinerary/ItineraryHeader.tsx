// src/components/itinerary/ItineraryHeader.tsx
import { StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import { formatTripDateRange } from "@/src/utils/itinerary/formatTripToDateRange";
import { Link } from "expo-router";
import type { ItineraryState } from "@/src/types/itinerary";

import Back from "@/assets/icons/back.svg";
import MascotWink from "@/assets/mascots/mascot-wink.svg";
import CalendarIcon from "@/assets/icons/calendar.svg";
import HourglassIcon from "@/assets/icons/hourglass.svg";
import LocationPin from "@/assets/icons/location-pin.svg";

type Props = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  introText: string;
  daysLeftText?: string;
  onBackPress: () => void;
  state?: ItineraryState;
};

/** Maps itinerary state to the hero background color */
function getHeroColor(state: ItineraryState): string {
  switch (state) {
    case "voting":
      return colors.sunsetPink;
    case "final":
      return colors.plantGreen;
    case "planning":
    default:
      return colors.beachYellow;
  }
}

export function ItineraryHeader({
  title,
  destination,
  startDate,
  endDate,
  introText,
  daysLeftText = "73 days",
  onBackPress,
  state = "planning",
}: Props) {
  const heroColor = getHeroColor(state);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.hero, { backgroundColor: heroColor }]}>
        <View style={styles.topRow}>
          <Link
            href="/home"
            accessibilityLabel="Go back to welcome screen"
            accessibilityRole="link"
          >
            <Back width={20} height={20} />
          </Link>

          <View style={styles.timerBox}>
            <HourglassIcon width={18} height={18} />
            <View>
              <AppText variant="body" style={styles.timerValue}>
                {daysLeftText}
              </AppText>
              <AppText variant="caption" style={styles.timerLabel}>
                Timer
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.heroContent}>
          <MascotWink width={64} height={64} />

          <View style={styles.textBlock}>
            <AppText variant="title" style={styles.title}>
              {title}
            </AppText>

            <AppText variant="subtitle" style={styles.destination}>
              <LocationPin width={18} height={18} style={styles.locationPin} />
              {destination}
            </AppText>
          </View>

          <View style={styles.dateBadge}>
            <CalendarIcon width={18} height={18} />
            <AppText variant="body" style={styles.dateText}>
              {formatTripDateRange(startDate, endDate)}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.contentTopCard}>
        <AppText variant="subtitle" style={styles.intro}>
          {introText}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 0,
  },
  hero: {
    // backgroundColor set dynamically via style prop
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  timerBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  timerValue: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  timerLabel: {
    color: colors.nightBlack,
  },
  heroContent: {
    gap: spacing.sm,
  },
  textBlock: {
    gap: spacing.xs,
  },
  title: {
    color: colors.nightBlack,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
  },
  destination: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
  },
  locationPin: {
    color: colors.nightBlack,
    paddingRight: spacing.md,
  },
  intro: {
    color: colors.nightBlack,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
  },
  dateBadge: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dateText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  contentTopCard: {
    backgroundColor: colors.lightWhite,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    marginTop: -8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
});