import { Request, Response } from "express";
import { loginWithIdToken, registerUser } from "../services/authService";

export const login = async (req: Request, res: Response): Promise<void> => {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400).json({ error: "idToken is required" });
    return;
  }

  try {
    const user = await loginWithIdToken(idToken);
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password and name are required" });
    return;
  }

  try {
    const user = await registerUser({ email, password, name });
    res.status(201).json(user);
  } catch (error: any) {
    console.error("Registration error:", error.code, error.message);

    if (error.code === "auth/email-already-exists") {
      res.status(409).json({ error: "Email is already registered" });
    } else if (error.code === "auth/invalid-password") {
      res.status(400).json({ error: "Password must be at least 6 characters" });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};