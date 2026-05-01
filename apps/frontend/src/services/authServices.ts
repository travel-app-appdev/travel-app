// apps/frontend/src/services/authServices.ts
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/src/lib/firebase";
import { loginWithToken, registerUser } from "@/src/api/auth";

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
  const backendUser = await loginWithToken(idToken);

  return { ...backendUser, idToken };
}

export async function handleLogin(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await credential.user.getIdToken();
  const backendUser = await loginWithToken(idToken);

  return { ...backendUser, idToken };
}