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
  message?: string;
  code?: string;
};

type AuthApiError = Error & {
  response?: {
    status: number;
    data: AuthResponse | ApiErrorResponse;
  };
  code?: string;
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
    const error = new Error(
      (data as ApiErrorResponse).message ||
        (data as ApiErrorResponse).error ||
        "Registration failed"
    ) as AuthApiError;

    error.response = {
      status: response.status,
      data,
    };
    error.code = (data as ApiErrorResponse).code;

    throw error;
  }

  return data as AuthResponse;
}

export async function loginWithToken(idToken: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  const data: AuthResponse | ApiErrorResponse = await response.json();

  if (!response.ok) {
    const error = new Error(
      (data as ApiErrorResponse).message ||
        (data as ApiErrorResponse).error ||
        "Login failed"
    ) as AuthApiError;

    error.response = {
      status: response.status,
      data,
    };
    error.code = (data as ApiErrorResponse).code;

    throw error;
  }

  return data as AuthResponse;
}

type UpdateProfilePayload = {
  idToken: string;
  name?: string;
  email?: string;
};

export async function updateProfile(
  payload: UpdateProfilePayload
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data: AuthResponse | ApiErrorResponse = await response.json();

  if (!response.ok) {
    throw new Error(
      (data as ApiErrorResponse).error || "Failed to update profile"
    );
  }

  return data as AuthResponse;
}
