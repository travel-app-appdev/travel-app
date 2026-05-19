import admin from "../config/firebase";
import {
    createActivity,
    createFinalItineraryForTrip,
    getActivityById,
    getActivitiesBySlotId,
    getFinalActivitiesByTripId,
    toggleActivityAttendance,
    updateActivityById,
    upsertActivityVote,
} from "../repositories/activityRepository";
import {
    findTripById,
    findMembership,
    updateTripState,
} from "../repositories/tripsRepository";
import { Activity, CreateActivityInput, TripState } from "../types/trip";

type VoteForActivityResponse = {
    activityId: string;
    slotId: string;
    tripState: TripState;
    voteAccepted: boolean;
};

function isPastDeadline(deadline?: string): boolean {
    if (!deadline) return false;

    const parsed = new Date(deadline);
    return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now();
}

export async function suggestActivity(
    tripId: string,
    slotId: string,
    input: CreateActivityInput
): Promise<Activity> {
    const decoded = await admin.auth().verifyIdToken(input.idToken);
    const userId = decoded.uid;

    const trip = await findTripById(tripId);
    if (!trip) {
        throw { status: 404, message: "Trip not found" };
    }

    if (trip.state !== "Planning") {
        throw { status: 400, message: "Trip is not in Planning state" };
    }

    const membership = await findMembership(tripId, userId);
    if (!membership) {
        throw { status: 404, message: "User is not a member of this trip" };
    }

    return createActivity({
        tripId,
        userId,
        slotId,
        name: input.name,
        description: input.description,
        address: input.address,
        googleMapsUrl: input.googleMapsUrl,
    });
}

export async function getCandidateActivities(
    tripId: string,
    slotId: string,
    userId?: string,
): Promise<Activity[]> {
    const trip = await findTripById(tripId);

    if (!trip) {
        throw { status: 404, message: "Trip not found" };
    }

    if (!["Planning", "Voting", "Final"].includes(trip.state)) {
        throw { status: 400, message: "Trip is not in a readable itinerary state" };
    }

    if (trip.state === "Planning" && !userId) {
        return [];
    }

    return getActivitiesBySlotId(slotId, tripId, {
        userId,
        currentUserId: userId,
        filterToUser: trip.state === "Planning",
        includeVotes: trip.state === "Voting",
    });
}

export async function updateSuggestedActivity(
    activityId: string,
    input: CreateActivityInput
): Promise<Activity> {
    const decoded = await admin.auth().verifyIdToken(input.idToken);
    const userId = decoded.uid;

    const activity = await getActivityById(activityId);
    if (!activity) {
        throw { status: 404, message: "Activity not found" };
    }

    const trip = await findTripById(activity.trip_id);
    if (!trip) {
        throw { status: 404, message: "Trip not found" };
    }

    if (trip.state !== "Planning") {
        throw { status: 400, message: "Trip is not in Planning state" };
    }

    if (activity.user_id !== userId) {
        throw { status: 403, message: "Only the activity owner can edit this activity" };
    }

    return updateActivityById(activityId, {
        name: input.name,
        description: input.description,
        address: input.address,
        googleMapsUrl: input.googleMapsUrl,
    });
}

export async function voteForActivity(input: {
    tripId: string;
    slotId: string;
    idToken: string;
    activityId: string;
}): Promise<VoteForActivityResponse> {
    const decoded = await admin.auth().verifyIdToken(input.idToken);
    const userId = decoded.uid;

    const trip = await findTripById(input.tripId);
    if (!trip) {
        throw { status: 404, message: "Trip not found" };
    }

    const membership = await findMembership(input.tripId, userId);
    if (!membership) {
        throw { status: 404, message: "User is not a member of this trip" };
    }

    if (trip.state === "Final") {
        return {
            activityId: input.activityId,
            slotId: input.slotId,
            tripState: "Final",
            voteAccepted: false,
        };
    }

    if (trip.state !== "Voting") {
        throw { status: 400, message: "Trip is not in Voting state" };
    }

    if (isPastDeadline(trip.voting_end_at)) {
        await createFinalItineraryForTrip(input.tripId);
        await updateTripState(input.tripId, "Final");

        return {
            activityId: input.activityId,
            slotId: input.slotId,
            tripState: "Final",
            voteAccepted: false,
        };
    }

    const activities = await getActivitiesBySlotId(input.slotId, input.tripId);
    const activity = activities.find((item) => item.activity_id === input.activityId);
    if (!activity) {
        throw { status: 400, message: "Activity does not belong to this trip slot" };
    }

    await upsertActivityVote({
        tripId: input.tripId,
        slotId: input.slotId,
        userId,
        activityId: input.activityId,
    });

    return {
        activityId: input.activityId,
        slotId: input.slotId,
        tripState: "Voting",
        voteAccepted: true,
    };
}

export async function getFinalActivities(
    tripId: string,
    userId?: string
): Promise<Activity[]> {
    const trip = await findTripById(tripId);

    if (!trip) {
        throw { status: 404, message: "Trip not found" };
    }

    if (trip.state !== "Final") {
        throw { status: 400, message: "Trip is not in Final state" };
    }

    let activities = await getFinalActivitiesByTripId(tripId, userId);

    if (activities.length === 0) {
        await createFinalItineraryForTrip(tripId);
        activities = await getFinalActivitiesByTripId(tripId, userId);
    }

    return activities;
}

export async function toggleFinalActivityAttendance(input: {
    tripId: string;
    slotId: string;
    idToken: string;
    activityId: string;
}): Promise<{ joined: boolean; joinedCount: number }> {
    const decoded = await admin.auth().verifyIdToken(input.idToken);
    const userId = decoded.uid;

    const trip = await findTripById(input.tripId);
    if (!trip) {
        throw { status: 404, message: "Trip not found" };
    }

    if (trip.state !== "Final") {
        throw { status: 400, message: "Trip is not in Final state" };
    }

    const membership = await findMembership(input.tripId, userId);
    if (!membership) {
        throw { status: 404, message: "User is not a member of this trip" };
    }

    const finalActivities = await getFinalActivitiesByTripId(input.tripId, userId);
    const activity = finalActivities.find(
        (item) =>
            item.activity_id === input.activityId && item.slot_id === input.slotId
    );

    if (!activity) {
        throw { status: 400, message: "Activity is not part of the final itinerary slot" };
    }

    return toggleActivityAttendance({
        tripId: input.tripId,
        slotId: input.slotId,
        activityId: input.activityId,
        userId,
    });
}
