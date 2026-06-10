import { useEffect, useMemo, useState } from "react";
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
  loadingMore?: boolean;
  error?: string | null;
  onClose: () => void;
  onAdd: (suggestion: ActivitySuggestion) => void;
  onLoadMore?: () => void;
};

const ALL_FILTER = "All";

const CATEGORY_LABEL_RULES: { label: string; categories: string[] }[] = [
  {
    label: "Coffee",
    categories: ["catering.cafe.coffee", "catering.cafe.coffee_shop"],
  },
  {
    label: "Dessert",
    categories: [
      "catering.cafe.dessert",
      "catering.cafe.ice_cream",
      "catering.cafe.cake",
    ],
  },
  { label: "Cafe", categories: ["catering.cafe"] },
  {
    label: "Food",
    categories: [
      "catering.restaurant",
      "catering.fast_food",
      "catering.food_court",
    ],
  },
  {
    label: "Nightlife",
    categories: ["catering.bar", "catering.pub", "catering.biergarten"],
  },
  { label: "Museum", categories: ["entertainment.museum"] },
  {
    label: "Gallery",
    categories: ["entertainment.culture.gallery", "commercial.art"],
  },
  { label: "Sight", categories: ["tourism.sights", "tourism.attraction"] },
  { label: "Viewpoint", categories: ["tourism.attraction.viewpoint"] },
  {
    label: "Culture",
    categories: ["entertainment.culture", "heritage", "building.historic"],
  },
  { label: "Park", categories: ["leisure.park"] },
  { label: "Nature", categories: ["natural", "national_park"] },
  { label: "Beach", categories: ["beach"] },
  { label: "Camping", categories: ["camping"] },
  { label: "Cinema", categories: ["entertainment.cinema"] },
  { label: "Theatre", categories: ["entertainment.culture.theatre"] },
  {
    label: "Fun",
    categories: [
      "entertainment.theme_park",
      "entertainment.activity_park",
      "entertainment.water_park",
      "entertainment.zoo",
      "entertainment.aquarium",
      "entertainment.bowling_alley",
      "entertainment.escape_game",
    ],
  },
  {
    label: "Active",
    categories: [
      "sport",
      "activity.sport_club",
      "ski",
      "rental.bicycle",
      "rental.boat",
    ],
  },
  {
    label: "Spa",
    categories: ["leisure.spa", "service.beauty.spa", "service.beauty.massage"],
  },
  {
    label: "Shopping",
    categories: [
      "commercial.shopping_mall",
      "commercial.department_store",
      "commercial.marketplace",
      "commercial.gift_and_souvenir",
      "commercial.books",
      "commercial.second_hand",
      "commercial.antiques",
    ],
  },
];

const PREFERENCE_LABELS: Record<string, string> = {
  coffee: "Coffee",
  food: "Food",
  quickbites: "Quick bites",
  desserts: "Dessert",
  nightlife: "Nightlife",
  museums: "Museum",
  galleries: "Gallery",
  sightseeing: "Sight",
  viewpoints: "Viewpoint",
  heritage: "Heritage",
  citywalks: "City walks",
  nature: "Nature",
  parks: "Park",
  gardens: "Garden",
  beaches: "Beach",
  camping: "Camping",
  water: "Water views",
  culture: "Culture",
  cinema: "Cinema",
  theatre: "Theatre",
  amusement: "Fun",
  zoo_aquarium: "Zoo & aquarium",
  bowling: "Bowling",
  escape_rooms: "Escape rooms",
  sports: "Active",
  fitness: "Fitness",
  swimming: "Swimming",
  skiing: "Skiing",
  cycling: "Cycling",
  water_sports: "Water sports",
  spa: "Spa",
  shopping: "Shopping",
  markets: "Markets",
  souvenirs: "Souvenirs",
  books: "Books",
  vintage: "Vintage",
};

function categoryMatches(category: string, target: string) {
  return category === target || category.startsWith(target + ".");
}

function getSuggestionLabels(suggestion: ActivitySuggestion) {
  const labels = new Set<string>();
  const categories = suggestion.categories ?? [];

  CATEGORY_LABEL_RULES.forEach((rule) => {
    if (
      rule.categories.some((target) =>
        categories.some((category) => categoryMatches(category, target))
      )
    ) {
      labels.add(rule.label);
    }
  });

  if (labels.size === 0) {
    suggestion.matchedPreferences.forEach((preference) => {
      const label = PREFERENCE_LABELS[preference];
      if (label) labels.add(label);
    });
  }

  return Array.from(labels);
}

export function SuggestionsModal({
  visible,
  slotLabel,
  destination,
  suggestions,
  loading,
  loadingMore = false,
  error,
  onClose,
  onAdd,
  onLoadMore,
}: Props) {
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER);

  useEffect(() => {
    if (visible) setActiveFilter(ALL_FILTER);
  }, [visible, slotLabel]);

  function handleAdd(s: ActivitySuggestion) {
    setAddedIds((prev) => new Set([...prev, s.sourcePlaceId]));
    onAdd(s);
  }

  // Build subtitle: "Based on your preferences · Museums, Shopping · Prague"
  const suggestionItems = useMemo(
    () =>
      suggestions.map((suggestion, index) => ({
        suggestion,
        labels: getSuggestionLabels(suggestion),
        key: suggestion.sourcePlaceId || `${suggestion.name}-${index}`,
      })),
    [suggestions]
  );

  const filterOptions = useMemo(() => {
    const counts = new Map<string, number>();
    suggestionItems.forEach(({ labels }) => {
      labels.forEach((label) => counts.set(label, (counts.get(label) ?? 0) + 1));
    });

    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => {
        const aIndex = CATEGORY_LABEL_RULES.findIndex(
          (rule) => rule.label === a.label
        );
        const bIndex = CATEGORY_LABEL_RULES.findIndex(
          (rule) => rule.label === b.label
        );
        const safeAIndex = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
        const safeBIndex = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
        return (
          safeAIndex - safeBIndex ||
          b.count - a.count ||
          a.label.localeCompare(b.label)
        );
      });
  }, [suggestionItems]);

  const effectiveFilter =
    activeFilter === ALL_FILTER ||
    filterOptions.some((option) => option.label === activeFilter)
      ? activeFilter
      : ALL_FILTER;

  const visibleSuggestionItems = useMemo(
    () =>
      effectiveFilter === ALL_FILTER
        ? suggestionItems
        : suggestionItems.filter(({ labels }) =>
            labels.includes(effectiveFilter)
          ),
    [effectiveFilter, suggestionItems]
  );

  const allMatchedPrefs = suggestions.flatMap((s) => s.matchedPreferences);
  const uniquePrefs = [...new Set(allMatchedPrefs)];
  const prefsText =
    uniquePrefs.length > 0
      ? uniquePrefs.map((pref) => PREFERENCE_LABELS[pref] ?? pref).join(", ")
      : null;

  const subtitleParts: string[] = ["Based on your preferences"];
  if (prefsText) subtitleParts.push(prefsText);
  if (destination) subtitleParts.push(destination);
  const subtitle = subtitleParts.join(" · ");

  function openMapsForPlace(s: ActivitySuggestion) {
    const query = encodeURIComponent(s.name + (s.address ? ", " + s.address : ""));
    const url =
      s.googleMapsUrl ??
      "https://www.google.com/maps/search/?api=1&query=" + query;
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

          {!loading && !error && suggestions.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
              style={styles.filterScroller}
            >
              <Pressable
                onPress={() => setActiveFilter(ALL_FILTER)}
                style={[
                  styles.filterChip,
                  effectiveFilter === ALL_FILTER && styles.filterChipActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Show all ${suggestions.length} suggestions`}
              >
                <AppText
                  variant="body"
                  style={[
                    styles.filterChipText,
                    effectiveFilter === ALL_FILTER && styles.filterChipTextActive,
                  ]}
                >
                  All {suggestions.length}
                </AppText>
              </Pressable>

              {filterOptions.map(({ label, count }) => {
                const active = effectiveFilter === label;
                return (
                  <Pressable
                    key={label}
                    onPress={() => setActiveFilter(label)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Show ${label} suggestions`}
                    accessibilityState={{ selected: active }}
                  >
                    <AppText
                      variant="body"
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {label} {count}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

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
              visibleSuggestionItems.map(({ suggestion: s, labels, key }) => {
                const added = addedIds.has(s.sourcePlaceId);
                return (
                  <View key={key} style={styles.card}>
                    {/* Place info */}
                    <View style={styles.cardBody}>
                      <AppText variant="body" style={styles.placeName} numberOfLines={2}>
                        {s.name}
                      </AppText>

                      {labels.length > 0 && (
                        <View style={styles.labelRow}>
                          {labels.slice(0, 3).map((label) => (
                            <View key={label} style={styles.placeLabel}>
                              <AppText variant="body" style={styles.placeLabelText}>
                                {label}
                              </AppText>
                            </View>
                          ))}
                        </View>
                      )}

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

            {/* Load more button */}
            {!loading && !error && suggestions.length > 0 && !!onLoadMore && (
              <Pressable
                style={[styles.loadMoreBtn, loadingMore && styles.loadMoreBtnDisabled]}
                onPress={onLoadMore}
                disabled={loadingMore}
                accessibilityRole="button"
                accessibilityLabel="Load more suggestions"
              >
                {loadingMore ? (
                  <ActivityIndicator color={colors.nightBlack} size="small" />
                ) : (
                  <AppText variant="body" style={styles.loadMoreText}>
                    Load more suggestions
                  </AppText>
                )}
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
  filterScroller: {
    marginBottom: spacing.sm,
    flexShrink: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    paddingRight: spacing.lg,
  },
  filterChip: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.nightBlack,
    backgroundColor: colors.lightWhite,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: colors.beachYellow,
    borderColor: colors.beachYellow,
  },
  filterChipText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  filterChipTextActive: {
    fontFamily: typography.fontFamily.bodyBold,
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
    gap: spacing.sm,
  },
  placeName: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    color: colors.nightBlack,
    lineHeight: typography.lineHeight.lg,
  },
  labelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  placeLabel: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.beachYellow,
    backgroundColor: "#FFF4C2",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  placeLabelText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
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
    backgroundColor: colors.beachYellow,
    borderRadius: radius.pill,
    height: 56,
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
  loadMoreBtnDisabled: {
    opacity: 0.5,
  },
});
