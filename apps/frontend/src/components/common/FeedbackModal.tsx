import { Modal, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius, spacing, typography } from "@/src/theme";
import { AppButton } from "@/src/components/common/AppButton";
import { AppText } from "@/src/components/common/AppText";

type FeedbackModalProps = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  buttonLabel?: string;
  buttonColor?: string;
};

export function FeedbackModal({
  visible,
  title,
  message,
  onClose,
  buttonLabel = "Okay",
  buttonColor = colors.neonGreen,
}: FeedbackModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "right", "bottom", "left"]}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <AppText variant="body" style={styles.title}>
              {title}
            </AppText>

            <View style={styles.content}>
              <AppText variant="caption" style={styles.message}>
                {message}
              </AppText>
            </View>

            <View style={styles.actions}>
              <AppButton
                title={buttonLabel}
                onPress={onClose}
                style={[styles.button, { backgroundColor: buttonColor }]}
                textStyle={styles.buttonText}
                accessibilityLabel="Close message"
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  card: {
    backgroundColor: colors.lightWhite,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.nightBlack,
  },
  title: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
  },
  content: {
    gap: spacing.md,
  },
  message: {
    color: colors.nightBlack,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.md,
    fontFamily: typography.fontFamily.bodySemiBold,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  button: {
    flex: 1,
  },
  buttonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
});
