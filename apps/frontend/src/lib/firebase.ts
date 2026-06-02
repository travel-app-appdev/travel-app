// apps/frontend/src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCQ2WK29B0IejbYVLKDr-S7r0MOuNM3sCk",
  authDomain: "travel-app-66233.firebaseapp.com",
  projectId: "travel-app-66233",
  storageBucket: "travel-app-66233.firebasestorage.app",
  messagingSenderId: "176497650369",
  appId: "1:176497650369:web:1d181c125bac6a66ca8240",
  measurementId: "G-TP2R4EX5JL",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

if (__DEV__ && process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", {
    disableWarnings: true,
  });

  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
