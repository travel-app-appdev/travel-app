import { Request, Response } from "express";
import admin from '../config/firebase.js';

export const login = async (req: Request, res: Response): Promise<void> => {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400).json({ error: "idToken is required" });
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);

    const userRef = admin.firestore().collection("users").doc(decoded.uid);
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

// Register with email + password
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password and name are required" });
    return;
  }

  try {
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Save user document in Firestore
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      name: name,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    });

    res.status(201).json({
      uid: userRecord.uid,
      email: userRecord.email,
      name: name,
    });
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