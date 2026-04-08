import { Link, router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";

import { AppButton } from "@/src/components/common/AppButton";
import { AppInput } from "@/src/components/common/AppInput";
import { AppText } from "@/src/components/common/AppText";
import { auth } from "@/src/lib/firebase";
import { colors, spacing, typography } from "@/src/theme";

import Back from "@/assets/icons/back.svg";
import MascotHelloSeaBlue from "@/assets/mascots/mascot-hello-seablue.svg";
import BlueBackground from "@/assets/visuals/blue-background.svg";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    try {
      setIsSubmitting(true);

      await signInWithEmailAndPassword(auth, email.trim(), password);

      router.replace("/landing");
    } catch (error: any) {
      Alert.alert("Login failed", error?.message ?? "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <BlueBackground style={styles.backgroundSvg} />

      <View style={styles.backWrapper}>
        <Link href="/">
          <Back width={20} height={20} />
        </Link>
      </View>

      <View style={styles.content}>
        <View style={styles.labelRow}>
          <View style={styles.labelWrapper}>
            <AppText variant="body" style={styles.smallLabel}>
              Login
            </AppText>
            <View style={styles.loginHighlight} />
          </View>
        </View>

        <View style={styles.titleBlock}>
          <View style={styles.mascotWrapper}>
            <MascotHelloSeaBlue width={110} height={110} />
          </View>

          <AppText variant="title" style={styles.title}>
            Welcome{"\n"}Back!
          </AppText>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <AppText variant="body" style={styles.label}>
              Your email
            </AppText>
            <AppInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.inputPlain}
            />
          </View>

          <View style={styles.fieldGroup}>
            <AppText variant="body" style={styles.label}>
              Your password
            </AppText>
            <AppInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.inputPlain}
            />
          </View>
        </View>

        <View style={styles.buttonWrapper}>
          <AppButton
            title={isSubmitting ? "LOGGING IN..." : "LET'S GOOOO"}
            onPress={handleLogin}
            style={styles.loginButton}
            textStyle={styles.loginButtonText}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.beachYellow,
  },
  backgroundSvg: {
    position: "absolute",
    top: -30,
    left: 0,
    right: 0,
    width: "100%",
    height: 460,
  },
  backWrapper: {
    position: "absolute",
    top: 56,
    left: spacing.xxl,
    zIndex: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xxxl,
    paddingTop: 170,
    gap: spacing.xl,
    zIndex: 2,
  },
  labelRow: {
    marginTop: spacing.sm,
  },
  labelWrapper: {
    alignSelf: "flex-start",
    position: "relative",
    paddingBottom: 6,
  },
  smallLabel: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 20,
    zIndex: 2,
  },
  loginHighlight: {
    position: "absolute",
    top: 17,
    left: 0,
    bottom: 0,
    width: "100%",
    height: 8,
    backgroundColor: colors.seaBlue,
    borderRadius: 6,
    zIndex: 1,
  },
  titleBlock: {
    position: "relative",
    marginTop: spacing.md,
  },
  mascotWrapper: {
    position: "absolute",
    top: -100,
    right: 12,
    zIndex: 3,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 70,
    lineHeight: 62,
    textTransform: "uppercase",
    maxWidth: 400,
    marginTop: 8,
  },
  form: {
    gap: spacing.xl,
    marginTop: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 18,
  },
  inputPlain: {
    borderWidth: 0,
  },
  buttonWrapper: {
    width: "70%",
    alignSelf: "center",
    marginTop: spacing.xxxl,
  },
  loginButton: {
    backgroundColor: colors.seaBlue,
  },
  loginButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
});
import { PlaceholderScreen } from '@/src/components/common/placeholder-screen';

export default function LoginScreen() {
  return (
    <PlaceholderScreen
      title="Login"
      description="Placeholder screen for user sign in. Authentication logic can be added later without changing the route structure."
      primaryLink={{ href: '/register', label: 'Need an account? Register' }}
    />
  );
}
