// apps/backend/src/controllers/tripsController.ts
import { Request, Response } from "express";
import {
    createTripForAuthenticatedUser,
    createTripForUserWithoutAuth,
    getTripsForUser,
    joinTripWithInviteCode,
    deleteTripForAdmin,
    leaveTripForMember,
    removeMemberForAdmin,
    updateTripForAdmin,
} from "../services/tripsService";

export const getMyTrips = async (req: Request, res: Response): Promise<void> => {
    const userId = req.query.userId as string;

    if (!userId) {
        res.status(400).json({ error: "userId is required" });
        return;
    }

    try {
        const trips = await getTripsForUser(userId);
        res.json(trips);
    } catch (error) {
        console.error("Error loading trips:", error);
        res.status(500).json({ error: "Failed to load trips" });
    }
};

export const createTrip = async (req: Request, res: Response): Promise<void> => {
    const { idToken, title, destination, start_date, end_date } = req.body;

    if (!idToken || !title || !destination || !start_date || !end_date) {
        res.status(400).json({
            error: "idToken, title, destination, start_date and end_date are required",
        });
        return;
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({ error: "start_date and end_date must be valid dates" });
        return;
    }

    if (end < start) {
        res.status(400).json({ error: "end_date cannot be before start_date" });
        return;
    }

    try {
        const trip = await createTripForAuthenticatedUser({
            idToken,
            title,
            destination,
            start_date,
            end_date,
        });

        res.status(201).json(trip);
    } catch (error) {
        console.error("Error creating trip:", error);
        res.status(401).json({ error: "Invalid token or failed to create trip" });
    }
};

export const createTripWithoutAuth = async (
    req: Request,
    res: Response
): Promise<void> => {
    const { userId, title, destination, start_date, end_date } = req.body;

    if (!userId || !title || !destination || !start_date || !end_date) {
        res.status(400).json({
            error: "userId, title, destination, start_date and end_date are required",
        });
        return;
    }

    try {
        const trip = await createTripForUserWithoutAuth({
            userId,
            title,
            destination,
            start_date,
            end_date,
        });

        res.status(201).json(trip);
    } catch (error) {
        console.error("Error creating trip without auth:", error);
        res.status(500).json({ error: "Failed to create trip" });
    }
};

export const joinTrip = async (req: Request, res: Response): Promise<void> => {
    const { idToken, inviteCode } = req.body;

    if (!idToken || !inviteCode) {
        res.status(400).json({ error: "idToken and inviteCode are required" });
        return;
    }

    try {
        const trip = await joinTripWithInviteCode({ idToken, inviteCode });
        res.status(200).json(trip);
    } catch (error: any) {
        if (error.status === 404) {
            res.status(404).json({ error: error.message });
        } else if (error.status === 409) {
            res.status(409).json({ error: error.message });
        } else {
            res.status(401).json({ error: "Invalid token or failed to join trip" });
        }
    }
};

export const deleteTrip = async (req: Request, res: Response): Promise<void> => {
    const { idToken } = req.body;
    const tripId = req.params.tripId as string;

    if (!idToken || !tripId) {
        res.status(400).json({ error: "idToken and tripId are required" });
        return;
    }

    try {
        await deleteTripForAdmin({ idToken, tripId });
        res.status(200).json({ message: "Trip deleted successfully" });
    } catch (error: any) {
        if (error.status === 403) {
            res.status(403).json({ error: error.message });
        } else {
            res.status(401).json({ error: "Invalid token or failed to delete trip" });
        }
    }
};

export const leaveTrip = async (req: Request, res: Response): Promise<void> => {
    const { idToken } = req.body;
    const tripId = req.params.tripId as string;

    if (!idToken || !tripId) {
        res.status(400).json({ error: "idToken and tripId are required" });
        return;
    }

    try {
        await leaveTripForMember({ idToken, tripId });
        res.status(200).json({ message: "Left trip successfully" });
    } catch (error: any) {
        if (error.status === 403) {
            res.status(403).json({ error: error.message });
        } else if (error.status === 404) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(401).json({ error: "Invalid token or failed to leave trip" });
        }
    }
};

export const removeMember = async (req: Request, res: Response): Promise<void> => {
    const { idToken } = req.body;
    const tripId = req.params.tripId as string;
    const memberId = req.params.memberId as string;

    if (!idToken || !tripId || !memberId) {
        res.status(400).json({ error: "idToken, tripId and memberId are required" });
        return;
    }

    try {
        await removeMemberForAdmin({ idToken, tripId, memberId });
        res.status(200).json({ message: "Member removed successfully" });
    } catch (error: any) {
        if (error.status === 403) {
            res.status(403).json({ error: error.message });
        } else if (error.status === 404) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(401).json({ error: "Invalid token or failed to remove member" });
        }
    }
};

// New controller for updating trip details by admin

export const updateTrip = async (req: Request, res: Response): Promise<void> => {
    const { idToken, title, destination, start_date, end_date } = req.body;
    const tripId = req.params.tripId as string;

    if (!idToken || !tripId) {
        res.status(400).json({ error: "idToken and tripId are required" });
        return;
    }

    if (!title && !destination && !start_date && !end_date) {
        res.status(400).json({ error: "At least one field to update is required" });
        return;
    }

    if (start_date && end_date) {
        const start = new Date(start_date);
        const end = new Date(end_date);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            res.status(400).json({ error: "start_date and end_date must be valid dates" });
            return;
        }
        if (end < start) {
            res.status(400).json({ error: "end_date cannot be before start_date" });
            return;
        }
    }

    try {
        const trip = await updateTripForAdmin({ idToken, tripId, title, destination, start_date, end_date });
        res.status(200).json(trip);
    } catch (error: any) {
        if (error.status === 403) {
            res.status(403).json({ error: error.message });
        } else if (error.status === 404) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(401).json({ error: "Invalid token or failed to update trip" });
        }
    }
};