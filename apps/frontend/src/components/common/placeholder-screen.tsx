import { Link, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/src/components/common/AppText';
import { colors, spacing } from '@/src/theme';
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
      <AppText variant="title" style={styles.title}>
        {title}
      </AppText>

      <AppText variant="body" style={styles.description}>
        {description}
      </AppText>

      {primaryLink ? (
        <Link href={primaryLink.href} style={styles.link}>
          {primaryLink.label}
        </Link>
      ) : null}
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
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    maxWidth: 320,
  },
  link: {
    marginTop: spacing.md,
    color: colors.primary,
    fontSize: 16,
  },
});
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
