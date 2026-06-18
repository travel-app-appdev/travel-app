export const SESSION_EXPIRED = {
  title: "Session expired",
  message:
    "Your session has expired. Please sign in again to continue.",
  buttonLabel: "Sign in",
} as const;

export type UserFacingApiError = {
  title: string;
  message: string;
  isSessionExpired: boolean;
  buttonLabel?: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

export function isSessionExpiredError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("invalid token") ||
    message.includes("expired token") ||
    message.includes("invalid or expired token")
  );
}

export function getUserFacingApiError(
  error: unknown,
  contextTitle: string,
  fallbackMessage: string
): UserFacingApiError {
  if (isSessionExpiredError(error)) {
    return {
      title: SESSION_EXPIRED.title,
      message: SESSION_EXPIRED.message,
      isSessionExpired: true,
      buttonLabel: SESSION_EXPIRED.buttonLabel,
    };
  }

  const rawMessage = getErrorMessage(error);
  return {
    title: contextTitle,
    message: rawMessage || fallbackMessage,
    isSessionExpired: false,
  };
}
