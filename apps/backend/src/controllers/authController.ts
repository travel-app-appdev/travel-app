import { Request, Response } from "express";
import { loginWithIdToken, registerUser, updateUserProfile } from "../services/authService";
import admin from "../config/firebase";
import { saveExpoPushToken } from "../repositories/tripsRepository";

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

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const { idToken, name, email } = req.body;

  if (!idToken) {
    res.status(400).json({ error: "idToken is required" });
    return;
  }

  if (!name && !email) {
    res.status(400).json({ error: "At least one of name or email is required" });
    return;
  }

  try {
    const user = await updateUserProfile({ idToken, name, email });
    res.json(user);
  } catch (error: any) {
    console.error("Update profile error:", error.code, error.message);

    if (error.code === "auth/email-already-exists") {
      res.status(409).json({ error: "Email is already in use" });
    } else if (error.code === "auth/invalid-email") {
      res.status(400).json({ error: "Invalid email address" });
    } else {
      res.status(401).json({ error: "Invalid token or failed to update profile" });
    }
  }
};

export const savePushToken = async (req: Request, res: Response): Promise<void> => {
  const { idToken, expoPushToken } = req.body;

  if (!idToken || !expoPushToken) {
    res.status(400).json({ error: "idToken and expoPushToken are required" });
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    await saveExpoPushToken(decoded.uid, expoPushToken);
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("savePushToken error:", error);
    res.status(500).json({ error: "Failed to save push token" });
  }
};