import { Router } from "express";
import {
    getMyTrips,
    createTrip,
    createTripWithoutAuth,
    joinTrip
} from "../controllers/tripsController";
import { getItineraryController } from "../controllers/itineraryController";

const router = Router();

router.get("/my", getMyTrips);
router.post("/", createTrip);
router.post("/test-create", createTripWithoutAuth);
router.post("/join", joinTrip);
router.get("/:id/itinerary", getItineraryController);

export default router;