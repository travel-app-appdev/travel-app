// apps/backend/src/__helpers__/groupTrips.ts
// This file contains a helper function to group trips by their dates.
export type Trip = {
    trip_id: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    state: string;
    role: string;
};

export const groupTripsByDate = (trips: Trip[], today = new Date()) => {
    const normalizedToday = new Date(today);
    normalizedToday.setHours(0, 0, 0, 0);

    const upcomingOrCurrent: Trip[] = [];
    const past: Trip[] = [];

    trips.forEach((trip) => {
        const tripEnd = new Date(trip.end_date);
        tripEnd.setHours(0, 0, 0, 0);

        if (tripEnd < normalizedToday) {
            past.push(trip);
        } else {
            upcomingOrCurrent.push(trip);
        }
    });

    return { upcomingOrCurrent, past };
};