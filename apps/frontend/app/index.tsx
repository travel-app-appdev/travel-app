import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
} from "react-native";
import { AppButton } from "@/src/components/common/AppButton";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography, shadows } from "@/src/theme";
import { useGoogleLogin } from "@/src/lib/googleAuth";
import { loginWithToken } from "@/src/api/auth";
import { useAuth } from "@/src/context/AuthContext";
import VoteyLogo from "@/assets/logos/votey-logo1.svg";
import CurlyGreen from "@/assets/visuals/curly-green.svg";
import PalmLeaf from "@/assets/visuals/palm-leaf.svg";
import PalmTree from "@/assets/visuals/palm-tree.svg";
import Google from "@/assets/icons/google.svg";
import Stars from "@/assets/visuals/stars.svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

export default function StartPage() {
  const { response, signInWithGoogleToken, promptAsync, request } =
    useGoogleLogin();
  const { setUser, setIdToken } = useAuth();

  const [dimensions, setDimensions] = useState(() => Dimensions.get("window"));
  const [svgDimensions] = useState(() => Dimensions.get("window"));
  const [isLandscape, setIsLandscape] = useState(() => {
    const { width, height } = Dimensions.get("window");
    return width > height;
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
      setIsLandscape(window.width > window.height);
    });
    return () => subscription.remove();
  }, []);

  const { width, height } = dimensions;
  const { width: svgWidth, height: svgHeight } = svgDimensions;

  // Layout / text — reactive to rotation
  const sw = width / 390;
  const sh = height / 844;
  const baseScale = Math.min(sw, sh);
  const midProgress = clamp((width - 390) / (1024 - 390), 0, 1);
  const contentMaxWidth = lerp(320, 460, midProgress);
  const logoWidth = lerp(280 * baseScale, 380, midProgress);
  const logoHeight = lerp(180 * baseScale, 240, midProgress);
  const titleYoooSize = Math.round(lerp(50 * baseScale, 72, midProgress));
  const titleVotiesSize = Math.round(lerp(56 * baseScale, 82, midProgress));
  const starsSize = lerp(50 * baseScale, 62, midProgress);

  // SVG sizes / positions — frozen at mount, never resize on rotation
  const svgSw = svgWidth / 390;
  const svgSh = svgHeight / 844;
  const svgWideProgress = clamp((svgWidth - 390) / (1440 - 390), 0, 1);

  const palmTreeSize = 1000 * svgSw * lerp(1, 0.78, svgWideProgress);
  const palmLeafSize = 350 * svgSw * lerp(1, 0.7, svgWideProgress);

  const palmTreeRight = lerp(-560 * svgSw, -560 * svgSw + 600, svgWideProgress);
  const palmTreeTop = lerp(-245 * svgSh, -245 * svgSh - 700, svgWideProgress);
  const palmLeafLeft = lerp(-240 * svgSw, -240 * svgSw + 350, svgWideProgress);
  const palmLeafTop = lerp(50 * svgSh, 50 * svgSh - 600, svgWideProgress);

  useEffect(() => {
    async function handleGoogleResponse() {
      if (response?.type === "success") {
        const googleIdToken =
          response.authentication?.idToken ?? response.params?.id_token;

        if (!googleIdToken) return;

        const { firebaseIdToken } = await signInWithGoogleToken(googleIdToken);
        const backendUser = await loginWithToken(firebaseIdToken);

        setUser(backendUser);
        setIdToken(firebaseIdToken);

        router.replace("/home");
      }
    }

    handleGoogleResponse();
  }, [response, signInWithGoogleToken, setUser, setIdToken]);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.palmTreeWrapper,
          {
            top: palmTreeTop,
            right: palmTreeRight,
            pointerEvents: "none",
          },
        ]}
      >
        <PalmTree width={palmTreeSize} height={palmTreeSize} />
      </View>

      <View
        style={[
          styles.palmLeafWrapper,
          {
            top: palmLeafTop,
            left: palmLeafLeft,
            pointerEvents: "none",
          },
        ]}
      >
        <PalmLeaf width={palmLeafSize} height={palmLeafSize} />
      </View>

      {!isLandscape && (
        <View
          style={[styles.curlyGreenWrapper, { pointerEvents: "none" }]}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <CurlyGreen width={SCREEN_WIDTH * 1.1} height={SCREEN_WIDTH * 1.1} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: lerp(spacing.xl, spacing.xxxxl2, midProgress),
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.logoWrapper, { maxWidth: contentMaxWidth }]}>
          <VoteyLogo width={logoWidth} height={logoHeight} />

          <View style={styles.titleWrapper}>
            <View
              style={[
                styles.starsWrapper,
                {
                  top: lerp(-26 * baseScale, -30, midProgress),
                  right: lerp(-20 * baseScale, -18, midProgress),
                },
              ]}
            >
              <Stars width={starsSize} height={starsSize} />
            </View>

            <AppText
              variant="title"
              style={[
                styles.titleYooo,
                {
                  fontSize: titleYoooSize,
                  lineHeight: Math.round(titleYoooSize * 1.15),
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
                  fontSize: titleVotiesSize,
                  lineHeight: Math.round(titleVotiesSize * 1.15),
                },
              ]}
            >
              Voties
            </AppText>
          </View>
        </View>

        <View
          style={[
            styles.actions,
            {
              maxWidth: contentMaxWidth,
            },
          ]}
        >
          <Link href="/login" asChild>
            <AppButton
              title="Login"
              onPress={() => {
                if (typeof document !== "undefined") {
                  (document.activeElement as HTMLElement | null)?.blur();
                }
                router.push("/login");
              }}
              textStyle={styles.primaryButtonText}
              accessibilityLabel="Go to login screen"
              accessibilityHint="Opens the login page"
            />
          </Link>

          <View style={styles.registerRow}>
            <AppText variant="caption" style={styles.captionDark}>
              No account yet?
            </AppText>

            <Link
              href="/register"
              accessibilityLabel="Go to registration screen"
              accessibilityRole="link"
            >
              <View style={styles.registerLinkWrapper}>
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
            onPress={() => promptAsync()}
            variant="secondary"
            icon={<Google width={20} height={20} />}
            textStyle={styles.secondaryButtonText}
            accessibilityLabel="Continue with Google"
            disabled={!request}
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
    bottom: -SCREEN_WIDTH * 0.3,
    left: -SCREEN_WIDTH * 0.1,
    zIndex: 0,
  },
  logoWrapper: {
    alignItems: "center",
    gap: spacing.xxxxl2,
    width: "100%",
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
    ...shadows.displayTitle,
  },
  titleTraveler: {
    color: colors.sunsetOrange,
    textTransform: "uppercase",
    fontFamily: typography.fontFamily.title,
    marginTop: 2,
    paddingBottom: spacing.xl,
    ...shadows.displayTitle,
  },
  actions: {
    width: "100%",
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
    minHeight: 44,
    justifyContent: "center",
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
