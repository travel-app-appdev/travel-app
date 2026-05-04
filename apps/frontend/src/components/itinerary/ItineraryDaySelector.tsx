import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import type { TripDay } from "@/src/types/itinerary";

type Props = {
  days: TripDay[];
  selectedDayId: string;
  onSelectDay: (dayId: string) => void;
  enabledDayIds?: Set<string>;
};

export function ItineraryDaySelector({
  days,
  selectedDayId,
  onSelectDay,
  enabledDayIds,
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      accessibilityRole="scrollbar"
      accessibilityLabel={
        enabledDayIds !== undefined
          ? "Trip days with activities, scroll horizontally to see more"
          : "Trip days, scroll horizontally to see more"
      }
    >
      {days.map((day) => {
        const isSelected = day.id === selectedDayId;
        const isDisabled =
          enabledDayIds !== undefined && !enabledDayIds.has(day.id);

        return (
          <Pressable
            key={day.id}
            onPress={() => !isDisabled && onSelectDay(day.id)}
            style={[
              styles.dayChip,
              isSelected && styles.dayChipSelected,
              isDisabled && styles.dayChipDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Day ${day.dayNumber}, ${day.weekdayShort}${isDisabled ? ", no activities" : ""}`}
            accessibilityHint={
              isDisabled
                ? undefined
                : isSelected
                  ? "Currently selected"
                  : "Tap to view this day"
            }
            accessibilityState={{ selected: isSelected, disabled: isDisabled }}
            disabled={isDisabled}
          >
            <View
              style={styles.dayChipInner}
              accessible={false}
              importantForAccessibility="no-hide-descendants"
            >
              <AppText
                variant="body"
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                  isDisabled && styles.dayTextDisabled,
                ]}
              >
                {day.dayNumber}
              </AppText>

              <AppText
                variant="caption"
                style={[
                  styles.weekday,
                  isSelected && styles.weekdaySelected,
                  isDisabled && styles.dayTextDisabled,
                ]}
              >
                {day.weekdayShort}
              </AppText>
            </View>
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
  },
  dayChip: {
    minWidth: 58,
    minHeight: 58,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.nightBlack,
    backgroundColor: colors.lightWhite,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dayChipSelected: {
    backgroundColor: colors.beachYellow,
  },
  dayChipDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
    opacity: 0.45,
  },
  dayChipInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
  },
  dayNumberSelected: {
    color: colors.textPrimary,
  },
  dayTextDisabled: {
    color: colors.textMuted,
  },
  weekday: {
    color: colors.textPrimary,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontFamily: typography.fontFamily.body,
  },
  weekdaySelected: {
    color: colors.textPrimary,
  },
});