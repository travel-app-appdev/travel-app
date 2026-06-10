import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/src/components/common/AppText";
import { PreferenceChips } from "@/src/components/common/PreferenceChips";
import { updateMemberPreferences } from "@/src/api/trips";
import { auth } from "@/src/lib/firebase";
import { colors, spacing, radius, typography } from "@/src/theme";
import LeafUp from "@/assets/visuals/leaf_up.svg";
import LeafDown from "@/assets/visuals/leaf_down.svg";
import BackIcon from "@/assets/icons/back.svg";
import { hiddenFromAccessibility } from "@/src/utils/accessibility";

const { width: W, height: H } = Dimensions.get("window");

export default function PreferencesScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();

  const [preferences, setPreferences] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    if (isSaving) return;

    if (tripId && preferences.length > 0) {
      try {
        setIsSaving(true);
        const currentUser = auth.currentUser;
        if (currentUser) {
          const token = await currentUser.getIdToken();
          await updateMemberPreferences(tripId, preferences, token);
        }
      } catch {
        // non-blocking — go home anyway
      } finally {
        setIsSaving(false);
      }
    }

    router.replace("/home");
  };

  const handleSkip = () => {
    router.replace("/home");
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        {/* Decorative leaves */}
        <View
          style={[styles.leafTopRight, { pointerEvents: "none" }]}
          {...hiddenFromAccessibility}
        >
          <LeafUp width={W * 0.38} height={W * 0.38} />
        </View>
        <View
          style={[styles.leafBottomLeft, { pointerEvents: "none" }]}
          {...hiddenFromAccessibility}
        >
          <LeafDown width={W * 0.42} height={W * 0.42} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <Pressable
            onPress={handleSkip}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Skip preferences"
          >
            <BackIcon width={24} height={24} {...hiddenFromAccessibility} />
          </Pressable>

          {/* Title */}
          <View style={styles.titleBlock}>
            <AppText variant="title" style={styles.title}>
              Your preferences
            </AppText>
            <AppText variant="body" style={styles.subtitle}>
              What do you enjoy{" "}
              <AppText variant="body" style={styles.subtitleBold}>
                most?
              </AppText>
            </AppText>
            <AppText variant="caption" style={styles.hint}>
              {"Pick up to 5 categories. We'll use them to suggest activities for your trip."}
            </AppText>
          </View>

          {/* Preference chips */}
          <PreferenceChips
            selected={preferences}
            onChange={setPreferences}
            showGroups
          />

          {/* Spacer */}
          <View style={styles.spacer} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleContinue}
            disabled={isSaving}
            style={[styles.continueBtn, isSaving && styles.continueBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            {isSaving ? (
              <ActivityIndicator color={colors.lightWhite} />
            ) : (
              <AppText variant="body" style={styles.continueBtnText}>
                Continue
              </AppText>
            )}
          </Pressable>
          <Pressable
            onPress={handleSkip}
            style={styles.skipBtn}
            accessibilityRole="button"
            accessibilityLabel="Skip"
          >
            <AppText variant="body" style={styles.skipText}>
              Skip for now
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.lightWhite,
  },
  safeArea: {
    flex: 1,
  },
  leafTopRight: {
    position: "absolute",
    top: H * -0.01,
    right: W * -0.05,
    zIndex: 0,
    opacity: 0.55,
  },
  leafBottomLeft: {
    position: "absolute",
    bottom: H * 0.08,
    left: W * -0.08,
    zIndex: 0,
    opacity: 0.55,
    transform: [{ rotate: "5deg" }],
  },
  scroll: {
    flex: 1,
    zIndex: 1,
  },
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxl,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  titleBlock: {
    gap: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.bodyBlack,
    fontSize: typography.size.displaySm,
    lineHeight: typography.lineHeight.displaySm,
    color: colors.nightBlack,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xl,
    color: colors.nightBlack,
  },
  subtitleBold: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    textDecorationLine: "underline",
    color: colors.nightBlack,
  },
  hint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.grayedOut,
    lineHeight: typography.lineHeight.md,
  },
  spacer: {
    height: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
    zIndex: 1,
    backgroundColor: colors.lightWhite,
  },
  continueBtn: {
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.sunsetOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnDisabled: {
    opacity: 0.7,
  },
  continueBtnText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    color: colors.lightWhite,
  },
  skipBtn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.grayedOut,
    textDecorationLine: "underline",
  },
});
