import { Router } from "express";
import { generateItineraryController } from "../controllers/itineraryController";

const router = Router();

router.post("/:tripId/generate", generateItineraryController);

export default router;