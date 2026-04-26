// apps/backend/src/repositories/authRepository.ts
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

export async function updateUserProfileInFirestore(data: {
    uid: string;
    name?: string;
    email?: string;
}) {
    const userRef = admin.firestore().collection("users").doc(data.uid);

    const updates: Record<string, string> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.email !== undefined) updates.email = data.email;

    await userRef.set(updates, { merge: true });
}