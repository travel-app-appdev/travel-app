const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type TripMember = {
  id: string;
  name: string;
  role: "admin" | "member";
  planning_done?: boolean;
  voting_done?: boolean;
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
  planning_started_at?: string;
  planning_end_at?: string;
  voting_end_at?: string;
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
  planning_end_at: string;
  voting_end_at: string;
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
  );

  if (!response.ok) {
    const data: ApiErrorResponse = await response.json();
    throw new Error(data.error || "Failed to remove member");
  }
}

type UpdateTripPayload = {
  idToken: string;
  tripId: string;
  title?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  planning_end_at?: string;
  voting_end_at?: string;
  state?: "Planning" | "Voting" | "Final";
};

export async function updateTrip(payload: UpdateTripPayload): Promise<Trip> {
  const response = await fetch(`${API_URL}/trips/${payload.tripId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken: payload.idToken,
      title: payload.title,
      destination: payload.destination,
      start_date: payload.start_date,
      end_date: payload.end_date,
      planning_end_at: payload.planning_end_at,
      voting_end_at: payload.voting_end_at,
      state: payload.state,
    }),
  });

  const data: Trip | ApiErrorResponse = await response.json();

  if (!response.ok) {
    throw new Error(
      (data as ApiErrorResponse).error || "Failed to update trip"
    );
  }

  return data as Trip;
}

export type FinishPlanningResponse = {
  allDone: boolean;
  tripState: "Planning" | "Voting";
  completedMembers: number;
  totalMembers: number;
};

type FinishPlanningPayload = {
  idToken: string;
  tripId: string;
};

export async function finishPlanning(
  payload: FinishPlanningPayload
): Promise<FinishPlanningResponse> {
  const response = await fetch(
    `${API_URL}/trips/${payload.tripId}/finish-planning`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: payload.idToken }),
    }
  );

  const data: FinishPlanningResponse | ApiErrorResponse = await response.json();

  if (!response.ok) {
    throw new Error(
      (data as ApiErrorResponse).error || "Failed to finish planning"
    );
  }

  return data as FinishPlanningResponse;
}
