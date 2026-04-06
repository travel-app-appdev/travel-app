import { PlaceholderScreen } from '@/src/components/common/placeholder-screen';

export default function HomeScreen() {
  return (
    <PlaceholderScreen
      title="Welcome"
      description="This is the clean starting point for your student group trip planning app. Use this screen as the landing page for navigation into auth and trip features."
      primaryLink={{ href: '/login', label: 'Go to login' }}
    />
  );
}
