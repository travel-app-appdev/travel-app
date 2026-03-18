import { PlaceholderScreen } from '@/src/components/common/placeholder-screen';

export default function JoinTripScreen() {
  return (
    <PlaceholderScreen
      title="Join Trip"
      description="Placeholder screen for joining an existing group trip by code or invitation link."
      primaryLink={{ href: '/questionnaire', label: 'Go to questionnaire' }}
    />
  );
}
