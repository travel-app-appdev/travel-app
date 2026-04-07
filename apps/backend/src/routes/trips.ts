import { Router } from "express";
import { getMyTrips } from "../controllers/tripsController";

const router = Router();

router.get("/my", getMyTrips);

export default router;