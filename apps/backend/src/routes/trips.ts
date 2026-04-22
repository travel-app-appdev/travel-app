// src/routes/trips.ts
import { Router } from "express";
import {
    getMyTrips,
    createTrip,
    createTripWithoutAuth,
    joinTrip,
    deleteTrip,
    leaveTrip,
} from "../controllers/tripsController";

const router = Router();

router.get("/my", getMyTrips);
router.post("/", createTrip);
router.post("/test-create", createTripWithoutAuth);
router.post("/join", joinTrip);
router.delete("/:tripId", deleteTrip);
router.post("/:tripId/leave", leaveTrip);

export default router;