import { Request, Response } from "express";
import {
    suggestActivity,
    getCandidateActivities,
    getFinalActivities,
    toggleFinalActivityAttendance,
    updateSuggestedActivity,
    voteForActivity,
} from "../services/activityService";

function normalizeOptionalTime(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function isValidTimeString(value: string): boolean {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function validateActivityTimes(
    startTime?: string,
    endTime?: string
): string | undefined {
    if (startTime && !isValidTimeString(startTime)) {
        return "startTime must be a valid time in HH:MM format";
    }

    if (endTime && !isValidTimeString(endTime)) {
        return "endTime must be a valid time in HH:MM format";
    }

    if (startTime && endTime && endTime < startTime) {
        return "endTime cannot be before startTime";
    }

    return undefined;
}

export const createActivity = async (req: Request, res: Response): Promise<void> => {
    const tripId = String(req.params.tripId);
    const slotId = String(req.params.slotId);
    const { idToken, name, description, address, googleMapsUrl } = req.body;
    const startTime = normalizeOptionalTime(req.body.startTime);
    const endTime = normalizeOptionalTime(req.body.endTime);

    if (!idToken) {
        res.status(400).json({ error: "idToken is required" });
        return;
    }

    if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({ error: "name is required" });
        return;
    }

    const timeError = validateActivityTimes(startTime, endTime);
    if (timeError) {
        res.status(400).json({ error: timeError });
        return;
    }

    try {
        const activity = await suggestActivity(tripId, slotId, {
            idToken,
            name: name.trim(),
            description,
            address,
            googleMapsUrl,
            startTime,
            endTime,
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
    const startTime = normalizeOptionalTime(req.body.startTime);
    const endTime = normalizeOptionalTime(req.body.endTime);

    if (!idToken) {
        res.status(400).json({ error: "idToken is required" });
        return;
    }

    if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({ error: "name is required" });
        return;
    }

    const timeError = validateActivityTimes(startTime, endTime);
    if (timeError) {
        res.status(400).json({ error: timeError });
        return;
    }

    try {
        const activity = await updateSuggestedActivity(activityId, {
            idToken,
            name: name.trim(),
            description,
            address,
            googleMapsUrl,
            startTime,
            endTime,
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
