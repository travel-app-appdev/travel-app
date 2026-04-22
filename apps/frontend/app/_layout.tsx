// app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { BagelFatOne_400Regular } from "@expo-google-fonts/bagel-fat-one";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";
import { View, ActivityIndicator } from "react-native";
import { AuthProvider } from "@/src/context/AuthContext";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BagelFatOne_400Regular,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: "Home" }} />
        <Stack.Screen name="login" options={{ title: "Login" }} />
        <Stack.Screen name="register" options={{ title: "Register" }} />
        <Stack.Screen name="home" options={{ title: "Home" }} />
        <Stack.Screen name="profile" options={{ title: "Profile" }} />
        <Stack.Screen name="create-trip" options={{ title: "Create Trip" }} />
        <Stack.Screen name="join-trip" options={{ title: "Join Trip" }} />
        {/* <Stack.Screen name="settings" options={{ title: "Settings" }} /> */}
        <Stack.Screen name="trip-settings" options={{ title: "Trip Settings" }} />
        <Stack.Screen name="trip-information" options={{ title: "Trip Information" }} />
        <Stack.Screen
          name="questionnaire"
          options={{ title: "Questionnaire" }}
        />
        <Stack.Screen
          name="destination-voting"
          options={{ title: "Destination Voting" }}
        />
        <Stack.Screen name="game" options={{ title: "Game" }} />
        <Stack.Screen name="map-pins" options={{ title: "Map Pins" }} />
        <Stack.Screen
          name="activity-voting"
          options={{ title: "Activity Voting" }}
        />
        <Stack.Screen name="itinerary" options={{ title: "Itinerary" }} />
        <Stack.Screen name="past-trips" options={{ title: "Past Trips" }} />
        <Stack.Screen name="add-activity" options={{ title: "Add Activity" }} />
      </Stack>
      <StatusBar style="dark" />
    </AuthProvider>
  );
}