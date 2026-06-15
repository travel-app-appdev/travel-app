import { Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing } from "@/src/theme";

type Props = {
  visible: boolean;
  title: string;
  text: string;
  primaryButtonColor?: string;
  accessibilityLabel: string;
  closeAccessibilityLabel: string;
  onClose: () => void;
};

export function ItineraryInfoModal({
  visible,
  title,
  text,
  primaryButtonColor = colors.sunsetPink,
  accessibilityLabel,
  closeAccessibilityLabel,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "right", "bottom", "left"]}
      >
        <View style={styles.overlay}>
          <Pressable
            style={styles.backdrop}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={closeAccessibilityLabel}
          />
          <View
            style={styles.card}
            accessibilityViewIsModal={true}
            accessible={true}
            accessibilityLabel={accessibilityLabel}
          >
            <AppText variant="subtitle" style={styles.title}>
              {title}
            </AppText>
            <AppText variant="body" style={styles.text}>
              {text}
            </AppText>
            <Pressable
              style={[
                styles.primaryButton,
                { backgroundColor: primaryButtonColor },
              ]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={closeAccessibilityLabel}
            >
              <AppText variant="body" style={styles.buttonText}>
                Got it
              </AppText>
            </Pressable>
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 18,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  title: {
    color: colors.nightBlack,
    textAlign: "center",
  },
  text: {
    color: colors.nightBlack,
    textAlign: "center",
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.sunsetPink,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    color: colors.nightBlack,
    textAlign: "center",
  },
});
