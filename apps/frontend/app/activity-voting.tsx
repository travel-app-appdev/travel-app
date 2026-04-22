import { PlaceholderScreen } from '@/src/components/common/placeholder-screen';

export default function ActivityVotingScreen() {
  return (
    <PlaceholderScreen
      title="Activity Voting"
      description="Placeholder screen for deciding which activities the group wants to include on the trip."
      primaryLink={{ href: '/itinerary', label: 'Open itinerary' }}
    />
  );
}
