const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type TripMember = {
    id: string;
    name: string;
    role: "admin" | "member";
};

export type Trip = {
    trip_id: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    state: "Planning" | "Voting" | "Final";
    role: "admin" | "member";
    members?: TripMember[];
};

type ApiErrorResponse = {
    error?: string;
};

export async function fetchMyTrips(userId: string): Promise<Trip[]> {
    const response = await fetch(
        `${API_URL}/trips/my?userId=${encodeURIComponent(userId)}`
    );

    const data: Trip[] | ApiErrorResponse = await response.json();

    if (!response.ok) {
        throw new Error((data as ApiErrorResponse).error || "Failed to load trips");
    }

    return data as Trip[];
}

type CreateTripPayload = {
    idToken: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
};

export async function createTrip(payload: CreateTripPayload): Promise<Trip> {
    const response = await fetch(`${API_URL}/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data: Trip | ApiErrorResponse = await response.json();

    if (!response.ok) {
        throw new Error((data as ApiErrorResponse).error || "Failed to create trip");
    }

    return data as Trip;
}