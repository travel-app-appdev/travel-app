import { Router } from "express";
import { login, register } from "../controllers/authController";

const router = Router();

// When frontend sends POST to /auth/login, run the login function
router.post("/login", login);
router.post("/register", register);  

export default router;