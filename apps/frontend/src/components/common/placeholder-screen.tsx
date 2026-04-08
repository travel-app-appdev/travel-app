import { Link, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/src/components/common/AppText';
import { colors, spacing } from '@/src/theme';

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