// src/api/auth.ts
const API_URL = process.env.EXPO_PUBLIC_API_URL;

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type AuthResponse = {
  uid: string;
  email: string | null;
  name: string | null;
};

type ApiErrorResponse = {
  error?: string;
};

export async function registerUser(
    payload: RegisterPayload
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data: AuthResponse | ApiErrorResponse = await response.json();

  if (!response.ok) {
    throw new Error((data as ApiErrorResponse).error || "Registration failed");
  }

  return data as AuthResponse;
}

export async function loginWithToken(
    idToken: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  const data: AuthResponse | ApiErrorResponse = await response.json();

  if (!response.ok) {
    throw new Error((data as ApiErrorResponse).error || "Login failed");
  }

  return data as AuthResponse;
}