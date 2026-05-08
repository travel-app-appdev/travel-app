import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import { formatTripDateRange } from "@/src/utils/itinerary/formatTripToDateRange";
import { useSinglePress } from "@/src/hooks/useSinglePress";
import type { ItineraryState } from "@/src/types/itinerary";

import Back from "@/assets/icons/back.svg";
import MascotPlanning from "@/assets/mascots/mascot-planning.svg";
import MascotVoting from "@/assets/mascots/mascot-voting.svg";
import MascotFinal from "@/assets/mascots/mascot-final.svg";
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

function getMascotByState(state: ItineraryState) {
  switch (state) {
    case "voting":
      return MascotVoting;
    case "final":
      return MascotFinal;
    case "planning":
    default:
      return MascotPlanning;
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
  const Mascot = getMascotByState(state);
  const handleBack = useSinglePress(onBackPress);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.hero, { backgroundColor: heroColor }]}>
        <View style={styles.topRow}>

          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
          >
            <Back width={20} height={20} />
          </Pressable>

          <View
            style={styles.timerBox}
            accessible={true}
            accessibilityLabel={`${daysLeftText} remaining`}
          >
            <HourglassIcon
              width={18}
              height={18}
              accessible={false}
              importantForAccessibility="no-hide-descendants"
            />
            <View accessible={false}>
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

          <Mascot
            width={64}
            height={64}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          />

          <View style={styles.textBlock}>
            <AppText variant="title" style={styles.title}>
              {title}
            </AppText>

            <View
              style={styles.destinationRow}
              accessible={true}
              accessibilityLabel={`Destination: ${destination}`}
            >
              <LocationPin
                width={18}
                height={18}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              />
              <AppText variant="subtitle" style={styles.destination}>
                {destination}
              </AppText>
            </View>
          </View>

          <View
            style={styles.dateBadge}
            accessible={true}
            accessibilityLabel={`Trip dates: ${formatTripDateRange(startDate, endDate)}`}
          >
            <CalendarIcon
              width={18}
              height={18}
              accessible={false}
              importantForAccessibility="no-hide-descendants"
            />
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
  backButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
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
  destinationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
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