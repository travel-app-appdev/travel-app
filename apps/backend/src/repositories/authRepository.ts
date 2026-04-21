// src/repositories/authRepository.ts
import admin from "../config/firebase";

export async function upsertUserLogin(data: {
    uid: string;
    email: string | null;
    name: string | null;
}) {
    const userRef = admin.firestore().collection("users").doc(data.uid);

    await userRef.set(
        {
            uid: data.uid,
            email: data.email,
            name: data.name,
            lastLogin: new Date().toISOString(),
        },
        { merge: true }
    );
}

export async function createUserProfile(data: {
    uid: string;
    email: string | null;
    name: string;
}) {
    const userRef = admin.firestore().collection("users").doc(data.uid);

    await userRef.set({
        uid: data.uid,
        email: data.email,
        name: data.name,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
    });
}