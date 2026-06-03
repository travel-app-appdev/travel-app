import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { colors, radius, spacing } from "@/src/theme";

export function SkeletonSlotCard() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.row, { opacity }]}
    accessible={true}
    accessibilityLabel="Loading activity"
    accessibilityHint="progress bar"
    >
      <View style={styles.card}>
        <View style={styles.timeLine} />
        <View style={styles.titleLine} />
        <View style={styles.subtitleLine} />
      </View>

      <View style={styles.cta} />
    </Animated.View>
  );
}

const CARD_HEIGHT = 108;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "stretch",
  },
  card: {
    flex: 1,
    minHeight: CARD_HEIGHT,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    justifyContent: "center",
  },
  timeLine: {
    height: 12,
    width: "35%",
    borderRadius: radius.pill,
    backgroundColor: colors.textMuted,
    opacity: 0.3,
  },
  titleLine: {
    height: 16,
    width: "70%",
    borderRadius: radius.pill,
    backgroundColor: colors.textMuted,
    opacity: 0.3,
  },
  subtitleLine: {
    height: 12,
    width: "50%",
    borderRadius: radius.pill,
    backgroundColor: colors.textMuted,
    opacity: 0.2,
  },
  cta: {
    width: 92,
    minHeight: CARD_HEIGHT,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    opacity: 0.5,
  },
});