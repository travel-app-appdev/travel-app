import { Link } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/src/components/common/AppText";
import { AppInput } from "@/src/components/common/AppInput";
import { AppButton } from "@/src/components/common/AppButton";
import { colors, spacing, radius, typography } from "@/src/theme";
import Back from "@/assets/icons/back.svg";
import Profile from "@/assets/icons/profile.svg";
import IdCard from "@/assets/icons/id_card.svg";
import Email from "@/assets/icons/email.svg";
import KeyFrame from "@/assets/icons/key_frame.svg";
import ArrowUp from "@/assets/icons/arrow_up.svg";
import ArrowDown from "@/assets/icons/arrow_down.svg";
import CheckMark from "@/assets/icons/check_mark.svg";
import VisibilityOn from "@/assets/icons/visibility_on.svg";
import VisibilityOff from "@/assets/icons/visibility_off.svg";

export default function ProfileScreen() {
  const [name, setName] = useState("Susi Trudl");
  const [nameInput, setNameInput] = useState("Susi Trudl");
  const [nameOpen, setNameOpen] = useState(false);
  const [nameUpdated, setNameUpdated] = useState(false);

  const [email, setEmail] = useState("susi.trudl.1234@gmail.com");
  const [emailInput, setEmailInput] = useState("susi.trudl.1234@gmail.com");
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailUpdated, setEmailUpdated] = useState(false);

  const [passwordInput, setPasswordInput] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleUpdateName = () => {
    setName(nameInput);
    setNameUpdated(true);
    setTimeout(() => {
      setNameUpdated(false);
      setNameOpen(false);
    }, 1500);
  };

  const handleUpdateEmail = () => {
    setEmail(emailInput);
    setEmailUpdated(true);
    setTimeout(() => {
      setEmailUpdated(false);
      setEmailOpen(false);
    }, 1500);
  };

  const handleUpdatePassword = () => {
    setPasswordUpdated(true);
    setTimeout(() => {
      setPasswordUpdated(false);
      setPasswordInput("");
      setPasswordOpen(false);
      setPasswordVisible(false);
    }, 1500);
  };

  return (
    <View style={styles.fullScreen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.scroll}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Link
                href="/settings"
                style={styles.backLink}
                accessibilityRole="link"
                accessibilityLabel="Go back to settings"
              >
                <Back width={20} height={20} />
              </Link>

              <View style={styles.headerTitle}>
                <Profile width={20} height={20} />
                <AppText variant="body" style={styles.headerLabel}>
                  Profile
                </AppText>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Pressable
                style={styles.infoRow}
                onPress={() => {
                  setNameOpen(!nameOpen);
                  setNameUpdated(false);
                  setNameInput(name);
                }}
                accessibilityRole="button"
                accessibilityLabel="Edit name"
                accessibilityState={{ expanded: nameOpen }}
              >
                <View style={styles.infoLeft}>
                  <View style={styles.infoLabelRow}>
                    <IdCard width={20} height={20} />
                    <AppText variant="body" style={styles.fieldLabel}>
                      Name
                    </AppText>
                  </View>
                  <AppText variant="caption" style={styles.infoValue}>
                    {name}
                  </AppText>
                </View>
                {nameOpen ? (
                  <ArrowUp width={20} height={20} />
                ) : (
                  <ArrowDown width={20} height={20} />
                )}
              </Pressable>

              {nameOpen && (
                <View style={styles.expandedField}>
                  <AppInput
                    value={nameInput}
                    onChangeText={(text) => {
                      setNameInput(text);
                      setNameUpdated(false);
                    }}
                    placeholder="Enter your name"
                    autoFocus
                    accessibilityLabel="Name"
                    accessibilityHint="Edit your name"
                  />

                  <AppButton
                    title="Update"
                    onPress={handleUpdateName}
                    style={styles.updateButton}
                    textStyle={styles.updateButtonText}
                    accessibilityLabel="Update name"
                  />

                  {nameUpdated && (
                    <View style={styles.successRow}>
                      <CheckMark width={18} height={18} />
                      <AppText
                        variant="caption"
                        style={styles.successText}
                        accessibilityRole="alert"
                      >
                        Name is updated!
                      </AppText>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Pressable
                style={styles.infoRow}
                onPress={() => {
                  setEmailOpen(!emailOpen);
                  setEmailUpdated(false);
                  setEmailInput(email);
                }}
                accessibilityRole="button"
                accessibilityLabel="Edit email"
                accessibilityState={{ expanded: emailOpen }}
              >
                <View style={styles.infoLeft}>
                  <View style={styles.infoLabelRow}>
                    <Email width={20} height={20} />
                    <AppText variant="body" style={styles.fieldLabel}>
                      Email
                    </AppText>
                  </View>
                  <AppText variant="caption" style={styles.infoValue}>
                    {email}
                  </AppText>
                </View>
                {emailOpen ? (
                  <ArrowUp width={20} height={20} />
                ) : (
                  <ArrowDown width={20} height={20} />
                )}
              </Pressable>

              {emailOpen && (
                <View style={styles.expandedField}>
                  <AppInput
                    value={emailInput}
                    onChangeText={(text) => {
                      setEmailInput(text);
                      setEmailUpdated(false);
                    }}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                    accessibilityLabel="Email"
                    accessibilityHint="Edit your email"
                  />

                  <AppButton
                    title="Update"
                    onPress={handleUpdateEmail}
                    style={styles.updateButton}
                    textStyle={styles.updateButtonText}
                    accessibilityLabel="Update email"
                  />

                  {emailUpdated && (
                    <View style={styles.successRow}>
                      <CheckMark width={18} height={18} />
                      <AppText
                        variant="caption"
                        style={styles.successText}
                        accessibilityRole="alert"
                      >
                        Email is updated!
                      </AppText>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Pressable
                style={styles.infoRow}
                onPress={() => {
                  setPasswordOpen(!passwordOpen);
                  setPasswordUpdated(false);
                  setPasswordInput("");
                }}
                accessibilityRole="button"
                accessibilityLabel="Edit password"
                accessibilityState={{ expanded: passwordOpen }}
              >
                <View style={styles.infoLeft}>
                  <View style={styles.infoLabelRow}>
                    <KeyFrame width={20} height={20} />
                    <AppText variant="body" style={styles.fieldLabel}>
                      Password
                    </AppText>
                  </View>
                  <AppText variant="caption" style={styles.infoValue}>
                    ****************
                  </AppText>
                </View>
                {passwordOpen ? (
                  <ArrowUp width={20} height={20} />
                ) : (
                  <ArrowDown width={20} height={20} />
                )}
              </Pressable>

              {passwordOpen && (
                <View style={styles.expandedField}>
                  <View style={styles.passwordInputWrapper}>
                    <AppInput
                      style={styles.passwordInput}
                      value={passwordInput}
                      onChangeText={(text) => {
                        setPasswordInput(text);
                        setPasswordUpdated(false);
                      }}
                      placeholder="Enter new password"
                      secureTextEntry={!passwordVisible}
                      autoFocus
                      accessibilityLabel="Password"
                      accessibilityHint="Enter a new password"
                    />

                    <Pressable
                      style={styles.visibilityIcon}
                      onPress={() => setPasswordVisible(!passwordVisible)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        passwordVisible ? "Hide password" : "Show password"
                      }
                    >
                      {passwordVisible ? (
                        <VisibilityOff width={24} height={24} />
                      ) : (
                        <VisibilityOn width={24} height={24} />
                      )}
                    </Pressable>
                  </View>

                  <AppButton
                    title="Update"
                    onPress={handleUpdatePassword}
                    disabled={!passwordInput.trim()}
                    style={styles.updateButton}
                    textStyle={styles.updateButtonText}
                    accessibilityLabel="Update password"
                  />

                  {passwordUpdated && (
                    <View style={styles.successRow}>
                      <CheckMark width={18} height={18} />
                      <AppText
                        variant="caption"
                        style={styles.successText}
                        accessibilityRole="alert"
                      >
                        Password is updated!
                      </AppText>
                    </View>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: colors.lightWhite,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  backLink: {
    position: "absolute",
    left: 0,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    padding: spacing.xs,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerLabel: {
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.textPrimary,
  },
  fieldGroup: {
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  infoLeft: {
    gap: spacing.xs,
    flex: 1,
  },
  infoLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  fieldLabel: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.textPrimary,
  },
  infoValue: {
    color: colors.textMuted,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    paddingLeft: 28,
  },
  expandedField: {
    gap: spacing.md,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.nightBlack,
  },
  passwordInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  visibilityIcon: {
    paddingRight: spacing.lg,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  updateButton: {
    backgroundColor: colors.sunsetOrange,
  },
  updateButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  successText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
});
