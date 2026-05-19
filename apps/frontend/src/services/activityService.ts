import { invalidateMyTripsCache } from "@/src/api/trips";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type CreateActivityPayload = {
  idToken: string;
  tripId: string;
  dayId: string;
  slotId: string;
  name: string;
  description?: string;
  address?: string;
  googleMapsUrl?: string;
};

export type UpdateActivityPayload = {
  idToken: string;
  name: string;
  description?: string;
  address?: string;
  googleMapsUrl?: string;
};

export type VoteForActivityResponse = {
  activityId: string;
  slotId: string;
  tripState: "Planning" | "Voting" | "Final";
  voteAccepted?: boolean;
};

export async function createActivity(payload: CreateActivityPayload) {
  const response = await fetch(
    `${API_URL}/itinerary/${payload.tripId}/slots/${payload.slotId}/activities`,
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
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not create activity");
  }

  return { ...data, dayId: payload.dayId };
}

export async function getActivitiesBySlot(
  tripId: string,
  slotId: string,
  userId?: string
) {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const response = await fetch(
    `${API_URL}/itinerary/${tripId}/slots/${slotId}/activities${query}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not load activities");
  }

  return data;
}

export async function voteForActivity(payload: {
  idToken: string;
  tripId: string;
  slotId: string;
  activityId: string;
}): Promise<VoteForActivityResponse> {
  const response = await fetch(
    `${API_URL}/itinerary/${payload.tripId}/slots/${payload.slotId}/votes`,
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
) {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const response = await fetch(`${API_URL}/itinerary/${tripId}/final${query}`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not load final itinerary");
  }

  return data;
}

export async function toggleActivityAttendance(payload: {
  idToken: string;
  tripId: string;
  slotId: string;
  activityId: string;
}) {
  const response = await fetch(
    `${API_URL}/itinerary/${payload.tripId}/slots/${payload.slotId}/attendance`,
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
    throw new Error(data.error || "Could not update attendance");
  }

  return data;
}

export async function updateActivity(
  activityId: string,
  payload: UpdateActivityPayload
) {
  const response = await fetch(`${API_URL}/activities/${activityId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not update activity");
  }

  return data;
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
