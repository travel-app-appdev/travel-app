import { Request, Response } from "express";
import {
    suggestActivity,
    getCandidateActivities,
    getFinalActivities,
    toggleFinalActivityAttendance,
    updateSuggestedActivity,
    voteForActivity,
} from "../services/activityService";

export const createActivity = async (req: Request, res: Response): Promise<void> => {
    const tripId = String(req.params.tripId);
    const slotId = String(req.params.slotId);
    const { idToken, name, description, address, googleMapsUrl } = req.body;

    if (!idToken) {
        res.status(400).json({ error: "idToken is required" });
        return;
    }

    if (!name) {
        res.status(400).json({ error: "name is required" });
        return;
    }

    try {
        const activity = await suggestActivity(tripId, slotId, {
            idToken,
            name,
            description,
            address,
            googleMapsUrl,
        });
        res.status(201).json(activity);
    } catch (error: any) {
        if (error.status === 404) {
            res.status(404).json({ error: error.message });
        } else if (error.status === 400) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(401).json({ error: "Invalid token or failed to create activity" });
        }
    }
};

export const updateActivity = async (req: Request, res: Response): Promise<void> => {
    const activityId = String(req.params.activityId);
    const { idToken, name, description, address, googleMapsUrl } = req.body;

    if (!idToken) {
        res.status(400).json({ error: "idToken is required" });
        return;
    }

    if (!name) {
        res.status(400).json({ error: "name is required" });
        return;
    }

    try {
        const activity = await updateSuggestedActivity(activityId, {
            idToken,
            name,
            description,
            address,
            googleMapsUrl,
        });
        res.status(200).json(activity);
    } catch (error: any) {
        if (error.status === 404) {
            res.status(404).json({ error: error.message });
        } else if (error.status === 400) {
            res.status(400).json({ error: error.message });
        } else if (error.status === 403) {
            res.status(403).json({ error: error.message });
        } else {
            res.status(401).json({ error: "Invalid token or failed to update activity" });
        }
    }
};

export const getActivities = async (req: Request, res: Response): Promise<void> => {
    const tripId = String(req.params.tripId);
    const slotId = String(req.params.slotId);
    const userId = req.query.userId as string | undefined;

    try {
        const activities = await getCandidateActivities(tripId, slotId, userId);
        res.status(200).json(activities);
    } catch (error: any) {
        if (error.status === 404) {
            res.status(404).json({ error: error.message });
        } else if (error.status === 400) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: "Failed to get activities" });
        }
    }
};

export const voteActivity = async (req: Request, res: Response): Promise<void> => {
    const tripId = String(req.params.tripId);
    const slotId = String(req.params.slotId);
    const { idToken, activityId } = req.body;

    if (!idToken) {
        res.status(400).json({ error: "idToken is required" });
        return;
    }

    if (!activityId) {
        res.status(400).json({ error: "activityId is required" });
        return;
    }

    try {
        const result = await voteForActivity({ tripId, slotId, idToken, activityId });
        res.status(200).json(result);
    } catch (error: any) {
        if (error.status === 404) {
            res.status(404).json({ error: error.message });
        } else if (error.status === 400) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(401).json({ error: "Invalid token or failed to vote" });
        }
    }
};

export const getFinalItineraryActivities = async (
    req: Request,
    res: Response
): Promise<void> => {
    const tripId = String(req.params.tripId);
    const userId = req.query.userId as string | undefined;

    try {
        const activities = await getFinalActivities(tripId, userId);
        res.status(200).json(activities);
    } catch (error: any) {
        if (error.status === 404) {
            res.status(404).json({ error: error.message });
        } else if (error.status === 400) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: "Failed to get final itinerary" });
        }
    }
};

export const toggleAttendance = async (
    req: Request,
    res: Response
): Promise<void> => {
    const tripId = String(req.params.tripId);
    const slotId = String(req.params.slotId);
    const { idToken, activityId } = req.body;

    if (!idToken) {
        res.status(400).json({ error: "idToken is required" });
        return;
    }

    if (!activityId) {
        res.status(400).json({ error: "activityId is required" });
        return;
    }

    try {
        const result = await toggleFinalActivityAttendance({
            tripId,
            slotId,
            idToken,
            activityId,
        });
        res.status(200).json(result);
    } catch (error: any) {
        if (error.status === 404) {
            res.status(404).json({ error: error.message });
        } else if (error.status === 400) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(401).json({ error: "Invalid token or failed to update attendance" });
        }
    }
};
