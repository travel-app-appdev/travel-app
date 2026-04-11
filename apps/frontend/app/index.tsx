import { Link, router } from "expo-router";
import { useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { AppButton } from "@/src/components/common/AppButton";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import { useGoogleLogin } from "@/src/lib/googleAuth";
import VoteyLogo from "@/assets/logos/votey-logo1.svg";
import CurlyGreen from "@/assets/visuals/curly-green.svg";
import PalmLeaf from "@/assets/visuals/palm-leaf.svg";
import PalmTree from "@/assets/visuals/palm-tree.svg";
import Google from "@/assets/icons/google.svg";
import Stars from "@/assets/visuals/stars.svg";

export default function StartPage() {
  const { response, signInWithGoogleToken } = useGoogleLogin();
  const { width, height } = useWindowDimensions();

  const sw = width / 390;
  const sh = height / 844;
  const scale = Math.min(sw, sh);

  useEffect(() => {
    async function handleGoogleResponse() {
      if (response?.type === "success") {
        const idToken = response.authentication?.idToken;
        if (!idToken) return;
        await signInWithGoogleToken(idToken);
        router.replace("/home");
      }
    }
    handleGoogleResponse();
  }, [response, signInWithGoogleToken]);

  return (
    <View style={styles.container}>
      {/* Decorative background visuals — scaled to screen */}
      <View
        style={[styles.palmTreeWrapper, { top: -245 * sh, right: -560 * sw }]}
        pointerEvents="none"
      >
        <PalmTree width={1000 * sw} height={1000 * sh} />
      </View>

      <View
        style={[styles.palmLeafWrapper, { top: 50 * sh, left: -240 * sw }]}
        pointerEvents="none"
      >
        <PalmLeaf width={350 * sw} height={350 * sw} />
      </View>

      <View
        style={[
          styles.curlyGreenWrapper,
          { bottom: -220 * sh, left: -215 * sw },
        ]}
        pointerEvents="none"
      >
        <CurlyGreen width={500 * sw} height={500 * sw} />
      </View>

      {/* ScrollView so tiny phones (SE) can still reach the buttons */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrapper}>
          <VoteyLogo width={280 * scale} height={180 * scale} />

          <View style={styles.titleWrapper}>
            <View
              style={[
                styles.starsWrapper,
                { top: -26 * scale, right: 20 * scale },
              ]}
            >
              <Stars width={50 * scale} height={50 * scale} />
            </View>

            <AppText
              variant="title"
              style={[
                styles.titleYooo,
                {
                  fontSize: Math.round(50 * scale),
                  lineHeight: Math.round(50 * scale * 1.15),
                },
              ]}
            >
              Yooo
            </AppText>

            <AppText
              variant="title"
              style={[
                styles.titleTraveler,
                {
                  fontSize: Math.round(56 * scale),
                  lineHeight: Math.round(56 * scale * 1.15),
                },
              ]}
            >
              Traveler
            </AppText>
          </View>
        </View>

        <View style={styles.actions}>
          <Link href="/login" asChild>
            <AppButton
              title="Login"
              onPress={() => {}}
              textStyle={styles.primaryButtonText}
              accessibilityLabel="Go to login screen"
            />
          </Link>

          <View style={styles.registerRow}>
            <AppText variant="caption" style={styles.captionDark}>
              No account yet?
            </AppText>

            <Link
              href="/register"
              accessibilityLabel="Register here"
              accessibilityRole="link"
            >
              <View>
                <AppText style={styles.registerLink}>Register here</AppText>
                <View style={styles.registerHighlight} />
              </View>
            </Link>
          </View>

          <AppText variant="caption" style={styles.orText}>
            or
          </AppText>

          <AppButton
            title="Continue with Google"
            onPress={() => {}}
            variant="secondary"
            icon={<Google width={20} height={20} />}
            textStyle={styles.secondaryButtonText}
            accessibilityLabel="Continue with Google"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightWhite,
    overflow: "hidden",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxxl2,
    gap: spacing.xxxxl2,
  },
  palmTreeWrapper: {
    position: "absolute",
  },
  palmLeafWrapper: {
    position: "absolute",
  },
  curlyGreenWrapper: {
    position: "absolute",
  },
  logoWrapper: {
    alignItems: "center",
    gap: spacing.xxxxl2,
  },
  titleWrapper: {
    alignItems: "center",
    position: "relative",
    marginTop: spacing.sm,
  },
  starsWrapper: {
    position: "absolute",
    zIndex: 3,
  },
  titleYooo: {
    color: colors.beachYellow,
    textTransform: "uppercase",
    fontFamily: typography.fontFamily.title,
  },
  titleTraveler: {
    color: colors.sunsetOrange,
    textTransform: "uppercase",
    fontFamily: typography.fontFamily.title,
    marginTop: 2,
    paddingBottom: spacing.xl,
  },
  actions: {
    width: "70%",
    alignSelf: "center",
    gap: spacing.md,
  },
  primaryButtonText: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
  },
  secondaryButtonText: {
    color: colors.seaBlue,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  captionDark: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.sm,
  },
  registerLink: {
    color: colors.textPrimary,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.bodyBold,
  },
  registerHighlight: {
    height: 4,
    backgroundColor: colors.neonGreen,
    borderRadius: radius.pill,
    marginTop: -1,
  },
  orText: {
    textAlign: "center",
    color: colors.seaBlue,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.md,
  },
});
