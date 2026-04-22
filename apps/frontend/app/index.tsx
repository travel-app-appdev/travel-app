import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/src/components/common/AppButton';
import { AppText } from '@/src/components/common/AppText';
import { colors, spacing } from '@/src/theme';

export default function StartPage() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.titleWrapper}>
          <AppText variant="title" style={styles.title}>
            Yooo
          </AppText>
          <AppText variant="title" style={styles.title}>
            Traveler
          </AppText>
        </View>

        <View style={styles.actions}>
          <Link href="/login" asChild>
            <View>
              <AppButton title="Login" onPress={() => {}} />
            </View>
          </Link>

          <View style={styles.registerRow}>
            <AppText variant="caption" style={styles.captionDark}>
              No account yet?
            </AppText>
            <Link href="/register" style={styles.registerLink}>
              Register here
            </Link>
          </View>

          <AppText variant="caption" style={styles.orText}>
            or
          </AppText>

          <AppButton
            title="Continue with Google"
            onPress={() => {}}
            variant="secondary"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    gap: spacing.xxl,
  },
  titleWrapper: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.sunsetOrange,
    textTransform: 'uppercase',
    fontSize: 44,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  captionDark: {
    color: colors.textPrimary,
  },
  registerLink: {
    color: colors.plantGreen,
    fontSize: 14,
  },
  orText: {
    textAlign: 'center',
    color: colors.textMuted,
  },
});