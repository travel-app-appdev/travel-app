import admin from "../config/firebase";
import {
    Trip,
    TripDocument,
    TripMembershipDocument,
    UserDocument,
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
    const batch = db.batch();

    const tripRef = db.collection("trips").doc(tripId);
    batch.delete(tripRef);

    const membersSnapshot = await db
        .collection("trip_members")
        .where("trip_id", "==", tripId)
        .get();

    membersSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();
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

export async function updateTripState(tripId: string, state: string): Promise<void> {
    const db = admin.firestore();
    await db.collection("trips").doc(tripId).update({ state });
}

export async function updateTripById(
    tripId: string,
    data: Partial<TripDocument>
): Promise<void> {
    const db = admin.firestore();
    await db.collection("trips").doc(tripId).update(data);
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
