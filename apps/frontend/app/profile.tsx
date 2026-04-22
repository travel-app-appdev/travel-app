import { PlaceholderScreen } from '@/src/components/common/placeholder-screen';

export default function ProfileScreen() {
  return (
    <PlaceholderScreen
      title="Profile"
      description="Placeholder screen for traveler details, preferences, and account information."
      primaryLink={{ href: '/create-trip', label: 'Create a trip' }}
    />
  );
}
