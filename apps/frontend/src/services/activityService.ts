const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type CreateActivityPayload = {
  tripId: string;
  dayId: string;
  slotId: string;
  name: string;
  description?: string;
  address?: string;
  googleMapsUrl?: string;
};

export type UpdateActivityPayload = {
  name: string;
  description?: string;
  address?: string;
  googleMapsUrl?: string;
};

export async function getActivitiesByTrip(tripId: string) {
  const response = await fetch(`${API_URL}/trips/${tripId}/activities`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not load activities");
  }

  return data;
}

export async function createActivity(payload: CreateActivityPayload) {
  const response = await fetch(`${API_URL}/activities`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not create activity");
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
