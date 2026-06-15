import { StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { BackLink } from "@/src/components/common/BackLink";
import { colors, radius, spacing, typography } from "@/src/theme";
import { formatTripDateRange } from "@/src/utils/itinerary/formatTripToDateRange";
import type { ItineraryState } from "@/src/types/itinerary";
import Hourglass1 from "@/assets/icons/hourglass_1.svg";

import MascotPlanning from "@/assets/mascots/mascot-planning.svg";
import MascotVoting from "@/assets/mascots/mascot-voting.svg";
import MascotFinal from "@/assets/mascots/mascot-final.svg";
import CalendarIcon from "@/assets/icons/calendar.svg";
import HourglassIcon from "@/assets/icons/hourglass.svg";
import { hiddenFromAccessibility } from "@/src/utils/accessibility";

import Timepoint from "@/assets/icons/timepoint.svg";
import { Animated } from "react-native";
import { useRef, useEffect } from "react";

type Props = {
  title: string;
  tripName: string;
  startDate: string;
  endDate: string;
  introText: string;
  daysLeftText?: string;
  onBackPress: () => void;
  state?: ItineraryState;
  showBackButton?: boolean;
};

function getHeroColor(state: ItineraryState): string {
  switch (state) {
    case "voting":
      return colors.sunsetPink;
    case "memories":
      return colors.seaBlue;
    case "final":
      return colors.neonGreen;
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
    case "memories":
      return MascotFinal;
    case "planning":
    default:
      return MascotPlanning;
  }
}

export function ItineraryHeader({
  title,
  tripName,
  startDate,
  endDate,
  introText,
  daysLeftText = "0 days",
  onBackPress,
  state = "planning",
  showBackButton = true,
}: Props) {
  const heroColor = getHeroColor(state);
  const Mascot = getMascotByState(state);
  const blinkingDotAnim = useRef(new Animated.Value(1)).current;
  
const isActive = state !== "final" && state !== "memories";
const isMuted = state === "planning"; 


useEffect(() => {
  if (!isActive) return;

  Animated.loop(
    Animated.sequence([
      Animated.timing(blinkingDotAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(blinkingDotAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ])
  ).start();
}, [isActive]);



  return (
    <View style={styles.wrapper}>
      <View style={[styles.hero, { backgroundColor: heroColor }]}>
        <View style={styles.topRow}>
          {showBackButton && (
            <View style={styles.backButtonSlot}>
              <BackLink onPress={onBackPress} />
            </View>
          )}

      {state !== "final" && state !== "memories" ? (
  <View
    style={styles.timerBox}
    accessible={true}
    accessibilityLabel={`${daysLeftText} remaining`}
  >
    <View style={styles.phaseTimerBlock}>
      
      <View
        style={styles.hourglassCol}
        {...hiddenFromAccessibility}
      >
        {isActive ? (
          <Hourglass1 width={32} height={32} />
        ) : (
          <HourglassIcon
            width={32}
            height={32}
            style={isMuted ? styles.mutedIcon : undefined}
          />
        )}
      </View>

      <View style={styles.phaseTextCol}>
        <View style={styles.daysRow}>
          <AppText
            variant="body"
            style={[
              styles.phaseDays,
              isMuted && styles.phaseDaysMuted,
            ]}
          >
            {daysLeftText}
          </AppText>

          {isActive && (
            <Animated.View
              style={[
                styles.timepointWrapper,
                { opacity: blinkingDotAnim },
              ]}
              {...hiddenFromAccessibility}
            >
              <Timepoint width={7} height={7} />
            </Animated.View>
          )}
        </View>

        <AppText
          variant="caption"
          style={[
            styles.timerLabel,
            isMuted && styles.timerLabelMuted,
          ]}
        >
          Timer
        </AppText>
      </View>

    </View>
  </View>
) : (
  <View style={styles.timerPlaceholder} />
)}
        </View>

        <View style={styles.heroContent}>
          <Mascot width={74} height={74} {...hiddenFromAccessibility} />

          <AppText variant="title" style={styles.title}>
            {title}
          </AppText>

          <View style={styles.tripMetaRow}>
            <AppText variant="subtitle" style={styles.tripName}>
              {tripName}
            </AppText>

            <View
              style={styles.dateBadge}
              accessible={true}
              accessibilityLabel={`Trip dates: ${formatTripDateRange(startDate, endDate)}`}
            >
              <CalendarIcon
                width={24}
                height={24}
                {...hiddenFromAccessibility}
              />
              <AppText variant="body" style={styles.dateText}>
                {formatTripDateRange(startDate, endDate)}
              </AppText>
            </View>
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
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxxl2,
  },
  topRow: {
    position: "relative",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
    paddingRight: spacing.xl,
  },
  backButtonSlot: {
    position: "absolute",
    left: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "flex-start",
    zIndex: 2,
  },
  timerBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  timerPlaceholder: {
    width: 80,
    minHeight: 44,
  },
  timerTextWrap: {
    justifyContent: "center",
    gap: 0,
  },
  timerValue: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    lineHeight: typography.lineHeight.md,
    marginBottom: -4,
  },
  timerLabel: {
    color: colors.nightBlack,
    lineHeight: typography.lineHeight.sm,
  },
  heroContent: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.nightBlack,
    fontSize: typography.size.displayMd,
    lineHeight: typography.lineHeight.displayMd,
  },
  tripMetaRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  tripName: {
    flex: 1,
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  dateText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
  },
  intro: {
    color: colors.nightBlack,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
  },
  contentTopCard: {
    backgroundColor: colors.lightWhite,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    marginTop: -35,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  phaseTimerBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 1,
  },
  hourglassCol: {
    justifyContent: "center",
    alignItems: "center",
  },
 mutedIcon: {
    opacity: 0.35,
  },
phaseTextCol: {
    flexDirection: "column",
    justifyContent: "center",
  },
daysRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 3,
  },
  phaseDays: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textPrimary,
  },
 phaseDaysMuted: {
    color: colors.textPrimary,
    
  },
  timepointWrapper: {
    marginTop: -5,
  },
  timerLabelMuted: {
    color: colors.textPrimary,
    
  },
});
