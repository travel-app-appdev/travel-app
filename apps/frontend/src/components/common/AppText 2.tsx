import { Text, TextProps, StyleSheet } from 'react-native';
import { colors, typography } from '@/src/theme';

type AppTextProps = TextProps & {
  variant?: 'body' | 'title' | 'subtitle' | 'caption';
};

export function AppText({
  variant = 'body',
  style,
  children,
  ...props
}: AppTextProps) {
  return (
    <Text style={[styles[variant], style]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: typography.size.md,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodySemiBold,
  },
  title: {
    fontSize: typography.size.xl,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.title,
  },
  subtitle: {
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
  },
  caption: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.body,
  },
});