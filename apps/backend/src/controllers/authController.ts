import { Request, Response } from "express";
import admin from "../config/firebase";

export const login = async (req: Request, res: Response): Promise<void> => {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400).json({ error: "idToken is required" });
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);

    const userRef = admin.firestore().collection("users").doc(decoded.uid);
    
    // merge: true prevents overwriting existing user data
    await userRef.set(
      {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name ?? null,
        lastLogin: new Date().toISOString(),
      },
      { merge: true }
    );

    res.json({
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name ?? null,
    });

  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};