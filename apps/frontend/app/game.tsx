// apps/frontend/app/game.tsx
import { PlaceholderScreen } from "@/src/components/common/PlaceholderScreen";

export default function GameScreen() {
  return (
    <PlaceholderScreen
      title="Game"
      description="Placeholder screen for lightweight group game mechanics or icebreakers during planning."
      primaryLink={{ href: "/map-pins", label: "Open map pins" }}
    />
  );
}
