import { Request, Response } from "express";
import admin from "../config/firebase";

export const getMyTrips = async (req: Request, res: Response): Promise<void> => {
    const userId = req.query.userId as string;

    if (!userId) {
        res.status(400).json({ error: "userId is required" });
        return;
    }

    try {
        const memberSnapshot = await admin
            .firestore()
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
            admin.firestore().collection("trips").doc(tripId).get()
        );

        const tripDocs = await Promise.all(tripPromises);

        const trips = tripDocs
            .filter((doc) => doc.exists)
            .map((doc) => {
                const data = doc.data();
                const membership = memberships.find((m) => m.trip_id === doc.id);

                return {
                    trip_id: doc.id,
                    title: data?.title,
                    destination: data?.destination,
                    start_date: data?.start_date,
                    end_date: data?.end_date,
                    state: data?.state,
                    role: membership?.role,
                };
            });

        res.json(trips);
    } catch (error) {
        console.error("Error loading trips:", error);
        res.status(500).json({ error: "Failed to load trips" });
    }
};

export const createTrip = async (req: Request, res: Response): Promise<void> => {
    const { userId, title, destination, start_date, end_date } = req.body;

    if (!userId || !title || !destination || !start_date || !end_date) {
        res.status(400).json({
            error: "userId, title, destination, start_date and end_date are required",
        });
        return;
    }

    if (new Date(end_date) < new Date(start_date)) {
        res.status(400).json({ error: "end_date cannot be before start_date" });
        return;
    }

    try {
        const db = admin.firestore();

        const tripRef = db.collection("trips").doc();
        const memberRef = db.collection("trip_members").doc();

        const batch = db.batch();

        batch.set(tripRef, {
            admin_user_id: userId,
            title,
            destination,
            start_date,
            end_date,
            state: "Planning",
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
        });
    } catch (error) {
        console.error("Error creating trip:", error);
        res.status(500).json({ error: "Failed to create trip" });
    }
};