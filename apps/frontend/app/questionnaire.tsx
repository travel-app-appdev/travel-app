import { PlaceholderScreen } from '@/src/components/common/placeholder-screen';

export default function QuestionnaireScreen() {
  return (
    <PlaceholderScreen
      title="Questionnaire"
      description="Placeholder screen for collecting trip preferences from each student in the group."
      primaryLink={{ href: '/destination-voting', label: 'Open destination voting' }}
    />
  );
}
