import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  type ListRenderItem,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import { hiddenFromAccessibility } from "@/src/utils/accessibility";
import { getPreferenceLabel } from "@/src/components/common/PreferenceChips";
import type { ActivitySuggestion } from "@/src/api/trips";
import type { Activity } from "@/src/types/itinerary";

import CloseIcon from "@/assets/icons/close.svg";
import LocationPin from "@/assets/icons/location-pin.svg";
import AddIcon from "@/assets/icons/add.svg";
import GoogleIcon from "@/assets/icons/google.svg";
import CheckIcon from "@/assets/icons/check_mark.svg";

type Props = {
  visible: boolean;
  slotLabel: string;
  destination?: string;
  suggestions: ActivitySuggestion[];
  loading: boolean;
  loadingMore?: boolean;
  error?: string | null;
  onClose: () => void;
  onAdd: (suggestion: ActivitySuggestion) => void | Promise<void>;
  onLoadMore?: () => void;
  addedElsewherePlaceIds?: string[];
  addedInSlotPlaceIds?: string[];
  selectedPlaceId?: string | null;
  selectedPreferences?: string[];
  onDeselect?: () => void | Promise<void>;
};

function normalizeMatchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeMapsUrl(url: string) {
  return url.trim().toLowerCase();
}

function normalizeActivitySlot(activity: Activity): {
  dayId: string;
  slotId: string;
} {
  if (activity.slotId.includes("_")) {
    const [dayId, ...slotParts] = activity.slotId.split("_");
    if (slotParts.length > 0) {
      return {
        dayId: dayId || activity.dayId,
        slotId: slotParts.join("_"),
      };
    }
  }

  return {
    dayId: activity.dayId,
    slotId: activity.slotId,
  };
}

function isActivityInSlot(
  activity: Activity,
  currentDayId: string,
  currentSlotId: string
): boolean {
  const { dayId, slotId } = normalizeActivitySlot(activity);
  return dayId === currentDayId && slotId === currentSlotId;
}

export function activityMatchesSuggestion(
  activity: Activity,
  suggestion: ActivitySuggestion
): boolean {
  const activityMapsUrl = activity.googleMapsUrl?.trim();
  const suggestionMapsUrl = suggestion.googleMapsUrl?.trim();

  if (activityMapsUrl && suggestionMapsUrl) {
    if (
      normalizeMapsUrl(activityMapsUrl) === normalizeMapsUrl(suggestionMapsUrl)
    ) {
      return true;
    }
  }

  return (
    normalizeMatchText(activity.name) === normalizeMatchText(suggestion.name) &&
    normalizeMatchText(activity.address ?? "") ===
      normalizeMatchText(suggestion.address ?? "")
  );
}

export function getAddedInCurrentSlotPlaceIds(
  activities: Activity[],
  suggestions: ActivitySuggestion[],
  currentDayId: string,
  currentSlotId: string
): Set<string> {
  const slotActivities = activities.filter((activity) =>
    isActivityInSlot(activity, currentDayId, currentSlotId)
  );
  const placeIds = new Set<string>();

  for (const suggestion of suggestions) {
    if (
      suggestion.sourcePlaceId &&
      slotActivities.some((activity) =>
        activityMatchesSuggestion(activity, suggestion)
      )
    ) {
      placeIds.add(suggestion.sourcePlaceId);
    }
  }

  return placeIds;
}

export function getAddedElsewherePlaceIds(
  activities: Activity[],
  suggestions: ActivitySuggestion[],
  currentDayId: string,
  currentSlotId: string
): Set<string> {
  const otherActivities = activities.filter(
    (activity) => !isActivityInSlot(activity, currentDayId, currentSlotId)
  );
  const placeIds = new Set<string>();

  for (const suggestion of suggestions) {
    if (
      suggestion.sourcePlaceId &&
      otherActivities.some((activity) =>
        activityMatchesSuggestion(activity, suggestion)
      )
    ) {
      placeIds.add(suggestion.sourcePlaceId);
    }
  }

  return placeIds;
}

const ALL_FILTER = "All";
const SHEET_ANIMATION_MS = 280;
const SHEET_BODY_RESERVE = 168;

type SuggestionListItem = {
  suggestion: ActivitySuggestion;
  labels: string[];
  key: string;
};

function getSheetLayout(
  windowWidth: number,
  windowHeight: number,
  insets: { top: number; bottom: number; left: number; right: number }
) {
  const isLandscape = windowWidth > windowHeight;
  const availableHeight = Math.max(
    windowHeight - insets.top - insets.bottom,
    220
  );

  if (isLandscape) {
    return {
      isLandscape: true,
      sheetMaxHeight: availableHeight,
      listMaxHeight: Math.max(availableHeight - SHEET_BODY_RESERVE, 100),
      sheetInsetLeft: insets.left,
      sheetInsetRight: insets.right,
    };
  }

  const sheetMaxHeight = Math.round(availableHeight * 0.92);

  return {
    isLandscape: false,
    sheetMaxHeight,
    listMaxHeight: Math.max(sheetMaxHeight - SHEET_BODY_RESERVE, 140),
    sheetInsetLeft: 0,
    sheetInsetRight: 0,
  };
}

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
    label: "Restaurants",
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
  {
    label: "Sightseeing",
    categories: ["tourism.sights", "tourism.attraction"],
  },
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

const PREFERENCE_FILTER_LABELS: Record<string, string[]> = {
  coffee: ["Coffee", "Cafe"],
  food: ["Restaurants"],
  quickbites: ["Restaurants"],
  desserts: ["Dessert", "Cafe"],
  nightlife: ["Nightlife"],
  museums: ["Museum", "Gallery"],
  galleries: ["Gallery", "Museum"],
  sightseeing: ["Sightseeing", "Viewpoint", "Culture"],
  viewpoints: ["Viewpoint", "Sightseeing"],
  heritage: ["Culture", "Sightseeing"],
  citywalks: ["Sightseeing", "Culture"],
  nature: ["Nature", "Park"],
  parks: ["Park", "Nature"],
  gardens: ["Park", "Nature"],
  beaches: ["Beach"],
  camping: ["Camping"],
  water: ["Viewpoint", "Nature"],
  culture: ["Culture", "Museum", "Gallery"],
  cinema: ["Cinema"],
  theatre: ["Theatre"],
  amusement: ["Fun"],
  zoo_aquarium: ["Fun"],
  bowling: ["Fun"],
  escape_rooms: ["Fun"],
  sports: ["Active"],
  fitness: ["Active"],
  swimming: ["Active"],
  skiing: ["Active"],
  cycling: ["Active"],
  water_sports: ["Active"],
  spa: ["Spa"],
  shopping: ["Shopping"],
  markets: ["Shopping"],
  souvenirs: ["Shopping"],
  books: ["Shopping"],
  vintage: ["Shopping"],
};

const PREFERENCE_LABELS: Record<string, string> = {
  coffee: "Coffee",
  food: "Restaurants",
  quickbites: "Quick bites",
  desserts: "Dessert",
  nightlife: "Nightlife",
  museums: "Museum",
  galleries: "Gallery",
  sightseeing: "Sightseeing",
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

function getSuggestionLabels(
  suggestion: ActivitySuggestion,
  allowedFilterLabels: Set<string> | null
) {
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

  if (allowedFilterLabels) {
    return Array.from(labels).filter((label) => allowedFilterLabels.has(label));
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
  addedElsewherePlaceIds = [],
  addedInSlotPlaceIds = [],
  selectedPlaceId = null,
  selectedPreferences = [],
  onDeselect,
}: Props) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    isLandscape,
    sheetMaxHeight,
    listMaxHeight,
    sheetInsetLeft,
    sheetInsetRight,
  } = useMemo(
    () => getSheetLayout(windowWidth, windowHeight, insets),
    [
      insets.bottom,
      insets.left,
      insets.right,
      insets.top,
      windowHeight,
      windowWidth,
    ]
  );

  const [addedPlaceId, setAddedPlaceId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER);
  const [mounted, setMounted] = useState(visible);
  const slideAnim = useRef(new Animated.Value(sheetMaxHeight)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const listScrollRef = useRef<FlatList<SuggestionListItem>>(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      slideAnim.setValue(sheetMaxHeight);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: SHEET_ANIMATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: SHEET_ANIMATION_MS,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!mounted) return;

    slideAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: sheetMaxHeight,
        duration: SHEET_ANIMATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: SHEET_ANIMATION_MS,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [backdropAnim, mounted, sheetMaxHeight, slideAnim, visible]);

  useEffect(() => {
    if (visible) {
      setActiveFilter(ALL_FILTER);
      setAddedPlaceId(selectedPlaceId);
      setIsAdding(false);
    }
  }, [selectedPlaceId, slotLabel, visible]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const elsewherePlaceIds = useMemo(
    () => new Set(addedElsewherePlaceIds),
    [addedElsewherePlaceIds]
  );

  const inSlotPlaceIds = useMemo(
    () => new Set(addedInSlotPlaceIds),
    [addedInSlotPlaceIds]
  );

  const isPickerMode = onDeselect != null;

  function getActiveSelection() {
    return isPickerMode ? addedPlaceId : (addedPlaceId ?? selectedPlaceId);
  }

  async function handleAdd(s: ActivitySuggestion) {
    if (isAdding || elsewherePlaceIds.has(s.sourcePlaceId)) {
      return;
    }

    const activeSelection = getActiveSelection();

    if (inSlotPlaceIds.has(s.sourcePlaceId)) {
      if (!isPickerMode || !activeSelection) {
        return;
      }
    }

    if (activeSelection === s.sourcePlaceId) {
      if (!onDeselect) {
        return;
      }

      setAddedPlaceId(null);
      setIsAdding(true);
      try {
        await onDeselect();
      } finally {
        setIsAdding(false);
      }
      return;
    }

    const previousPlaceId = activeSelection;
    setAddedPlaceId(s.sourcePlaceId);
    setIsAdding(true);
    try {
      await onAdd(s);
    } catch {
      setAddedPlaceId(previousPlaceId);
    } finally {
      setIsAdding(false);
    }
  }

  // Build subtitle: "Based on your preferences · Museums, Shopping · Prague"
  const allowedFilterLabels = useMemo(() => {
    if (selectedPreferences.length === 0) return null;

    const labels = new Set<string>();
    selectedPreferences.forEach((preference) => {
      (PREFERENCE_FILTER_LABELS[preference] ?? []).forEach((label) => {
        labels.add(label);
      });
    });
    return labels;
  }, [selectedPreferences]);

  const suggestionItems = useMemo(
    (): SuggestionListItem[] =>
      suggestions
        .filter((suggestion) => {
          if (selectedPreferences.length === 0) return true;
          return suggestion.matchedPreferences.some((preference) =>
            selectedPreferences.includes(preference)
          );
        })
        .map((suggestion, index) => ({
          suggestion,
          labels: getSuggestionLabels(suggestion, allowedFilterLabels),
          key: suggestion.sourcePlaceId || `${suggestion.name}-${index}`,
        })),
    [allowedFilterLabels, selectedPreferences, suggestions]
  );

  const filterOptions = useMemo(() => {
    if (selectedPreferences.length > 0) {
      return selectedPreferences.map((preference) => ({
        key: preference,
        label: getPreferenceLabel(preference),
        count: suggestionItems.filter(({ suggestion }) =>
          suggestion.matchedPreferences.includes(preference)
        ).length,
      }));
    }

    const counts = new Map<string, number>();
    suggestionItems.forEach(({ labels }) => {
      labels.forEach((label) =>
        counts.set(label, (counts.get(label) ?? 0) + 1)
      );
    });

    return Array.from(counts.entries())
      .map(([label, count]) => ({ key: label, label, count }))
      .filter(
        ({ label }) => !allowedFilterLabels || allowedFilterLabels.has(label)
      )
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
  }, [allowedFilterLabels, selectedPreferences, suggestionItems]);

  const effectiveFilter =
    activeFilter === ALL_FILTER ||
    filterOptions.some((option) => option.key === activeFilter)
      ? activeFilter
      : ALL_FILTER;

  const visibleSuggestionItems = useMemo(
    () =>
      effectiveFilter === ALL_FILTER
        ? suggestionItems
        : suggestionItems.filter(({ suggestion }) =>
            suggestion.matchedPreferences.includes(effectiveFilter)
          ),
    [effectiveFilter, suggestionItems]
  );

  useEffect(() => {
    listScrollRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [effectiveFilter, loading, suggestions.length]);

  const prefsText =
    selectedPreferences.length > 0
      ? selectedPreferences.map((pref) => getPreferenceLabel(pref)).join(", ")
      : null;

  const subtitleParts: string[] = ["Based on your travel preferences"];
  if (prefsText) subtitleParts.push(prefsText);
  if (destination) subtitleParts.push(destination);
  const subtitle = subtitleParts.join(" · ");

  const openMapsForPlace = useCallback((s: ActivitySuggestion) => {
    const query = encodeURIComponent(
      s.name + (s.address ? ", " + s.address : "")
    );
    const url =
      s.googleMapsUrl ??
      "https://www.google.com/maps/search/?api=1&query=" + query;
    Linking.openURL(url).catch(() => {});
  }, []);

  const showFilterChips =
    !loading &&
    !error &&
    (selectedPreferences.length > 0 || suggestionItems.length > 0);

  const showSuggestionList =
    suggestions.length > 0 || selectedPreferences.length > 0;

  const activeSelection = getActiveSelection();

  const listContent = visibleSuggestionItems.map(({ suggestion: s, labels, key }) => {
    const isSavedInSlot = inSlotPlaceIds.has(s.sourcePlaceId);
    const isSelected = activeSelection === s.sourcePlaceId;
    const isAddedElsewhere = elsewherePlaceIds.has(s.sourcePlaceId);
    const isAddedInCurrentSlot = isPickerMode
      ? activeSelection
        ? isSelected
        : isSavedInSlot
      : isSavedInSlot || isSelected;
    const isAdded = isAddedElsewhere || isAddedInCurrentSlot;
    const isAddDisabled =
      isAdding ||
      isAddedElsewhere ||
      (!isPickerMode && isSavedInSlot) ||
      (isPickerMode && !activeSelection && isSavedInSlot);
    return (
      <View key={key} style={styles.card}>
        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <AppText
              variant="body"
              style={styles.placeName}
              numberOfLines={2}
            >
              {s.name}
            </AppText>
            {labels.length > 0 && (
              <View style={styles.titleLabels}>
                {labels.slice(0, 3).map((label) => (
                  <View key={label} style={styles.placeLabel}>
                    <AppText variant="body" style={styles.placeLabelText}>
                      {label}
                    </AppText>
                  </View>
                ))}
              </View>
            )}
          </View>

            {!!s.address && (
              <View style={styles.infoRow}>
                <LocationPin
                  width={18}
                  height={18}
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

            <Pressable
              onPress={() => openMapsForPlace(s)}
              style={styles.mapsLink}
              accessibilityRole="link"
              accessibilityLabel={`Open ${s.name} in Google Maps`}
            >
              <GoogleIcon width={18} height={18} {...hiddenFromAccessibility} />
              <AppText variant="body" style={styles.mapsLinkText}>
                Open in Google Maps
              </AppText>
            </Pressable>
          </View>

        <Pressable
          onPress={() => handleAdd(s)}
          disabled={isAddDisabled}
          style={[styles.addBtn, isAdded && styles.addBtnDone]}
          accessibilityRole="button"
          accessibilityLabel={
            isAddedElsewhere
              ? `${s.name} already added in another time slot`
              : isPickerMode && isSelected
                ? `${s.name} added. Tap again to remove`
                : !isPickerMode && isSavedInSlot
                  ? `${s.name} already added in this time slot`
                  : !isPickerMode && isSelected
                    ? `${s.name} added`
                    : activeSelection
                      ? `Replace with ${s.name}`
                      : `Add ${s.name} to itinerary`
          }
          accessibilityState={{ disabled: isAddDisabled }}
        >
          {isAdded ? (
            <View {...hiddenFromAccessibility}>
              <CheckIcon width={20} height={20} color={colors.nightBlack} />
            </View>
          ) : (
            <View {...hiddenFromAccessibility}>
              <AddIcon width={20} height={20} color={colors.nightBlack} />
            </View>
          )}
          <AppText
            variant="body"
            style={[styles.addBtnText, isAdded && styles.addBtnTextDone]}
          >
            {isAdded ? "Added" : "Add Activity"}
          </AppText>
        </Pressable>
      </View>
    );
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropAnim,
            },
          ]}
        />
        <Pressable
          style={styles.backdropPress}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close suggestions"
        />
        {insets.bottom > 0 && (
          <View
            style={[styles.bottomSafeAreaFill, { height: insets.bottom }]}
            pointerEvents="none"
          />
        )}
        <View
          style={[
            styles.sheetHost,
            isLandscape
              ? {
                  left: sheetInsetLeft,
                  right: sheetInsetRight,
                  top: insets.top,
                  bottom: 0,
                  justifyContent: "flex-start",
                }
              : {
                  paddingTop: insets.top + spacing.xs,
                },
          ]}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              isLandscape && styles.sheetLandscape,
              {
                width: "100%",
                maxHeight: sheetMaxHeight,
                ...(isLandscape ? { height: sheetMaxHeight } : null),
                paddingBottom: spacing.lg + insets.bottom,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerText}>
                <AppText variant="body" style={styles.title}>
                  Suggestions for{" "}
                  <AppText variant="body" style={styles.titleSlot}>
                    {slotLabel.toLowerCase()}
                  </AppText>
                </AppText>
                <View style={styles.subtitleSlot}>
                  {showFilterChips && (
                    <AppText
                      variant="body"
                      style={styles.subtitleText}
                      numberOfLines={2}
                    >
                      {subtitle}
                    </AppText>
                  )}
                </View>
              </View>
              <Pressable
                onPress={handleClose}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close suggestions"
              >
                <View {...hiddenFromAccessibility}>
                  <CloseIcon width={22} height={22} />
                </View>
              </Pressable>
            </View>

            <View style={styles.filterScroller}>
              {showFilterChips && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRow}
                  style={styles.filterScrollFill}
                >
                  <Pressable
                    onPress={() => setActiveFilter(ALL_FILTER)}
                    style={[
                      styles.filterChip,
                      effectiveFilter === ALL_FILTER && styles.filterChipActive,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Show all ${suggestionItems.length} suggestions`}
                  >
                    <AppText
                      variant="body"
                      style={[
                        styles.filterChipText,
                        effectiveFilter === ALL_FILTER &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      All ({suggestionItems.length})
                    </AppText>
                  </Pressable>

                  {filterOptions.map(({ key, label, count }) => {
                    const active = effectiveFilter === key;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setActiveFilter(key)}
                        style={[
                          styles.filterChip,
                          active && styles.filterChipActive,
                        ]}
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
                          {label} ({count})
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View style={[styles.listContainer, { height: listMaxHeight }]}>
              {loading ? (
                <View style={styles.listStatusCenter}>
                  <ActivityIndicator color={colors.nightBlack} size="large" />
                  <AppText variant="body" style={styles.stateText}>
                    Finding places nearby...
                  </AppText>
                </View>
              ) : error ? (
                <View style={styles.listStatusCenter}>
                  <AppText variant="body" style={styles.stateText}>
                    {error}
                  </AppText>
                </View>
              ) : !showSuggestionList ? (
                <View style={styles.listStatusCenter}>
                  <AppText variant="body" style={styles.stateText}>
                    No suggestions found for this destination.{"\n"}Try setting
                    preferences to get better results.
                  </AppText>
                </View>
              ) : (
                <FlatList
                  ref={listScrollRef}
                  style={styles.listScroll}
                  contentContainerStyle={styles.list}
                  data={visibleSuggestionItems}
                  keyExtractor={(item) => item.key}
                  renderItem={renderSuggestionItem}
                  showsVerticalScrollIndicator
                  nestedScrollEnabled
                  ListEmptyComponent={
                    <View style={styles.emptyFilterState}>
                      <AppText variant="body" style={styles.stateText}>
                        No matching activities for this preference.
                      </AppText>
                    </View>
                  }
                  ListFooterComponent={
                    !!onLoadMore && visibleSuggestionItems.length > 0 ? (
                      <Pressable
                        style={[
                          styles.loadMoreBtn,
                          loadingMore && styles.loadMoreBtnDisabled,
                        ]}
                        onPress={onLoadMore}
                        disabled={loadingMore}
                        accessibilityRole="button"
                        accessibilityLabel="Load more suggestions"
                      >
                        {loadingMore ? (
                          <ActivityIndicator
                            color={colors.nightBlack}
                            size="small"
                          />
                        ) : (
                          <AppText variant="body" style={styles.loadMoreText}>
                            Load more suggestions
                          </AppText>
                        )}
                      </Pressable>
                    ) : null
                  }
                />
              )}
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  sheetHost: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  bottomSafeAreaFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.lightWhite,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: "100%",
    backgroundColor: colors.lightWhite,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sheetLandscape: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingBottom: spacing.sm,
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
    color: colors.nightBlack,
    lineHeight: typography.lineHeight.xl,
  },
  subtitleText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.nightBlack,
    lineHeight: typography.lineHeight.sm,
  },
  subtitleSlot: {
    minHeight: typography.lineHeight.sm * 2,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -6,
    marginRight: -8,
  },
  filterScroller: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    marginHorizontal: -spacing.lg,
    flexShrink: 0,
    height: 48,
  },
  filterScrollFill: {
    flex: 1,
    backgroundColor: "transparent",
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    paddingVertical: spacing.xs,
    paddingLeft: spacing.lg + spacing.sm,
    paddingRight: spacing.xl,
  },
  filterChip: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.nightBlack,
    backgroundColor: "transparent",
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
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
  filterChipTextActive: {
    // Keep the same font metrics so chips do not resize when selected.
    fontFamily: typography.fontFamily.bodySemiBold,
  },
  listContainer: {
    flexShrink: 0,
    marginHorizontal: -spacing.lg,
  },
  listScroll: {
    flex: 1,
    backgroundColor: "transparent",
  },
  listStatusCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  list: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    flexGrow: 0,
  },
  emptyFilterState: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  stateText: {
    color: colors.nightBlack,
    textAlign: "center",
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.nightBlack,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.lightWhite,
    gap: spacing.md,
  },
  cardBody: {
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  placeName: {
    flex: 1,
    flexShrink: 1,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    color: colors.nightBlack,
    lineHeight: typography.lineHeight.lg,
  },
  titleLabels: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: spacing.xs,
    maxWidth: "42%",
    flexShrink: 0,
  },
  placeLabel: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.beachYellow,
    backgroundColor: colors.highlightYellow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  placeLabelText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
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
    lineHeight: typography.lineHeight.sm,
  },
  mapsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
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
