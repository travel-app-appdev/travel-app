const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type BackendTrip = {
    trip_id: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    state: string;
    role: string;
};

export async function getMyTrips(userId: string): Promise<BackendTrip[]> {
    const response = await fetch(
        `${API_URL}/trips/my?userId=${encodeURIComponent(userId)}`
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Failed to load trips");
    }

    return data;
}