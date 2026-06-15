import { colors, radius } from "@/src/theme";
import { ItineraryDoneBar } from "@/src/components/itinerary/ItineraryDoneBar";

type Props = {
  checked: boolean;
  disabled?: boolean;
  onPress: () => void;
  onInfoPress: () => void;
};

export function PlanningDoneBar({
  checked,
  disabled = false,
  onPress,
  onInfoPress,
}: Props) {
  return (
    <ItineraryDoneBar
      label="Planning done"
      checked={checked}
      disabled={disabled}
      docked
      accentColor={colors.beachYellow}
      shadowColor={colors.sunsetOrange}
      shadow={`0px -10px ${radius.lg}px rgba(255, 107, 53, 0.15)`}
      accessibilityLabel="Mark planning as done"
      accessibilityCheckedLabel="Mark planning as not done"
      infoAccessibilityLabel="Show planning done info"
      accessibilityRole="checkbox"
      onPress={onPress}
      onInfoPress={onInfoPress}
    />
  );
}
