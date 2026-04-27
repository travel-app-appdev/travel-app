// apps/backend/src/dtos/authDtos.ts
export type LoginRequestDto = {
    idToken: string;
};

export type RegisterRequestDto = {
    email: string;
    password: string;
    name: string;
};

export type AuthResponseDto = {
    uid: string;
    email: string | null;
    name: string | null;
};