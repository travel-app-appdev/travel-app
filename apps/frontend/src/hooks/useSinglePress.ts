// src/hooks/useSinglePress.ts
import { useCallback, useRef } from "react";

export function useSinglePress(
  onPress: (() => void) | (() => Promise<void>),
  delay = 500
): () => void {
  const isLockedRef = useRef(false);

  return useCallback(() => {
    if (isLockedRef.current) return;
    isLockedRef.current = true;

    const release = () => {
      const timeout = setTimeout(() => {
        isLockedRef.current = false;
      }, delay) as ReturnType<typeof setTimeout> & { unref?: () => void };
      timeout.unref?.();
    };

    try {
      const result = onPress();
      Promise.resolve(result).finally(release);
    } catch (error) {
      release();
      throw error;
    }
  }, [onPress, delay]);
}
