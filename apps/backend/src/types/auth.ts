export type AuthUser = {
    uid: string;
    email: string | null;
    name: string | null;
};

export type RegisterUserInput = {
    email: string;
    password: string;
    name: string;
};

export type LoginWithTokenInput = {
    idToken: string;
};