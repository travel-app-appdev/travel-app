// app/profile.tsx
import { Link } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/src/components/common/AppText";
import { colors, spacing, radius, typography } from "@/src/theme";
import Back from "@/assets/icons/back.svg";
import Profile from "@/assets/icons/profile.svg";
import IdCard from "@/assets/icons/id_card.svg";
import Email from "@/assets/icons/email.svg";
import KeyFrame from "@/assets/icons/key_frame.svg";
import ArrowRight from "@/assets/icons/arrow_right.svg";
import ArrowDown from "@/assets/icons/arrow_down.svg";
import CheckMark from "@/assets/icons/check_mark.svg";
import VisibilityOn from "@/assets/icons/visibility_on.svg";
import VisibilityOff from "@/assets/icons/visibility_off.svg";

export default function ProfileScreen() {
  // TODO: replace with real user data from auth
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
    // TODO: call API to update name
    setTimeout(() => {
      setNameUpdated(false);
      setNameOpen(false);
    }, 1500);
  };

  const handleUpdateEmail = () => {
    setEmail(emailInput);
    setEmailUpdated(true);
    // TODO: call API to update email
    setTimeout(() => {
      setEmailUpdated(false);
      setEmailOpen(false);
    }, 1500);
  };

  const handleUpdatePassword = () => {
    setPasswordUpdated(true);
    // TODO: call API to update password
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
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Link href="/settings" style={styles.backLink}>
              <Back width={20} height={20} />
            </Link>
            <View style={styles.headerTitle}>
              <Profile width={20} height={20} />
              <AppText variant="body" style={styles.headerLabel}>
                Profile
              </AppText>
            </View>
          </View>

          {/* ── Name ── */}
          <View style={styles.fieldGroup}>
            <Pressable
              style={styles.infoRow}
              onPress={() => {
                setNameOpen(!nameOpen);
                setNameUpdated(false);
                setNameInput(name);
              }}
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
                <ArrowDown width={20} height={20} />
              ) : (
                <ArrowRight width={20} height={20} />
              )}
            </Pressable>
            {nameOpen && (
              <View style={styles.expandedField}>
                <TextInput
                  style={styles.input}
                  value={nameInput}
                  onChangeText={(text) => {
                    setNameInput(text);
                    setNameUpdated(false);
                  }}
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
                <Pressable
                  style={styles.updateButton}
                  onPress={handleUpdateName}
                >
                  <AppText variant="body" style={styles.updateButtonText}>
                    Update
                  </AppText>
                </Pressable>
                {nameUpdated && (
                  <View style={styles.successRow}>
                    <CheckMark width={18} height={18} />
                    <AppText variant="caption" style={styles.successText}>
                      Name is updated!
                    </AppText>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── Email ── */}
          <View style={styles.fieldGroup}>
            <Pressable
              style={styles.infoRow}
              onPress={() => {
                setEmailOpen(!emailOpen);
                setEmailUpdated(false);
                setEmailInput(email);
              }}
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
                <ArrowDown width={20} height={20} />
              ) : (
                <ArrowRight width={20} height={20} />
              )}
            </Pressable>
            {emailOpen && (
              <View style={styles.expandedField}>
                <TextInput
                  style={styles.input}
                  value={emailInput}
                  onChangeText={(text) => {
                    setEmailInput(text);
                    setEmailUpdated(false);
                  }}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
                <Pressable
                  style={styles.updateButton}
                  onPress={handleUpdateEmail}
                >
                  <AppText variant="body" style={styles.updateButtonText}>
                    Update
                  </AppText>
                </Pressable>
                {emailUpdated && (
                  <View style={styles.successRow}>
                    <CheckMark width={18} height={18} />
                    <AppText variant="caption" style={styles.successText}>
                      Email is updated!
                    </AppText>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── Password ── */}
          <View style={styles.fieldGroup}>
            <Pressable
              style={styles.infoRow}
              onPress={() => {
                setPasswordOpen(!passwordOpen);
                setPasswordUpdated(false);
                setPasswordInput("");
              }}
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
                <ArrowDown width={20} height={20} />
              ) : (
                <ArrowRight width={20} height={20} />
              )}
            </Pressable>
            {passwordOpen && (
              <View style={styles.expandedField}>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    value={passwordInput}
                    onChangeText={(text) => {
                      setPasswordInput(text);
                      setPasswordUpdated(false);
                    }}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!passwordVisible}
                    autoFocus
                  />
                  <Pressable
                    style={styles.visibilityIcon}
                    onPress={() => setPasswordVisible(!passwordVisible)}
                  >
                    {passwordVisible ? (
                      <VisibilityOff width={24} height={24} />
                    ) : (
                      <VisibilityOn width={24} height={24} />
                    )}
                  </Pressable>
                </View>
                <Pressable
                  style={styles.updateButton}
                  onPress={handleUpdatePassword}
                >
                  <AppText variant="body" style={styles.updateButtonText}>
                    Update
                  </AppText>
                </Pressable>
                {passwordUpdated && (
                  <View style={styles.successRow}>
                    <CheckMark width={18} height={18} />
                    <AppText variant="caption" style={styles.successText}>
                      Password is updated!
                    </AppText>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
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

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  backLink: {
    position: "absolute",
    left: 0,
    padding: spacing.xs,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerLabel: {
    fontSize: 25,
    fontFamily: "Nunito_700Bold",
    color: colors.textPrimary,
  },

  // Field groups
  fieldGroup: {
    gap: spacing.md,
  },

  // Info rows
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  infoLeft: {
    gap: spacing.xs,
  },
  infoLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  fieldLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 20,
    color: colors.textPrimary,
  },
  infoValue: {
    color: colors.textMuted,
    fontSize: 14,
    paddingLeft: 28,
  },

  // Expanded editor
  expandedField: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.body,
    color: colors.textPrimary,
    borderWidth: 2,
    borderColor: colors.nightBlack,
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.body,
    color: colors.textPrimary,
  },
  visibilityIcon: {
    paddingRight: spacing.lg,
  },

  // Update button
  updateButton: {
    backgroundColor: colors.sunsetOrange,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  updateButtonText: {
    color: colors.nightBlack,
    fontFamily: "Nunito_700Bold",
    fontSize: 20,
  },

  // Success message
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  successText: {
    color: colors.textPrimary,
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
  },
});
