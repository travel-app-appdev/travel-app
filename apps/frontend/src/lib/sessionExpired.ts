import { router } from "expo-router";

import { auth } from "@/src/lib/firebase";

export async function redirectToLogin(
  setUser?: (user: null) => void,
  setIdToken?: (token: null) => void
): Promise<void> {
  try {
    await auth.signOut();
  } catch {
    // Still clear local state even if sign-out fails.
  }

  setUser?.(null);
  setIdToken?.(null);
  router.replace("/login");
}
