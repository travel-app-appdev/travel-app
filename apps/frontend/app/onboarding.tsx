import { useState, type ComponentType } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import Plane from "@/assets/icons/plane.svg";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Platform,
  Text,
  useWindowDimensions,
} from "react-native";
import { colors, spacing, radius, typography } from "@/src/theme";
import { AppButton } from "@/src/components/common/AppButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Back from "@/assets/icons/back.svg";
import Forward from "@/assets/icons/forward.svg";
import CurlyGreen from "@/assets/visuals/curly-green.svg";
import HourglassIcon from "@/assets/icons/hourglass.svg";
import LocationHeartIcon from "@/assets/icons/location-heart.svg";
import LocationPinIcon from "@/assets/icons/location-pin.svg";
import GoogleIcon from "@/assets/icons/google.svg";
import EditIcon from "@/assets/icons/edit.svg";
import { hiddenFromAccessibility } from "@/src/utils/accessibility";
import YellowVotey from "@/assets/mascots/Votey_Yellow.svg";
import GreenVotey from "@/assets/mascots/Votey_Green.svg";
import BlueVotey from "@/assets/mascots/mascot-emotional.svg";
import FunnyMascot from "@/assets/mascots/mascot-funny.svg";
import ArrowDownIcon from "@/assets/icons/arrow_down.svg";
import ProfileIcon from "@/assets/icons/members.svg";
import JoinGroupIcon from "@/assets/icons/join-group.svg";
import { Image } from "react-native";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

type Step = 1 | 2 | 3 | 4 | 5;

export default function Onboarding() {
  const [step, setStep] = useState<Step>(1);
  const [titleWidths, setTitleWidths] = useState<Record<Step, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  });

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const isLandscape = width > height;
  const shouldReturnToCreateTrip = returnTo === "create-trip";

  const handleExitOnboarding = () => {
    if (shouldReturnToCreateTrip) {
      router.back();
      return;
    }

    router.replace("/home");
  };

  const setTitleWidth = (stepKey: Step, measuredWidth: number) => {
    setTitleWidths((prev) =>
      prev[stepKey] === measuredWidth
        ? prev
        : { ...prev, [stepKey]: measuredWidth }
    );
  };

  const getHighlightWidth = (stepKey: Step) => {
    const measured = titleWidths[stepKey];
    return measured <= 0 ? undefined : measured;
  };

  const sw = width / 390;
  const sh = height / 844;
  const scale = Math.min(sw, sh);

  const curlyProgress = clamp((width - 390) / (1920 - 390), 0, 1);
  const curlyTopSize = lerp(width * 1.05, 700, curlyProgress);
  const curlyTopTop = lerp(height * 0.01 - 100, height * 0.04 - 120, curlyProgress);
  const curlyTopLeft = lerp(-width * 0.48, -800, curlyProgress);

  const mascotBaseSize = isLandscape ? 70 : 110;
  const mascotSize = Math.round(
    clamp(mascotBaseSize * scale, isLandscape ? 72 : 96, mascotBaseSize)
  );

  const contentMaxWidth = Math.min(width - spacing.xl * 2, isLandscape ? 760 : 520);
  const mainBlockWidth = Math.min(width - spacing.xl * 2, isLandscape ? 520 : 350);
  const verticalPagePadding = isLandscape ? spacing.xl : spacing.xl;
  const bottomPagePadding = isLandscape ? spacing.xl : spacing.xxxl;
  const containerStyle = [Styles.container, isLandscape && Styles.containerLandscape];
  const TOTAL_STEPS = 5;

  const renderHeader = () => (
    <View style={Styles.header}>
      <View style={Styles.headerSide} />
      <View
        style={Styles.headerTitle}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <Plane width={25} height={25} />
        <Text style={Styles.headerLabel}>Onboarding</Text>
      </View>
      <View style={Styles.headerSide} />
    </View>
  );

  const renderMascot = (
    Mascot: ComponentType<{ width: number; height: number }>
  ) => (
    <View style={[Styles.mascotSection, isLandscape && Styles.mascotSectionLandscape]}>
      <View
        style={Styles.mascotInlineWrapper}
        {...(Platform.OS !== "web" ? { accessible: false } : {})}
      >
        <Mascot width={mascotSize} height={mascotSize} />
      </View>
    </View>
  );

  const renderFooter = (
    current: Step,
    buttonStyle?: object,
    buttonTextStyle?: object
  ) => (
    <View style={[Styles.footerBlock, isLandscape && Styles.footerBlockLandscape]}>
      <View style={[Styles.ArrowWrapper, { width: mainBlockWidth }]}>
        {current > 1 ? (
          <Pressable
            onPress={() => setStep((current - 1) as Step)}
            style={Styles.navButton}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Go to onboarding step ${current - 1}`}
          >
            <View style={Styles.navIcon}>
              <Back width={20} height={20} />
            </View>
          </Pressable>
        ) : (
          <View style={Styles.arrowSpacer} />
        )}

        <Text style={Styles.StepIndicator}>
          {current} / {TOTAL_STEPS}
        </Text>

        {current < TOTAL_STEPS ? (
          <Pressable
            onPress={() => setStep((current + 1) as Step)}
            style={Styles.navButton}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Go to onboarding step ${current + 1}`}
          >
            <View style={Styles.navIcon}>
              <Forward width={20} height={20} />
            </View>
          </Pressable>
        ) : (
          <View style={Styles.arrowSpacer} />
        )}
      </View>

      <View style={[Styles.continueWrapper, { width: mainBlockWidth }]}>
        <AppButton
          title={current === TOTAL_STEPS ? "Finish" : "Skip"}
          onPress={handleExitOnboarding}
          style={[Styles.continueButton, buttonStyle]}
          textStyle={[Styles.continueButtonText, buttonTextStyle]}
          accessibilityLabel={
            current === TOTAL_STEPS ? "Finish onboarding" : "Skip onboarding"
          }
          accessibilityHint={
            shouldReturnToCreateTrip
              ? "Returns to the create trip screen"
              : "Navigates to the home screen"
          }
        />
      </View>
    </View>
  );

  return (
    <View style={Styles.fullScreen}>
      <View style={Styles.safeArea}>
        <View style={Styles.root}>
          <ScrollView
            style={Styles.scrollView}
            contentContainerStyle={[
              Styles.scrollContent,
              {
                paddingTop: insets.top + verticalPagePadding,
                paddingBottom: insets.bottom + bottomPagePadding,
                ...(isLandscape ? {} : { minHeight: height }),
              },
            ]}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View
              style={[
                Styles.contentTop,
                { maxWidth: contentMaxWidth },
                isLandscape && Styles.contentTopLandscape,
              ]}
            >
              {step === 1 && (
                <>
                  {renderHeader()}

                  <View
                    pointerEvents="none"
                    style={[
                      Styles.curlyGreenWrapper2,
                      { top: curlyTopTop, left: curlyTopLeft },
                    ]}
                    {...hiddenFromAccessibility}
                  >
                    <CurlyGreen width={curlyTopSize} height={curlyTopSize} />
                  </View>

                  {renderMascot(GreenVotey)}

                  <View style={containerStyle}>
                    <View style={[Styles.titleBlock, { marginBottom: spacing.sm }]}>
                      <Text
                        style={Styles.title}
                        onLayout={(e) =>
                          setTitleWidth(1, e.nativeEvent.layout.width)
                        }
                      >
                        Before you start
                      </Text>
                      <View
                        style={[
                          Styles.titleHighlight,
                          Styles.titleHighlightGreen,
                          { width: getHighlightWidth(1) },
                        ]}
                      />
                    </View>
                  </View>

                  <Text
                    style={[
                      Styles.InfoText,
                      Styles.InfoTextWide,
                      { marginTop: spacing.xl, width: mainBlockWidth },
                    ]}
                  >
                    Every trip goes through 3 phases.{" "}
                    <Text style={Styles.InfoTextBold}>
                      Planning, Voting, and Final,
                    </Text>{" "}
                    each one brings you closer to your perfect trip.
                  </Text>

                  <View style={[Styles.phasesCard, { width: mainBlockWidth }]}>
                    <View style={Styles.phaseRow}>
                      <View style={Styles.phaseLeft}>
                        <View style={[Styles.phasePill, Styles.phasePillYellow]}>
                          <Text style={Styles.phasePillTextDark}>Planning</Text>
                        </View>
                        <View style={Styles.phaseConnector} />
                      </View>
                      <Text style={Styles.phaseDesc}>
                        Add activities to your trip
                      </Text>
                    </View>

                    <View style={Styles.phaseRow}>
                      <View style={Styles.phaseLeft}>
                        <View style={[Styles.phasePill, Styles.phasePillPink]}>
                          <Text style={Styles.phasePillTextLight}>Voting</Text>
                        </View>
                        <View style={Styles.phaseConnector} />
                      </View>
                      <Text style={Styles.phaseDesc}>
                        Vote for your favourite activities
                      </Text>
                    </View>

                    <View style={Styles.phaseRow}>
                      <View style={Styles.phaseLeft}>
                        <View style={[Styles.phasePill, Styles.phasePillGreen]}>
                          <Text style={Styles.phasePillTextDark}>Final</Text>
                        </View>
                      </View>
                      <Text style={Styles.phaseDesc}>Your final itinerary</Text>
                    </View>
                  </View>

                  <View style={Styles.flexSpacer} />

                  {renderFooter(
                    1,
                    Styles.continueButtonGreen,
                    Styles.continueButtonTextGreen
                  )}
                </>
              )}

              {step === 2 && (
                <>
                  {renderHeader()}

                  {renderMascot(BlueVotey)}

                  <View style={containerStyle}>
                    <View style={[Styles.titleBlock, { marginBottom: spacing.sm }]}>
                      <Text
                        style={Styles.title}
                        onLayout={(e) =>
                          setTitleWidth(2, e.nativeEvent.layout.width)
                        }
                      >
                        Set up the timers
                      </Text>
                      <View
                        style={[
                          Styles.titleHighlight,
                          Styles.titleHighlightBlue,
                          { width: getHighlightWidth(2) },
                        ]}
                      />
                    </View>
                  </View>

                  <Text
                    style={[
                      Styles.InfoText,
                      { marginTop: spacing.xl, width: mainBlockWidth },
                    ]}
                  >
                    Set a <Text style={Styles.InfoTextBold}>timer</Text> for each
                    phase. The app moves forward automatically. The admin can
                    always end Voting early.
                  </Text>

                 
                    <Image
                      source={require("../assets/images/Timer.Screenshot.png")}
                      style={Styles.Image}
                      resizeMode="contain"
                    />


                  <View style={Styles.flexSpacer} />

                  {renderFooter(2, Styles.continueButtonBlue, undefined)}
                </>
              )}

              {step === 3 && (
                <>
                  {renderHeader()}

                  {renderMascot(YellowVotey)}

                  <View style={containerStyle}>
                    <View style={[Styles.titleBlock, { marginBottom: spacing.sm }]}>
                      <Text
                        style={Styles.title}
                        onLayout={(e) =>
                          setTitleWidth(3, e.nativeEvent.layout.width)
                        }
                      >
                        Plan Together
                      </Text>
                      <View
                        style={[
                          Styles.titleHighlight,
                          Styles.titleHighlightYellow,
                          { width: getHighlightWidth(3) },
                        ]}
                      />
                    </View>
                  </View>

                  <Text
                    style={[
                      Styles.InfoText,
                      Styles.InfoTextWide,
                      { marginTop: spacing.xl, width: mainBlockWidth },
                    ]}
                  >
                    Plan your trip with your travel companions.{" "}
                    <Text style={Styles.InfoTextBold}>Add activities</Text> to the
                    itinerary and collaborate in one place.
                  </Text>

                   <Image
                      source={require("../assets/images/EmptyActivity.png")}
                      style={Styles.Image}
                      resizeMode="contain"
                    />
                     <Image
                      source={require("../assets/images/DetailWindow.png")}
                      style={Styles.Image}
                      resizeMode="contain"
                    />

                  <View style={Styles.flexSpacer} />

                  {renderFooter(
                    3,
                    Styles.continueButtonYellow,
                    Styles.continueButtonTextDark
                  )}
                </>
              )}

              {step === 4 && (
                <>
                  {renderHeader()}

                  {renderMascot(FunnyMascot)}

                  <View style={containerStyle}>
                    <View style={[Styles.titleBlock, { marginBottom: spacing.sm }]}>
                      <View style={Styles.titleRow}>
                        <Text style={Styles.title}>Decide </Text>
                        <View style={Styles.titleWordWrapper}>
                          <Text
                            style={Styles.title}
                            onLayout={(e) =>
                              setTitleWidth(4, e.nativeEvent.layout.width)
                            }
                          >
                            Together
                          </Text>
                          <View
                            style={[
                              Styles.titleHighlight,
                              Styles.titleHighlightPink,
                              Styles.titleWordHighlight,
                              { width: getHighlightWidth(4) },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  </View>

                  <Text
                    style={[
                      Styles.InfoText,
                      { marginTop: spacing.xl, width: mainBlockWidth },
                    ]}
                  >
                    Say goodbye to endless debates. Use the{" "}
                    <Text style={Styles.InfoTextBold}>voting feature</Text> to let
                    everyone have a say in choosing activities for each slot.
                  </Text>

                  <View style={[Styles.activityCardRow, { width: mainBlockWidth }]}>
                    <View
                      style={[
                        Styles.activityCard,
                        { backgroundColor: colors.sunsetPink + "33" },
                      ]}
                    >
                      <View style={Styles.activityTimeRow}>
                        <LocationHeartIcon width={16} height={16} />
                        <Text style={Styles.activityTimeText}>06:00-08:00</Text>
                      </View>

                      <Text style={Styles.activityName}>
                        Tempel of Hephaistos
                      </Text>

                      <View style={Styles.activityInfoRow}>
                        <LocationPinIcon width={14} height={14} />
                        <Text style={Styles.activityInfoText}>Athina 105 55</Text>
                      </View>

                      <View style={Styles.activityInfoRow}>
                        <GoogleIcon width={14} height={14} />
                        <Text style={Styles.activityLinkText}>Google-Link</Text>
                      </View>
                    </View>

                    <View style={[Styles.activityAddBtn, Styles.activityAddBtnPink]}>
                      <EditIcon width={30} height={30} />
                      <Text style={Styles.activityAddBtnText}>
                        Add{"\n"}Vote
                      </Text>
                    </View>
                  </View>

                  <View style={Styles.flexSpacer} />

                  {renderFooter(
                    4,
                    Styles.continueButtonPink,
                    Styles.continueButtonTextDark
                  )}
                </>
              )}

              {step === 5 && (
                <>
                  {renderHeader()}

                  {renderMascot(GreenVotey)}

                  <View style={containerStyle}>
                    <View style={[Styles.titleBlock, { marginBottom: spacing.sm }]}>
                      <View style={Styles.titleRow}>
                        <Text style={Styles.title}>Travel </Text>
                        <View style={Styles.titleWordWrapper}>
                          <Text
                            style={Styles.title}
                            onLayout={(e) =>
                              setTitleWidth(5, e.nativeEvent.layout.width)
                            }
                          >
                            together
                          </Text>
                          <View
                            style={[
                              Styles.titleHighlight,
                              Styles.titleHighlightGreen,
                              Styles.titleWordHighlight,
                              { width: getHighlightWidth(5) },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  </View>

                  <Text
                    style={[
                      Styles.InfoText,
                      { marginTop: spacing.xl, width: mainBlockWidth },
                    ]}
                  >
                    Enjoy a seamless travel experience. Your{" "}
                    <Text style={Styles.InfoTextBold}>final itinerary</Text> is
                    locked and ready - access it on the go.
                  </Text>

                  <View style={[Styles.activityCardRow, { width: mainBlockWidth }]}>
                    <View
                      style={[
                        Styles.activityCard,
                        { backgroundColor: colors.neonGreen + "33" },
                      ]}
                    >
                      <View style={Styles.activityTimeRow}>
                        <LocationHeartIcon width={16} height={16} />
                        <Text style={Styles.activityTimeText}>06:00-08:00</Text>
                      </View>

                      <View style={Styles.activityNameRow}>
                        <Text style={[Styles.activityName, Styles.activityNameInRow]}>
                          Tempel of Hephaistos
                        </Text>

                        <View style={Styles.activityParticipants}>
                          <ProfileIcon width={14} height={14} />
                          <Text style={Styles.activityParticipantText}>4</Text>
                        </View>
                      </View>

                      <View style={Styles.activityInfoRow}>
                        <LocationPinIcon width={14} height={14} />
                        <Text style={Styles.activityInfoText}>Athina 105 55</Text>
                      </View>

                      <View style={Styles.activityInfoRow}>
                        <GoogleIcon width={14} height={14} />
                        <Text style={Styles.activityLinkText}>Google-Link</Text>
                      </View>
                    </View>

                    <View style={[Styles.activityAddBtn, Styles.activityAddBtnGreen]}>
                      <JoinGroupIcon width={28} height={28} />
                        <Text style={Styles.activityAddBtnText}>
                          Join{"\n"}group
                        </Text>
                    </View>
                  </View>

                  <View style={Styles.flexSpacer} />

                  {renderFooter(
                    5,
                    Styles.continueButtonGreen,
                    Styles.continueButtonTextGreen
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const Styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: colors.lightWhite },
  safeArea: { flex: 1, backgroundColor: colors.lightWhite },
  root: { flex: 1, overflow: "hidden", backgroundColor: colors.lightWhite },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: "center" },
  contentTop: { width: "100%", flexGrow: 1, position: "relative" },
  contentTopLandscape: {
    flexGrow: 0,
    paddingBottom: spacing.lg,
  },
  flexSpacer: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerSide: { width: 80 },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerLabel: {
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.textPrimary,
  },

  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl + spacing.xs,
  },
  containerLandscape: {
    paddingTop: spacing.md,
  },

  titleBlock: {
    alignSelf: "center",
    alignItems: "center",
    marginBottom: spacing.xxxxl2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  titleWordWrapper: {
    position: "relative",
    alignItems: "center",
  },
  titleWordHighlight: {
    position: "absolute",
    bottom: 3,
    marginTop: 0,
    zIndex: -1,
  },
  title: {
    fontSize: typography.size.displaySm,
    lineHeight: typography.lineHeight.displayLg,
    color: colors.textPrimary,
    textAlign: "center",
    fontFamily: typography.fontFamily.bodyBold,
    alignSelf: "center",
  },
  titleHighlight: {
    height: 4,
    borderRadius: radius.pill,
    marginTop: -4,
    alignSelf: "center",
  },
  titleHighlightYellow: { backgroundColor: colors.beachYellow },
  titleHighlightPink: { backgroundColor: colors.sunsetPink },
  titleHighlightBlue: { backgroundColor: colors.seaBlue },
  titleHighlightGreen: { backgroundColor: colors.neonGreen },

  mascotSection: {
    marginTop: spacing.xxxxl2 + spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  mascotSectionLandscape: {
    marginTop: spacing.lg,
  },
  mascotInlineWrapper: {
    alignSelf: "center",
    zIndex: 3,
  },

  footerBlock: {
    width: "100%",
    paddingBottom: spacing.lg,
    gap: spacing.xl,
    zIndex: 20,
    elevation: 20,
    alignItems: "center",
  },
  footerBlockLandscape: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  continueWrapper: {
    zIndex: 20,
    elevation: 20,
  },
  ArrowWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 20,
    elevation: 20,
  },
  arrowSpacer: { width: 44, height: 44 },
  navButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  navIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  continueButton: { backgroundColor: colors.sunsetOrange, width: "100%" },
  continueButtonGreen: { backgroundColor: colors.neonGreen },
  continueButtonYellow: { backgroundColor: colors.beachYellow, width: "100%" },
  continueButtonBlue: { backgroundColor: colors.seaBlue, width: "100%" },
  continueButtonPink: { backgroundColor: colors.sunsetPink, width: "100%" },
  continueButtonText: {
    color: colors.white,
    fontFamily: typography.fontFamily.bodyBold,
  },
  continueButtonTextGreen: { color: colors.nightBlack },
  continueButtonTextDark: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },

  InfoText: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.textPrimary,
    textAlign: "center",
    fontFamily: typography.fontFamily.body,
    alignSelf: "center",
  },
  InfoTextWide: {},
  InfoTextBold: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.textPrimary,
    fontWeight: "bold",
    fontFamily: typography.fontFamily.bodyBold,
  },
  StepIndicator: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.textPrimary,
    textAlign: "center",
    fontFamily: typography.fontFamily.bodyBold,
  },

  curlyGreenWrapper2: {
    position: "absolute",
    zIndex: 1,
    transform: [{ rotate: "90deg" }],
  },

  phasesCard: {
    marginTop: spacing.xl + spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.nightBlack,
    backgroundColor: colors.neonGreen + "22",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    alignSelf: "center",
  },
  phaseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  phaseLeft: { alignItems: "center", width: 90 },
  phasePill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    width: 90,
    alignItems: "center",
  },
  phaseConnector: {
    width: 2,
    height: spacing.xl,
    backgroundColor: colors.border,
    marginTop: 2,
  },
  phasePillYellow: { backgroundColor: colors.beachYellow },
  phasePillPink: { backgroundColor: colors.sunsetPink },
  phasePillGreen: { backgroundColor: colors.neonGreen },
  phasePillTextDark: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    color: colors.nightBlack,
  },
  phasePillTextLight: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    color: colors.nightBlack,
  },
  phaseDesc: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    paddingTop: spacing.xs,
  },

  timersRows: {
    marginTop: spacing.xl + spacing.md,
    alignSelf: "center",
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  timerPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minWidth: 88,
    alignItems: "center",
  },
  timerPillYellow: { backgroundColor: colors.beachYellow },
  timerPillPink: { backgroundColor: colors.sunsetPink },
  timerPillTextDark: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    color: colors.nightBlack,
  },
  timerPillTextLight: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    color: colors.nightBlack,
  },
  timerValueBlock: { flex: 1 },
  timerValue: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    color: colors.nightBlack,
  },
  timerLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  timerChevronIcon: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  activityCardRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl + spacing.md,
    alignItems: "stretch",
    alignSelf: "center",
  },
  activityCard: {
    flex: 1,
    minHeight: 108,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.nightBlack,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: "center",
    gap: 2,
  },
  activityTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 2,
  },
  activityTimeText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    color: colors.nightBlack,
  },
  activityName: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    color: colors.nightBlack,
    marginBottom: 2,
  },
  activityNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  activityNameInRow: {
    flex: 1,
  },
  activityParticipants: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  activityParticipantText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    color: colors.nightBlack,
  },
  activityInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 1,
  },
  activityInfoText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.nightBlack,
  },
  activityLinkText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.nightBlack,
    textDecorationLine: "underline",
  },
  activityAddBtn: {
    width: 92,
    minHeight: 108,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  activityAddBtnYellow: {
    backgroundColor: colors.beachYellow,
  },
  activityAddBtnPink: {
    backgroundColor: colors.sunsetPink,
  },
  activityAddBtnGreen: {
    backgroundColor: colors.neonGreen,
  },
  activityAddBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.md,
    color: colors.nightBlack,
    textAlign: "center",
    lineHeight: typography.lineHeight.md,
  },
 Image: {
  width: "100%",
  aspectRatio: 2, // adjust based on your image
  marginTop: spacing.md,
  alignSelf: "center",
  borderRadius: 5,
}


});