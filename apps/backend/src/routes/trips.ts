import { Router } from "express";
import {
    getMyTrips,
    createTrip,
    createTripWithoutAuth,
    joinTrip,
    deleteTrip,
    leaveTrip,
    removeMember,
    finishPlanning,
    finishVoting,
    updateTrip,
    getTripPreviewByCode,
} from "../controllers/tripsController";
import { getItineraryController } from "../controllers/itineraryController";

const router = Router();

router.get("/my", getMyTrips);
router.post("/", createTrip);
router.post("/test-create", createTripWithoutAuth);
router.post("/join", joinTrip);

// ── Public: preview a trip by invite code (no auth)
router.get("/invite/:inviteCode", getTripPreviewByCode);

router.get("/:id/itinerary", getItineraryController);
router.patch("/:tripId", updateTrip);
router.delete("/:tripId", deleteTrip);
router.post("/:tripId/leave", leaveTrip);
router.delete("/:tripId/members/:memberId", removeMember);
router.post("/:tripId/finish-planning", finishPlanning);
router.post("/:tripId/finish-voting", finishVoting);

export default router;