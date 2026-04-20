// components/common/BackLink.tsx
import { Link } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { type Href } from "expo-router";
import { spacing } from "@/src/theme";
import Back from "@/assets/icons/back.svg";

type BackLinkProps = {
  href?: Href;
  onPress?: () => void;
};

export function BackLink({ href, onPress }: BackLinkProps) {
  if (onPress) {
    return (
      <Pressable
        style={styles.backLink}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Back width={20} height={20} />
      </Pressable>
    );
  }

  return (
    <Link
      href={href!}
      style={styles.backLink}
      accessibilityRole="link"
      accessibilityLabel="Go back"
    >
      <Back width={20} height={20} />
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