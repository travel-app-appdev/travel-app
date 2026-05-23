import admin from "../config/firebase";
import { Activity } from "../types/trip";
import { findUserById } from "./tripsRepository";

function normalizeDateTime(value: any): string | undefined {
    if (!value) return undefined;

    if (typeof value === "string") {
        return value;
    }

    if (typeof value.toDate === "function") {
        return value.toDate().toISOString();
    }

    if (typeof value._seconds === "number") {
        return new Date(value._seconds * 1000).toISOString();
    }

    return undefined;
}

function activityFromDoc(doc: FirebaseFirestore.DocumentSnapshot, slotId?: string): Activity | null {
    if (!doc.exists) return null;

    const data = doc.data()!;

    return {
        activity_id: doc.id,
        trip_id: data.trip_id,
        user_id: data.user_id,
        slot_id: slotId,
        name: data.name,
        description: data.description,
        address: data.address,
        googleMapsUrl: data.googleMapsUrl,
        startTime: data.startTime ?? undefined,
        endTime: data.endTime ?? undefined,
        created_at: normalizeDateTime(data.created_at) ?? normalizeDateTime((doc as any).createTime),
        source_type: data.source_type,
    } as Activity;
}

export async function createActivity(data: {
    tripId: string;
    userId: string;
    slotId: string;
    name: string;
    description?: string;
    address?: string;
    googleMapsUrl?: string;
    startTime?: string;
    endTime?: string;
}): Promise<Activity> {
    const db = admin.firestore();

    const activityRef = db.collection("activities").doc();
    const timeSlotActivityRef = db.collection("timeslot_activities").doc();
    const createdAt = admin.firestore.Timestamp.now();

    const batch = db.batch();

    batch.set(activityRef, {
        trip_id: data.tripId,
        user_id: data.userId,
        name: data.name,
        description: data.description ?? null,
        address: data.address ?? null,
        googleMapsUrl: data.googleMapsUrl ?? null,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
        source_type: "manual",
        created_at: createdAt,
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
        name: data.name,
        description: data.description,
        address: data.address,
        googleMapsUrl: data.googleMapsUrl,
        startTime: data.startTime,
        endTime: data.endTime,
        created_at: createdAt.toDate().toISOString(),
        source_type: "manual",
    };
}

export async function getActivityById(activityId: string): Promise<Activity | null> {
    const db = admin.firestore();
    const activityDoc = await db.collection("activities").doc(activityId).get();
    return activityFromDoc(activityDoc);
}

export async function updateActivityById(
    activityId: string,
    data: {
        name: string;
        description?: string;
        address?: string;
        googleMapsUrl?: string;
        startTime?: string;
        endTime?: string;
    }
): Promise<Activity> {
    const db = admin.firestore();
    const ref = db.collection("activities").doc(activityId);

    await ref.update({
        name: data.name,
        description: data.description ?? null,
        address: data.address ?? null,
        googleMapsUrl: data.googleMapsUrl ?? null,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
        updated_at: admin.firestore.Timestamp.now(),
    });

    const updated = await ref.get();
    const activity = activityFromDoc(updated);

    if (!activity) {
        throw { status: 404, message: "Activity not found after update" };
    }

    return activity;
}

async function getVoteMetadata(tripId: string, slotId: string, currentUserId?: string) {
    const db = admin.firestore();
    const snapshot = await db
        .collection("activity_votes")
        .where("trip_id", "==", tripId)
        .where("slot_id", "==", slotId)
        .get();

    const counts = new Map<string, number>();
    let currentUserActivityId: string | undefined;

    snapshot.docs.forEach((doc) => {
        const data = doc.data();
        counts.set(data.activity_id, (counts.get(data.activity_id) ?? 0) + 1);

        if (currentUserId && data.user_id === currentUserId) {
            currentUserActivityId = data.activity_id;
        }
    });

    return { counts, currentUserActivityId };
}

export async function getActivitiesBySlotId(
    slotId: string,
    tripId: string,
    options: {
        userId?: string;
        filterToUser?: boolean;
        includeVotes?: boolean;
        currentUserId?: string;
    } = {}
): Promise<Activity[]> {
    const db = admin.firestore();

    const tsaSnapshot = await db
        .collection("timeslot_activities")
        .where("slot_id", "==", slotId)
        .where("status", "==", "candidate")
        .get();

    if (tsaSnapshot.empty) return [];

    const activityIds = tsaSnapshot.docs
        .map((doc) => doc.data().activity_id)
        .filter(Boolean);

    if (activityIds.length === 0) return [];

    const chunkSize = 10;
    const activityDocs = (
        await Promise.all(
            Array.from(
                { length: Math.ceil(activityIds.length / chunkSize) },
                (_, index) => {
                    const chunk = activityIds.slice(
                        index * chunkSize,
                        index * chunkSize + chunkSize
                    );

                    return db
                        .collection("activities")
                        .where(
                            admin.firestore.FieldPath.documentId(),
                            "in",
                            chunk
                        )
                        .get();
                }
            )
        )
    ).flatMap((snapshot) => snapshot.docs);

    const activities = activityDocs
        .map((doc) => activityFromDoc(doc, slotId))
        .filter((a): a is Activity => a !== null)
        .filter((activity) => activity.trip_id === tripId);

    let filtered = activities;

    if (options.filterToUser && options.userId) {
        filtered = filtered.filter((a) => a.user_id === options.userId);
    }

    if (options.includeVotes) {
        const metadata = await getVoteMetadata(tripId, slotId, options.currentUserId);
        filtered = filtered.map((activity) => ({
            ...activity,
            voteCount: metadata.counts.get(activity.activity_id) ?? 0,
            hasCurrentUserVote: metadata.currentUserActivityId === activity.activity_id,
        }));
    }

    return filtered;
}

export async function getCandidateActivitiesByTripId(tripId: string): Promise<Activity[]> {
    const db = admin.firestore();

    const activitiesSnapshot = await db
        .collection("activities")
        .where("trip_id", "==", tripId)
        .get();

    if (activitiesSnapshot.empty) return [];

    const activitiesById = new Map<string, Activity>();
    activitiesSnapshot.docs.forEach((doc) => {
        const activity = activityFromDoc(doc);
        if (activity) activitiesById.set(activity.activity_id, activity);
    });

    const tsaSnapshot = await db
        .collection("timeslot_activities")
        .where("status", "==", "candidate")
        .get();

    const candidates: Activity[] = [];

    tsaSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const activity = activitiesById.get(data.activity_id);
        if (!activity) return;

        candidates.push({
            ...activity,
            slot_id: data.slot_id,
        });
    });

    return candidates;
}

export async function upsertActivityVote(input: {
    tripId: string;
    slotId: string;
    userId: string;
    activityId: string;
}): Promise<void> {
    const db = admin.firestore();
    const ref = db
        .collection("activity_votes")
        .doc(`${input.tripId}_${input.slotId}_${input.userId}`);

    await ref.set(
        {
            trip_id: input.tripId,
            slot_id: input.slotId,
            user_id: input.userId,
            activity_id: input.activityId,
            updated_at: admin.firestore.Timestamp.now(),
        },
        { merge: true }
    );
}

export async function getVotingCompletionStatus(
    tripId: string,
    memberUserIds: string[]
): Promise<{
    isComplete: boolean;
    requiredSlotIds: string[];
    completedUserIds: string[];
}> {
    const db = admin.firestore();
    const candidates = await getCandidateActivitiesByTripId(tripId);
    const slotCounts = new Map<string, number>();

    candidates.forEach((activity) => {
        if (!activity.slot_id) return;
        slotCounts.set(activity.slot_id, (slotCounts.get(activity.slot_id) ?? 0) + 1);
    });

    const requiredSlotIds = Array.from(slotCounts.entries())
        .filter(([, count]) => count > 1)
        .map(([slotId]) => slotId);

    if (requiredSlotIds.length === 0) {
        return {
            isComplete: true,
            requiredSlotIds,
            completedUserIds: memberUserIds,
        };
    }

    const votesSnapshot = await db
        .collection("activity_votes")
        .where("trip_id", "==", tripId)
        .get();

    const votesByUser = new Map<string, Set<string>>();
    votesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (!requiredSlotIds.includes(data.slot_id)) return;

        const userVotes = votesByUser.get(data.user_id) ?? new Set<string>();
        userVotes.add(data.slot_id);
        votesByUser.set(data.user_id, userVotes);
    });

    const completedUserIds = memberUserIds.filter((userId) => {
        const userVotes = votesByUser.get(userId);
        return requiredSlotIds.every((slotId) => userVotes?.has(slotId));
    });

    return {
        isComplete: completedUserIds.length === memberUserIds.length,
        requiredSlotIds,
        completedUserIds,
    };
}

export async function createFinalItineraryForTrip(tripId: string): Promise<void> {
    const db = admin.firestore();

    const existing = await db
        .collection("final_itinerary_slots")
        .where("trip_id", "==", tripId)
        .limit(1)
        .get();

    if (!existing.empty) return;

    const candidates = await getCandidateActivitiesByTripId(tripId);
    if (candidates.length === 0) return;

    const voteSnapshot = await db
        .collection("activity_votes")
        .where("trip_id", "==", tripId)
        .get();

    const voteCounts = new Map<string, number>();
    voteSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const key = `${data.slot_id}|${data.activity_id}`;
        voteCounts.set(key, (voteCounts.get(key) ?? 0) + 1);
    });

    const bySlot = new Map<string, Activity[]>();
    candidates.forEach((activity) => {
        if (!activity.slot_id) return;
        bySlot.set(activity.slot_id, [...(bySlot.get(activity.slot_id) ?? []), activity]);
    });

    const batch = db.batch();
    const selectedAt = admin.firestore.Timestamp.now();

    bySlot.forEach((activities, slotId) => {
        const sorted = [...activities].sort((a, b) => {
            const aVotes = voteCounts.get(`${slotId}|${a.activity_id}`) ?? 0;
            const bVotes = voteCounts.get(`${slotId}|${b.activity_id}`) ?? 0;

            if (bVotes !== aVotes) return bVotes - aVotes;

            const aCreated = a.created_at ?? "";
            const bCreated = b.created_at ?? "";
            const createdCompare = aCreated.localeCompare(bCreated);
            if (createdCompare !== 0) return createdCompare;

            return a.activity_id.localeCompare(b.activity_id);
        });

        const winner = sorted[0];
        if (!winner) return;

        const ref = db
            .collection("final_itinerary_slots")
            .doc(`${tripId}_${slotId}`);

        batch.set(ref, {
            trip_id: tripId,
            slot_id: slotId,
            activity_id: winner.activity_id,
            vote_count: voteCounts.get(`${slotId}|${winner.activity_id}`) ?? 0,
            selected_at: selectedAt,
        });
    });

    await batch.commit();
}

async function getJoinedMetadata(input: {
    tripId: string;
    slotId: string;
    activityId: string;
    currentUserId?: string;
}) {
    const db = admin.firestore();
    const snapshot = await db
        .collection("activity_attendance")
        .where("trip_id", "==", input.tripId)
        .where("slot_id", "==", input.slotId)
        .where("activity_id", "==", input.activityId)
        .where("joined", "==", true)
        .get();

    let hasCurrentUserJoined = false;

    const joinedUserIds = snapshot.docs.map((doc) => {
        const data = doc.data();

        if (input.currentUserId && data.user_id === input.currentUserId) {
            hasCurrentUserJoined = true;
        }

        return data.user_id as string;
    });

    const uniqueUserIds = [...new Set(joinedUserIds)];

    const joinedMembers = await Promise.all(
        uniqueUserIds.map(async (userId) => {
            const user = await findUserById(userId);

            return {
                user_id: userId,
                name: user?.name ?? "Unknown User",
            };
        })
    );

    return {
        joinedCount: snapshot.size,
        hasCurrentUserJoined,
        joinedMembers,
    };
}

export async function getFinalActivitiesByTripId(
    tripId: string,
    currentUserId?: string
): Promise<Activity[]> {
    const db = admin.firestore();
    const snapshot = await db
        .collection("final_itinerary_slots")
        .where("trip_id", "==", tripId)
        .get();

    if (snapshot.empty) return [];

    const activities: Array<Activity | null> = await Promise.all(
        snapshot.docs.map(async (doc): Promise<Activity | null> => {
            const finalData = doc.data();
            const activityDoc = await db
                .collection("activities")
                .doc(finalData.activity_id)
                .get();
            const activity = activityFromDoc(activityDoc, finalData.slot_id);
            if (!activity) return null;

            const joined = await getJoinedMetadata({
                tripId,
                slotId: finalData.slot_id,
                activityId: finalData.activity_id,
                currentUserId,
            });

            return {
                ...activity,
                voteCount: finalData.vote_count ?? 0,
                joinedCount: joined.joinedCount,
                hasCurrentUserJoined: joined.hasCurrentUserJoined,
                joinedMembers: joined.joinedMembers,
            } as Activity;
        })
    );

    return activities
        .filter((activity): activity is Activity => activity !== null)
        .sort((a, b) => (a.slot_id ?? "").localeCompare(b.slot_id ?? ""));
}

export async function toggleActivityAttendance(input: {
    tripId: string;
    slotId: string;
    activityId: string;
    userId: string;
}): Promise<{ joined: boolean; joinedCount: number }> {
    const db = admin.firestore();
    const ref = db
        .collection("activity_attendance")
        .doc(`${input.tripId}_${input.slotId}_${input.activityId}_${input.userId}`);

    const current = await ref.get();
    const joined = !(current.exists && current.data()?.joined === true);

    await ref.set(
        {
            trip_id: input.tripId,
            slot_id: input.slotId,
            activity_id: input.activityId,
            user_id: input.userId,
            joined,
            updated_at: admin.firestore.Timestamp.now(),
        },
        { merge: true }
    );

    const metadata = await getJoinedMetadata({
        tripId: input.tripId,
        slotId: input.slotId,
        activityId: input.activityId,
        currentUserId: input.userId,
    });

    return {
        joined,
        joinedCount: metadata.joinedCount,
    };
}
