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
import Back from "@/assets/icons/back.svg";
import Forward from "@/assets/icons/forward.svg";



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

                        <View style={Styles.container}>
                            <Text style={[Styles.title]}>Plan Together</Text>
                            <View style={Styles.TitleHighlight1} />
                        </View>

                        <View>
                            <Text style={Styles.InfoText}>
                                Plan your trip together with your travel companions.{" "}
                                <Text style={Styles.InfoTextBold}>Add activities</Text> in the itinerary, and collaborate on the details of your trip{" "} 
                                <Text style={Styles.InfoTextBold}>in one place.</Text>
                            </Text>
                        </View>

                        <View style={[Styles. ArrowWrapper, { pointerEvents: "box-none" }]}>
                            <View style={Styles.arrowSide} /> 

                            <Text style={Styles.StepIndicator}>
                                {step}/3
                            </Text>

                            <Pressable onPress={() => setStep(2)}>
                                <Forward width={20} height={20} style={Styles.FowardButton}/>
                            </Pressable>
                            
                        </View>

                        <View style={[Styles.continueWrapper, { pointerEvents: "box-none" }]}>
                            <AppButton
                                title="Skip"
                               onPress={() => navigate("/home")}
                                style={Styles.continueButton}
                                textStyle={Styles.continueButtonText}
                               accessibilityLabel="Skip onboarding"
                                accessibilityHint="Skips the onboarding process and navigates to the home screen"
                                        />
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

                        <View style={Styles.container}>
                            <Text style={[Styles.title]}>Decide Together</Text>
                            <View style={Styles.TitleHighlight2} />
                        </View>

                        <View>
                            <Text style={Styles.InfoText}>
                               Say goodbye to endless debates and{" "} 
                               <Text style={Styles.InfoTextBold}>make decisions together </Text>with ease. Use our{" "} 
                               <Text style={Styles.InfoTextBold}>voting feature</Text> to let everyone have a say in choosing activities.
                            </Text>
                        </View>

                        

                        <View style={[Styles.ArrowWrapper, { pointerEvents: "box-none" }]}>
                            <Pressable onPress={() => setStep(1)}>
                                <Back width={20} height={20} />
                            </Pressable>

                            <Text style={Styles.StepIndicator}>
                                {step}/3
                            </Text>

                            <Pressable onPress={() => setStep(3)}>
                                <Forward width={20} height={20} style={Styles.FowardButton}/>
                            </Pressable>
                            
                        </View>

                        <View style={[Styles.continueWrapper, { pointerEvents: "box-none" }]}>
                            <AppButton
                                title="Skip"
                               onPress={() => navigate("/home")}
                                style={Styles.continueButton}
                                textStyle={Styles.continueButtonText}
                               accessibilityLabel="Skip onboarding"
                                accessibilityHint="Skips the onboarding process and navigates to the home screen"
                                        />
                        </View>
                    </>

                    ) : (

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

                        <View style={Styles.container}>
                            <Text style={[Styles.title]}>Travel Together</Text>
                            <View style={Styles.TitleHighlight3} />
                        </View>

                        <View>
                            <Text style={Styles.InfoText}>
                                Enjoy a{" "} 
                                <Text style={Styles.InfoTextBold}>seamless travel experience</Text> with your friends and family. Access your itinerary and important travel information{" "} 
                                <Text style={Styles.InfoTextBold}>on the go</Text>.
                            </Text>
                        </View>

                        <View style={[Styles.ArrowWrapper, { pointerEvents: "box-none" }]}>
                            <Pressable onPress={() => setStep(2)}>
                                <Back width={20} height={20} />
                            </Pressable>
                            <Text style={Styles.StepIndicator}>
                                {step}/3
                            </Text>
                             <View style={Styles.arrowSide} /> 

                        </View>

                        <View style={[Styles.continueWrapper, { pointerEvents: "box-none" }]}>
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
  justifyContent: "space-between",
  paddingHorizontal: spacing.sm,
  paddingTop: spacing.xl,
  },

headerSide: {
  width: 80, // MUST match Skip button width
},

arrowSide: {
    width: 20, 
},

TitleHighlight1: {
    height: 5,
    backgroundColor: colors.beachYellow,
    borderRadius: radius.pill,
    marginTop: -4,
    width: "75%",
    alignSelf: "center",
  },

  TitleHighlight2: {
    height: 4,
    backgroundColor: colors.sunsetPink,
    borderRadius: radius.pill,
    marginTop: -4,
    width: "75%",
    alignSelf: "center",
  },

  TitleHighlight3: {
    height: 4,
    backgroundColor: colors.neonGreen,
    borderRadius: radius.pill,
    marginTop: -4,
    width: "75%",
    alignSelf: "center",
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
    alignItems: "center",
    },

    ArrowWrapper: {
        position: "absolute",
        bottom: SCREEN_WIDTH * (210 / 393),
        left: spacing.xl,
        right: spacing.xl,
        zIndex: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
  continueButton: {
    backgroundColor: colors.sunsetOrange,
    flex: 1, 
    marginRight: spacing.sm
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
    marginTop: spacing.xxxxl2,
    paddingLeft: spacing.xl,
    paddingRight: spacing.xl,
  },
  InfoTextBold: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.textPrimary,
    textAlign: "center",
    marginTop: spacing.xxxxl2,
    fontWeight: "bold",
  },
  StepIndicator: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.textPrimary,
    textAlign: "center",
  },
  FowardButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
}, 
});