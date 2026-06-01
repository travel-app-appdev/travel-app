import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import ArrowUp from "@/assets/icons/arrow_up.svg";
import ArrowDown from "@/assets/icons/arrow_down.svg";
import { AppText } from "@/src/components/common/AppText";
import { FinalSlotCard } from "@/src/components/itinerary/FinalSlotCard";
import { colors, radius, spacing } from "@/src/theme";
import type { Activity } from "@/src/types/itinerary";

type Props = {
  slotLabel: string;
  activities: Activity[];
  onJoinGroup: (activityId: string) => void;
  onPressDetails: (activity: Activity, slotLabel: string) => void;
  accentColor?: string;
};

export function FinalSuggestedActivitiesSection({
  slotLabel,
  activities,
  onJoinGroup,
  onPressDetails,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!activities || activities.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Pressable
        style={styles.toggle}
        onPress={() => setExpanded((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={
          expanded
            ? "Hide other suggested activities"
            : "Show other suggested activities"
        }
        accessibilityState={{ expanded }}
      >
        <View style={styles.left}>
          <AppText variant="body" style={styles.title}>
            Other suggested activities
          </AppText>
        </View>

        <View style={styles.iconWrapper}>
          {expanded ? (
            <ArrowUp width={24} height={24} />
          ) : (
            <ArrowDown width={24} height={24} />
          )}
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.list}>
          {activities.map((activity) => (
            <FinalSlotCard
              key={activity.id}
              slot={{ id: activity.slotId, label: slotLabel }}
              activity={activity}
              onJoinGroup={onJoinGroup}
              onPressDetails={onPressDetails}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  toggle: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.nightBlack,
    borderRadius: radius.sm,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: spacing.md,
  },
  title: {
    color: colors.nightBlack,
    flexShrink: 1,
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.xs,
  },
  list: {
    gap: spacing.sm,
  },
});
