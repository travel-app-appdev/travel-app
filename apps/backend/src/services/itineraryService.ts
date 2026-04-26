// apps/backend/src/services/itineraryService.ts
import { generateItinerary } from "../__helpers__/itineraryHelper";
import { saveItinerary, getItineraryByTripId } from "../repositories/itineraryRepository";
import { findTripById } from "../repositories/tripsRepository";
import { Itinerary } from "../types/trip";

export async function generateAndSaveItinerary(tripId: string): Promise<Itinerary> {
    const trip = await findTripById(tripId);

    if (!trip) {
        throw { status: 404, message: "Trip not found" };
    }

    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw { status: 400, message: "Invalid dates" };
    }

    if (end < start) {
        throw { status: 400, message: "endDate cannot be before startDate" };
    }

    const itinerary = generateItinerary(tripId, trip.start_date, trip.end_date);
    await saveItinerary(itinerary);

    return itinerary;
}

export async function getItinerary(tripId: string): Promise<Itinerary> {
    const itinerary = await getItineraryByTripId(tripId);

    if (!itinerary) {
        throw { status: 404, message: "Itinerary not found" };
    }

    return itinerary;
}