import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import { hiddenFromAccessibility } from "@/src/utils/accessibility";
import type { ActivitySuggestion } from "@/src/api/trips";

import CloseIcon from "@/assets/icons/close.svg";
import LocationPin from "@/assets/icons/location-pin.svg";
import AddIcon from "@/assets/icons/add.svg";

type Props = {
  visible: boolean;
  slotLabel: string;
  destination?: string;
  suggestions: ActivitySuggestion[];
  loading: boolean;
  error?: string | null;
  onClose: () => void;
  onAdd: (suggestion: ActivitySuggestion) => void;
};

export function SuggestionsModal({
  visible,
  slotLabel,
  destination,
  suggestions,
  loading,
  error,
  onClose,
  onAdd,
}: Props) {
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  function handleAdd(s: ActivitySuggestion) {
    setAddedIds((prev) => new Set([...prev, s.sourcePlaceId]));
    onAdd(s);
  }

  // Build subtitle: "Based on your preferences · Museums, Shopping · Prague"
  const allMatchedPrefs = suggestions.flatMap((s) => s.matchedPreferences);
  const uniquePrefs = [...new Set(allMatchedPrefs)];
  const prefsText = uniquePrefs.length > 0 ? uniquePrefs.join(", ") : null;

  const subtitleParts: string[] = ["Based on your preferences"];
  if (prefsText) subtitleParts.push(prefsText);
  if (destination) subtitleParts.push(destination);
  const subtitle = subtitleParts.join(" · ");

  function openMapsForPlace(s: ActivitySuggestion) {
    const query = encodeURIComponent(s.name + (s.address ? ", " + s.address : ""));
    const url = "https://www.google.com/maps/search/?api=1&query=" + query;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <AppText variant="body" style={styles.title}>
                Suggestions for{" "}
                <AppText variant="body" style={styles.titleSlot}>
                  {slotLabel.toLowerCase()}
                </AppText>
              </AppText>
              {!loading && !error && suggestions.length > 0 && (
                <AppText variant="body" style={styles.subtitleText} numberOfLines={2}>
                  {subtitle}
                </AppText>
              )}
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close suggestions"
            >
              <CloseIcon width={22} height={22} {...hiddenFromAccessibility} />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {loading && (
              <View style={styles.centerState}>
                <ActivityIndicator color={colors.nightBlack} size="large" />
                <AppText variant="body" style={styles.stateText}>
                  Finding places nearby...
                </AppText>
              </View>
            )}

            {!loading && error && (
              <View style={styles.centerState}>
                <AppText variant="body" style={styles.stateText}>
                  {error}
                </AppText>
              </View>
            )}

            {!loading && !error && suggestions.length === 0 && (
              <View style={styles.centerState}>
                <AppText variant="body" style={styles.stateText}>
                  No suggestions found for this destination.{"\n"}Try setting preferences to get better results.
                </AppText>
              </View>
            )}

            {!loading &&
              !error &&
              suggestions.map((s) => {
                const added = addedIds.has(s.sourcePlaceId);
                return (
                  <View key={s.sourcePlaceId} style={styles.card}>
                    {/* Place info */}
                    <View style={styles.cardBody}>
                      <AppText variant="body" style={styles.placeName} numberOfLines={2}>
                        {s.name}
                      </AppText>

                      {!!s.address && (
                        <View style={styles.infoRow}>
                          <LocationPin
                            width={14}
                            height={14}
                            {...hiddenFromAccessibility}
                          />
                          <AppText
                            variant="body"
                            style={styles.addressText}
                            numberOfLines={2}
                          >
                            {s.address}
                          </AppText>
                        </View>
                      )}

                      {/* Google Maps link */}
                      <Pressable
                        onPress={() => openMapsForPlace(s)}
                        style={styles.mapsLink}
                        accessibilityRole="link"
                        accessibilityLabel={`Open ${s.name} in Google Maps`}
                      >
                        <AppText variant="body" style={styles.mapsLinkText}>
                          Open in Google Maps →
                        </AppText>
                      </Pressable>
                    </View>

                    {/* Add Activity button */}
                    <Pressable
                      onPress={() => handleAdd(s)}
                      disabled={added}
                      style={[styles.addBtn, added && styles.addBtnDone]}
                      accessibilityRole="button"
                      accessibilityLabel={added ? `${s.name} added` : `Add ${s.name} to itinerary`}
                    >
                      {!added && (
                        <View {...hiddenFromAccessibility}>
                          <AddIcon width={16} height={16} color={colors.nightBlack} />
                        </View>
                      )}
                      <AppText
                        variant="body"
                        style={[styles.addBtnText, added && styles.addBtnTextDone]}
                      >
                        {added ? "Added ✓" : "Add Activity"}
                      </AppText>
                    </Pressable>
                  </View>
                );
              })}

            {/* Load more button (decorative — same cache result, but lets user know there's a way to refresh) */}
            {!loading && !error && suggestions.length > 0 && (
              <Pressable
                style={styles.loadMoreBtn}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close and search again later"
              >
                <AppText variant="body" style={styles.loadMoreText}>
                  Load more suggestions
                </AppText>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.lightWhite,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    maxHeight: "80%",
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    color: colors.nightBlack,
    lineHeight: typography.lineHeight.xl,
  },
  titleSlot: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    color: colors.sunsetOrange,
    lineHeight: typography.lineHeight.xl,
  },
  subtitleText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.nightBlack,
    opacity: 0.6,
    lineHeight: typography.lineHeight.sm,
  },
  closeBtn: {
    padding: spacing.xs,
    marginTop: 2,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  centerState: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxxl,
  },
  stateText: {
    color: colors.nightBlack,
    textAlign: "center",
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    opacity: 0.7,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.lightWhite,
    gap: spacing.md,
  },
  cardBody: {
    gap: spacing.xs,
  },
  placeName: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    color: colors.nightBlack,
    lineHeight: typography.lineHeight.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  addressText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.nightBlack,
    opacity: 0.7,
    lineHeight: typography.lineHeight.sm,
  },
  mapsLink: {
    marginTop: spacing.xs,
  },
  mapsLinkText: {
    fontSize: typography.size.sm,
    color: colors.seaBlue,
    fontFamily: typography.fontFamily.bodySemiBold,
    textDecorationLine: "underline",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.neonGreen,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  addBtnDone: {
    backgroundColor: colors.border,
  },
  addBtnText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
  },
  addBtnTextDone: {
    color: colors.nightBlack,
    opacity: 0.5,
  },
  loadMoreBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.nightBlack,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  loadMoreText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.md,
    color: colors.nightBlack,
  },
});
