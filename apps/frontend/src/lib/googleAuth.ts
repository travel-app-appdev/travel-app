import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import {
  GoogleAuthProvider,
  getAdditionalUserInfo,
  signInWithCredential,
} from "firebase/auth";
import { auth } from "./firebase";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleLogin() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId:
      "176497650369-45dh080k3i8jv041mv9aov1j6u02gj0p.apps.googleusercontent.com",
    webClientId:
      "176497650369-0tdfoggthmj01c254gjpslvqri5c6tmh.apps.googleusercontent.com",
  });

  async function signInWithGoogleToken(googleIdToken: string) {
    const credential = GoogleAuthProvider.credential(googleIdToken);
    const result = await signInWithCredential(auth, credential);
    const firebaseIdToken = await result.user.getIdToken();
    const isNewUser = getAdditionalUserInfo(result)?.isNewUser ?? false;

    return {
      firebaseIdToken,
      firebaseUser: result.user,
      isNewUser,
    };
  }

  return {
    request,
    response,
    promptAsync,
    signInWithGoogleToken,
  };
}
