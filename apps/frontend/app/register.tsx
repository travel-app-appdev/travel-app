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
import { handleRegister as registerUser } from "@/src/services/authServices";

import { AppButton } from "@/src/components/common/AppButton";
import { AppInput } from "@/src/components/common/AppInput";
import { AppText } from "@/src/components/common/AppText";
import { getFirebaseAuthMessage } from "@/src/lib/authErrors";
import {
  hasErrors,
  type AuthFieldErrors,
  validateRegister,
} from "@/src/lib/authValidation";
import { colors, radius, spacing, typography } from "@/src/theme";

import Back from "@/assets/icons/back.svg";
import MascotHelloPink from "@/assets/mascots/mascot-hello-pink.svg";
import RegisterYellowBg from "@/assets/visuals/yellow-background.svg";
import Flowers from "@/assets/visuals/flowers-blue.svg";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const { width, height } = useWindowDimensions();
  const scale = Math.min(width / 390, height / 844);

  // Same as login — 70 on iPhone 14 Pro, shrinks on narrower screens
  const titleSize = Math.round(60 * scale);

  function clearFieldError(field: keyof AuthFieldErrors) {
    setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
  }

  async function handleRegister() {
    if (isSubmitting) return;

    const nextErrors = validateRegister({ name, email, password });
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    try {
      setIsSubmitting(true);
      await registerUser(name.trim(), email.trim(), password);
      router.replace("/home");
    } catch (error) {
      const message = getFirebaseAuthMessage(error);
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
        <RegisterYellowBg style={[styles.backgroundSvg, { height: height }]} />

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.round(70 * scale) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button scrolls with content — same as login */}
          <View style={styles.backWrapper}>
            <Link
              href="/login"
              accessibilityLabel="Go back to login"
              accessibilityRole="link"
            >
              <Back width={20} height={20} />
            </Link>
          </View>

          {/* Label with inline highlight */}
          <View style={styles.labelRow}>
            <View style={styles.labelWrapper}>
              <AppText variant="body" style={styles.smallLabel}>
                Register
              </AppText>
              <View style={styles.registerHighlight} />
            </View>
          </View>

          {/* Title + Mascot */}
          <View style={styles.titleBlock}>
            <View style={styles.mascotWrapper}>
              <MascotHelloPink width={110 * scale} height={110 * scale} />
            </View>

            {/* Same word-wrapper pattern as login */}
            <View
              style={[
                styles.titleLines,
                { paddingRight: Math.round(80 * scale) },
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
                  Who
                </AppText>
              </View>

              <View style={styles.titleWordWrapper}>
                <AppText
                  variant="title"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[
                    styles.title,
                    {
                      fontSize: titleSize,
                      lineHeight: Math.round(titleSize * 1.15),
                    },
                  ]}
                >
                  Are You?
                </AppText>
              </View>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <AppText variant="body" style={styles.label}>
                Your name
              </AppText>
              <AppInput
                testID="register-name-input"
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  clearFieldError("name");
                }}
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
                accessibilityLabel="Full name"
                accessibilityHint="Enter your name to create an account"
                style={[styles.inputPlain, errors.name && styles.inputError]}
              />
              {errors.name ? (
                <AppText variant="caption" style={styles.errorText}>
                  {errors.name}
                </AppText>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <AppText variant="body" style={styles.label}>
                Your email
              </AppText>
              <AppInput
                ref={emailRef}
                testID="register-email-input"
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
                accessibilityHint="Enter your email to create an account"
                style={[styles.inputPlain, errors.email && styles.inputError]}
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
                testID="register-password-input"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  clearFieldError("password");
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                accessibilityLabel="Password"
                accessibilityHint="Enter a password to create your account"
                style={[
                  styles.inputPlain,
                  errors.password && styles.inputError,
                ]}
              />
              {errors.password ? (
                <AppText variant="caption" style={styles.errorText}>
                  {errors.password}
                </AppText>
              ) : null}
            </View>

            {errors.general ? (
              <AppText variant="caption" style={styles.errorText}>
                {errors.general}
              </AppText>
            ) : null}
          </View>

          {/* Button */}
          <View style={styles.buttonWrapper}>
            <AppButton
              title={isSubmitting ? "CREATING..." : "LET'S GOOOO"}
              onPress={handleRegister}
              disabled={isSubmitting}
              style={styles.registerButton}
              textStyle={styles.registerButtonText}
              accessibilityLabel={
                isSubmitting ? "Creating account" : "Create account"
              }
            />
          </View>

          <View style={styles.flowersWrapper}>
            <Flowers width={64} height={24} />
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
    backgroundColor: colors.sunsetPink,
  },
  backgroundSvg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
  },
  // Back button now in scroll flow — no more position absolute
  backWrapper: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: spacing.xxxl,
    gap: spacing.xl,
    paddingBottom: spacing.xl,
    zIndex: 2,
  },
  labelRow: {
    marginTop: spacing.sm,
  },
  labelWrapper: {
    alignSelf: "flex-start",
  },
  smallLabel: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 20,
    zIndex: 2,
  },
  // Inline highlight — same pattern as login and welcome screen
  registerHighlight: {
    height: 4,
    backgroundColor: colors.sunsetPink,
    borderRadius: radius.pill,
    marginTop: -4,
  },
  titleBlock: {
    position: "relative",
    marginTop: spacing.md,
  },
  mascotWrapper: {
    position: "absolute",
    top: -50,
    right: 0,
    zIndex: 3,
  },
  titleLines: {
    alignSelf: "flex-start",
    gap: 2,
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
    fontSize: 18,
  },
  inputPlain: { borderWidth: 1 },
  inputError: { borderColor: "#D62828" },
  errorText: { color: "#D62828", fontSize: 14, lineHeight: 18 },
  buttonWrapper: {
    width: "70%",
    alignSelf: "center",
    marginTop: spacing.xxxl,
  },
  registerButton: { backgroundColor: colors.sunsetPink },
  registerButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  flowersWrapper: {
    alignItems: "center",
    marginTop: spacing.xl,
  },
  bottomSpacer: { height: spacing.xxxxl2 },
});
