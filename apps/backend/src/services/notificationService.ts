const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

type ExpoMessage = {
    to: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    sound?: "default" | null;
};

/**
 * Sends push notifications to one or more Expo push tokens.
 * Silently ignores empty token lists and logs errors without throwing,
 * so a notification failure never breaks the main request flow.
 */
export async function sendPushNotifications(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>
): Promise<void> {
    const validTokens = tokens.filter(
        (t) => typeof t === "string" && t.startsWith("ExponentPushToken[")
    );

    if (validTokens.length === 0) return;

    const messages: ExpoMessage[] = validTokens.map((token) => ({
        to: token,
        title,
        body,
        sound: "default",
        ...(data ? { data } : {}),
    }));

    try {
        const response = await fetch(EXPO_PUSH_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(messages),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("[notifications] Expo push API error:", text);
        }
    } catch (error) {
        console.error("[notifications] Failed to send push notifications:", error);
    }
}