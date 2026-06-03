// apps/backend/src/controllers/tripsController.ts
import { Request, Response } from "express";
import {
    createTripForAuthenticatedUser,
    createTripForUserWithoutAuth,
    getTripForUser,
    getTripsForUser,
    joinTripWithInviteCode,
    deleteTripForAdmin,
    leaveTripForMember,
    removeMemberForAdmin,
    finishPlanningForMember,
    finishVotingForAdmin,
    updateTripForAdmin,
    getTripByInviteCodePublic,
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

export const getTrip = async (req: Request, res: Response): Promise<void> => {
    const tripId = req.params.tripId as string;
    const userId = req.query.userId as string;

    if (!tripId || !userId) {
        res.status(400).json({ error: "tripId and userId are required" });
        return;
    }

    try {
        const trip = await getTripForUser(tripId, userId);
        res.json(trip);
    } catch (error: any) {
        if (error.status === 404) {
            res.status(404).json({ error: error.message });
            return;
        }

        console.error("Error loading trip:", error);
        res.status(500).json({ error: "Failed to load trip" });
    }
};

export const createTrip = async (req: Request, res: Response): Promise<void> => {
    const { idToken, title, destination, start_date, end_date,
        planning_end_at, voting_end_at, } = req.body;

    if (!idToken || !title || !destination || !start_date || !end_date || !planning_end_at || !voting_end_at) {
        res.status(400).json({
            error:
                "idToken, title, destination, start_date, end_date, planning_end_at and voting_end_at are required",
        });
        return;
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    const planningEnd = new Date(planning_end_at);
    const votingEnd = new Date(voting_end_at);

    if (
        isNaN(start.getTime()) ||
        isNaN(end.getTime()) ||
        isNaN(planningEnd.getTime()) ||
        isNaN(votingEnd.getTime())
    ) {
        res.status(400).json({ error: "startdate, enddate, planningEndAt and votingEndAt must be valid dates",
        });
        return;
    }

    if (end < start) {
        res.status(400).json({ error: "end_date cannot be before start_date" });
        return;
    }

    if (planningEnd >= votingEnd) {
        res.status(400).json({
            error: "planning_end_at must be before voting_end_at",
        });
        return;
    }

    try {
        const trip = await createTripForAuthenticatedUser({
            idToken,
            title,
            destination,
            start_date,
            end_date,
            planning_end_at,
            voting_end_at,
        });

        res.status(201).json(trip);
    } catch (error: any) {
        console.error("Error creating trip:", error);
        if (error.status === 400) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(401).json({ error: "Invalid token or failed to create trip" });
        }
    }
};


export const createTripWithoutAuth = async (
    req: Request,
    res: Response
): Promise<void> => {
    const {
        userId,
        title,
        destination,
        start_date,
        end_date,
        planning_end_at,
        voting_end_at,
    } = req.body;

    if (
        !userId ||
        !title ||
        !destination ||
        !start_date ||
        !end_date ||
        !planning_end_at ||
        !voting_end_at
    ) {
        res.status(400).json({
            error:
                "userId, title, destination, start_date, end_date, planning_end_at and voting_end_at are required",
        });
        return;
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    const planningEnd = new Date(planning_end_at);
    const votingEnd = new Date(voting_end_at);

    if (
        isNaN(start.getTime()) ||
        isNaN(end.getTime()) ||
        isNaN(planningEnd.getTime()) ||
        isNaN(votingEnd.getTime())
    ) {
        res.status(400).json({
            error:
                "start_date, end_date, planning_end_at and voting_end_at must be valid dates",
        });
        return;
    }

    if (end < start) {
        res.status(400).json({
            error: "end_date cannot be before start_date",
        });
        return;
    }

    if (planningEnd >= votingEnd) {
        res.status(400).json({
            error: "planning_end_at must be before voting_end_at",
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
            planning_end_at,
            voting_end_at,
        });

        res.status(201).json(trip);
    } catch (error: any) {
        console.error("Error creating trip without auth:", error);
        if (error.status === 400) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: "Failed to create trip" });
        }
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

export const finishPlanning = async (req: Request, res: Response): Promise<void> => {
    const tripId = String(req.params.tripId);
    const { idToken, planningDone } = req.body;

    if (!idToken) {
        res.status(400).json({ error: "idToken is required" });
        return;
    }

    if (planningDone !== undefined && typeof planningDone !== "boolean") {
        res.status(400).json({ error: "planningDone must be a boolean" });
        return;
    }

    try {
        const result = await finishPlanningForMember(tripId, idToken, planningDone);
        res.status(200).json(result);
    } catch (error: any) {
        if (error.status === 404) {
            res.status(404).json({ error: error.message });
        } else if (error.status === 400) {
            res.status(400).json({ error: error.message });
        } else if (error.status === 409) {
            res.status(409).json({ error: error.message });
        } else {
            res.status(401).json({ error: "Invalid token or failed to finish planning" });
        }
    }
};

export const finishVoting = async (req: Request, res: Response): Promise<void> => {
    const tripId = String(req.params.tripId);
    const { idToken } = req.body;

    if (!idToken) {
        res.status(400).json({ error: "idToken is required" });
        return;
    }

    try {
        const result = await finishVotingForAdmin(tripId, idToken);
        res.status(200).json(result);
    } catch (error: any) {
        if (error.status === 404) {
            res.status(404).json({ error: error.message });
        } else if (error.status === 400) {
            res.status(400).json({ error: error.message });
        } else if (error.status === 403) {
            res.status(403).json({ error: error.message });
        } else {
            res.status(401).json({ error: "Invalid token or failed to finish voting" });
        }
    }
};

export const updateTrip = async (req: Request, res: Response): Promise<void> => {
    const { idToken, title, destination, start_date, end_date,
        planning_end_at, voting_end_at  } = req.body;
    const tripId = req.params.tripId as string;

    if (!idToken || !tripId) {
        res.status(400).json({ error: "idToken and tripId are required" });
        return;
    }

    if (!title && !destination && !start_date && !end_date && !planning_end_at && !voting_end_at) {
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

    if (planning_end_at && voting_end_at) {
        const planningEnd = new Date(planning_end_at);
        const votingEnd = new Date(voting_end_at);
        if (isNaN(planningEnd.getTime()) || isNaN(votingEnd.getTime())) {
            res.status(400).json({ error: "planning_end_at and voting_end_at must be valid dates" });
            return;
        }
        if (planningEnd >= votingEnd) {
            res.status(400).json({ error: "planning_end_at must be before voting_end_at" });
            return;
        }
    }

    try {
        const trip = await updateTripForAdmin({ idToken, tripId, title, destination, start_date, end_date,
        planning_end_at, voting_end_at });
        res.status(200).json(trip);
    } catch (error: any) {
        if (error.status === 403) {
            res.status(403).json({ error: error.message });
        } else if (error.status === 404) {
            res.status(404).json({ error: error.message });
        } else if (error.status === 400) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(401).json({ error: "Invalid token or failed to update trip" });
        }
    }
};

// ── Public trip preview by invite code (no auth required)
export const getTripPreviewByCode = async (
    req: Request,
    res: Response
): Promise<void> => {
    const inviteCode = String(req.params.inviteCode ?? "").trim().toUpperCase();

    if (!inviteCode) {
        res.status(400).json({ error: "inviteCode is required" });
        return;
    }

    try {
        const trip = await getTripByInviteCodePublic(inviteCode);
        res.status(200).json(trip);
    } catch (error: any) {
        if (error.status === 404) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: "Failed to load trip preview" });
        }
    }
};
