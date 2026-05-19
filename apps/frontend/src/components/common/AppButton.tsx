import { ReactNode, useCallback, useRef } from "react";
import {
  Pressable,
  StyleSheet,
  ViewStyle,
  View,
  TextStyle,
  StyleProp,
} from "react-native";
import { colors, radius, spacing, typography } from "@/src/theme";
import { AppText } from "./AppText";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function AppButton({
  title,
  onPress,
  variant = "primary",
  style,
  icon,
  textStyle,
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const isPressLockedRef = useRef(false);

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    if (isPressLockedRef.current) return;
    isPressLockedRef.current = true;

    const release = () => {
      const timeout = setTimeout(() => {
        isPressLockedRef.current = false;
      }, 500) as ReturnType<typeof setTimeout> & { unref?: () => void };
      timeout.unref?.();
    };

    try {
      const result = onPress();
      Promise.resolve(result).finally(release);
    } catch (error) {
      release();
      throw error;
    }
  }, [onPress, isDisabled]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.secondaryButton,
        isDisabled && styles.disabledButton,
        pressed && !isDisabled && styles.pressedButton,
        style,
      ]}
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}

      <AppText
        variant="body"
        style={[
          styles.text,
          variant === "secondary" && styles.secondaryText,
          isDisabled && styles.disabledText,
          textStyle,
        ]}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: 48,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: colors.seaBlue,
  },
  secondaryButton: {
    backgroundColor: colors.lightWhite,
    borderWidth: 2,
    borderColor: colors.seaBlue,
  },
  disabledButton: {
    opacity: 0.6,
  },
  pressedButton: {
    opacity: 0.85,
  },
  text: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
  },
  secondaryText: {
    color: colors.seaBlue,
  },
  disabledText: {
    opacity: 0.95,
  },
  iconWrapper: {
    marginRight: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
