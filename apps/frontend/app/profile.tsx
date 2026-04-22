// app/profile.tsx
import { useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth } from "@/src/lib/firebase";
import { updateProfile } from "@/src/api/auth";
import { useAuth } from "@/src/context/AuthContext";
import { AppText } from "@/src/components/common/AppText";
import { AppInput } from "@/src/components/common/AppInput";
import { AppButton } from "@/src/components/common/AppButton";
import { ActionCard, ACTION_CARD_HEIGHT } from "@/src/components/common/ActionCard";
import { BackLink } from "@/src/components/common/BackLink";
import { colors, spacing, radius, typography } from "@/src/theme";
import Profile from "@/assets/icons/profile.svg";
import IdCard from "@/assets/icons/id_card.svg";
import Email from "@/assets/icons/email.svg";
import KeyFrame from "@/assets/icons/key_frame.svg";
import ArrowUp from "@/assets/icons/arrow_up.svg";
import ArrowDown from "@/assets/icons/arrow_down.svg";
import CheckMark from "@/assets/icons/check_mark.svg";
import VisibilityOn from "@/assets/icons/visibility_on.svg";
import VisibilityOff from "@/assets/icons/visibility_off.svg";
import Exit from "@/assets/icons/exit.svg";

export default function ProfileScreen() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenHeight < 700;

  // Cleanup timeouts on unmount to prevent state updates on unmounted component
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const safeTimeout = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeoutRefs.current.push(id);
    return id;
  };
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  const [name, setName] = useState(user?.name ?? "");
  const [nameInput, setNameInput] = useState(user?.name ?? "");
  const [nameOpen, setNameOpen] = useState(false);
  const [nameUpdated, setNameUpdated] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [email, setEmail] = useState(user?.email ?? "");
  const [emailInput, setEmailInput] = useState(user?.email ?? "");
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailUpdated, setEmailUpdated] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [currentPasswordVisible, setCurrentPasswordVisible] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleUpdateName = async () => {
    if (isUpdatingName) return;

    try {
      setIsUpdatingName(true);
      setNameError(null);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Not logged in", "Please log in again.");
        return;
      }

      const idToken = await currentUser.getIdToken();
      const updatedUser = await updateProfile({ idToken, name: nameInput });

      setName(updatedUser.name ?? nameInput);
      setUser(user ? { ...user, name: updatedUser.name } : null);
      setNameUpdated(true);
      safeTimeout(() => {
        setNameUpdated(false);
        setNameOpen(false);
      }, 1500);
    } catch (error: any) {
      setNameError(error.message || "Failed to update name.");
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (isUpdatingEmail) return;

    try {
      setIsUpdatingEmail(true);
      setEmailError(null);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Not logged in", "Please log in again.");
        return;
      }

      const idToken = await currentUser.getIdToken();
      await updateProfile({ idToken, email: emailInput });

      setEmailUpdated(true);
      safeTimeout(() => {
        Alert.alert(
          "Email updated",
          "Your email has been changed. Please log in again with your new email address.",
          [
            {
              text: "OK",
              onPress: () => {
                setUser(null);
                router.replace("/");
              },
            },
          ]
        );
      }, 1000);
    } catch (error: any) {
      if (error.message?.includes("already in use")) {
        setEmailError("This email is already in use.");
      } else {
        setEmailError(error.message || "Failed to update email.");
      }
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (isUpdatingPassword) return;

    if (passwordInput.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    try {
      setIsUpdatingPassword(true);
      setPasswordError(null);

      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        Alert.alert("Not logged in", "Please log in again.");
        return;
      }

      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPasswordInput
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, passwordInput);

      setPasswordUpdated(true);
      safeTimeout(() => {
        setPasswordUpdated(false);
        setPasswordInput("");
        setCurrentPasswordInput("");
        setPasswordOpen(false);
        setPasswordVisible(false);
        setCurrentPasswordVisible(false);
      }, 1500);
    } catch (error: any) {
      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        setPasswordError("Current password is incorrect.");
      } else if (error.code === "auth/weak-password") {
        setPasswordError("New password must be at least 6 characters.");
      } else if (error.code === "auth/too-many-requests") {
        setPasswordError("Too many attempts. Please try again later.");
      } else {
        setPasswordError(error.message || "Failed to update password.");
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    router.replace("/");
  };

  return (
    <View style={styles.fullScreen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.container,
              {
                paddingBottom:
                  ACTION_CARD_HEIGHT +
                  (isSmallScreen ? spacing.lg : spacing.xxxl),
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <BackLink href="/home" />
              <View style={styles.headerTitle}>
                <Profile width={20} height={20} />
                <AppText variant="body" style={styles.headerLabel}>
                  Profile
                </AppText>
              </View>
            </View>

            {/* Name */}
            <View style={styles.fieldGroup}>
              <Pressable
                style={styles.infoRow}
                onPress={() => {
                  setNameOpen(!nameOpen);
                  setNameUpdated(false);
                  setNameError(null);
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
                    {name || "—"}
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
                      setNameError(null);
                    }}
                    placeholder="Enter your name"
                    autoFocus
                    accessibilityLabel="Name"
                    accessibilityHint="Edit your name"
                    style={styles.inputBlackStroke}
                  />
                  {nameError && (
                    <AppText
                      variant="caption"
                      style={styles.errorText}
                      accessibilityRole="alert"
                    >
                      {nameError}
                    </AppText>
                  )}
                  <AppButton
                    title={isUpdatingName ? "Updating..." : "Update"}
                    onPress={handleUpdateName}
                    disabled={!nameInput.trim() || isUpdatingName}
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

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Pressable
                style={styles.infoRow}
                onPress={() => {
                  setEmailOpen(!emailOpen);
                  setEmailUpdated(false);
                  setEmailError(null);
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
                    {email || "—"}
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
                      setEmailError(null);
                    }}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                    accessibilityLabel="Email"
                    accessibilityHint="Edit your email"
                    style={styles.inputBlackStroke}
                  />
                  {emailError && (
                    <AppText
                      variant="caption"
                      style={styles.errorText}
                      accessibilityRole="alert"
                    >
                      {emailError}
                    </AppText>
                  )}
                  <AppButton
                    title={isUpdatingEmail ? "Updating..." : "Update"}
                    onPress={handleUpdateEmail}
                    disabled={
                      !emailInput.trim() ||
                      !emailInput.includes("@") ||
                      isUpdatingEmail
                    }
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

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Pressable
                style={styles.infoRow}
                onPress={() => {
                  setPasswordOpen(!passwordOpen);
                  setPasswordUpdated(false);
                  setPasswordInput("");
                  setCurrentPasswordInput("");
                  setPasswordError(null);
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
                  <AppText variant="caption" style={styles.passwordFieldLabel}>
                    Current password
                  </AppText>
                  <View style={styles.passwordInputWrapper}>
                    <AppInput
                      style={styles.passwordInput}
                      value={currentPasswordInput}
                      onChangeText={(text) => {
                        setCurrentPasswordInput(text);
                        setPasswordError(null);
                      }}
                      placeholder="Enter current password"
                      secureTextEntry={!currentPasswordVisible}
                      autoFocus
                      accessibilityLabel="Current password"
                      accessibilityHint="Enter your current password to verify identity"
                    />
                    <Pressable
                      style={styles.visibilityIcon}
                      onPress={() =>
                        setCurrentPasswordVisible(!currentPasswordVisible)
                      }
                      accessibilityRole="button"
                      accessibilityLabel={
                        currentPasswordVisible
                          ? "Hide current password"
                          : "Show current password"
                      }
                    >
                      {currentPasswordVisible ? (
                        <VisibilityOff width={24} height={24} />
                      ) : (
                        <VisibilityOn width={24} height={24} />
                      )}
                    </Pressable>
                  </View>

                  <AppText variant="caption" style={styles.passwordFieldLabel}>
                    New password
                  </AppText>
                  <View style={styles.passwordInputWrapper}>
                    <AppInput
                      style={styles.passwordInput}
                      value={passwordInput}
                      onChangeText={(text) => {
                        setPasswordInput(text);
                        setPasswordError(null);
                      }}
                      placeholder="Enter new password"
                      secureTextEntry={!passwordVisible}
                      accessibilityLabel="New password"
                      accessibilityHint="Enter your new password"
                    />
                    <Pressable
                      style={styles.visibilityIcon}
                      onPress={() => setPasswordVisible(!passwordVisible)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        passwordVisible
                          ? "Hide new password"
                          : "Show new password"
                      }
                    >
                      {passwordVisible ? (
                        <VisibilityOff width={24} height={24} />
                      ) : (
                        <VisibilityOn width={24} height={24} />
                      )}
                    </Pressable>
                  </View>

                  {passwordError && (
                    <AppText
                      variant="caption"
                      style={styles.errorText}
                      accessibilityRole="alert"
                    >
                      {passwordError}
                    </AppText>
                  )}

                  <AppButton
                    title={isUpdatingPassword ? "Updating..." : "Update"}
                    onPress={handleUpdatePassword}
                    disabled={
                      !passwordInput.trim() ||
                      !currentPasswordInput.trim() ||
                      isUpdatingPassword
                    }
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

          {/* Logout — pinned to bottom, always visible above safe area */}
          <SafeAreaView edges={["bottom"]} style={styles.logoutSafeArea}>
            <View style={styles.logoutWrapper}>
              <ActionCard
                label="Logout"
                icon={<Exit width={20} height={20} />}
                onPress={handleLogout}
                accessibilityHint="Signs you out of the app"
              />
            </View>
          </SafeAreaView>
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
  flex: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
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
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    paddingLeft: 28,
  },
  expandedField: {
    gap: spacing.md,
  },
  inputBlackStroke: {
    borderWidth: 2,
    borderColor: colors.nightBlack,
  },
  passwordFieldLabel: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    marginBottom: -spacing.xs,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.sm,
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
  errorText: {
    color: colors.error,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
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
  logoutSafeArea: {
    backgroundColor: colors.lightWhite,
  },
  logoutWrapper: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
});