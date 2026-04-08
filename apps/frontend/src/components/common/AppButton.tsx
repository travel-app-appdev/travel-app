import {
  Pressable,
  StyleSheet,
  ViewStyle,
  View,
  TextStyle,
  StyleProp,
} from "react-native";
import { colors, radius, spacing } from "@/src/theme";
import { AppText } from "./AppText";
import { ReactNode } from "react";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
  textStyle?: StyleProp<TextStyle>;
};

export function AppButton({
  title,
  onPress,
  variant = "primary",
  style,
  icon,
  textStyle,
}: AppButtonProps) {
  return (
    <Pressable
      style={[
        styles.button,
        variant === "secondary" && styles.secondaryButton,
        style,
      ]}
      onPress={onPress}
    >
      {icon && <View style={styles.iconWrapper}>{icon}</View>}

      <AppText
        variant="body"
        style={[
          styles.text,
          variant === "secondary" && styles.secondaryText,
          textStyle,
        ]}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    backgroundColor: colors.seaBlue,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  secondaryButton: {
    backgroundColor: colors.lightWhite,
    borderWidth: 2.5,
    borderColor: colors.seaBlue,
  },
  text: {
    color: colors.white,
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
  },
  secondaryText: {
    color: colors.seaBlue,
  },
  iconWrapper: {
    marginRight: spacing.sm,
  },
});
