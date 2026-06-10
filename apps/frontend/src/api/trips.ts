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

// Minimal public trip info returned by the invite preview endpoint
export type TripPreview = {
  trip_id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  state: "Planning" | "Voting" | "Final";
};

type ApiErrorResponse = {
  error?: string;
};

export class TripApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TripApiError";
    this.status = status;
  }
}

export function isTripNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: unknown }).status === 404
  );
}

type FetchMyTripsOptions = {
  forceRefresh?: boolean;
  allowStaleOnError?: boolean;
  maxAgeMs?: number;
};

type FetchTripOptions = FetchMyTripsOptions;

type TripsCacheEntry = {
  trips: Trip[];
  fetchedAt: number;
};

type TripCacheEntry = {
  trip: Trip;
  fetchedAt: number;
};

const DEFAULT_TRIPS_CACHE_MAX_AGE_MS = 60 * 1000;
const tripsCache = new Map<string, TripsCacheEntry>();
const inFlightTripsRequests = new Map<string, Promise<Trip[]>>();
const tripCache = new Map<string, TripCacheEntry>();
const inFlightTripRequests = new Map<string, Promise<Trip>>();

export function getCachedMyTrips(userId: string): Trip[] | null {
  return tripsCache.get(userId)?.trips ?? null;
}

export function isMyTripsCacheFresh(
  userId: string,
  maxAgeMs = DEFAULT_TRIPS_CACHE_MAX_AGE_MS
): boolean {
  const cached = tripsCache.get(userId);
  return cached ? Date.now() - cached.fetchedAt < maxAgeMs : false;
}

export function invalidateMyTripsCache(userId?: string): void {
  if (userId) {
    tripsCache.delete(userId);
    inFlightTripsRequests.delete(userId);
    [...tripCache.keys()].forEach((key) => {
      if (key.startsWith(`${userId}:`)) {
        tripCache.delete(key);
        inFlightTripRequests.delete(key);
      }
    });
    return;
  }

  tripsCache.clear();
  inFlightTripsRequests.clear();
  tripCache.clear();
  inFlightTripRequests.clear();
}

async function readApiJson<T>(
  response: Response
): Promise<T | ApiErrorResponse> {
  try {
    return (await response.json()) as T | ApiErrorResponse;
  } catch {
    return {};
  }
}

export async function fetchMyTrips(
  userId: string,
  options: FetchMyTripsOptions = {}
): Promise<Trip[]> {
  const {
    forceRefresh = false,
    allowStaleOnError = true,
    maxAgeMs = DEFAULT_TRIPS_CACHE_MAX_AGE_MS,
  } = options;

  const cached = tripsCache.get(userId);
  if (!forceRefresh && cached && Date.now() - cached.fetchedAt < maxAgeMs) {
    return cached.trips;
  }

  const existingRequest = inFlightTripsRequests.get(userId);
  if (!forceRefresh && existingRequest) {
    return existingRequest;
  }

  let request: Promise<Trip[]>;
  request = (async () => {
    try {
      const response = await fetch(
        `${API_URL}/trips/my?userId=${encodeURIComponent(userId)}`
      );

      const data = await readApiJson<Trip[]>(response);

      if (!response.ok) {
        throw new Error(
          (data as ApiErrorResponse).error || "Failed to load trips"
        );
      }

      const trips = data as Trip[];
      replaceCachedTrips(userId, trips, Date.now());

      return trips;
    } catch (error) {
      if (allowStaleOnError && cached) {
        console.warn("Using cached trips after refresh failed:", error);
        return cached.trips;
      }

      throw error;
    }
  })();

  inFlightTripsRequests.set(userId, request);
  const clearInFlightRequest = () => {
    if (inFlightTripsRequests.get(userId) === request) {
      inFlightTripsRequests.delete(userId);
    }
  };
  request.then(clearInFlightRequest, clearInFlightRequest);

  return request;
}

export async function fetchTripForUser(
  userId: string,
  tripId: string,
  options: FetchTripOptions = {}
): Promise<Trip> {
  const {
    forceRefresh = false,
    allowStaleOnError = true,
    maxAgeMs = DEFAULT_TRIPS_CACHE_MAX_AGE_MS,
  } = options;
  const cacheKey = getTripCacheKey(userId, tripId);
  const cached = tripCache.get(cacheKey);

  if (!forceRefresh && cached && Date.now() - cached.fetchedAt < maxAgeMs) {
    return cached.trip;
  }

  const listCached = tripsCache.get(userId);
  const cachedFromList = listCached?.trips.find(
    (trip) => trip.trip_id === tripId
  );

  if (
    !forceRefresh &&
    cachedFromList &&
    listCached &&
    Date.now() - listCached.fetchedAt < maxAgeMs
  ) {
    return cachedFromList;
  }

  const existingRequest = inFlightTripRequests.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    try {
      const response = await fetch(
        `${API_URL}/trips/${encodeURIComponent(
          tripId
        )}?userId=${encodeURIComponent(userId)}`
      );

      const data = await readApiJson<Trip>(response);

      if (!response.ok) {
        if (response.status === 404) {
          removeCachedTrip(userId, tripId);
        }

        throw new TripApiError(
          (data as ApiErrorResponse).error || "Failed to load trip",
          response.status
        );
      }

      const trip = data as Trip;
      const fetchedAt = Date.now();
      tripCache.set(cacheKey, { trip, fetchedAt });
      updateCachedTripList(userId, trip);

      return trip;
    } catch (error) {
      if (isTripNotFoundError(error)) {
        throw error;
      }

      if (allowStaleOnError) {
        if (cached) {
          console.warn("Using cached trip after refresh failed:", error);
          return cached.trip;
        }

        if (cachedFromList) {
          console.warn(
            "Using cached trip list item after refresh failed:",
            error
          );
          return cachedFromList;
        }
      }

      throw error;
    }
  })();

  inFlightTripRequests.set(cacheKey, request);
  const clearInFlightRequest = () => {
    if (inFlightTripRequests.get(cacheKey) === request) {
      inFlightTripRequests.delete(cacheKey);
    }
  };
  request.then(clearInFlightRequest, clearInFlightRequest);

  return request;
}

function invalidateTripsAfterMutation(): void {
  invalidateMyTripsCache();
}

export const TRIPS_CACHE_MAX_AGE_MS = DEFAULT_TRIPS_CACHE_MAX_AGE_MS;

function getTripCacheKey(userId: string, tripId: string): string {
  return `${userId}:${tripId}`;
}

function updateCachedTripList(userId: string, updatedTrip: Trip): void {
  const cached = tripsCache.get(userId);
  if (!cached) return;

  tripsCache.set(userId, {
    trips: cached.trips.map((trip) =>
      trip.trip_id === updatedTrip.trip_id ? updatedTrip : trip
    ),
    fetchedAt: cached.fetchedAt,
  });
}

function removeCachedTrip(userId: string, tripId: string): void {
  const cacheKey = getTripCacheKey(userId, tripId);

  tripCache.delete(cacheKey);
  inFlightTripRequests.delete(cacheKey);

  const cached = tripsCache.get(userId);
  if (!cached) return;

  tripsCache.set(userId, {
    trips: cached.trips.filter((trip) => trip.trip_id !== tripId),
    fetchedAt: cached.fetchedAt,
  });
}

export function removeTripFromCache(userId: string, tripId: string): void {
  removeCachedTrip(userId, tripId);
}

function replaceCachedTrips(userId: string, trips: Trip[], fetchedAt: number) {
  tripsCache.set(userId, {
    trips,
    fetchedAt,
  });

  const returnedTripIds = new Set(trips.map((trip) => trip.trip_id));

  [...tripCache.keys()].forEach((key) => {
    if (!key.startsWith(`${userId}:`)) return;

    const tripId = key.slice(userId.length + 1);
    if (!returnedTripIds.has(tripId)) {
      tripCache.delete(key);
      inFlightTripRequests.delete(key);
    }
  });

  trips.forEach((trip) => {
    tripCache.set(getTripCacheKey(userId, trip.trip_id), {
      trip,
      fetchedAt,
    });
  });
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

  invalidateTripsAfterMutation();
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

  invalidateTripsAfterMutation();
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

  invalidateTripsAfterMutation();
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

  invalidateTripsAfterMutation();
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

  invalidateTripsAfterMutation();
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
  const requestBody = {
    idToken: payload.idToken,
    tripId: payload.tripId,
    title: payload.title,
    destination: payload.destination,
    start_date: payload.start_date,
    end_date: payload.end_date,
    planning_end_at: payload.planning_end_at,
    voting_end_at: payload.voting_end_at,
    state: payload.state,
  };

  const response = await fetch(`${API_URL}/trips/${payload.tripId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${payload.idToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  const data: Trip | ApiErrorResponse = await response.json();

  if (!response.ok) {
    throw new Error(
      (data as ApiErrorResponse).error || "Failed to update trip"
    );
  }

  invalidateTripsAfterMutation();
  return data as Trip;
}

export type FinishPlanningResponse = {
  allDone: boolean;
  tripState: "Planning" | "Voting" | "Final";
  completedMembers: number;
  totalMembers: number;
  planningDone: boolean;
};

type FinishPlanningPayload = {
  idToken: string;
  tripId: string;
  planningDone?: boolean;
};

export async function finishPlanning(
  payload: FinishPlanningPayload
): Promise<FinishPlanningResponse> {
  const response = await fetch(
    `${API_URL}/trips/${payload.tripId}/finish-planning`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken: payload.idToken,
        ...(payload.planningDone !== undefined
          ? { planningDone: payload.planningDone }
          : {}),
      }),
    }
  );

  const data: FinishPlanningResponse | ApiErrorResponse = await response.json();

  if (!response.ok) {
    throw new Error(
      (data as ApiErrorResponse).error || "Failed to finish planning"
    );
  }

  invalidateTripsAfterMutation();
  return data as FinishPlanningResponse;
}

export type FinishVotingResponse = {
  tripState: "Planning" | "Voting" | "Final";
};

type FinishVotingPayload = {
  idToken: string;
  tripId: string;
};

export async function finishVoting(
  payload: FinishVotingPayload
): Promise<FinishVotingResponse> {
  const response = await fetch(
    `${API_URL}/trips/${payload.tripId}/finish-voting`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: payload.idToken }),
    }
  );

  const data: FinishVotingResponse | ApiErrorResponse = await response.json();

  if (!response.ok) {
    throw new Error(
      (data as ApiErrorResponse).error || "Failed to finish voting"
    );
  }

  invalidateTripsAfterMutation();
  return data as FinishVotingResponse;
}

// ── Suggestions ──────────────────────────────────────────────────────────────

export type ActivitySuggestion = {
  name: string;
  address?: string;
  googleMapsUrl?: string;
  latitude: number;
  longitude: number;
  source: "geoapify";
  sourcePlaceId: string;
  matchedPreferences: string[];
};

export async function fetchActivitySuggestions(
  tripId: string,
  slotType: string,
  idToken: string,
  offset = 0
): Promise<ActivitySuggestion[]> {
  const response = await fetch(
    `${API_URL}/trips/${encodeURIComponent(tripId)}/suggestions?slotType=${encodeURIComponent(slotType)}&offset=${offset}`,
    { headers: { Authorization: `Bearer ${idToken}` } }
  );

  const data = await response.json() as { suggestions: ActivitySuggestion[] } | ApiErrorResponse;

  if (!response.ok) {
    throw new Error((data as ApiErrorResponse).error || "Failed to fetch suggestions");
  }

  return (data as { suggestions: ActivitySuggestion[] }).suggestions;
}

export async function updateMemberPreferences(
  tripId: string,
  preferences: string[],
  idToken: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/trips/${encodeURIComponent(tripId)}/members/me/preferences`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ preferences }),
    }
  );

  if (!response.ok) {
    const data: ApiErrorResponse = await response.json();
    throw new Error(data.error || "Failed to update preferences");
  }
}

// ── Fetch public trip preview by invite code (no auth required) ──
export async function fetchTripByInviteCode(
  inviteCode: string
): Promise<TripPreview> {
  const response = await fetch(
    `${API_URL}/trips/invite/${encodeURIComponent(inviteCode.toUpperCase())}`
  );

  const data: TripPreview | ApiErrorResponse = await response.json();

  if (!response.ok) {
    throw new Error((data as ApiErrorResponse).error || "Invalid invite code");
  }

  return data as TripPreview;
}
