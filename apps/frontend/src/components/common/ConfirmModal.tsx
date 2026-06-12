import { Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmButtonColor?: string;
  accessibilityLabel: string;
  confirmAccessibilityLabel: string;
  cancelAccessibilityLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmButtonColor = colors.neonGreen,
  accessibilityLabel,
  confirmAccessibilityLabel,
  cancelAccessibilityLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "right", "bottom", "left"]}>
        <View style={styles.overlay}>
          <Pressable
            style={styles.backdrop}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={cancelAccessibilityLabel}
          />
          <View
            style={styles.card}
            accessibilityViewIsModal={true}
            accessible={true}
            accessibilityLabel={accessibilityLabel}
          >
            <AppText variant="body" style={styles.title}>
              {title}
            </AppText>

            <AppText variant="caption" style={styles.message}>
              {message}
            </AppText>

            <View style={styles.actions}>
              <Pressable
                style={styles.cancelButton}
                onPress={onCancel}
                accessibilityRole="button"
                accessibilityLabel={cancelAccessibilityLabel}
              >
                <AppText variant="body" style={styles.cancelButtonText}>
                  {cancelLabel}
                </AppText>
              </Pressable>

              <Pressable
                style={[
                  styles.confirmButton,
                  { backgroundColor: confirmButtonColor },
                ]}
                onPress={onConfirm}
                accessibilityRole="button"
                accessibilityLabel={confirmAccessibilityLabel}
              >
                <AppText variant="body" style={styles.confirmButtonText}>
                  {confirmLabel}
                </AppText>
              </Pressable>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
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
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.nightBlack,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  cancelButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    textAlign: "center",
  },
  confirmButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  confirmButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    textAlign: "center",
  },
});
