import admin from "../config/firebase";
import {
    Trip,
    TripDocument,
    TripMembershipDocument,
    UserDocument,
    TripState,
} from "../types/trip";

export async function findAcceptedMembershipsByUserId(
    userId: string
): Promise<TripMembershipDocument[]> {
    const db = admin.firestore();

    const snapshot = await db
        .collection("trip_members")
        .where("user_id", "==", userId)
        .where("invite_status", "==", "accepted")
        .get();

    return snapshot.docs.map((doc) => doc.data() as TripMembershipDocument);
}

export async function findTripById(tripId: string): Promise<Trip | null> {
    const db = admin.firestore();
    const tripDoc = await db.collection("trips").doc(tripId).get();

    if (!tripDoc.exists) {
        return null;
    }

    const data = tripDoc.data() as TripDocument;

    return {
        trip_id: tripDoc.id,
        title: data.title,
        destination: data.destination,
        start_date: data.start_date,
        end_date: data.end_date,
        state: data.state,
        invite_code: data.invite_code,
        planning_started_at: normalizeDateTime(data.planning_started_at),
        planning_end_at: normalizeDateTime(data.planning_end_at),
        voting_end_at: normalizeDateTime(data.voting_end_at),
    };
}

export async function findAcceptedMembersByTripId(
    tripId: string
): Promise<TripMembershipDocument[]> {
    const db = admin.firestore();

    const snapshot = await db
        .collection("trip_members")
        .where("trip_id", "==", tripId)
        .where("invite_status", "==", "accepted")
        .get();

    return snapshot.docs.map((doc) => doc.data() as TripMembershipDocument);
}

export async function findUserById(userId: string): Promise<UserDocument | null> {
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
        return null;
    }

    return userDoc.data() as UserDocument;
}

export async function createTripWithAdminMembership(data: {
    userId: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    planning_end_at: string;
    voting_end_at: string;
}): Promise<Trip> {
    const db = admin.firestore();
    const user = await findUserById(data.userId);

    const tripRef = db.collection("trips").doc();
    const memberRef = db.collection("trip_members").doc();
    const batch = db.batch();
    const planningStartedAt = admin.firestore.Timestamp.now();

    batch.set(tripRef, {
        admin_user_id: data.userId,
        title: data.title,
        destination: data.destination,
        start_date: data.start_date,
        end_date: data.end_date,
        state: "Planning",
        planning_started_at: planningStartedAt,
        planning_end_at: data.planning_end_at,
        voting_end_at: data.voting_end_at,
    });

    batch.set(memberRef, {
        user_id: data.userId,
        user_name: user?.name ?? "Unknown User",
        trip_id: tripRef.id,
        role: "admin",
        invite_status: "accepted",
        planning_done: false,
    });

    await batch.commit();

    return {
        trip_id: tripRef.id,
        title: data.title,
        destination: data.destination,
        start_date: data.start_date,
        end_date: data.end_date,
        state: "Planning",
        role: "admin",
        planning_started_at: planningStartedAt.toDate().toISOString(),
        planning_end_at: data.planning_end_at,
        voting_end_at: data.voting_end_at,
    };
}

export async function findTripByInviteCode(
    inviteCode: string
): Promise<(Trip & { trip_id: string }) | null> {
    const db = admin.firestore();

    const snapshot = await db
        .collection("trips")
        .where("invite_code", "==", inviteCode)
        .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data() as TripDocument;

    return {
        trip_id: doc.id,
        title: data.title,
        destination: data.destination,
        start_date: data.start_date,
        end_date: data.end_date,
        state: data.state,
        invite_code: data.invite_code,
        planning_started_at: normalizeDateTime(data.planning_started_at),
        planning_end_at: normalizeDateTime(data.planning_end_at),
        voting_end_at: normalizeDateTime(data.voting_end_at),
    };
}

export async function findMembership(
    tripId: string,
    userId: string
): Promise<TripMembershipDocument | null> {
    const db = admin.firestore();

    const snapshot = await db
        .collection("trip_members")
        .where("trip_id", "==", tripId)
        .where("user_id", "==", userId)
        .get();

    if (snapshot.empty) return null;

    return snapshot.docs[0].data() as TripMembershipDocument;
}

export async function addTripMember(tripId: string, userId: string): Promise<void> {
    const db = admin.firestore();
    const user = await findUserById(userId);

    await db.collection("trip_members").doc().set({
        user_id: userId,
        user_name: user?.name ?? "Unknown User",
        trip_id: tripId,
        role: "member",
        invite_status: "accepted",
        planning_done: false,
    });
}

export async function createTripWithInviteCode(data: {
    userId: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    invite_code: string;
    planning_end_at: string;
    voting_end_at: string;
}): Promise<Trip> {
    const db = admin.firestore();
    const user = await findUserById(data.userId);

    const tripRef = db.collection("trips").doc();
    const memberRef = db.collection("trip_members").doc();
    const batch = db.batch();
    const planningStartedAt = admin.firestore.Timestamp.now();

    batch.set(tripRef, {
        admin_user_id: data.userId,
        title: data.title,
        destination: data.destination,
        start_date: data.start_date,
        end_date: data.end_date,
        state: "Planning",
        invite_code: data.invite_code,
        planning_started_at: planningStartedAt,
        planning_end_at: data.planning_end_at,
        voting_end_at: data.voting_end_at,
    });

    batch.set(memberRef, {
        user_id: data.userId,
        user_name: user?.name ?? "Unknown User",
        trip_id: tripRef.id,
        role: "admin",
        invite_status: "accepted",
        planning_done: false,
    });

    await batch.commit();

    return {
        trip_id: tripRef.id,
        title: data.title,
        destination: data.destination,
        start_date: data.start_date,
        end_date: data.end_date,
        state: "Planning",
        role: "admin",
        invite_code: data.invite_code,
        planning_started_at: planningStartedAt.toDate().toISOString(),
        planning_end_at: data.planning_end_at,
        voting_end_at: data.voting_end_at,
    };
}

export async function deleteTripById(tripId: string): Promise<void> {
    const db = admin.firestore();

    const tripRef = db.collection("trips").doc(tripId);

    const [
        membersSnapshot,
        itinerarySnapshot,
        finalItinerarySnapshot,
        votesSnapshot,
        attendanceSnapshot,
        activitiesSnapshot,
    ] = await Promise.all([
        db.collection("trip_members").where("trip_id", "==", tripId).get(),
        db.collection("itinerary").where("trip_id", "==", tripId).get(),
        db
            .collection("final_itinerary_slots")
            .where("trip_id", "==", tripId)
            .get(),
        db.collection("activity_votes").where("trip_id", "==", tripId).get(),
        db
            .collection("activity_attendance")
            .where("trip_id", "==", tripId)
            .get(),
        db.collection("activities").where("trip_id", "==", tripId).get(),
    ]);

    const activityIds = activitiesSnapshot.docs
        .map((doc) => doc.id)
        .filter(Boolean);
    const timeslotActivityRefs: FirebaseFirestore.DocumentReference[] = [];

    for (let i = 0; i < activityIds.length; i += 10) {
        const chunk = activityIds.slice(i, i + 10);
        const snapshot = await db
            .collection("timeslot_activities")
            .where("activity_id", "in", chunk)
            .get();

        snapshot.docs.forEach((doc) => {
            timeslotActivityRefs.push(doc.ref);
        });
    }

    await deleteDocumentRefsInBatches(db, [
        tripRef,
        ...membersSnapshot.docs.map((doc) => doc.ref),
        ...itinerarySnapshot.docs.map((doc) => doc.ref),
        ...finalItinerarySnapshot.docs.map((doc) => doc.ref),
        ...votesSnapshot.docs.map((doc) => doc.ref),
        ...attendanceSnapshot.docs.map((doc) => doc.ref),
        ...activitiesSnapshot.docs.map((doc) => doc.ref),
        ...timeslotActivityRefs,
    ]);
}

async function deleteDocumentRefsInBatches(
    db: FirebaseFirestore.Firestore,
    refs: FirebaseFirestore.DocumentReference[],
    batchSize = 450,
): Promise<void> {
    for (let i = 0; i < refs.length; i += batchSize) {
        const batch = db.batch();
        refs.slice(i, i + batchSize).forEach((ref) => batch.delete(ref));
        await batch.commit();
    }
}

export async function removeTripMember(tripId: string, userId: string): Promise<void> {
    const db = admin.firestore();

    const snapshot = await db
        .collection("trip_members")
        .where("trip_id", "==", tripId)
        .where("user_id", "==", userId)
        .get();

    if (snapshot.empty) return;

    await snapshot.docs[0].ref.delete();
}

export async function setMemberPreferences(
    tripId: string,
    userId: string,
    preferences: string[]
): Promise<void> {
    const db = admin.firestore();

    const snapshot = await db
        .collection("trip_members")
        .where("trip_id", "==", tripId)
        .where("user_id", "==", userId)
        .get();

    if (snapshot.empty) return;

    await snapshot.docs[0].ref.update({ preferences });
}

export async function setMemberPlanningDone(
    tripId: string,
    userId: string,
    planningDone: boolean
): Promise<void> {
    const db = admin.firestore();

    const snapshot = await db
        .collection("trip_members")
        .where("trip_id", "==", tripId)
        .where("user_id", "==", userId)
        .get();

    if (snapshot.empty) return;

    await snapshot.docs[0].ref.update({
        planning_done: planningDone,
    });
}

export async function markMemberPlanningDone(tripId: string, userId: string): Promise<void> {
    await setMemberPlanningDone(tripId, userId, true);
}

export async function resetPlanningDoneForTrip(tripId: string): Promise<void> {
    const db = admin.firestore();

    const snapshot = await db
        .collection("trip_members")
        .where("trip_id", "==", tripId)
        .where("invite_status", "==", "accepted")
        .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { planning_done: false });
    });

    await batch.commit();
}

export async function updateTripState(
    tripId: string,
    state: TripState
): Promise<void> {
    const db = admin.firestore();
    const update: Partial<TripDocument> = { state };

    if (state === "Voting") {
        update.planning_end_at = admin.firestore.Timestamp.now();
    }

    if (state === "Final") {
        update.voting_end_at = admin.firestore.Timestamp.now();
    }

    await db.collection("trips").doc(tripId).update(update);
}

export async function updateTripById(
    tripId: string,
    data: Partial<TripDocument>
): Promise<void> {
    const db = admin.firestore();
    await db.collection("trips").doc(tripId).update(data);
}

/**
 * Saves or updates an Expo push token for a user.
 * Stored on the user document under `expoPushToken`.
 */
export async function saveExpoPushToken(
    userId: string,
    token: string
): Promise<void> {
    const db = admin.firestore();
    await db.collection("users").doc(userId).set(
        { expoPushToken: token },
        { merge: true }
    );
}

/**
 * Retrieves Expo push tokens for a list of user IDs.
 * Skips users with no token stored.
 */
export async function getExpoPushTokensByUserIds(
    userIds: string[]
): Promise<string[]> {
    if (userIds.length === 0) return [];

    const db = admin.firestore();

    const chunkSize = 10;
    const tokens: string[] = [];

    for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        const snapshot = await db
            .collection("users")
            .where(admin.firestore.FieldPath.documentId(), "in", chunk)
            .get();

        snapshot.docs.forEach((doc) => {
            const token = doc.data()?.expoPushToken;
            if (typeof token === "string" && token.length > 0) {
                tokens.push(token);
            }
        });
    }

    return tokens;
}

/**
 * Finds the admin user ID for a trip.
 */
export async function findTripAdminUserId(tripId: string): Promise<string | null> {
    const db = admin.firestore();
    const tripDoc = await db.collection("trips").doc(tripId).get();

    if (!tripDoc.exists) return null;

    return tripDoc.data()?.admin_user_id ?? null;
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
