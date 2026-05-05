import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";

import LocationIcon from "@/assets/icons/location.svg";

type TimeChip = {
  slotId: string;
  label: string; // "06:00–08:00"
};

type Props = {
  chips: TimeChip[];
  selectedSlotId: string;
  onSelectSlot: (slotId: string) => void;
};

export function VotingTimeFilter({
  chips,
  selectedSlotId,
  onSelectSlot,
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      accessibilityRole="scrollbar"
      accessibilityLabel="Time slot filters, scroll horizontally to see more"
    >
      {chips.map((chip) => {
        const isSelected = chip.slotId === selectedSlotId;

        return (
          <Pressable
            key={chip.slotId}
            onPress={() => onSelectSlot(chip.slotId)}
            style={({ pressed }) => [
              styles.chip,
              isSelected && styles.chipSelected,
              pressed && styles.chipPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Time slot ${chip.label}`}
            accessibilityHint={
              isSelected
                ? "Currently selected"
                : "Tap to filter activities for this time slot"
            }
            accessibilityState={{ selected: isSelected }}
          >
            {/* Icon is decorative — label on Pressable carries the meaning */}
            <View
              accessible={false}
              importantForAccessibility="no-hide-descendants"
            >
              <LocationIcon
                width={14}
                height={14}
                color={isSelected ? colors.nightBlack : colors.textMuted}
              />
            </View>

            <AppText
              variant="caption"
              style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}
              accessible={false}
            >
              {chip.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.sunsetPink,
    borderColor: colors.sunsetPink,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipLabel: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.sm,
  },
  chipLabelSelected: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
});