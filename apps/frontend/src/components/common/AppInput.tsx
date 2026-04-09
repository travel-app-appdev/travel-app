import { TextInput, TextInputProps, StyleSheet } from "react-native";
import { colors, radius, spacing, typography } from "@/src/theme";

type AppInputProps = TextInputProps;

export function AppInput({ style, ...props }: AppInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={[styles.input, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: "100%",
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
});