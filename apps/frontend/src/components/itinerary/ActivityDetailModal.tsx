import { Linking, Modal, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import type { Activity, ItineraryState } from "@/src/types/itinerary";
import { formatActivityTimeRange } from "@/src/utils/itinerary/formatActivityTimeRange";

import LocationIcon from "@/assets/icons/location.svg";
import GoogleIcon from "@/assets/icons/google.svg";
import MembersIcon from "@/assets/icons/members.svg";
import Timer from "@/assets/icons/timer.svg";
import CloseIcon from "@/assets/icons/close.svg";
import { hiddenFromAccessibility } from "@/src/utils/accessibility";
import { useSinglePress } from "@/src/hooks/useSinglePress";

type Props = {
  visible: boolean;
  activity: Activity | null;
  slotLabel?: string;
  state: ItineraryState;
  onClose: () => void;
};

export function ActivityDetailModal({
  visible,
  activity,
  slotLabel,
  state,
  onClose,
}: Props) {
  const handleOpenGoogleMaps = useSinglePress(async () => {
    if (!activity?.googleMapsUrl) return;

    try {
      await Linking.openURL(activity.googleMapsUrl);
    } catch (error) {
      console.log("Could not open Google Maps link:", error);
    }
  });

  if (!activity) return null;

  const showMembers = state === "final";
  const topLabel = slotLabel || "Activity";
  const activityTimeRange = formatActivityTimeRange(activity);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close activity details"
        />

        <View style={styles.centerWrap} pointerEvents="box-none">
          <View
            style={styles.modalCard}
            accessibilityViewIsModal={true}
            accessible={true}
            accessibilityLabel={`Activity details for ${activity.name}`}
          >
            <View style={styles.headerRow}>
              <AppText variant="body" style={styles.smallTitle}>
                {topLabel}
              </AppText>

              <Pressable
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close activity details"
              >
                <View {...hiddenFromAccessibility}>
                  <CloseIcon width={22} height={22} />
                </View>
              </Pressable>
            </View>

            <AppText variant="subtitle" style={styles.title}>
              {activity.name}
            </AppText>

            {!!activity.description && (
              <AppText variant="body" style={styles.description}>
                {activity.description}
              </AppText>
            )}

            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <LocationIcon width={32} height={32} />
                <AppText variant="body" style={styles.infoText}>
                  {activity.address || "No address available"}
                </AppText>
              </View>

              <View style={styles.infoRow}>
                <Timer width={20} height={20} />
                <AppText variant="body" style={styles.infoText}>
                  {activityTimeRange
                    ? `${topLabel}: ${activityTimeRange}`
                    : slotLabel || "No time available"}
                </AppText>
              </View>

              {activity.googleMapsUrl ? (
                <Pressable
                  onPress={handleOpenGoogleMaps}
                  style={styles.infoRow}
                  accessibilityRole="link"
                  accessibilityLabel="Open Google Maps link"
                >
                  <View {...hiddenFromAccessibility} style={styles.googleRow}>
                    <GoogleIcon width={20} height={20} />
                    <AppText variant="body" style={styles.linkText}>
                      Google-Link
                    </AppText>
                  </View>
                </Pressable>
              ) : null}

              {showMembers ? (
                <View style={styles.infoRow}>
                  <MembersIcon width={20} height={20} />
                  <AppText variant="body" style={styles.infoText}>
                    {activity.joinedMembers?.length
                      ? activity.joinedMembers.map((member) => member.name).join(", ")
                      : "No members joined yet"}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 460,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.nightBlack,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  smallTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    fontFamily: typography.fontFamily.bodyBold,
  },
  description: {
    color: colors.textPrimary,
    lineHeight: typography.lineHeight.lg,
    paddingRight: spacing.md,
  },

  infoList: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  googleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  infoText: {
    color: colors.textPrimary,
    flexShrink: 1,
  },
  linkText: {
    color: colors.nightBlack,
    textDecorationLine: "underline",
    fontFamily: typography.fontFamily.bodySemiBold,
  },
});
