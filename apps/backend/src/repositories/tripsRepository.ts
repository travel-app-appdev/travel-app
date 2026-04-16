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