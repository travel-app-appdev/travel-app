const API_URL = process.env.EXPO_PUBLIC_API_URL;

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export async function registerUser(payload: RegisterPayload) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Registration failed");
  }

  return data;
}

export async function loginWithToken(idToken: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Login failed");
  }

  return data;
}