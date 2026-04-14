import { Request, Response } from "express";
import admin from "../config/firebase";
import { v4 as uuidv4 } from 'uuid';

export const getMyTrips = async (req: Request, res: Response): Promise<void> => {
    const userId = req.query.userId as string;

    if (!userId) {
        res.status(400).json({ error: "userId is required" });
        return;
    }

    try {
        const db = admin.firestore();

        const memberSnapshot = await db
            .collection("trip_members")
            .where("user_id", "==", userId)
            .where("invite_status", "==", "accepted")
            .get();

        if (memberSnapshot.empty) {
            res.json([]);
            return;
        }

        const memberships = memberSnapshot.docs.map((doc) => doc.data());
        const tripIds = memberships.map((member) => member.trip_id);

        const tripPromises = tripIds.map((tripId) =>
            db.collection("trips").doc(tripId).get()
        );

        const tripDocs = await Promise.all(tripPromises);

        const trips = await Promise.all(
            tripDocs
                .filter((doc) => doc.exists)
                .map(async (tripDoc) => {
                    const tripData = tripDoc.data();
                    const membership = memberships.find((m) => m.trip_id === tripDoc.id);

                    const tripMembersSnapshot = await db
                        .collection("trip_members")
                        .where("trip_id", "==", tripDoc.id)
                        .where("invite_status", "==", "accepted")
                        .get();

                    const tripMembers = tripMembersSnapshot.docs.map((doc) => doc.data());

                    const members = await Promise.all(
                        tripMembers.map(async (member) => {
                            const userDoc = await db.collection("users").doc(member.user_id).get();
                            const userData = userDoc.data();

                            return {
                                id: member.user_id,
                                name: userData?.name ?? "Unknown User",
                                role: member.role,
                            };
                        })
                    );

                    return {
                        trip_id: tripDoc.id,
                        title: tripData?.title,
                        destination: tripData?.destination,
                        start_date: tripData?.start_date,
                        end_date: tripData?.end_date,
                        state: tripData?.state,
                        role: membership?.role,
                        members,
                    };
                })
        );

        res.json(trips);
    } catch (error) {
        console.error("Error loading trips:", error);
        res.status(500).json({ error: "Failed to load trips" });
    }
};

export const createTrip = async (req: Request, res: Response): Promise<void> => {
    const { idToken, title, destination, start_date, end_date } = req.body;

    if (!idToken || !title || !destination || !start_date || !end_date) {
        res.status(400).json({
            error: "idToken, title, destination, start_date and end_date are required",
        });
        return;
    }

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

    try {
        // 1) verify token and get authenticated user id
        const decoded = await admin.auth().verifyIdToken(idToken);
        const userId = decoded.uid;

        const db = admin.firestore();

        const tripRef = db.collection("trips").doc();
        const memberRef = db.collection("trip_members").doc();
        const inviteCode = uuidv4(); // generate invite code

        const batch = db.batch();

        // use userId
        batch.set(tripRef, {
            admin_user_id: userId,
            title,
            destination,
            start_date,
            end_date,
            state: "Planning",
            invite_code: inviteCode, // save invite code
        });

        batch.set(memberRef, {
            user_id: userId,
            trip_id: tripRef.id,
            role: "admin",
            invite_status: "accepted",
        });

        await batch.commit();

        res.status(201).json({
            trip_id: tripRef.id,
            title,
            destination,
            start_date,
            end_date,
            state: "Planning",
            role: "admin",
            invite_code: inviteCode, // return invite code to frontend
        });
    } catch (error) {
        console.error("Error creating trip:", error);
        res.status(401).json({ error: "Invalid token or failed to create trip" });
    }
};

//testing integration

export const createTripWithoutAuth = async (req: Request, res: Response): Promise<void> => {
    const { userId, title, destination, start_date, end_date } = req.body;

    if (!userId || !title || !destination || !start_date || !end_date) {
        res.status(400).json({
            error: "userId, title, destination, start_date and end_date are required",
        });
        return;
    }

    try {
        const db = admin.firestore();

        const tripRef = db.collection("trips").doc();
        const memberRef = db.collection("trip_members").doc();
        const inviteCode = uuidv4(); // generate invite code

        const batch = db.batch();

        batch.set(tripRef, {
            admin_user_id: userId,
            title,
            destination,
            start_date,
            end_date,
            state: "Planning",
            invite_code: inviteCode, // save invite code
        });

        batch.set(memberRef, {
            user_id: userId,
            trip_id: tripRef.id,
            role: "admin",
            invite_status: "accepted",
        });

        await batch.commit();

        res.status(201).json({
            trip_id: tripRef.id,
            title,
            destination,
            start_date,
            end_date,
            state: "Planning",
            role: "admin",
            invite_code: inviteCode, // return invite code
        });
    } catch (error) {
        console.error("Error creating trip without auth:", error);
        res.status(500).json({ error: "Failed to create trip" });
    }
};

export const joinTrip = async (req: Request, res: Response): Promise<void> => {
    const { idToken, inviteCode } = req.body;

    if (!idToken || !inviteCode) {
        res.status(400).json({ error: "idToken and inviteCode are required" });
        return;
    }

    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        const userId = decoded.uid;

        const db = admin.firestore();

        const inviteSnapshot = await db
            .collection("trips")
            .where("invite_code", "==", inviteCode)
            .get();

        if (inviteSnapshot.empty) {
            res.status(404).json({ error: "Invalid invite code" });
            return;
        }

        const tripDoc = inviteSnapshot.docs[0];
        const tripId = tripDoc.id;

        const existingMember = await db
            .collection("trip_members")
            .where("trip_id", "==", tripId)
            .where("user_id", "==", userId)
            .get();

        if (!existingMember.empty) {
            res.status(409).json({ error: "User is already a member of this trip" });
            return;
        }

        await db.collection("trip_members").doc().set({
            user_id: userId,
            trip_id: tripId,
            role: "member",
            invite_status: "accepted",
        });

        const tripData = tripDoc.data();

        res.status(200).json({
            trip_id: tripId,
            title: tripData?.title,
            destination: tripData?.destination,
            start_date: tripData?.start_date,
            end_date: tripData?.end_date,
            state: tripData?.state,
            role: "member",
        });

    } catch (error) {
        console.error("Error joining trip:", error);
        res.status(401).json({ error: "Invalid token or failed to join trip" });
    }
};