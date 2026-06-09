import { useState } from "react";
import { useRouter } from "expo-router";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/src/components/common/AppText";
import { AppInput } from "@/src/components/common/AppInput";
import { AppButton } from "@/src/components/common/AppButton";
import { BackLink } from "@/src/components/common/BackLink";
import { joinTrip } from "@/src/api/trips";
import { auth } from "@/src/lib/firebase";
import { invalidateTripsCache } from "./home";
import { colors, radius, spacing, typography } from "@/src/theme";
import LinkIcon from "@/assets/icons/link.svg";
import KeyFrame from "@/assets/icons/key_frame.svg";
import LeafUp from "@/assets/visuals/leaf_up.svg";
import LeafDown from "@/assets/visuals/leaf_down.svg";
import { hiddenFromAccessibility } from "@/src/utils/accessibility";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function ModalShell({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView
      style={styles.modalSafeArea}
      edges={["top", "right", "bottom", "left"]}
    >
      <View style={styles.calendarOverlay}>
        <View style={styles.calendarModal}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

function StickyHeader() {
  const router = useRouter();

  return (
    <View style={styles.stickyHeaderBlock}>
      <View style={styles.header}>
        <View style={styles.backButtonSlot}>
          <BackLink onPress={() => router.replace("/home")} />
        </View>

        <View style={styles.headerTitle} {...hiddenFromAccessibility}>
          <LinkIcon width={20} height={20} />
          <AppText variant="body" style={styles.headerLabel}>
            Join Trip
          </AppText>
        </View>
      </View>
    </View>
  );
}

export default function JoinTripScreen() {
  const [code, setCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const router = useRouter();

  function openFeedbackModal(title: string, message: string) {
    setFeedbackTitle(title);
    setFeedbackMessage(message);
    setShowFeedbackModal(true);
  }

  const handleJoin = async () => {
    try {
      setIsJoining(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        openFeedbackModal("Not logged in", "Please log in again.");
        return;
      }
      const idToken = await currentUser.getIdToken();
      await joinTrip({ idToken, inviteCode: code.trim() });
      invalidateTripsCache();
      router.replace("/home");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to join trip";
      openFeedbackModal("Join failed", message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <View style={styles.fullScreen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View
          style={[styles.leafTopRight, { pointerEvents: "none" }]}
          {...hiddenFromAccessibility}
        >
          <LeafUp width={SCREEN_WIDTH * 0.4} height={SCREEN_WIDTH * 0.4} />
        </View>

        <View
          style={[styles.leafBottomLeft, { pointerEvents: "none" }]}
          {...hiddenFromAccessibility}
        >
          <LeafDown width={SCREEN_WIDTH * 0.45} height={SCREEN_WIDTH * 0.45} />
        </View>

        <KeyboardAvoidingView
          style={styles.scroll}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.scroll}
            stickyHeaderIndices={[0]}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <StickyHeader />

            <AppText variant="title" style={styles.title}>
              Which trip you wanna join?
            </AppText>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow} {...hiddenFromAccessibility}>
                <KeyFrame width={24} height={24} />
                <AppText variant="body" style={styles.fieldLabel}>
                  Code
                </AppText>
              </View>

              <AppInput
                value={code}
                onChangeText={setCode}
                placeholder="Enter code here"
                autoCapitalize="characters"
                accessibilityLabel="Trip code"
                accessibilityHint="Enter the invite code sent by the admin"
              />

              <AppText variant="caption" style={styles.hint}>
                Enter the code that was sent to you by the admin.
              </AppText>
            </View>

            <AppButton
              title={isJoining ? "Joining..." : "Join trip"}
              onPress={handleJoin}
              loading={isJoining}
              disabled={!code.trim() || isJoining}
              style={styles.joinButton}
              textStyle={styles.joinButtonText}
              accessibilityLabel="Join trip"
              accessibilityHint="Joins the trip using the entered code"
            />
          </ScrollView>
        </KeyboardAvoidingView>

        <Modal
          visible={showFeedbackModal}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setShowFeedbackModal(false)}
        >
          <ModalShell>
            <AppText variant="body" style={styles.calendarTitle}>
              {feedbackTitle}
            </AppText>

            <View style={styles.timeModalContent}>
              <AppText variant="caption" style={styles.feedbackMessage}>
                {feedbackMessage}
              </AppText>
            </View>

            <View style={styles.calendarActions}>
              <AppButton
                title="Okay"
                onPress={() => setShowFeedbackModal(false)}
                style={styles.calendarApplyButton}
                textStyle={styles.calendarApplyButtonText}
                accessibilityLabel="Close message"
              />
            </View>
          </ModalShell>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: colors.plantGreen,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: 0,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxl,
  },
  leafTopRight: {
    position: "absolute",
    top: SCREEN_HEIGHT * -0.001,
    right: SCREEN_WIDTH * -0.05,
    zIndex: 0,
    opacity: 0.6,
    transform: [{ rotate: "-0.01deg" }],
  },
  leafBottomLeft: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.02,
    left: SCREEN_WIDTH * -0.08,
    zIndex: 0,
    opacity: 0.6,
    transform: [{ rotate: "5deg" }],
  },
  stickyHeaderBlock: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: "transparent",
    zIndex: 20,
    elevation: 0,
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  header: {
    position: "relative",
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonSlot: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "flex-start",
    zIndex: 2,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    alignSelf: "center",
  },
  headerLabel: {
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.textPrimary,
    textAlignVertical: "center",
  },
  title: {
    fontSize: typography.size.displaySm,
    lineHeight: typography.lineHeight.displaySm,
    fontFamily: typography.fontFamily.bodyBlack,
    color: colors.textPrimary,
    textAlign: "left",
    alignSelf: "stretch",
    zIndex: 1,
  },
  fieldGroup: {
    gap: spacing.sm,
    zIndex: 1,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
  },
  hint: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontFamily: typography.fontFamily.body,
  },
  joinButton: {
    backgroundColor: colors.neonGreen,
    marginTop: spacing.xxxl,
  },
  joinButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  calendarOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  calendarModal: {
    backgroundColor: colors.lightWhite,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.nightBlack,
  },
  calendarTitle: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
  },
  timeModalContent: {
    gap: spacing.md,
  },
  feedbackMessage: {
    color: colors.nightBlack,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.md,
    fontFamily: typography.fontFamily.bodySemiBold,
  },
  calendarActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  calendarApplyButton: {
    flex: 1,
    backgroundColor: colors.neonGreen,
  },
  calendarApplyButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
});
