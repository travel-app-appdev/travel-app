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

    return snapshot.docs.map(
        (doc) => doc.data() as TripMembershipDocument
    );
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

    return snapshot.docs.map(
        (doc) => doc.data() as TripMembershipDocument
    );
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
}): Promise<Trip> {
    const db = admin.firestore();

    const tripRef = db.collection("trips").doc();
    const memberRef = db.collection("trip_members").doc();
    const batch = db.batch();

    batch.set(tripRef, {
        admin_user_id: data.userId,
        title: data.title,
        destination: data.destination,
        start_date: data.start_date,
        end_date: data.end_date,
        state: "Planning",
    });

    batch.set(memberRef, {
        user_id: data.userId,
        trip_id: tripRef.id,
        role: "admin",
        invite_status: "accepted",
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
    };
}

export async function findTripByInviteCode(inviteCode: string): Promise<(Trip & { trip_id: string }) | null> {
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
    };
}

export async function findMembership(tripId: string, userId: string): Promise<TripMembershipDocument | null> {
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

    await db.collection("trip_members").doc().set({
        user_id: userId,
        trip_id: tripId,
        role: "member",
        invite_status: "accepted",
    });
}

export async function createTripWithInviteCode(data: {
    userId: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    invite_code: string;
}): Promise<Trip> {
    const db = admin.firestore();

    const tripRef = db.collection("trips").doc();
    const memberRef = db.collection("trip_members").doc();
    const batch = db.batch();

    batch.set(tripRef, {
        admin_user_id: data.userId,
        title: data.title,
        destination: data.destination,
        start_date: data.start_date,
        end_date: data.end_date,
        state: "Planning",
        invite_code: data.invite_code,
    });

    batch.set(memberRef, {
        user_id: data.userId,
        trip_id: tripRef.id,
        role: "admin",
        invite_status: "accepted",
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
    };
}

export async function deleteTripById(tripId: string): Promise<void> {
    const db = admin.firestore();
    const batch = db.batch();

    // Delete the trip document
    const tripRef = db.collection("trips").doc(tripId);
    batch.delete(tripRef);

    // Delete all trip_members documents for this trip
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