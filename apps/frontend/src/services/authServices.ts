// apps/frontend/src/services/authServices.ts
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/src/lib/firebase";
import { registerUser } from "@/src/api/auth";

export async function handleRegister(
  name: string,
  email: string,
  password: string
) {
  await registerUser({
    name,
    email,
    password,
  });

  const credential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await credential.user.getIdToken();

  return {
    uid: credential.user.uid,
    email: credential.user.email,
    name: credential.user.displayName ?? name,
    idToken,
  };
}

export async function handleLogin(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await credential.user.getIdToken();

  return {
    uid: credential.user.uid,
    email: credential.user.email,
    name: credential.user.displayName ?? null,
    idToken,
  };
}
