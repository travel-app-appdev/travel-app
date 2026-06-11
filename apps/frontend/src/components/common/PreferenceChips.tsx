import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";

type PreferenceItem = {
  key: string;
  label: string;
};

type PreferenceGroup = {
  group: string;
  items: PreferenceItem[];
};

export const PREFERENCE_GROUPS: PreferenceGroup[] = [
  {
    group: "Food & Drink",
    items: [
      { key: "coffee", label: "Coffee" },
      { key: "food", label: "Restaurants" },
      { key: "quickbites", label: "Quick bites" },
      { key: "desserts", label: "Desserts" },
      { key: "nightlife", label: "Nightlife" },
    ],
  },
  {
    group: "Explore",
    items: [
      { key: "museums", label: "Museums" },
      { key: "galleries", label: "Galleries" },
      { key: "sightseeing", label: "Sightseeing" },
      { key: "viewpoints", label: "Viewpoints" },
      { key: "heritage", label: "Heritage" },
      { key: "citywalks", label: "City walks" },
    ],
  },
  {
    group: "Outdoors",
    items: [
      { key: "nature", label: "Nature" },
      { key: "parks", label: "Parks" },
      { key: "gardens", label: "Gardens" },
      { key: "beaches", label: "Beaches" },
      { key: "camping", label: "Camping" },
      { key: "water", label: "Water views" },
    ],
  },
  {
    group: "Fun",
    items: [
      { key: "culture", label: "Culture" },
      { key: "cinema", label: "Cinema" },
      { key: "theatre", label: "Theatre" },
      { key: "amusement", label: "Theme parks" },
      { key: "zoo_aquarium", label: "Zoo & aquarium" },
      { key: "bowling", label: "Bowling" },
      { key: "escape_rooms", label: "Escape rooms" },
    ],
  },
  {
    group: "Active",
    items: [
      { key: "sports", label: "Sports" },
      { key: "fitness", label: "Fitness" },
      { key: "swimming", label: "Swimming" },
      { key: "skiing", label: "Skiing" },
      { key: "cycling", label: "Cycling" },
      { key: "water_sports", label: "Water sports" },
      { key: "spa", label: "Spa" },
    ],
  },
  {
    group: "Shopping",
    items: [
      { key: "shopping", label: "Malls" },
      { key: "markets", label: "Markets" },
      { key: "souvenirs", label: "Souvenirs" },
      { key: "books", label: "Books" },
      { key: "vintage", label: "Vintage" },
    ],
  },
];

export const ALL_PREFERENCES = PREFERENCE_GROUPS.flatMap((g) => g.items);
export type PreferenceKey = (typeof ALL_PREFERENCES)[number]["key"];

type Props = {
  selected: string[];
  onChange: (prefs: string[]) => void;
  maxSelect?: number;
  /** Show group labels (default true) */
  showGroups?: boolean;
};

export function PreferenceChips({
  selected,
  onChange,
  maxSelect = 5,
  showGroups = true,
}: Props) {
  function toggle(key: string) {
    if (selected.includes(key)) {
      onChange(selected.filter((p) => p !== key));
    } else if (selected.length < maxSelect) {
      onChange([...selected, key]);
    } else {
      onChange([...selected.slice(0, maxSelect - 1), key]);
    }
  }

  if (!showGroups) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.flatRow}
      >
        {ALL_PREFERENCES.map(({ key, label }) => {
          const active = selected.includes(key);
          return (
            <Chip
              key={key}
              label={label}
              active={active}
              disabled={false}
              onPress={() => toggle(key)}
            />
          );
        })}
      </ScrollView>
    );
  }

  return (
    <View style={styles.groups}>
      {PREFERENCE_GROUPS.map(({ group, items }) => (
        <View key={group} style={styles.groupSection}>
          <AppText variant="body" style={styles.groupLabel}>
            {group}
          </AppText>
          <View style={styles.chipRow}>
            {items.map(({ key, label }) => {
              const active = selected.includes(key);
              return (
                <Chip
                  key={key}
                  label={label}
                  active={active}
                  disabled={false}
                  onPress={() => toggle(key)}
                />
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

function Chip({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.chip,
        active && styles.chipActive,
        disabled && styles.chipDisabled,
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active, disabled }}
    >
      <AppText
        variant="body"
        style={[styles.chipLabel, active && styles.chipLabelActive]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  groups: {
    gap: spacing.lg,
  },
  groupSection: {
    gap: spacing.sm,
  },
  groupLabel: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    color: colors.nightBlack,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  flatRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.nightBlack,
    backgroundColor: "transparent",
  },
  chipActive: {
    backgroundColor: colors.sunsetOrange,
    borderColor: colors.sunsetOrange,
  },
  chipDisabled: {
    opacity: 0.35,
  },
  chipLabel: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
  },
  chipLabelActive: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
});
