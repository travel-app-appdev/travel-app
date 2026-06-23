import { useCallback, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityRole,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/src/components/common/AppText";
import { ACTION_CARD_HEIGHT } from "@/src/components/common/ActionCard";
import { colors, radius, spacing, typography } from "@/src/theme";
import { PressLock } from "@/src/utils/PressLock";

import CheckIcon from "@/assets/icons/check_mark.svg";
import InfoIcon from "@/assets/icons/info.svg";

type Props = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  docked?: boolean;
  dimSurroundings?: boolean;
  accentColor: string;
  shadowColor: string;
  shadow: string;
  accessibilityLabel: string;
  accessibilityCheckedLabel: string;
  infoAccessibilityLabel: string;
  accessibilityRole?: AccessibilityRole;
  onPress: () => void;
  onInfoPress: () => void;
};

function getTrayGlowStyle(shadowColor: string, shadow: string) {
  if (Platform.OS === "web") {
    return { shadowColor, boxShadow: shadow };
  }

  if (Platform.OS === "ios") {
    return {
      shadowColor,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.45,
      shadowRadius: 24,
    };
  }

  return {
    boxShadow: "0px 6px 20px rgba(247, 118, 70, 0.38)",
    elevation: 0,
  };
}

function TrayWithGlow({
  shadowColor,
  shadow,
  docked,
  children,
}: {
  shadowColor: string;
  shadow: string;
  docked: boolean;
  children: ReactNode;
}) {
  const tray = (
    <View
      style={[
        styles.tray,
        docked && styles.dockedTray,
        getTrayGlowStyle(shadowColor, shadow),
      ]}
      testID="done-bar-footer"
    >
      {children}
    </View>
  );

  if (Platform.OS !== "ios") {
    return tray;
  }

  return (
    <View style={styles.trayOuter}>
      <View
        pointerEvents="none"
        style={[styles.trayGlowHalo, { backgroundColor: shadowColor }]}
      />
      {tray}
    </View>
  );
}

export function ItineraryDoneBar({
  label,
  checked,
  disabled = false,
  docked = false,
  dimSurroundings = false,
  accentColor,
  shadowColor,
  shadow,
  accessibilityLabel,
  accessibilityCheckedLabel,
  infoAccessibilityLabel,
  accessibilityRole = "checkbox",
  onPress,
  onInfoPress,
}: Props) {
  const isDisabled = disabled;

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    if (!PressLock.acquire()) return;
    Promise.resolve()
      .then(() => onPress())
      .finally(() => setTimeout(() => PressLock.release(), 500));
  }, [onPress, isDisabled]);

  const handleInfoPress = useCallback(() => {
    if (!PressLock.acquire()) return;
    Promise.resolve()
      .then(() => onInfoPress())
      .finally(() => setTimeout(() => PressLock.release(), 300));
  }, [onInfoPress]);

  const trayContent = (
    <>
      <Pressable
        style={[styles.doneButton, { backgroundColor: accentColor }]}
        onPress={handlePress}
        disabled={isDisabled}
        hitSlop={8}
        testID="done-bar-submit-button"
        accessibilityRole={accessibilityRole}
        accessibilityLabel={
          checked ? accessibilityCheckedLabel : accessibilityLabel
        }
        accessibilityState={{ checked, disabled: isDisabled }}
      >
        {checked ? (
          <CheckIcon
            width={22}
            height={22}
            color={colors.nightBlack}
            testID="done-bar-checked-icon"
          />
        ) : (
          <View style={styles.checkbox} testID="done-bar-unchecked-icon" />
        )}

        <AppText variant="body" style={styles.doneText}>
          {label}
        </AppText>
      </Pressable>

      <Pressable
        style={styles.infoButton}
        onPress={handleInfoPress}
        hitSlop={8}
        testID="done-bar-info-button"
        accessibilityRole="button"
        accessibilityLabel={infoAccessibilityLabel}
      >
        <InfoIcon width={24} height={24} />
      </Pressable>
    </>
  );

  const tray = (
    <TrayWithGlow shadowColor={shadowColor} shadow={shadow} docked={docked}>
      {trayContent}
    </TrayWithGlow>
  );

  if (docked) {
    return (
      <View
        style={[styles.dockedWrapper, docked && styles.dockedEdgeWrapper]}
        testID="done-bar-wrapper"
      >
        {tray}
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={styles.safeArea}
      testID="done-bar-wrapper"
    >
      {dimSurroundings ? (
        <View
          pointerEvents="none"
          style={styles.surroundDimOverlay}
          testID="done-bar-surround-dim"
        />
      ) : null}
      <View style={styles.contentWrapper}>{tray}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.lightWhite,
    zIndex: 10,
  },
  surroundDimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    zIndex: 1,
  },
  contentWrapper: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    zIndex: 2,
    overflow: "visible",
  },
  trayOuter: {
    position: "relative",
    overflow: "visible",
  },
  trayGlowHalo: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: radius.lg + 8,
    opacity: 0.28,
  },
  tray: {
    backgroundColor: colors.lightWhite,
    borderRadius: radius.lg,
    minHeight: ACTION_CARD_HEIGHT,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  dockedWrapper: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.xl,
    zIndex: 10,
  },
  dockedEdgeWrapper: {
    left: 0,
    right: 0,
    bottom: 0,
  },
  dockedTray: {
    borderTopLeftRadius: 23,
    borderTopRightRadius: 23,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    width: "100%",
  },
  doneButton: {
    minHeight: 56,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.nightBlack,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  doneText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
  },
  infoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
