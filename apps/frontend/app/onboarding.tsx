import { useState } from "react";
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
import { navigate } from "expo-router/build/global-state/routing";
import Back from "@/assets/icons/back.svg";
import Forward from "@/assets/icons/forward.svg";
import PalmTree from "@/assets/visuals/palm-tree-yellow.svg";
import PalmLeaf from "@/assets/visuals/palm-leaf.svg";
import CurlyGreen from "@/assets/visuals/curly-green.svg";
import { hiddenFromAccessibility } from "@/src/utils/accessibility";
import YellowVotey from "@/assets/mascots/Votey_Yellow.svg";
import PinkVotey from "@/assets/mascots/Votey_Pink.svg";
import GreenVotey from "@/assets/mascots/Votey_Green.svg";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

export default function Onboarding() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [titleWidths, setTitleWidths] = useState<Record<1 | 2 | 3, number>>({
    1: 0,
    2: 0,
    3: 0,
  });

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const setTitleWidth = (stepKey: 1 | 2 | 3, measuredWidth: number) => {
    setTitleWidths((prev) =>
      prev[stepKey] === measuredWidth
        ? prev
        : { ...prev, [stepKey]: measuredWidth }
    );
  };

  const getHighlightWidth = (stepKey: 1 | 2 | 3) => {
    const measured = titleWidths[stepKey];
    if (measured <= 0) {
      return undefined;
    }
    return measured;
  };

  const isLandscape = width > height;
  const isSmallPhone = height < 760;

  const sw = width / 390;
  const sh = height / 844;
  const scale = Math.min(sw, sh);

  const wideProgress = clamp((width - 390) / (1440 - 390), 0, 1);
  const leafWideProgress = clamp((width - 600) / (1440 - 600), 0, 1);

  const palmTreeSize = 500 * sw * lerp(1, 0.22, wideProgress);
  const palmTreeRight = lerp(-320 * sw, -250 * sw, wideProgress);
  const palmTreeTop = lerp(-185 * sh + 450, -1145 * sh, wideProgress);
  const palmTreeLeft = lerp(-420 * sw, -150 * sw, wideProgress);
  const palmTreeTop2 = lerp(-245 * sh + 100, -845 * sh, wideProgress);

  const palmLeafSize = 400 * sw * lerp(1, 0.82, leafWideProgress);
  const palmLeafLeft = lerp(-300 * sw, -380 * sw, leafWideProgress);
  const palmLeafTop = lerp(4 * sh, -500 * sh, leafWideProgress);
  const palmLeafRight = lerp(280, 780, leafWideProgress);
  const palmLeafTop2 = lerp(350 * sh, 10 * sh + 100, leafWideProgress);

  const curlyProgress = clamp((width - 390) / (1920 - 390), 0, 1);

  const curlyBottomMobileSize = width * 1.5;
  const curlyBottomDesktopSize = 820;
  const curlyBottomMobileTop = height * 0.4;
  const curlyBottomDesktopTop = height * 0.58;
  const curlyBottomMobileRight = -width * 0.4;
  const curlyBottomDesktopRight = -800;

  const curlyBottomSize = lerp(
    curlyBottomMobileSize,
    curlyBottomDesktopSize,
    curlyProgress
  );
  const curlyBottomTop = lerp(
    curlyBottomMobileTop,
    curlyBottomDesktopTop,
    curlyProgress
  );
  const curlyBottomRight = lerp(
    curlyBottomMobileRight,
    curlyBottomDesktopRight,
    curlyProgress
  );

  const curlyTopMobileSize = width * 1.05;
  const curlyTopDesktopSize = 700;
  const curlyTopMobileTop = height * 0.01 - 100;
  const curlyTopDesktopTop = height * 0.04 - 120;
  const curlyTopMobileLeft = -width * 0.48;
  const curlyTopDesktopLeft = -800;

  const curlyTopSize = lerp(
    curlyTopMobileSize,
    curlyTopDesktopSize,
    curlyProgress
  );
  const curlyTopTop = lerp(
    curlyTopMobileTop,
    curlyTopDesktopTop,
    curlyProgress
  );
  const curlyTopLeft = lerp(
    curlyTopMobileLeft,
    curlyTopDesktopLeft,
    curlyProgress
  );

  const mascotBaseSize = step === 1 ? 110 : 92;
  const mascotMaxSize = mascotBaseSize;
  const mascotMinSize = 200;

  const mascotSize = Math.round(
    clamp(mascotBaseSize * scale, mascotMinSize, mascotMaxSize)
  );

  const showCurly = true;
  const contentMaxWidth = Math.min(width - spacing.xl * 2, 520);
  const infoTextTopMargin = spacing.xl;

  return (
    <View style={Styles.fullScreen}>
      <View style={Styles.safeArea}>
        <View style={Styles.root}>
          <ScrollView
            style={Styles.scrollView}
            contentContainerStyle={[
              Styles.scrollContent,
              {
                paddingTop: insets.top + spacing.lg,
                paddingBottom: insets.bottom + spacing.xxxl,
                minHeight: height,
              },
            ]}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={[Styles.contentTop, { maxWidth: contentMaxWidth }]}>
              {step === 1 ? (
                <>
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

                  <View
                    pointerEvents="none"
                    style={[
                      Styles.palmTreeWrapper,
                      {
                        top: palmTreeTop2,
                        left: palmTreeLeft,
                      },
                    ]}
                  >
                    <PalmTree width={palmTreeSize} height={palmTreeSize} />
                  </View>

                  <View style={Styles.container}>
                    <View style={Styles.titleBlock}>
                      <Text
                        style={Styles.title}
                        onLayout={(e) =>
                          setTitleWidth(1, e.nativeEvent.layout.width)
                        }
                      >
                        Plan together
                      </Text>
                      <View
                        style={[
                          Styles.titleHighlight,
                          Styles.titleHighlightYellow,
                          { width: getHighlightWidth(1) },
                        ]}
                      />
                    </View>
                  </View>

                  <View
                    pointerEvents="none"
                    style={[
                      Styles.palmTreeWrapper,
                      {
                        top: palmTreeTop,
                        right: palmTreeRight,
                      },
                    ]}
                  >
                    <PalmTree width={palmTreeSize} height={palmTreeSize} />
                  </View>

                  <View style={Styles.mascotSection}>
                    <View
                      style={Styles.mascotInlineWrapper}
                      {...(Platform.OS !== "web" ? { accessible: false } : {})}
                    >
                      <YellowVotey width={mascotSize} height={mascotSize} />
                    </View>
                  </View>

                  <Text
                    style={[Styles.InfoText, { marginTop: infoTextTopMargin }]}
                  >
                    Plan your trip together with your travel companions.{" "}
                    <Text style={Styles.InfoTextBold}>Add activities</Text> in
                    the itinerary, and collaborate on the details of your trip{" "}
                    <Text style={Styles.InfoTextBold}>in one place.</Text>
                  </Text>

                  <View style={Styles.footerBlock}>
                    <View style={Styles.ArrowWrapper}>
                      <View style={Styles.arrowSpacer} />
                      <Text style={Styles.StepIndicator}>{step}/3</Text>
                      <Pressable
                        onPress={() => setStep(2)}
                        style={Styles.navButton}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel="Go to onboarding step 2"
                      >
                        <View style={Styles.navIcon}>
                          <Forward width={20} height={20} />
                        </View>
                      </Pressable>
                    </View>

                    <View style={Styles.continueWrapper}>
                      <AppButton
                        title="Skip"
                        onPress={() => navigate("/home")}
                        style={Styles.continueButton}
                        textStyle={Styles.continueButtonText}
                        accessibilityLabel="Skip onboarding"
                        accessibilityHint="Skips the onboarding process and navigates to the home screen"
                      />
                    </View>
                  </View>
                </>
              ) : step === 2 ? (
                <>
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

                  <View
                    pointerEvents="none"
                    style={[
                      Styles.palmLeafWrapper,
                      {
                        top: palmLeafTop2,
                        left: palmLeafLeft,
                      },
                    ]}
                  >
                    <PalmLeaf width={palmLeafSize} height={palmLeafSize} />
                  </View>

                  <View
                    pointerEvents="none"
                    style={[
                      Styles.palmLeafWrapper,
                      {
                        top: palmLeafTop,
                        left: palmLeafRight,
                        transform: [{ scaleX: -1 }],
                      },
                    ]}
                  >
                    <PalmLeaf width={palmLeafSize} height={palmLeafSize} />
                  </View>

                  <View style={Styles.container}>
                    <View style={Styles.titleBlock}>
                      <Text
                        style={Styles.title}
                        onLayout={(e) =>
                          setTitleWidth(2, e.nativeEvent.layout.width)
                        }
                      >
                        Decide together
                      </Text>
                      <View
                        style={[
                          Styles.titleHighlight,
                          Styles.titleHighlightPink,
                          { width: getHighlightWidth(2) },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={Styles.mascotSection}>
                    <View
                      style={Styles.mascotInlineWrapper}
                      {...(Platform.OS !== "web" ? { accessible: false } : {})}
                    >
                      <PinkVotey width={mascotSize} height={mascotSize} />
                    </View>
                  </View>

                  <Text
                    style={[Styles.InfoText, { marginTop: infoTextTopMargin }]}
                  >
                    Say goodbye to endless debates and{" "}
                    <Text style={Styles.InfoTextBold}>
                      make decisions together{" "}
                    </Text>
                    with ease. Use our{" "}
                    <Text style={Styles.InfoTextBold}>voting feature</Text> to
                    let everyone have a say in choosing activities.
                  </Text>

                  <View style={Styles.footerBlock}>
                    <View style={Styles.ArrowWrapper}>
                      <Pressable
                        onPress={() => setStep(1)}
                        style={Styles.navButton}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel="Go to onboarding step 1"
                      >
                        <View style={Styles.navIcon}>
                          <Back width={20} height={20} />
                        </View>
                      </Pressable>

                      <Text style={Styles.StepIndicator}>{step}/3</Text>

                      <Pressable
                        onPress={() => setStep(3)}
                        style={Styles.navButton}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel="Go to onboarding step 3"
                      >
                        <View style={Styles.navIcon}>
                          <Forward width={20} height={20} />
                        </View>
                      </Pressable>
                    </View>

                    <View style={Styles.continueWrapper}>
                      <AppButton
                        title="Skip"
                        onPress={() => navigate("/home")}
                        style={Styles.continueButton}
                        textStyle={Styles.continueButtonText}
                        accessibilityLabel="Skip onboarding"
                        accessibilityHint="Skips the onboarding process and navigates to the home screen"
                      />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={Styles.header}>
                    <View style={Styles.headerSide} />

                    {showCurly && (
                      <View
                        pointerEvents="none"
                        style={[
                          Styles.curlyGreenWrapper2,
                          {
                            top: curlyTopTop,
                            left: curlyTopLeft,
                          },
                        ]}
                        {...hiddenFromAccessibility}
                      >
                        <CurlyGreen
                          width={curlyTopSize}
                          height={curlyTopSize}
                        />
                      </View>
                    )}

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

                  <View style={Styles.container}>
                    <View style={Styles.titleBlock}>
                      <Text
                        style={Styles.title}
                        onLayout={(e) =>
                          setTitleWidth(3, e.nativeEvent.layout.width)
                        }
                      >
                        Travel together
                      </Text>
                      <View
                        style={[
                          Styles.titleHighlight,
                          Styles.titleHighlightGreen,
                          { width: getHighlightWidth(3) },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={Styles.mascotSection}>
                    <View
                      style={Styles.mascotInlineWrapper}
                      {...(Platform.OS !== "web" ? { accessible: false } : {})}
                    >
                      <GreenVotey width={mascotSize} height={mascotSize} />
                    </View>
                  </View>

                  <Text
                    style={[Styles.InfoText, { marginTop: infoTextTopMargin }]}
                  >
                    Enjoy a{" "}
                    <Text style={Styles.InfoTextBold}>
                      seamless travel experience
                    </Text>{" "}
                    with your friends and family. Access your itinerary and
                    important travel information{" "}
                    <Text style={Styles.InfoTextBold}>on the go</Text>.
                  </Text>

                  {showCurly && (
                    <View
                      pointerEvents="none"
                      style={[
                        Styles.curlyGreenWrapper,
                        {
                          top: curlyBottomTop,
                          right: curlyBottomRight,
                        },
                      ]}
                      {...hiddenFromAccessibility}
                    >
                      <CurlyGreen
                        width={curlyBottomSize}
                        height={curlyBottomSize}
                      />
                    </View>
                  )}

                  <View style={Styles.footerBlock}>
                    <View style={Styles.ArrowWrapper}>
                      <Pressable
                        onPress={() => setStep(2)}
                        style={Styles.navButton}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel="Go to onboarding step 2"
                      >
                        <View style={Styles.navIcon}>
                          <Back width={20} height={20} />
                        </View>
                      </Pressable>

                      <Text style={Styles.StepIndicator}>{step}/3</Text>
                      <View style={Styles.arrowSpacer} />
                    </View>

                    <View style={Styles.continueWrapper}>
                      <AppButton
                        title="Finish"
                        onPress={() => navigate("/home")}
                        style={Styles.continueButton}
                        textStyle={Styles.continueButtonText}
                        accessibilityLabel="Finish onboarding"
                        accessibilityHint="Completes the onboarding process and navigates to the home screen"
                      />
                    </View>
                  </View>
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
  fullScreen: {
    flex: 1,
    backgroundColor: colors.lightWhite,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.lightWhite,
  },
  root: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: colors.lightWhite,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
  },
  contentTop: {
    width: "100%",
    flexGrow: 1,
    position: "relative",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerSide: {
    width: 80,
  },
  arrowSpacer: {
    width: 44,
    height: 44,
  },
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
  titleBlock: {
    alignSelf: "center",
    alignItems: "center",
    marginBottom: spacing.xxxxl2,
  },
  titleHighlight: {
    height: 4,
    borderRadius: radius.pill,
    marginTop: -4,
    alignSelf: "center",
  },
  titleHighlightYellow: {
    backgroundColor: colors.beachYellow,
  },
  titleHighlightPink: {
    backgroundColor: colors.sunsetPink,
  },
  titleHighlightGreen: {
    backgroundColor: colors.neonGreen,
  },
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
  title: {
    fontSize: typography.size.displaySm,
    lineHeight: typography.lineHeight.displayLg,
    color: colors.textPrimary,
    textAlign: "center",
    fontFamily: typography.fontFamily.bodyBold,
    alignSelf: "center",
  },
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  mascotSection: {
    marginTop: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  mascotInlineWrapper: {
    alignSelf: "center",
    zIndex: 3,
  },
  footerBlock: {
    width: "100%",
    marginTop: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
    zIndex: 20,
    elevation: 20,
  },
  continueWrapper: {
    width: "100%",
    zIndex: 20,
    elevation: 20,
  },
  ArrowWrapper: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 20,
    elevation: 20,
  },
  continueButton: {
    backgroundColor: colors.sunsetOrange,
    width: "100%",
  },
  continueButtonText: {
    color: colors.white,
    fontFamily: typography.fontFamily.bodyBold,
  },
  InfoText: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.textPrimary,
    textAlign: "center",
    paddingLeft: spacing.xxxl,
    paddingRight: spacing.xxxl,
    fontFamily: typography.fontFamily.body,
  },
  InfoTextBold: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.textPrimary,
    textAlign: "center",
    marginTop: spacing.xxxxl2,
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
  palmTreeWrapper: {
    position: "absolute",
  },
  palmLeafWrapper: {
    position: "absolute",
  },
  curlyGreenWrapper: {
    position: "absolute",
    zIndex: 1,
    transform: [{ rotate: "-90deg" }],
  },
  curlyGreenWrapper2: {
    position: "absolute",
    zIndex: 1,
    transform: [{ rotate: "90deg" }],
  },
  mascotWrapper: {
    position: "absolute",
    zIndex: 3,
  },
});
