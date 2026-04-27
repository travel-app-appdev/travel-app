import admin from "../config/firebase";
import { Activity } from "../types/trip";

export async function createActivity(data: {
    tripId: string;
    userId: string;
    slotId: string;
    title: string;
    description?: string;
    location_link?: string;
}): Promise<Activity> {
    const db = admin.firestore();

    const activityRef = db.collection("activities").doc();
    const timeSlotActivityRef = db.collection("timeslot_activities").doc();

    const batch = db.batch();

    batch.set(activityRef, {
        trip_id: data.tripId,
        user_id: data.userId,
        title: data.title,
        description: data.description ?? null,
        location_link: data.location_link ?? null,
        source_type: "manual",
    });

    batch.set(timeSlotActivityRef, {
        slot_id: data.slotId,
        activity_id: activityRef.id,
        status: "candidate",
    });

    await batch.commit();

    return {
        activity_id: activityRef.id,
        trip_id: data.tripId,
        user_id: data.userId,
        title: data.title,
        description: data.description,
        location_link: data.location_link,
        source_type: "manual",
    };
}

export async function getActivitiesBySlotId(slotId: string, userId?: string): Promise<Activity[]> {
    const db = admin.firestore();

    const tsaSnapshot = await db
        .collection("timeslot_activities")
        .where("slot_id", "==", slotId)
        .where("status", "==", "candidate")
        .get();

    if (tsaSnapshot.empty) return [];

    const activityIds = tsaSnapshot.docs.map((doc) => doc.data().activity_id);

    const activities = await Promise.all(
        activityIds.map(async (activityId) => {
            const activityDoc = await db.collection("activities").doc(activityId).get();
            if (!activityDoc.exists) return null;
            const data = activityDoc.data()!;
            return {
                activity_id: activityDoc.id,
                trip_id: data.trip_id,
                user_id: data.user_id,
                title: data.title,
                description: data.description,
                location_link: data.location_link,
                source_type: data.source_type,
            } as Activity;
        })
    );

    const filtered = activities.filter((a): a is Activity => a !== null);

    // filter by userId if provided
    if (userId) {
        return filtered.filter((a) => a.user_id === userId);
    }

    return filtered;
}