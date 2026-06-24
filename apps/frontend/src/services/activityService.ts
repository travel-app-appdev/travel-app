import { invalidateMyTripsCache } from "@/src/api/trips";
import type { TripState } from "@/src/api/trips";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

export type JoinedMember = {
  user_id: string;
  name: string;
};

export type BackendActivity = {
  activity_id: string;
  trip_id?: string;
  user_id?: string;
  slot_id?: string;
  name: string;
  description?: string;
  address?: string;
  googleMapsUrl?: string;
  startTime?: string;
  endTime?: string;
  created_at?: string;
  voteCount?: number;
  hasCurrentUserVote?: boolean;
  joinedCount?: number;
  hasCurrentUserJoined?: boolean;
  joinedMembers?: JoinedMember[];
  isAddedToFinalItinerary?: boolean;
  source_type?: string;
};

export type FinalItinerarySlotDto = {
  slot_id: string;
  selectedActivity: BackendActivity;
  alternativeActivities: BackendActivity[];
  addedAlternativeActivities: BackendActivity[];
  alternativeCount: number;
};

export type FinalItineraryResponseDto = {
  trip_id: string;
  slots: FinalItinerarySlotDto[];
};

export type CreateActivityPayload = {
  idToken: string;
  tripId: string;
  dayId: string;
  slotId: string;
  name: string;
  description?: string;
  address?: string;
  googleMapsUrl?: string;
  startTime?: string;
  endTime?: string;
};

export type UpdateActivityPayload = {
  idToken: string;
  name: string;
  description?: string;
  address?: string;
  googleMapsUrl?: string;
  startTime?: string;
  endTime?: string;
};

export type VoteForActivityResponse = {
  activityId: string;
  slotId: string;
  tripState: TripState;
  voteAccepted?: boolean;
};

export type ToggleAddedAlternativeResponse = {
  added: boolean;
  addedAlternativeActivityIds: string[];
};

export type ToggleActivityAttendanceResponse = {
  joined: boolean;
  joinedCount: number;
  joinedMembers?: JoinedMember[];
};

export type CreatedActivityResponse = BackendActivity & {
  dayId: string;
};

export async function createActivity(
  payload: CreateActivityPayload
): Promise<CreatedActivityResponse> {
  const encodedSlotId = encodePathSegment(payload.slotId);
  const response = await fetch(
    `${API_URL}/itinerary/${payload.tripId}/slots/${encodedSlotId}/activities`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idToken: payload.idToken,
        name: payload.name,
        description: payload.description,
        address: payload.address,
        googleMapsUrl: payload.googleMapsUrl,
        startTime: payload.startTime,
        endTime: payload.endTime,
      }),
    }
  );

  const data = (await response.json()) as BackendActivity & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      (data as { error?: string }).error || "Could not create activity"
    );
  }

  return { ...data, dayId: payload.dayId };
}

export async function getActivitiesBySlot(
  tripId: string,
  slotId: string,
  userId?: string
): Promise<BackendActivity[]> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const encodedSlotId = encodePathSegment(slotId);
  const response = await fetch(
    `${API_URL}/itinerary/${tripId}/slots/${encodedSlotId}/activities${query}`
  );

  const data = (await response.json()) as
    | BackendActivity[]
    | { error?: string };

  if (!response.ok) {
    throw new Error(
      (data as { error?: string }).error || "Could not load activities"
    );
  }

  return data as BackendActivity[];
}

export async function voteForActivity(payload: {
  idToken: string;
  tripId: string;
  slotId: string;
  activityId: string;
}): Promise<VoteForActivityResponse> {
  const encodedSlotId = encodePathSegment(payload.slotId);
  const response = await fetch(
    `${API_URL}/itinerary/${payload.tripId}/slots/${encodedSlotId}/votes`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idToken: payload.idToken,
        activityId: payload.activityId,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not add vote");
  }

  invalidateMyTripsCache();
  return data as VoteForActivityResponse;
}

export async function getFinalItineraryActivities(
  tripId: string,
  userId?: string
): Promise<FinalItineraryResponseDto> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const response = await fetch(`${API_URL}/itinerary/${tripId}/final${query}`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not load final itinerary");
  }

  return data as FinalItineraryResponseDto;
}

export async function toggleActivityAttendance(payload: {
  idToken: string;
  tripId: string;
  slotId: string;
  activityId: string;
}): Promise<ToggleActivityAttendanceResponse> {
  const encodedSlotId = encodePathSegment(payload.slotId);
  const response = await fetch(
    `${API_URL}/itinerary/${payload.tripId}/slots/${encodedSlotId}/attendance`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idToken: payload.idToken,
        activityId: payload.activityId,
      }),
    }
  );

  const data = (await response.json()) as
    | ToggleActivityAttendanceResponse
    | { error?: string };

  if (!response.ok) {
    throw new Error(
      (data as { error?: string }).error || "Could not update attendance"
    );
  }

  return data as ToggleActivityAttendanceResponse;
}

export async function toggleAddedAlternativeToItinerary(payload: {
  idToken: string;
  tripId: string;
  slotId: string;
  activityId: string;
}): Promise<ToggleAddedAlternativeResponse> {
  const encodedSlotId = encodePathSegment(payload.slotId);
  const response = await fetch(
    `${API_URL}/itinerary/${payload.tripId}/slots/${encodedSlotId}/added-alternatives`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idToken: payload.idToken,
        activityId: payload.activityId,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not update suggested activity");
  }

  return data as ToggleAddedAlternativeResponse;
}

export async function updateActivity(
  activityId: string,
  payload: UpdateActivityPayload
): Promise<BackendActivity> {
  const response = await fetch(`${API_URL}/activities/${activityId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as BackendActivity | { error?: string };

  if (!response.ok) {
    throw new Error(
      (data as { error?: string }).error || "Could not update activity"
    );
  }

  return data as BackendActivity;
}

export async function deleteActivity(activityId: string) {
  const response = await fetch(`${API_URL}/activities/${activityId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Could not delete activity");
  }

  return true;
}
