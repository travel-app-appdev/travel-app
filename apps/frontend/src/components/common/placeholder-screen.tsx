import { Link, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { appColors, spacing } from '@/src/theme';

type PlaceholderScreenProps = {
  title: string;
  description: string;
  primaryLink?: {
    href: Href;
    label: string;
  };
};

export function PlaceholderScreen({
  title,
  description,
  primaryLink,
}: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Student Group Trip Planner</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {primaryLink ? (
          <Link href={primaryLink.href} style={styles.link}>
            {primaryLink.label}
          </Link>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: appColors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  eyebrow: {
    color: appColors.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: appColors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  description: {
    color: appColors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  link: {
    color: appColors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
