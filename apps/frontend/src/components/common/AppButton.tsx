import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/src/theme';
import { AppText } from './AppText';

type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
};

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  style,
}: AppButtonProps) {
  return (
    <Pressable
      style={[
        styles.button,
        variant === 'secondary' && styles.secondaryButton,
        style,
      ]}
      onPress={onPress}
    >
      <AppText
        variant="body"
        style={[
          styles.text,
          variant === 'secondary' && styles.secondaryText,
        ]}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    backgroundColor: colors.seaBlue,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: colors.lightWhite,
    borderWidth: 2,
    borderColor: colors.seaBlue,
  },
  text: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.seaBlue,
  },
});