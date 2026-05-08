// src/hooks/useSinglePress.ts
import { useCallback } from "react";
import { PressLock } from "@/src/utils/PressLock";

export function useSinglePress(
  onPress: (() => void) | (() => Promise<void>),
  delay = 500
): () => void {
  return useCallback(() => {
    if (!PressLock.acquire()) return;
    Promise.resolve()
      .then(() => onPress())
      .finally(() => {
        setTimeout(() => PressLock.release(), delay);
      });
  }, [onPress, delay]);
}