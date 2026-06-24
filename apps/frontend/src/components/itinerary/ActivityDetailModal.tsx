import { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  View,
  ScrollView,
} from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import type { Activity, ItineraryState } from "@/src/types/itinerary";
import { formatActivityTimeRange } from "@/src/utils/itinerary/formatActivityTimeRange";

import LocationIcon from "@/assets/icons/location.svg";
import GoogleIcon from "@/assets/icons/google.svg";
import MembersIcon from "@/assets/icons/members.svg";
import Timer from "@/assets/icons/timer.svg";
import CloseIcon from "@/assets/icons/close.svg";
import JoinGroup from "@/assets/icons/join-group.svg";
import ArrowDownIcon from "@/assets/icons/arrow_down.svg";
import ArrowUpIcon from "@/assets/icons/arrow_up.svg";
import CheckIcon from "@/assets/icons/check_mark.svg";
import { hiddenFromAccessibility } from "@/src/utils/accessibility";
import { useSinglePress } from "@/src/hooks/useSinglePress";

type Props = {
  visible: boolean;
  activity: Activity | null;
  slotLabel?: string;
  state: ItineraryState;
  alternativeActivities?: Activity[];
  addedAlternativeActivityIds?: string[];
  onClose: () => void;
  onAddAlternativeToItinerary?: (activity: Activity) => void;
};

export function ActivityDetailModal({
  visible,
  activity,
  slotLabel,
  state,
  alternativeActivities = [],
  addedAlternativeActivityIds = [],
  onClose,
  onAddAlternativeToItinerary,
}: Props) {
  const [isAlternativesExpanded, setIsAlternativesExpanded] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsAlternativesExpanded(false);
    }
  }, [visible, activity?.id]);

  const handleOpenGoogleMaps = useSinglePress(async () => {
    if (!activity?.googleMapsUrl) return;

    try {
      await Linking.openURL(activity.googleMapsUrl);
    } catch (error) {
      console.log("Could not open Google Maps link:", error);
    }
  });

  const handleToggleAlternatives = useSinglePress(() => {
    setIsAlternativesExpanded((current) => !current);
  });

  const remainingAlternativeCount = useMemo(() => {
    return Math.max(
      0,
      alternativeActivities.filter(
        (alternative) => !addedAlternativeActivityIds.includes(alternative.id)
      ).length
    );
  }, [alternativeActivities, addedAlternativeActivityIds]);

  if (!activity) return null;

  const showMembers = state === "final";
  const topLabel = slotLabel || "Activity";
  const activityTimeRange = formatActivityTimeRange(activity);
  const hasAlternatives = alternativeActivities.length > 0;

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
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close activity details"
              >
                <View {...hiddenFromAccessibility}>
                  <CloseIcon width={22} height={22} />
                </View>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: 16,
                paddingTop: spacing.sm,
              }}
            >
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
                  <LocationIcon width={24} height={24} />
                  <AppText variant="body" style={styles.infoText}>
                    {activity.address?.trim() || "No address available"}
                  </AppText>
                </View>

                <View style={styles.infoRow}>
                  <Timer width={24} height={24} />
                  <AppText variant="body" style={styles.infoText}>
                    {activityTimeRange || "No time available"}
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
                        ? activity.joinedMembers
                            .map((member) => member.name)
                            .join(", ")
                        : "No members joined yet"}
                    </AppText>
                  </View>
                ) : null}
              </View>

              {hasAlternatives ? (
                <View style={styles.alternativesSection}>
                  <Pressable
                    onPress={handleToggleAlternatives}
                    style={({ pressed }) => [
                      styles.alternativesHeaderButton,
                      pressed && styles.alternativesHeaderButtonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isAlternativesExpanded
                        ? "Hide other suggested activities"
                        : "Show other suggested activities"
                    }
                    accessibilityState={{ expanded: isAlternativesExpanded }}
                  >
                    <View style={styles.alternativesHeader}>
                      <View style={styles.alternativesHeaderLeft}>
                        <AppText
                          variant="body"
                          style={styles.alternativesTitle}
                        >
                          Other suggested activities
                        </AppText>

                        <View style={styles.badge}>
                          <AppText variant="caption" style={styles.badgeText}>
                            {remainingAlternativeCount}
                          </AppText>
                        </View>
                      </View>

                      <View {...hiddenFromAccessibility}>
                        {isAlternativesExpanded ? (
                          <ArrowUpIcon width={22} height={22} />
                        ) : (
                          <ArrowDownIcon width={22} height={22} />
                        )}
                      </View>
                    </View>
                  </Pressable>

                  {isAlternativesExpanded ? (
                    <View style={styles.alternativesList}>
                      {alternativeActivities.map((alternative) => {
                        const alternativeTimeRange =
                          formatActivityTimeRange(alternative);
                        const joinedLabel = `${alternative.joinedCount ?? 0}`;
                        const isAlreadyAdded =
                          addedAlternativeActivityIds.includes(alternative.id);

                        return (
                          <View
                            key={alternative.id}
                            style={styles.alternativeRow}
                          >
                            <View style={styles.alternativeCard}>
                              <AppText
                                variant="body"
                                style={styles.alternativeSlotLabel}
                              >
                                {slotLabel || "Activity"}
                              </AppText>

                              <AppText
                                variant="subtitle"
                                style={styles.alternativeName}
                                numberOfLines={2}
                              >
                                {alternative.name}
                              </AppText>

                              {!!alternative.address?.trim() && (
                                <View style={styles.alternativeMetaRow}>
                                  <LocationIcon width={16} height={16} />
                                  <AppText
                                    variant="caption"
                                    style={styles.alternativeMetaText}
                                    numberOfLines={1}
                                  >
                                    {alternative.address.trim()}
                                  </AppText>
                                </View>
                              )}

                              {!!alternativeTimeRange && (
                                <View style={styles.alternativeMetaRow}>
                                  <Timer width={16} height={16} />
                                  <AppText
                                    variant="caption"
                                    style={styles.alternativeMetaText}
                                    numberOfLines={1}
                                  >
                                    {alternativeTimeRange}
                                  </AppText>
                                </View>
                              )}

                              <View style={styles.alternativeJoinedRow}>
                                <MembersIcon width={16} height={16} />
                                <AppText
                                  variant="caption"
                                  style={styles.alternativeMetaText}
                                >
                                  {joinedLabel}
                                </AppText>
                              </View>
                            </View>

                            <Pressable
                              onPress={() => {
                                onAddAlternativeToItinerary?.(alternative);
                              }}
                              style={({ pressed }) => [
                                styles.addCta,
                                isAlreadyAdded && styles.addCtaActive,
                                pressed && styles.addCtaPressed,
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={
                                isAlreadyAdded
                                  ? `Remove ${alternative.name} from itinerary`
                                  : `Add ${alternative.name} to itinerary`
                              }
                            >
                              <View {...hiddenFromAccessibility}>
                                {isAlreadyAdded ? (
                                  <CheckIcon
                                    width={24}
                                    height={24}
                                    color={colors.nightBlack}
                                  />
                                ) : (
                                  <JoinGroup width={24} height={24} />
                                )}
                              </View>

                              <AppText
                                variant="caption"
                                style={styles.addCtaText}
                              >
                                {isAlreadyAdded ? "Added" : "Add to\nitinerary"}
                              </AppText>
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    zIndex: 1,
  },
  modalCard: {
    width: "100%",
    maxHeight: "90%",
    maxWidth: 460,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.nightBlack,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    elevation: 2,
    zIndex: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -10,
    marginRight: -8,
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
    color: colors.nightBlack,
    flexShrink: 1,
  },
  linkText: {
    color: colors.nightBlack,
    textDecorationLine: "underline",
    fontFamily: typography.fontFamily.bodySemiBold,
  },
  alternativesSection: {
    marginTop: spacing.sm,
  },
  alternativesHeaderButton: {
    borderColor: colors.nightBlack,
    borderRadius: radius.md,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  alternativesHeaderButtonPressed: {
    opacity: 0.85,
  },
  alternativesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  alternativesHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 1,
  },
  alternativesTitle: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.body,
  },
  badge: {
    minWidth: 24,
    maxHeight: 24,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    marginLeft: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.neonGreen,
  },
  badgeText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  alternativesList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  alternativeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "stretch",
  },
  alternativeCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.nightBlack,
    borderRadius: radius.md,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  alternativeSlotLabel: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
  },
  alternativeName: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
  },
  alternativeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  alternativeJoinedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  alternativeMetaText: {
    color: colors.nightBlack,
    flexShrink: 1,
  },
  addCta: {
    width: 88,
    borderRadius: radius.md,
    backgroundColor: colors.neonGreen,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  addCtaPressed: {
    opacity: 0.85,
  },
  addCtaActive: {
    opacity: 0.8,
  },
  addCtaText: {
    color: colors.nightBlack,
    textAlign: "center",
    fontFamily: typography.fontFamily.body,
    lineHeight: typography.lineHeight.xs,
  },
});
