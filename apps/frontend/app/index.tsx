
import { Link, router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View, Image } from "react-native";
import { AppButton } from "@/src/components/common/AppButton";
import { AppText } from "@/src/components/common/AppText";
import { colors, spacing, typography } from "@/src/theme";
import { useGoogleLogin } from "@/src/lib/googleAuth";
import VoteyLogo from "@/assets/logos/votey-logo1.svg";
import CurlyGreen from "@/assets/visuals/curly-green.svg";
import PalmLeaf from "@/assets/visuals/palm-leaf.svg";
import PalmTree from "@/assets/visuals/palm-tree.svg";
import Google from "@/assets/icons/google.svg";
import Stars from "@/assets/visuals/stars.svg";

export default function StartPage() {
  const { response, promptAsync, signInWithGoogleToken } =
    useGoogleLogin();
  useEffect(() => {
    async function handleGoogleResponse() {
      if (response?.type === "success") {
        const idToken = response.authentication?.idToken;
        if (!idToken) return;

        await signInWithGoogleToken(idToken);
        router.replace("/landing");
      }
    }

    handleGoogleResponse();
  }, [response, signInWithGoogleToken]);
  
  return (
    <View style={styles.container}>
      {/* Decorative background visuals */}
      <View style={styles.palmTreeWrapper} pointerEvents="none">
        <PalmTree width={1000} height={1000} />
      </View>

      <View style={styles.palmLeafWrapper} pointerEvents="none">
        <PalmLeaf width={350} height={350} />
      </View>

      <View style={styles.curlyGreenWrapper} pointerEvents="none">
        <CurlyGreen width={500} height={500} />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <View style={styles.logoWrapper}>
          <VoteyLogo width={280} height={180} />

          <View style={styles.titleWrapper}>
            <View style={styles.starsWrapper}>
              <Stars width={50} height={50} />
            </View>

            <AppText variant="title" style={styles.titleYooo}>
              Yooo
            </AppText>

            <AppText variant="title" style={styles.titleTraveler}>
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
            />
          </Link>

          <View style={styles.registerRow}>
            <AppText variant="caption" style={styles.captionDark}>
              No account yet?
            </AppText>
            <Link href="/register" style={styles.registerLink}>
              Register here
            </Link>
            <View style={styles.registerHighlight} />
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
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
    overflow: "hidden",
  },

  palmTreeWrapper: {
    position: "absolute",
    top: -245,
    right: -560,
  },

  palmLeafWrapper: {
    position: "absolute",
    top: 50,
    left: -240,
  },

  curlyGreenWrapper: {
    position: "absolute",
    bottom: -220,
    left: -215,
  },

  content: {
    width: "100%",
    gap: spacing.xxxxl2,
    alignItems: "center",
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
    top: -26,
    right: 20,
    zIndex: 3,
  },

  titleYooo: {
    fontSize: 50,
    lineHeight: 45,
    color: colors.beachYellow,
    textTransform: "uppercase",
    fontFamily: typography.fontFamily.title,
  },

  titleTraveler: {
    fontSize: 56,
    lineHeight: 54,
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

  registerLinkWrapper: {
    position: "relative",
    width: 92,
    alignItems: "center",
    justifyContent: "center",
  },

  registerLink: {
    color: colors.textPrimary,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.bodyBold,
    zIndex: 2,
    textAlign: "center",
  },

  registerHighlight: {
    position: "absolute",
    right: 37,
    bottom: 0,
    height: 7,
    width: 88,
    backgroundColor: colors.neonGreen,
    borderRadius: 6,
    zIndex: 1,
  },

  orText: {
    textAlign: "center",
    color: colors.seaBlue,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.md,
  },
});
