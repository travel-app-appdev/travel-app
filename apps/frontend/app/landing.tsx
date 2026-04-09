import { Link } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppButton } from "@/src/components/common/AppButton";
import { AppText } from "@/src/components/common/AppText";
import { colors, spacing } from "@/src/theme";

export default function LandingScreen() {
  return (
    <View style={styles.container}>
      <AppText variant="title" style={styles.title}>
        Welcome to Votey
      </AppText>

      <AppText variant="body" style={styles.subtitle}>
        You are logged in.
      </AppText>

      <View style={styles.actions}>
        <Link href="/create-trip" asChild>
          <AppButton title="Create Trip" onPress={() => {}} />
        </Link>

        <Link href="/join-trip" asChild>
          <AppButton title="Join Trip" onPress={() => {}} variant="secondary" />
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  actions: {
    width: "75%",
    gap: spacing.md,
  },
});
