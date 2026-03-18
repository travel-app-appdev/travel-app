import { PlaceholderScreen } from '@/src/components/common/placeholder-screen';

export default function ItineraryScreen() {
  return (
    <PlaceholderScreen
      title="Itinerary"
      description="Placeholder screen for the trip timeline, daily schedule, and planning overview."
      primaryLink={{ href: '/past-trips', label: 'Open past trips' }}
    />
  );
}
