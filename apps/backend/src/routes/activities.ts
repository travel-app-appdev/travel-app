import { Router } from "express";
import { updateActivity } from "../controllers/activityController";

const router = Router();

router.patch("/:activityId", updateActivity);

export default router;
