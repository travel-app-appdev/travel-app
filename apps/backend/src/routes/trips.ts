import { NextFunction, Request, Response, Router } from "express";
import multer from "multer";
import {
  getMyTrips,
  getTrip,
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
import {
  createMemory,
  deleteMemory,
  getMemories,
  getMemoryFile,
} from "../controllers/memoriesController";
import { getItineraryController } from "../controllers/itineraryController";
import { getSuggestionsController, updatePreferencesController, getPreferencesController } from "../controllers/suggestionsController";

const router = Router();
const memoriesUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024,
    files: 1,
  },
});

function uploadSingleMemoryPhoto(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  memoriesUpload.single("photo")(req, res, (error: any) => {
    if (!error) {
      next();
      return;
    }

    if (
      error instanceof multer.MulterError &&
      error.code === "LIMIT_FILE_SIZE"
    ) {
      res.status(400).json({ error: "Photo must be 1 MB or smaller" });
      return;
    }

    res.status(400).json({ error: "Could not read uploaded photo" });
  });
}

router.get("/my", getMyTrips);
router.post("/", createTrip);
router.post("/test-create", createTripWithoutAuth);
router.post("/join", joinTrip);

// ── Public: preview a trip by invite code (no auth)
router.get("/invite/:inviteCode", getTripPreviewByCode);

router.get("/:tripId", getTrip);
router.get("/:id/itinerary", getItineraryController);
router.get("/:tripId/memories", getMemories);
router.post("/:tripId/memories", uploadSingleMemoryPhoto, createMemory);
router.delete("/:tripId/memories/:memoryId", deleteMemory);
router.get("/:tripId/memories/:memoryId/file", getMemoryFile);
router.patch("/:tripId", updateTrip);
router.delete("/:tripId", deleteTrip);
router.post("/:tripId/leave", leaveTrip);
router.delete("/:tripId/members/:memberId", removeMember);
router.post("/:tripId/finish-planning", finishPlanning);
router.post("/:tripId/finish-voting", finishVoting);
router.get("/:tripId/members/me/preferences", getPreferencesController);
router.patch("/:tripId/members/me/preferences", updatePreferencesController);
router.get("/:tripId/suggestions", getSuggestionsController);

export default router;
