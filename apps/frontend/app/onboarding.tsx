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
                        <Text style={[Styles.title, Styles.titleBg]}>Planning Together</Text>
                    </View>
                    </>
                    ) : step === 2 ? (

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

                    ) : (

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
    titleBg: {
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.beachYellow
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

});