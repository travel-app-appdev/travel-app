import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/src/components/common/AppButton';
import { AppInput } from '@/src/components/common/AppInput';
import { AppText } from '@/src/components/common/AppText';
import { colors, spacing } from '@/src/theme';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Link href="/" style={styles.backLink}>
            ←
          </Link>

          <AppText variant="body" style={styles.smallLabel}>
            Login
          </AppText>

          <AppText variant="title" style={styles.title}>
            Welcome back
          </AppText>
        </View>

        <View style={styles.form}>
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
            title="LOGIN" 
            onPress={() => {}}
            style={styles.loginButton} 
          />

          <View style={styles.registerRow}>
            <AppText variant="caption" style={styles.captionDark}>
              No account yet?
            </AppText>
            <Link href="/register" style={styles.registerLink}>
              Register here
            </Link>
          </View>
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
  loginButton:{
    backgroundColor: colors.sunsetPink,
    marginTop: spacing.lg,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  captionDark: {
    color: colors.textPrimary,
  },
  registerLink: {
    color: colors.plantGreen,
    fontSize: 14,
  },
});