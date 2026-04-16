// components/common/AppInput.tsx
import { forwardRef } from "react";
import {
  TextInput,
  TextInputProps,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { colors, radius, spacing, typography } from "@/src/theme";

type AppInputProps = TextInputProps & {
  hasError?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const AppInput = forwardRef<TextInput, AppInputProps>(
  ({ style, hasError = false, ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, hasError && styles.inputError, style]}
        accessibilityState={{ disabled: props.editable === false }}
        {...props}
      />
    );
  }
);

AppInput.displayName = "AppInput";

const styles = StyleSheet.create({
  input: {
    width: "100%",
    minHeight: 48,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputError: {
    borderColor: colors.error,
  },
});
