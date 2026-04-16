import admin from "../config/firebase";
import { createUserProfile, upsertUserLogin } from "../repositories/authRepository";
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