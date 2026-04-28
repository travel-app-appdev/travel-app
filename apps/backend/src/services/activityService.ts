import admin from "../config/firebase";
import { createActivity, getActivitiesBySlotId } from "../repositories/activityRepository";
import { findTripById, findMembership } from "../repositories/tripsRepository";
import { Activity, CreateActivityInput } from "../types/trip";

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

    if (trip.state !== "Planning") {
        throw { status: 400, message: "Trip is not in Planning state" };
    }

    return getActivitiesBySlotId(slotId, tripId, userId); 
}