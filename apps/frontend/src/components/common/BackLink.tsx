import { Link } from "expo-router";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { type Href } from "expo-router";
import { spacing } from "@/src/theme";
import Back from "@/assets/icons/back.svg";

type BackLinkProps = {
  href?: Href;
  onPress?: () => void;
};

export function BackLink({ href, onPress }: BackLinkProps) {
  // Decorative icon — hidden from accessibility tree in both variants
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
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        accessibilityHint="Returns to the previous screen"
      >
        {icon}
      </Pressable>
    );
  }

  // Link variant — use button role on mobile, link role on web
  // On mobile, navigating "back" feels like a button action not a hyperlink,
  // and screen readers announce it more naturally as "Go back, button"
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