import { PlaceholderScreen } from '@/src/components/common/placeholder-screen';

export default function RegisterScreen() {
  return (
    <PlaceholderScreen
      title="Register"
      description="Placeholder screen for creating an account for the trip planning app."
      primaryLink={{ href: '/profile', label: 'Continue to profile' }}
    />
  );
}
