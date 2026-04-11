import {
  Pressable,
  StyleSheet,
  ViewStyle,
  View,
  TextStyle,
  StyleProp,
} from "react-native";
import { colors, radius, spacing } from "@/src/theme";
import { AppText } from "./AppText";
import { ReactNode } from "react";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  accessibilityLabel?: string; // 👈 added
};

export function AppButton({
  title,
  onPress,
  variant = "primary",
  style,
  icon,
  textStyle,
  disabled = false,
  accessibilityLabel, // 👈 added
}: AppButtonProps) {
  return (
    <Pressable
      style={[
        styles.button,
        variant === "secondary" && styles.secondaryButton,
        disabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel} // 👈 added
    >
      {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}

      <AppText
        variant="body"
        style={[
          styles.text,
          variant === "secondary" && styles.secondaryText,
          disabled && styles.disabledText,
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
    backgroundColor: colors.seaBlue,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  secondaryButton: {
    backgroundColor: colors.lightWhite,
    borderWidth: 2.5,
    borderColor: colors.seaBlue,
  },
  disabledButton: {
    opacity: 0.6,
  },
  text: {
    color: colors.white,
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
  },
  secondaryText: {
    color: colors.seaBlue,
  },
  disabledText: {
    opacity: 0.9,
  },
  iconWrapper: {
    marginRight: spacing.sm,
  },
});