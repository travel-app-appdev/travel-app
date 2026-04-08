import { Router } from "express";
import { getMyTrips, createTrip } from "../controllers/tripsController";

const router = Router();

router.get("/my", getMyTrips);
router.post("/", createTrip);

export default router;