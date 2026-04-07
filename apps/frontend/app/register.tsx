import { Link } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppButton } from "@/src/components/common/AppButton";
import { AppInput } from "@/src/components/common/AppInput";
import { AppText } from "@/src/components/common/AppText";
import { colors, spacing, typography } from "@/src/theme";
import Back from "@/assets/icons/back.svg";
import MascotHelloPink from "@/assets/mascots/mascot-hello-pink.svg";
import RegisterYellowBg from "@/assets/visuals/yellow-background.svg";
import Flowers from "@/assets/visuals/flowers-blue.svg";

export default function RegisterScreen() {
  return (
    <View style={styles.container}>
      {/* Pink page background + yellow top shape */}
      <RegisterYellowBg style={styles.backgroundSvg} />

      {/* Back arrow */}
      <View style={styles.backWrapper}>
        <Link href="/login">
          <Back width={20} height={20} />
        </Link>
      </View>

      {/* Main content */}
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
              placeholder=""
              autoCapitalize="words"
              style={styles.inputPlain}
            />
          </View>

          <View style={styles.fieldGroup}>
            <AppText variant="body" style={styles.label}>
              Your email
            </AppText>
            <AppInput
              placeholder=""
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.inputPlain}
            />
          </View>

          <View style={styles.fieldGroup}>
            <AppText variant="body" style={styles.label}>
              Your password
            </AppText>
            <AppInput
              placeholder=""
              secureTextEntry
              style={styles.inputPlain}
            />
          </View>
        </View>

        <View style={styles.buttonWrapper}>
          <AppButton
            title="LET’S GOOOO"
            onPress={() => {}}
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
    borderWidth: 0,
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
    fontFamily: typography.fontFamily.bodyBold
  },

  flowersWrapper: {
    alignItems: "center",
    marginTop: spacing.xl,
  },
});
