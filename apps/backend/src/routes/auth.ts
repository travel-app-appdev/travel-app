// apps/backend/src/routes/auth.ts
import { Router } from "express";
import { login, register, updateProfile } from "../controllers/authController";

const router = Router();

router.post("/login", login);
router.post("/register", register);
router.patch("/profile", updateProfile);

export default router;