import { colors, radius } from "@/src/theme";
import { ItineraryDoneBar } from "@/src/components/itinerary/ItineraryDoneBar";

type Props = {
  checked: boolean;
  disabled?: boolean;
  dimSurroundings?: boolean;
  onPress: () => void;
  onInfoPress: () => void;
};

export function PlanningDoneBar({
  checked,
  disabled = false,
  dimSurroundings = false,
  onPress,
  onInfoPress,
}: Props) {
  return (
    <ItineraryDoneBar
      label="Planning done"
      checked={checked}
      disabled={disabled}
      dimSurroundings={dimSurroundings}
      accentColor={colors.beachYellow}
      shadowColor={colors.sunsetOrange}
      shadow={`0px 10px ${radius.xl}px rgba(247, 118, 70, 0.45)`}
      accessibilityLabel="Mark planning as done"
      accessibilityCheckedLabel="Mark planning as not done"
      infoAccessibilityLabel="Show planning done info"
      accessibilityRole="checkbox"
      onPress={onPress}
      onInfoPress={onInfoPress}
    />
  );
}
