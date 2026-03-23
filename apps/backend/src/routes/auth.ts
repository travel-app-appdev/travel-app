import { Router } from "express";
import { login } from "../controllers/authController";

const router = Router();

// When frontend sends POST to /auth/login, run the login function
router.post("/login", login);

export default router;