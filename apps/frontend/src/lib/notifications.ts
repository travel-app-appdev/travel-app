import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export async function registerForPushNotifications(
  idToken: string
): Promise<void> {
  if (Platform.OS === "web") return;
  if (isExpoGo) return; // not supported in Expo Go since SDK 53

  try {
    const Notifications = await import("expo-notifications");

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const expoPushToken = tokenData.data;

    await fetch(`${API_URL}/auth/push-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, expoPushToken }),
    });
  } catch (error) {
    console.warn("[notifications] registerForPushNotifications failed:", error);
  }
}

export function configureNotificationHandler(): void {
  if (isExpoGo) return; // not supported in Expo Go since SDK 53

  import("expo-notifications").then((Notifications) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  });
}