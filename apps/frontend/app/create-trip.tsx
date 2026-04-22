import { PlaceholderScreen } from '@/src/components/common/placeholder-screen';

export default function CreateTripScreen() {
  return (
    <PlaceholderScreen
      title="Create Trip"
      description="Placeholder screen for setting up a new group trip with destination ideas, dates, and invited members."
      primaryLink={{ href: '/join-trip', label: 'Open join trip' }}
    />
  );
}
