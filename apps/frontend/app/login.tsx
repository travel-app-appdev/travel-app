import { Link, router } from "expo-router";
import { useRef, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  TextInput,
} from "react-native";

import { AppButton } from "@/src/components/common/AppButton";
import { AppInput } from "@/src/components/common/AppInput";
import { AppText } from "@/src/components/common/AppText";
import {
  hasErrors,
  type AuthFieldErrors,
  validateLogin,
} from "@/src/lib/authValidation";
import { handleLogin as loginUser } from "@/src/services/authServices";
import { colors, radius, spacing, typography } from "@/src/theme";

import Back from "@/assets/icons/back.svg";
import MascotHelloSeaBlue from "@/assets/mascots/mascot-hello-seablue.svg";
import BlueBackground from "@/assets/visuals/blue-background.svg";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const { width, height } = useWindowDimensions();
  const scale = Math.min(width / 390, height / 844);

  const titleSize = Math.round(Math.max(60 * scale, 40));

  function clearFieldError(field: keyof AuthFieldErrors) {
    setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
  }

  async function handleLogin() {
    if (isSubmitting) return;

    const nextErrors = validateLogin({ email, password });
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    try {
      setIsSubmitting(true);
      await loginUser(email.trim(), password);
      router.replace("/home");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      setErrors((prev) => ({ ...prev, general: message }));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <View style={styles.container}>
        <BlueBackground
          style={[styles.backgroundSvg, { height: Math.round(460 * scale) }]}
          {...(Platform.OS !== "web" ? { accessible: false } : {})}
        />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.round(70 * scale) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.backWrapper}>
            <Link
              href="/"
              accessibilityLabel="Go back to welcome screen"
              accessibilityRole="link"
              style={styles.backWrapper}
            >
              <Back width={20} height={20} />
            </Link>
          </View>

          {/* Label with inline highlight — same pattern as welcome screen */}
          <View style={styles.labelRow}>
            <View style={styles.labelWrapper}>
              <AppText variant="body" style={styles.smallLabel}>
                Login
              </AppText>
              <View style={styles.loginHighlight} />
            </View>
          </View>

          {/* Title + Mascot */}
          <View style={styles.titleBlock}>
            <View
              style={styles.mascotWrapper}
              {...(Platform.OS !== "web" ? { accessible: false } : {})}
            >
              <MascotHelloSeaBlue width={110 * scale} height={110 * scale} />
            </View>

            {/* Each word on its own line, each with its own highlight — same as register */}
            <View
              style={[
                styles.titleLines,
                { paddingRight: Math.round(120 * scale) },
              ]}
            >
              <View style={styles.titleWordWrapper}>
                <AppText
                  variant="title"
                  style={[
                    styles.title,
                    {
                      fontSize: titleSize,
                      lineHeight: Math.round(titleSize * 1.15),
                    },
                  ]}
                >
                  Welcome
                </AppText>
              </View>

              <View style={styles.titleWordWrapper}>
                <AppText
                  variant="title"
                  style={[
                    styles.title,
                    {
                      fontSize: titleSize,
                      lineHeight: Math.round(titleSize * 1.15),
                    },
                  ]}
                >
                  Back!
                </AppText>
              </View>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <AppText variant="body" style={styles.label}>
                Your email
              </AppText>
              <AppInput
                testID="login-email-input"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  clearFieldError("email");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
                accessibilityLabel="Email address"
                accessibilityHint="Enter your email to log in"
                hasError={!!errors.email}
                style={styles.inputPlain}
              />
              {errors.email ? (
                <AppText variant="caption" style={styles.errorText}>
                  {errors.email}
                </AppText>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <AppText variant="body" style={styles.label}>
                Your password
              </AppText>
              <AppInput
                ref={passwordRef}
                testID="login-password-input"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  clearFieldError("password");
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                accessibilityLabel="Password"
                accessibilityHint="Enter your password to log in"
                hasError={!!errors.password}
                style={[
                  styles.inputPlain,
                  errors.password && styles.inputError,
                ]}
              />
              {errors.password ? (
                <AppText
                  variant="caption"
                  style={styles.errorText}
                  accessibilityRole="alert"
                >
                  {errors.password}
                </AppText>
              ) : null}
            </View>

            {errors.general ? (
              <AppText
                variant="caption"
                style={styles.errorText}
                accessibilityRole="alert"
              >
                {errors.general}
              </AppText>
            ) : null}
          </View>

          {/* Button */}
          <View style={styles.buttonWrapper}>
            <AppButton
              title={isSubmitting ? "LOGGING IN..." : "LET'S GOOOO"}
              onPress={handleLogin}
              loading={isSubmitting}
              style={styles.loginButton}
              textStyle={styles.loginButtonText}
              accessibilityLabel={isSubmitting ? "Logging in" : "Log in"}
              accessibilityHint="Logs you into your account"
            />
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  },
  backWrapper: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: spacing.xxxl,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
    zIndex: 2,
  },
  labelRow: {
    marginTop: spacing.sm,
  },
  smallLabel: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    zIndex: 2,
  },
  labelWrapper: {
    alignSelf: "flex-start",
  },
  loginHighlight: {
    height: 4,
    backgroundColor: colors.seaBlue,
    borderRadius: radius.pill,
    marginTop: -4,
  },
  titleBlock: {
    position: "relative",
    marginTop: spacing.md,
  },
  mascotWrapper: {
    position: "absolute",
    top: -110,
    right: 0,
    zIndex: 3,
  },
  titleLines: {
    alignSelf: "flex-start",
    gap: 2,
    paddingRight: 120,
  },
  titleWordWrapper: {
    alignSelf: "flex-start",
  },
  title: {
    color: colors.textPrimary,
    textTransform: "uppercase",
    fontFamily: typography.fontFamily.title,
  },
  form: {
    gap: spacing.xl,
    marginTop: spacing.lg,
  },
  fieldGroup: { gap: spacing.sm },
  label: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
  },
  inputPlain: { borderWidth: 1 },
  inputError: { borderColor: colors.error },
  errorText: {
    color: colors.error,
    fontSize: typography.size.sm,
    lineHeight: 18,
  },
  buttonWrapper: {
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
    marginTop: spacing.xxxl,
  },
  loginButton: { backgroundColor: colors.seaBlue },
  loginButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  bottomSpacer: { height: spacing.xxxxl2 },
});
