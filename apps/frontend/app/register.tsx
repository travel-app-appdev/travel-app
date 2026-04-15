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
  Keyboard,
} from "react-native";
import { handleRegister as registerUser } from "@/src/services/authServices";
import { useAuth } from "@/src/context/AuthContext";

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
import PinkBackground from "@/assets/visuals/pink-background.svg";
import Flowers from "@/assets/visuals/flowers-blue.svg";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setUser } = useAuth();

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const { width, height } = useWindowDimensions();
  const scale = Math.min(width / 390, height / 844);

  const isSmallPhone = height < 760;
  const isVerySmallPhone = height < 700;

  const titleSize = Math.round(Math.min(52 * scale, isSmallPhone ? 36 : 44));
  const mascotSize = Math.round(Math.min(100 * scale, isSmallPhone ? 78 : 100));

  const headerTop = Math.round(isVerySmallPhone ? 34 : isSmallPhone ? 44 : 56);
  const headerBottom = isVerySmallPhone ? spacing.sm : spacing.lg;

  const bgHeight = Math.min(height * 0.42, 360);
  const bgWidth = width;

  function clearFieldError(field: keyof AuthFieldErrors) {
    setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
  }

  async function handleRegister() {
    if (isSubmitting) return;

    const nextErrors = validateRegister({ name, email, password });
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    Keyboard.dismiss();

    try {
      setIsSubmitting(true);

      const authResponse = await registerUser(
          name.trim(),
          email.trim(),
          password
      );

      setUser(authResponse);

      router.replace("/home");
    } catch (error) {
      const message = getFirebaseAuthMessage(error);
      setErrors((prev) => ({ ...prev, general: message }));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <PinkBackground
        width={bgWidth}
        height={bgHeight}
        style={styles.backgroundSvg}
        {...(Platform.OS !== "web" ? { accessible: false } : {})}
      />

      <View
        style={[
          styles.header,
          {
            paddingTop: headerTop,
            paddingBottom: headerBottom,
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.backWrapper}>
          <Link
            href="/"
            accessibilityLabel="Go back to welcome screen"
            accessibilityRole="link"
            style={styles.backTouchable}
          >
            <Back width={20} height={20} />
          </Link>
        </View>

        <View style={styles.labelRow}>
          <View style={styles.labelWrapper}>
            <AppText variant="body" style={styles.smallLabel}>
              Register
            </AppText>
            <View style={styles.registerHighlight} />
          </View>
        </View>

        <View
          style={[
            styles.titleBlock,
            {
              minHeight: mascotSize * 0.95,
              marginTop: isSmallPhone ? spacing.sm : spacing.md,
            },
          ]}
        >
          <View
            style={[
              styles.mascotWrapper,
              {
                top: isSmallPhone ? -8 : -16,
                right: 0,
              },
            ]}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <MascotHelloPink width={mascotSize} height={mascotSize} />
          </View>

          <View
            style={[
              styles.titleLines,
              {
                paddingRight: mascotSize * 0.8,
                paddingTop: isSmallPhone ? 10 : 16,
              },
            ]}
          >
            <View style={styles.titleWordWrapper}>
              <AppText
                variant="title"
                style={[
                  styles.title,
                  {
                    fontSize: titleSize,
                    lineHeight: Math.round(titleSize * 1.08),
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
                    lineHeight: Math.round(titleSize * 1.08),
                  },
                ]}
              >
                Are You?
              </AppText>
            </View>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: isVerySmallPhone ? spacing.md : spacing.xl,
              paddingBottom: isVerySmallPhone ? spacing.xl : spacing.xxxxl2,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
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
                hasError={!!errors.name}
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
                hasError={!!errors.email}
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
                hasError={!!errors.password}
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

          <View style={styles.bottomArea}>
            <View style={styles.buttonWrapper}>
              <AppButton
                title={isSubmitting ? "CREATING..." : "LET'S GOOOO"}
                onPress={handleRegister}
                disabled={isSubmitting}
                style={styles.registerButton}
                textStyle={styles.registerButtonText}
                loading={isSubmitting}
                accessibilityHint="Creates your account"
                accessibilityLabel={
                  isSubmitting ? "Creating account" : "Create account"
                }
              />
            </View>

            <View style={styles.flowersWrapper}>
              <Flowers width={64} height={24} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    top: 0,
    left: 0,
    zIndex: 0,
  },
  header: {
    paddingHorizontal: spacing.xxxl,
    zIndex: 2,
  },
  backWrapper: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  backTouchable: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  labelRow: {
    marginTop: spacing.xs,
  },
  labelWrapper: {
    alignSelf: "flex-start",
  },
  smallLabel: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    zIndex: 2,
  },
  registerHighlight: {
    height: 4,
    backgroundColor: colors.sunsetPink,
    borderRadius: radius.pill,
    marginTop: -4,
  },
  titleBlock: {
    position: "relative",
  },
  mascotWrapper: {
    position: "absolute",
    zIndex: 3,
  },
  titleLines: {
    alignSelf: "flex-start",
    gap: 0,
  },
  titleWordWrapper: {
    alignSelf: "flex-start",
  },
  title: {
    color: colors.textPrimary,
    textTransform: "uppercase",
    fontFamily: typography.fontFamily.title,
  },

  keyboardArea: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxxl,
    justifyContent: "space-between",
  },
  form: {
    gap: spacing.xl,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
  },
  inputPlain: {
    borderWidth: 1,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.size.sm,
    lineHeight: 18,
  },
  bottomArea: {
    marginTop: spacing.xxxl,
    alignItems: "center",
  },
  buttonWrapper: {
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
  },
  registerButton: {
    backgroundColor: colors.sunsetPink,
  },
  registerButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  flowersWrapper: {
    alignItems: "center",
    marginTop: spacing.xl,
  },
});
