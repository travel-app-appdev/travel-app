// apps/backend/src/repositories/itineraryRepository.ts
import admin from "../config/firebase";
import { Itinerary } from "../types/trip";

export async function saveItinerary(itinerary: Itinerary): Promise<void> {
    const db = admin.firestore();
    const batch = db.batch();

    for (const day of itinerary.days) {
        const ref = db
            .collection("itinerary")
            .doc(`${itinerary.trip_id}_${day.date}`);

        batch.set(ref, {
            trip_id: itinerary.trip_id,
            date: day.date,
            slots: day.slots,
        });
    }

    await batch.commit();
}

export async function getItineraryByTripId(tripId: string): Promise<Itinerary | null> {
    const db = admin.firestore();

    const snapshot = await db
        .collection("itinerary")
        .where("trip_id", "==", tripId)
        .get();

    if (snapshot.empty) return null;

    const days = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            date: data.date,
            slots: data.slots,
        };
    });

    days.sort((a, b) => a.date.localeCompare(b.date));

    return {
        trip_id: tripId,
        days,
    };
}