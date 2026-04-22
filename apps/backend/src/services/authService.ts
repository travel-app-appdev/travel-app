// src/services/authService.ts
import admin from "../config/firebase";
import {
    createUserProfile,
    upsertUserLogin,
    updateUserProfileInFirestore,
} from "../repositories/authRepository";
import { AuthUser, RegisterUserInput } from "../types/auth";

export async function loginWithIdToken(idToken: string): Promise<AuthUser> {
    const decoded = await admin.auth().verifyIdToken(idToken);

    const user: AuthUser = {
        uid: decoded.uid,
        email: decoded.email ?? null,
        name: decoded.name ?? null,
    };

    await upsertUserLogin(user);

    return user;
}

export async function registerUser(input: RegisterUserInput): Promise<AuthUser> {
    const userRecord = await admin.auth().createUser({
        email: input.email,
        password: input.password,
        displayName: input.name,
    });

    const user: AuthUser = {
        uid: userRecord.uid,
        email: userRecord.email ?? null,
        name: input.name,
    };

    await createUserProfile({
        uid: user.uid,
        email: user.email,
        name: input.name,
    });

    return user;
}

export async function updateUserProfile(input: {
    idToken: string;
    name?: string;
    email?: string;
}): Promise<AuthUser> {
    const decoded = await admin.auth().verifyIdToken(input.idToken);
    const uid = decoded.uid;

    // Build Firebase Auth update payload
    const authUpdate: { displayName?: string; email?: string } = {};
    if (input.name !== undefined) authUpdate.displayName = input.name;
    if (input.email !== undefined) authUpdate.email = input.email;

    // Update Firebase Auth user record
    const updatedRecord = await admin.auth().updateUser(uid, authUpdate);

    // Update Firestore users document
    await updateUserProfileInFirestore({
        uid,
        name: input.name,
        email: input.email,
    });

    return {
        uid,
        email: updatedRecord.email ?? null,
        name: updatedRecord.displayName ?? null,
    };
}