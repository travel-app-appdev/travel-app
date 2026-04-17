import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import type { TripDay } from "@/src/types/itinerary";

type Props = {
  days: TripDay[];
  selectedDayId: string;
  onSelectDay: (dayId: string) => void;
};

export function ItineraryDaySelector({
  days,
  selectedDayId,
  onSelectDay,
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {days.map((day) => {
        const isSelected = day.id === selectedDayId;

        return (
          <Pressable
            key={day.id}
            onPress={() => onSelectDay(day.id)}
            style={[styles.dayChip, isSelected && styles.dayChipSelected]}
            accessibilityRole="button"
            accessibilityLabel={`${day.dayNumber} ${day.weekdayShort}`}
            accessibilityState={{ selected: isSelected }}
          >
            <View style={styles.dayChipInner}>
              <AppText
                variant="body"
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                ]}
              >
                {day.dayNumber}
              </AppText>

              <AppText
                variant="caption"
                style={[styles.weekday, isSelected && styles.weekdaySelected]}
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
