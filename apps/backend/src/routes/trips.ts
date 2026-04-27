import { Router } from "express";
import {
    getMyTrips,
    createTrip,
    createTripWithoutAuth,
    joinTrip,
    deleteTrip,
    leaveTrip,
    removeMember,
    finishPlanning
} from "../controllers/tripsController";
import { getItineraryController } from "../controllers/itineraryController";

const router = Router();

router.get("/my", getMyTrips);
router.post("/", createTrip);
router.post("/test-create", createTripWithoutAuth);
router.post("/join", joinTrip);
router.get("/:id/itinerary", getItineraryController);
router.delete("/:tripId", deleteTrip);
router.post("/:tripId/leave", leaveTrip);
router.delete("/:tripId/members/:memberId", removeMember);
router.post("/:tripId/finish-planning", finishPlanning);

export default router;