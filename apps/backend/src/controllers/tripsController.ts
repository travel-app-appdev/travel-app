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