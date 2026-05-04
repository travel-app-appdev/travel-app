import { Text, TextProps, StyleSheet } from "react-native";
import { colors, typography } from "@/src/theme";

type AppTextProps = TextProps & {
  variant?: "body" | "title" | "subtitle" | "caption";
};

export function AppText({
  variant = "body",
  style,
  children,
  ...props
}: AppTextProps) {
  return (
    <Text
      style={[styles.base, styles[variant], style]}
      maxFontSizeMultiplier={1.5}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.textPrimary,
  },
  body: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontFamily: typography.fontFamily.bodySemiBold,
  },
  title: {
    fontSize: typography.size.displaySm,
    lineHeight: typography.lineHeight.displaySm,
    fontFamily: typography.fontFamily.title,
  },
  subtitle: {
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    fontFamily: typography.fontFamily.bodyBold,
  },
  caption: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.body,
  },
});
