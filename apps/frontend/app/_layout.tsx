import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerTitleAlign: 'center',
        }}>
        <Stack.Screen name="index" options={{ title: 'Home' }} />
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="register" options={{ title: 'Register' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="create-trip" options={{ title: 'Create Trip' }} />
        <Stack.Screen name="join-trip" options={{ title: 'Join Trip' }} />
        <Stack.Screen name="questionnaire" options={{ title: 'Questionnaire' }} />
        <Stack.Screen
          name="destination-voting"
          options={{ title: 'Destination Voting' }}
        />
        <Stack.Screen name="game" options={{ title: 'Game' }} />
        <Stack.Screen name="map-pins" options={{ title: 'Map Pins' }} />
        <Stack.Screen
          name="activity-voting"
          options={{ title: 'Activity Voting' }}
        />
        <Stack.Screen name="itinerary" options={{ title: 'Itinerary' }} />
        <Stack.Screen name="past-trips" options={{ title: 'Past Trips' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
