import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import Plane from "@/assets/icons/plane.svg";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  Alert,
  Animated,
  Text
} from "react-native";
import { colors, spacing, radius, typography } from "@/src/theme";
import { AppButton } from "@/src/components/common/AppButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { navigate } from "expo-router/build/global-state/routing";



const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function Onboarding() { 
    const [step, setStep] = useState<1 | 2 | 3 >(1);

    return (
        <View style={Styles.fullScreen}>
            <View style={Styles.safeArea}>
                <View style={Styles.root}>
                    {step === 1 ? (

                    <>
                        <View style={Styles.header}>
                            <View
                        style={Styles.headerTitle}
                        accessible={false}
                        importantForAccessibility="no-hide-descendants"
                        >
                        <Plane width={25} height={25} />
                            <Text style={Styles.headerLabel}>Onboarding</Text>
                            </View>
                        </View>

                        <View style={Styles.container}>
                            <Text style={[Styles.title, Styles.titleBg1]}>Plan Together</Text>
                        </View>

                        <View style={[Styles.continueWrapper, { pointerEvents: "box-none" }]}>
                            <AppButton
                                title="Continue"
                                onPress={() => setStep(2)}
                                style={Styles.continueButton}
                                textStyle={Styles.continueButtonText}
                                accessibilityLabel="Continue to next step"
                                accessibilityHint="Moves to the next step of onboarding"
                                        />
                        </View>
                    </>

                    ) : step === 2 ? (
                    <>
                        <View style={Styles.header}>
                            <View
                                style={Styles.headerTitle}
                                accessible={false}
                                importantForAccessibility="no-hide-descendants"
                                >
                                <Plane width={25} height={25} />
                                <Text style={Styles.headerLabel}>Onboarding</Text>
                            </View>
                        </View>

                        <View style={Styles.container}>
                            <Text style={[Styles.title, Styles.titleBg2]}>Decide Together</Text>
                        </View>

                        <View style={[Styles.continueWrapper, { pointerEvents: "box-none" }]}>
                            <AppButton
                                title="Previous"
                                onPress={() => setStep(1)}
                                style={Styles.continueButton}
                                textStyle={Styles.continueButtonText}
                                accessibilityLabel="Go to Previous step"
                                accessibilityHint="Moves to the previous step of onboarding"
                            />
                            <AppButton
                                title="Continue"
                                onPress={() => setStep(3)}
                                style={Styles.continueButton}
                                textStyle={Styles.continueButtonText}
                                accessibilityLabel="Continue to next step"
                                accessibilityHint="Moves to the next step of onboarding"
                            />
                        </View>
                    </>

                    ) : (

                    <>
                        <View style={Styles.header}>
                            <View
                            style={Styles.headerTitle}
                            accessible={false}
                            importantForAccessibility="no-hide-descendants"
                            >
                                <Plane width={25} height={25} />
                                <Text style={Styles.headerLabel}>Onboarding</Text>
                            </View>
                        </View>

                        <View style={Styles.container}>
                            <Text style={[Styles.title, Styles.titleBg3]}>Travel Together</Text>
                        </View>

                        <View style={[Styles.continueWrapper, { pointerEvents: "box-none" }]}>
                            <AppButton
                                title="Previous"
                                onPress={() => setStep(2)}
                                style={Styles.continueButton}
                                textStyle={Styles.continueButtonText}
                                accessibilityLabel="Go to Previous step"
                                accessibilityHint="Moves to the previous step of onboarding"
                            />
                            <AppButton
                                title="Finish"
                                onPress={() => navigate("/home")}
                                style={Styles.continueButton}
                                textStyle={Styles.continueButtonText}
                                accessibilityLabel="Finish onboarding"
                                accessibilityHint="Completes the onboarding process and navigates to the home screen"
                            />
                        </View>
                    </>
                    )
                }
                </View>
                
            </View>
        </View>
    );
}


const Styles = StyleSheet.create({
    fullScreen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  root: {
    flex: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.xl,
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
      alignSelf: "stretch",
    },
    titleBg1: {
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.beachYellow
    },
    titleBg2: {
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.sunsetPink
    },
    titleBg3: {
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.neonGreen
    },
    container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxxl2,
  },
  setupText: {
    fontSize: 18,
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    textAlign: "center",
    paddingTop: spacing.xxxxl2,
  },
  continueWrapper: {
    position: "absolute",
    bottom: SCREEN_WIDTH * (140 / 393),
    left: spacing.xl,
    right: spacing.xl,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    },
  continueButton: {
    backgroundColor: colors.sunsetOrange,
    flex: 1, 
    marginRight: spacing.sm
  },
  continueButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
});