import { Router } from "express";
import { login, register, updateProfile, savePushToken } from "../controllers/authController";

const router = Router();

router.post("/login", login);
router.post("/register", register);
router.patch("/profile", updateProfile);
router.post("/push-token", savePushToken);

export default router;