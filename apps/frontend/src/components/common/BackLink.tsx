import { useCallback } from "react";
import { Link } from "expo-router";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { type Href } from "expo-router";
import { spacing } from "@/src/theme";
import { PressLock } from "@/src/utils/PressLock";
import Back from "@/assets/icons/back.svg";

type BackLinkProps = {
  href?: Href;
  onPress?: () => void;
};

export function BackLink({ href, onPress }: BackLinkProps) {
  const handlePress = useCallback(() => {
    if (!PressLock.acquire()) return;
    Promise.resolve()
      .then(() => onPress?.())
      .finally(() => setTimeout(() => PressLock.release(), 500));
  }, [onPress]);

  const icon = (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Back width={20} height={20} />
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        style={styles.backLink}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        accessibilityHint="Returns to the previous screen"
      >
        {icon}
      </Pressable>
    );
  }

  return (
    <Link
      href={href!}
      style={styles.backLink}
      accessibilityRole={Platform.OS === "web" ? "link" : "button"}
      accessibilityLabel="Go back"
      accessibilityHint="Returns to the previous screen"
    >
      {icon}
    </Link>
  );
}

const styles = StyleSheet.create({
  backLink: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xs,
  },
});