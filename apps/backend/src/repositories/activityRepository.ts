import admin from "../config/firebase";
import {
    Activity,
    FinalItineraryResponse,
    FinalItinerarySlot,
} from "../types/trip";
import { findUserById } from "./tripsRepository";

async function touchFinalItineraryTrip(tripId: string): Promise<void> {
    const db = admin.firestore();

    await db.collection("trips").doc(tripId).set(
        {
            final_itinerary_updated_at: admin.firestore.Timestamp.now(),
        },
        { merge: true }
    );
}

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

function activityFromDoc(
    doc: FirebaseFirestore.DocumentSnapshot,
    slotId?: string
): Activity | null {
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
        created_at:
            normalizeDateTime(data.created_at) ??
            normalizeDateTime((doc as any).createTime),
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
        slot_id: data.slotId,
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

export async function getActivityById(
    activityId: string
): Promise<Activity | null> {
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

async function getVoteMetadata(
    tripId: string,
    slotId: string,
    currentUserId?: string
) {
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
        counts.set(
            data.activity_id,
            (counts.get(data.activity_id) ?? 0) + 1
        );

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
        const metadata = await getVoteMetadata(
            tripId,
            slotId,
            options.currentUserId
        );
        filtered = filtered.map((activity) => ({
            ...activity,
            voteCount: metadata.counts.get(activity.activity_id) ?? 0,
            hasCurrentUserVote:
                metadata.currentUserActivityId === activity.activity_id,
        }));
    }

    return filtered;
}

export async function getCandidateActivitiesByTripId(
    tripId: string
): Promise<Activity[]> {
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
        slotCounts.set(
            activity.slot_id,
            (slotCounts.get(activity.slot_id) ?? 0) + 1
        );
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

        const userVotes =
            votesByUser.get(data.user_id) ?? new Set<string>();
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

export async function createFinalItineraryForTrip(
    tripId: string
): Promise<void> {
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
        bySlot.set(
            activity.slot_id,
            [...(bySlot.get(activity.slot_id) ?? []), activity]
        );
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
            vote_count:
                voteCounts.get(`${slotId}|${winner.activity_id}`) ?? 0,
            selected_at: selectedAt,
            added_alternative_activity_ids: [],
        });
    });

    await batch.commit();
    await touchFinalItineraryTrip(tripId);
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
        joinedCount: uniqueUserIds.length,
        hasCurrentUserJoined,
        joinedMembers,
    };
}

async function enrichActivityWithJoinedMetadata(
    activity: Activity,
    tripId: string,
    slotId: string,
    currentUserId?: string,
    voteCount?: number
): Promise<Activity> {
    const joined = await getJoinedMetadata({
        tripId,
        slotId,
        activityId: activity.activity_id,
        currentUserId,
    });

    return {
        ...activity,
        slot_id: slotId,
        voteCount,
        joinedCount: joined.joinedCount,
        hasCurrentUserJoined: joined.hasCurrentUserJoined,
        joinedMembers: joined.joinedMembers,
    };
}

export async function getFinalItinerarySlotsByTripId(
    tripId: string,
    currentUserId?: string
): Promise<FinalItineraryResponse> {
    const db = admin.firestore();
    const snapshot = await db
        .collection("final_itinerary_slots")
        .where("trip_id", "==", tripId)
        .get();

    if (snapshot.empty) {
        return {
            trip_id: tripId,
            slots: [],
        };
    }

    const slots: FinalItinerarySlot[] = await Promise.all(
        snapshot.docs.map(
            async (doc): Promise<FinalItinerarySlot> => {
                const finalData = doc.data();
                const slotId = finalData.slot_id as string;
                const selectedActivityId =
                    finalData.activity_id as string;
                const selectedVoteCount = finalData.vote_count ?? 0;
                const addedAlternativeActivityIds = Array.isArray(
                    finalData.added_alternative_activity_ids
                )
                    ? (finalData
                        .added_alternative_activity_ids as string[])
                    : [];

                const slotActivities = await getActivitiesBySlotId(
                    slotId,
                    tripId
                );

                const selectedBase = slotActivities.find(
                    (activity) =>
                        activity.activity_id === selectedActivityId
                );

                if (!selectedBase) {
                    throw {
                        status: 404,
                        message: `Selected activity ${selectedActivityId} not found for slot ${slotId}`,
                    };
                }

                const alternativeBase = slotActivities.filter(
                    (activity) =>
                        activity.activity_id !== selectedActivityId
                );

                const selectedActivity =
                    await enrichActivityWithJoinedMetadata(
                        selectedBase,
                        tripId,
                        slotId,
                        currentUserId,
                        selectedVoteCount
                    );

                const enrichedAlternativeActivities =
                    await Promise.all(
                        alternativeBase.map((activity) =>
                            enrichActivityWithJoinedMetadata(
                                activity,
                                tripId,
                                slotId,
                                currentUserId
                            )
                        )
                    );

                const addedAlternativeActivities =
                    enrichedAlternativeActivities.filter((activity) =>
                        addedAlternativeActivityIds.includes(
                            activity.activity_id
                        )
                    );

                const alternativeActivities =
                    enrichedAlternativeActivities.filter(
                        (activity) =>
                            !addedAlternativeActivityIds.includes(
                                activity.activity_id
                            )
                    );

                return {
                    slot_id: slotId,
                    selectedActivity,
                    alternativeActivities,
                    addedAlternativeActivities,
                    alternativeCount: alternativeActivities.length,
                };
            }
        )
    );

    return {
        trip_id: tripId,
        slots: slots.sort((a, b) =>
            a.slot_id.localeCompare(b.slot_id)
        ),
    };
}

export async function getFinalActivitiesByTripId(
    tripId: string,
    currentUserId?: string
): Promise<Activity[]> {
    const result = await getFinalItinerarySlotsByTripId(
        tripId,
        currentUserId
    );
    return result.slots.map((slot) => slot.selectedActivity);
}

export async function slotExistsInFinalItinerary(
    tripId: string,
    slotId: string
): Promise<boolean> {
    const db = admin.firestore();
    const doc = await db
        .collection("final_itinerary_slots")
        .doc(`${tripId}_${slotId}`)
        .get();

    return doc.exists;
}

export async function activityBelongsToTripSlot(
    tripId: string,
    slotId: string,
    activityId: string
): Promise<boolean> {
    const activities = await getActivitiesBySlotId(slotId, tripId);
    return activities.some(
        (activity) => activity.activity_id === activityId
    );
}

export async function toggleActivityAttendance(input: {
    tripId: string;
    slotId: string;
    activityId: string;
    userId: string;
}): Promise<{
    joined: boolean;
    joinedCount: number;
    joinedMembers: { user_id: string; name: string }[];
}> {
    const db = admin.firestore();
    const ref = db
        .collection("activity_attendance")
        .doc(
            `${input.tripId}_${input.slotId}_${input.activityId}_${input.userId}`
        );

    const current = await ref.get();
    const joined = !(current.exists && current.data()?.joined === true);

    if (joined) {
        const existingAttendanceSnapshot = await db
            .collection("activity_attendance")
            .where("trip_id", "==", input.tripId)
            .where("slot_id", "==", input.slotId)
            .where("user_id", "==", input.userId)
            .where("joined", "==", true)
            .get();

        const batch = db.batch();

        existingAttendanceSnapshot.docs.forEach((doc) => {
            batch.set(
                doc.ref,
                {
                    joined: false,
                    updated_at: admin.firestore.Timestamp.now(),
                },
                { merge: true }
            );
        });

        batch.set(
            ref,
            {
                trip_id: input.tripId,
                slot_id: input.slotId,
                activity_id: input.activityId,
                user_id: input.userId,
                joined: true,
                updated_at: admin.firestore.Timestamp.now(),
            },
            { merge: true }
        );

        await batch.commit();
    } else {
        await ref.set(
            {
                trip_id: input.tripId,
                slot_id: input.slotId,
                activity_id: input.activityId,
                user_id: input.userId,
                joined: false,
                updated_at: admin.firestore.Timestamp.now(),
            },
            { merge: true }
        );
    }

    const metadata = await getJoinedMetadata({
        tripId: input.tripId,
        slotId: input.slotId,
        activityId: input.activityId,
        currentUserId: input.userId,
    });

    await touchFinalItineraryTrip(input.tripId);

    return {
        joined,
        joinedCount: metadata.joinedCount,
        joinedMembers: metadata.joinedMembers,
    };
}

export async function toggleAddedAlternativeActivityBySlot(input: {
    tripId: string;
    slotId: string;
    activityId: string;
}): Promise<{
    added: boolean;
    addedAlternativeActivityIds: string[];
}> {
    const db = admin.firestore();
    const ref = db
        .collection("final_itinerary_slots")
        .doc(`${input.tripId}_${input.slotId}`);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
        throw { status: 404, message: "Final itinerary slot not found" };
    }

    const data = snapshot.data()!;
    const selectedActivityId = data.activity_id as string;

    if (selectedActivityId === input.activityId) {
        throw {
            status: 400,
            message: "Selected activity cannot be added as alternative",
        };
    }

    const currentIds = Array.isArray(
        data.added_alternative_activity_ids
    )
        ? (data.added_alternative_activity_ids as string[])
        : [];

    const alreadyAdded = currentIds.includes(input.activityId);
    const nextIds = alreadyAdded
        ? currentIds.filter((id) => id !== input.activityId)
        : [...currentIds, input.activityId];

    await ref.set(
        {
            added_alternative_activity_ids: nextIds,
            updated_at: admin.firestore.Timestamp.now(),
        },
        { merge: true }
    );

    await touchFinalItineraryTrip(input.tripId);

    return {
        added: !alreadyAdded,
        addedAlternativeActivityIds: nextIds,
    };
}

/**
 * Removes all data belonging to a user within a trip:
 * - Their votes (activity_votes)
 * - Their attendance records (activity_attendance)
 * - Their activities (activities) and the corresponding timeslot links (timeslot_activities)
 *
 * Note: final_itinerary_slots is intentionally left untouched — the final
 * itinerary represents the group's collective decision and should not be
 * retroactively altered when a member leaves.
 *
 * Note: Firestore batches are limited to 500 write operations. This is safe
 * for typical trip sizes; revisit if activity counts can grow very large.
 */
export async function removeMemberDataFromTrip(
    tripId: string,
    userId: string
): Promise<void> {
    const db = admin.firestore();
    const batch = db.batch();

    // 1. Delete the user's votes for this trip
    const votesSnapshot = await db
        .collection("activity_votes")
        .where("trip_id", "==", tripId)
        .where("user_id", "==", userId)
        .get();
    votesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    // 2. Delete the user's attendance records for this trip
    const attendanceSnapshot = await db
        .collection("activity_attendance")
        .where("trip_id", "==", tripId)
        .where("user_id", "==", userId)
        .get();
    attendanceSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    // 3. Delete the user's activities and their timeslot_activities links
    const activitiesSnapshot = await db
        .collection("activities")
        .where("trip_id", "==", tripId)
        .where("user_id", "==", userId)
        .get();

    const activityIds = activitiesSnapshot.docs.map((doc) => doc.id);
    activitiesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    // timeslot_activities uses activity_id as the foreign key; delete in chunks of 10
    const chunkSize = 10;
    for (let i = 0; i < activityIds.length; i += chunkSize) {
        const chunk = activityIds.slice(i, i + chunkSize);
        const tsaSnapshot = await db
            .collection("timeslot_activities")
            .where("activity_id", "in", chunk)
            .get();
        tsaSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    }

    await batch.commit();
}