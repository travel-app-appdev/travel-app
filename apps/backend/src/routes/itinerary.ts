import { Router } from "express";
import { generateItineraryController } from "../controllers/itineraryController";
import {
    createActivity,
    getActivities,
    getFinalItineraryActivities,
    toggleAttendance,
    voteActivity,
} from "../controllers/activityController";


const router = Router();

router.post("/:tripId/generate", generateItineraryController);
router.get("/:tripId/final", getFinalItineraryActivities);
router.post("/:tripId/slots/:slotId/activities", createActivity);
router.get("/:tripId/slots/:slotId/activities", getActivities);
router.post("/:tripId/slots/:slotId/votes", voteActivity);
router.post("/:tripId/slots/:slotId/attendance", toggleAttendance);

export default router;
