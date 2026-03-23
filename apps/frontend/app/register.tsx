import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/src/components/common/AppButton';
import { AppInput } from '@/src/components/common/AppInput';
import { AppText } from '@/src/components/common/AppText';
import { colors, spacing } from '@/src/theme';

export default function RegisterScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Link href="/login" style={styles.backLink}>
            ←
          </Link>

          <AppText variant="body" style={styles.smallLabel}>
            Register
          </AppText>

          <AppText variant="title" style={styles.title}>
            Who are you?
          </AppText>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <AppText variant="body" style={styles.label}>
              Your name
            </AppText>
            <AppInput placeholder="Enter your name" />
          </View>

          <View style={styles.fieldGroup}>
            <AppText variant="body" style={styles.label}>
              Your email
            </AppText>
            <AppInput
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <AppText variant="body" style={styles.label}>
              Your password
            </AppText>
            <AppInput placeholder="Enter your password" secureTextEntry />
          </View>

          <AppButton
            title="LET’S GOOO"
            onPress={() => {}}
            style={styles.registerButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.beachYellow,
    paddingHorizontal: spacing.xl,
    paddingTop: 72,
  },
  content: {
    flex: 1,
    gap: spacing.xxl,
  },
  header: {
    gap: spacing.lg,
  },
  backLink: {
    fontSize: 28,
    color: colors.textPrimary,
    width: 32,
  },
  smallLabel: {
    color: colors.textPrimary,
    textDecorationLine: 'underline',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 52,
    lineHeight: 58,
    textTransform: 'uppercase',
    maxWidth: 260,
  },
  form: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textPrimary,
  },
  registerButton: {
    backgroundColor: colors.sunsetPink,
    marginTop: spacing.lg,
  },
});