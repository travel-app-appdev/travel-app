import { Router } from "express";
import {
    getMyTrips,
    createTrip,
    createTripWithoutAuth,
    joinTrip
} from "../controllers/tripsController";

const router = Router();

router.get("/my", getMyTrips);
router.post("/", createTrip);
router.post("/test-create", createTripWithoutAuth);
router.post("/join", joinTrip);

export default router;