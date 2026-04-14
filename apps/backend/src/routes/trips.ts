import { Router } from "express";
import { getMyTrips, createTrip, createTripWithoutAuth,joinTrip  } from "../controllers/tripsController";

const router = Router();

router.get("/my", getMyTrips);
router.post("/", createTrip);
router.post("/join", joinTrip);

// testing
router.post("/test-create", createTripWithoutAuth);

export default router;