import { Router } from "express";
import { generateItineraryController } from "../controllers/itineraryController";
import { createActivity, getActivities } from "../controllers/activityController";


const router = Router();

router.post("/:tripId/generate", generateItineraryController);
router.post("/:tripId/slots/:slotId/activities", createActivity);
router.get("/:tripId/slots/:slotId/activities", getActivities);

export default router;