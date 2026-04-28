import { Request, Response } from "express";
import { suggestActivity, getCandidateActivities } from "../services/activityService";

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