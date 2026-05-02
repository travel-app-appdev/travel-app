// components/common/ActionCard.tsx
import { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors, spacing, radius, typography } from "@/src/theme";
import ArrowRight from "@/assets/icons/arrow_right.svg";

type ActionCardProps = {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export const ACTION_CARD_HEIGHT = 97;

export function ActionCard({
  label,
  icon,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: ActionCardProps) {
  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
    >
      <View style={styles.left}>
        {icon}
        <AppText variant="body" style={styles.label}>
          {label}
        </AppText>
      </View>
      <ArrowRight width={20} height={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    minHeight: ACTION_CARD_HEIGHT,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: `0px 8px ${radius.xl}px rgba(255, 107, 53, 0.25)`,
    elevation: 6,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  label: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.textPrimary,
  },
});
