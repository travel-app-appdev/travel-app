import { PlaceholderScreen } from '@/src/components/common/placeholder-screen';

export default function LoginScreen() {
  return (
    <PlaceholderScreen
      title="Login"
      description="Placeholder screen for user sign in. Authentication logic can be added later without changing the route structure."
      primaryLink={{ href: '/register', label: 'Need an account? Register' }}
    />
  );
}
