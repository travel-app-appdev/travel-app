// src/api/trips.ts
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
  invite_code?: string;
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
    throw new Error(
      (data as ApiErrorResponse).error || "Failed to create trip"
    );
  }

  return data as Trip;
}

type JoinTripPayload = {
  idToken: string;
  inviteCode: string;
};

export async function joinTrip(payload: JoinTripPayload): Promise<Trip> {
  const response = await fetch(`${API_URL}/trips/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data: Trip | ApiErrorResponse = await response.json();

  if (!response.ok) {
    throw new Error((data as ApiErrorResponse).error || "Failed to join trip");
  }

  return data as Trip;
}

type DeleteTripPayload = {
  idToken: string;
  tripId: string;
};

export async function deleteTrip(payload: DeleteTripPayload): Promise<void> {
  const response = await fetch(`${API_URL}/trips/${payload.tripId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: payload.idToken }),
  });

  if (!response.ok) {
    const data: ApiErrorResponse = await response.json();
    throw new Error(data.error || "Failed to delete trip");
  }
}

type LeaveTripPayload = {
  idToken: string;
  tripId: string;
};

export async function leaveTrip(payload: LeaveTripPayload): Promise<void> {
  const response = await fetch(`${API_URL}/trips/${payload.tripId}/leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: payload.idToken }),
  });

  if (!response.ok) {
    const data: ApiErrorResponse = await response.json();
    throw new Error(data.error || "Failed to leave trip");
  }
}

type RemoveMemberPayload = {
  idToken: string;
  tripId: string;
  memberId: string;
};

export async function removeMember(
  payload: RemoveMemberPayload
): Promise<void> {
  const response = await fetch(
    `${API_URL}/trips/${payload.tripId}/members/${payload.memberId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: payload.idToken }),
    }
}

type UpdateTripPayload = {
    idToken: string;
    tripId: string;
    title?: string;
    destination?: string;
    start_date?: string;
    end_date?: string;
};

export async function updateTrip(payload: UpdateTripPayload): Promise<Trip> {
    const url = `${API_URL}/trips/${payload.tripId}`;
    console.log("PATCH URL:", url);
    
    const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            idToken: payload.idToken,
            title: payload.title,
            destination: payload.destination,
            start_date: payload.start_date,
            end_date: payload.end_date,
        }),
    });

    const text = await response.text();
    console.log("Response status:", response.status);
    console.log("Response body:", text);

    if (!response.ok) {
        let errorMessage = "Failed to update trip";
        try {
            const data = JSON.parse(text);
            errorMessage = data.error || errorMessage;
        } catch {
            errorMessage = text;
        }
        throw new Error(errorMessage);
    }

    return JSON.parse(text) as Trip;
}
