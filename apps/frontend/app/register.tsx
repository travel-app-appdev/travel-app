import { Link, router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
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
import { colors, spacing, typography } from "@/src/theme";

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
  const { setUser } = useAuth();

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

      const backendUser = await registerUser(name.trim(), email.trim(), password);
      setUser(backendUser);

      router.replace("/home");
    } catch (error) {
      const message = getFirebaseAuthMessage(error);

      setErrors((prev) => ({
        ...prev,
        general: message,
      }));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <RegisterYellowBg style={styles.backgroundSvg} />

      <View style={styles.backWrapper}>
        <Link href="/login">
          <Back width={20} height={20} />
        </Link>
      </View>

      <View style={styles.content}>
        <View style={styles.labelRow}>
          <View style={styles.labelWrapper}>
            <AppText variant="body" style={styles.smallLabel}>
              Register
            </AppText>
            <View style={styles.registerHighlight} />
          </View>
        </View>

        <View style={styles.titleBlock}>
          <View style={styles.mascotWrapper}>
            <MascotHelloPink width={110} height={110} />
          </View>

          <AppText variant="title" style={styles.title}>
            Who{"\n"}are you?
          </AppText>
        </View>

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
              style={[styles.inputPlain, errors.password && styles.inputError]}
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

        <View style={styles.buttonWrapper}>
          <AppButton
            title={isSubmitting ? "CREATING..." : "LET’S GOOOO"}
            onPress={handleRegister}
            disabled={isSubmitting}
            style={styles.registerButton}
            textStyle={styles.registerButtonText}
          />
        </View>

        <View style={styles.flowersWrapper}>
          <Flowers width={64} height={24} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    height: 935,
  },
  backWrapper: {
    position: "absolute",
    top: 56,
    left: spacing.xxl,
    zIndex: 10,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xxxl,
    paddingTop: 170,
    gap: spacing.xl,
    zIndex: 2,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelWrapper: {
    alignSelf: "flex-start",
    position: "relative",
  },
  smallLabel: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 20,
    zIndex: 2,
  },
  registerHighlight: {
    position: "absolute",
    left: 0,
    bottom: 1,
    width: "100%",
    height: 8,
    backgroundColor: colors.sunsetPink,
    borderRadius: 6,
    zIndex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 70,
    lineHeight: 62,
    textTransform: "uppercase",
    maxWidth: 400,
    marginTop: 8,
  },
  titleBlock: {
    position: "relative",
    marginTop: spacing.md,
  },
  mascotWrapper: {
    position: "absolute",
    top: -35,
    right: 40,
    zIndex: 3,
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
    borderWidth: 1,
  },
  inputError: {
    borderColor: "#D62828",
  },
  errorText: {
    color: "#D62828",
    fontSize: 14,
    lineHeight: 18,
  },
  buttonWrapper: {
    width: "70%",
    alignSelf: "center",
    marginTop: spacing.xxxl,
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
