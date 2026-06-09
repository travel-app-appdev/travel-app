import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function registerForPushNotifications(
  idToken: string
): Promise<void> {
  // Push notifications don't work on the web or in simulators without
  // physical device credentials, so we bail out silently.
  if (Platform.OS === "web") return;

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      // User declined — respect their choice, don't throw
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
    // Never let notification registration break the login flow
    console.warn("[notifications] registerForPushNotifications failed:", error);
  }
}

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
