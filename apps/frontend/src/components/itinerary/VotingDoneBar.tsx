import { colors, radius } from "@/src/theme";
import { ItineraryDoneBar } from "@/src/components/itinerary/ItineraryDoneBar";

type Props = {
  checked: boolean;
  disabled?: boolean;
  onPress: () => void;
  onInfoPress: () => void;
};

export function VotingDoneBar({
  checked,
  disabled = false,
  onPress,
  onInfoPress,
}: Props) {
  return (
    <ItineraryDoneBar
      label="Submit Voting"
      checked={checked}
      disabled={disabled}
      accentColor={colors.sunsetPink}
      shadowColor={colors.sunsetPink}
      shadow={`0px -10px ${radius.lg}px rgba(229, 130, 251, 0.18)`}
      accessibilityLabel="End voting for everyone"
      accessibilityCheckedLabel="Voting is being submitted"
      infoAccessibilityLabel="Show voting done info"
      accessibilityRole="button"
      onPress={onPress}
      onInfoPress={onInfoPress}
    />
  );
}
