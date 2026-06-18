import { useCallback, useRef, useState } from "react";

import { FeedbackModal } from "@/src/components/common/FeedbackModal";
import { useAuth } from "@/src/context/AuthContext";
import { getUserFacingApiError } from "@/src/lib/apiErrors";
import { redirectToLogin } from "@/src/lib/sessionExpired";
import { colors } from "@/src/theme";

type ShowFeedbackOptions = {
  buttonLabel?: string;
  buttonColor?: string;
  onClose?: () => void;
};

export function useApiFeedbackModal(
  defaultButtonColor: string = colors.beachYellow
) {
  const { setUser, setIdToken } = useAuth();
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [buttonLabel, setButtonLabel] = useState("Okay");
  const [buttonColor, setButtonColor] = useState(defaultButtonColor);
  const onCloseRef = useRef<(() => void) | null>(null);
  const sessionExpiredRef = useRef(false);

  const closeFeedback = useCallback(() => {
    setVisible(false);

    const customOnClose = onCloseRef.current;
    onCloseRef.current = null;

    if (sessionExpiredRef.current) {
      sessionExpiredRef.current = false;
      void redirectToLogin(setUser, setIdToken);
      return;
    }

    customOnClose?.();
  }, [setIdToken, setUser]);

  const showFeedback = useCallback(
    (
      nextTitle: string,
      nextMessage: string,
      options: ShowFeedbackOptions = {}
    ) => {
      sessionExpiredRef.current = false;
      setTitle(nextTitle);
      setMessage(nextMessage);
      setButtonLabel(options.buttonLabel ?? "Okay");
      setButtonColor(options.buttonColor ?? defaultButtonColor);
      onCloseRef.current = options.onClose ?? null;
      setVisible(true);
    },
    [defaultButtonColor]
  );

  const showApiError = useCallback(
    (error: unknown, contextTitle: string, fallbackMessage: string) => {
      const resolved = getUserFacingApiError(
        error,
        contextTitle,
        fallbackMessage
      );

      sessionExpiredRef.current = resolved.isSessionExpired;
      setTitle(resolved.title);
      setMessage(resolved.message);
      setButtonLabel(resolved.buttonLabel ?? "Okay");
      setButtonColor(defaultButtonColor);
      onCloseRef.current = null;
      setVisible(true);
    },
    [defaultButtonColor]
  );

  const feedbackModal = (
    <FeedbackModal
      visible={visible}
      title={title}
      message={message}
      buttonLabel={buttonLabel}
      buttonColor={buttonColor}
      onClose={closeFeedback}
    />
  );

  return { showFeedback, showApiError, feedbackModal };
}
