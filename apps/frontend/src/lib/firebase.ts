// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCQ2WK29B0IejbYVLKDr-S7r0MOuNM3sCk",
  authDomain: "travel-app-66233.firebaseapp.com",
  projectId: "travel-app-66233",
  storageBucket: "travel-app-66233.firebasestorage.app",
  messagingSenderId: "176497650369",
  appId: "1:176497650369:web:1d181c125bac6a66ca8240",
  measurementId: "G-TP2R4EX5JL"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
