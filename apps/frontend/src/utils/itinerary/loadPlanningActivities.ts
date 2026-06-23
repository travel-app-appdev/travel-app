import { getActivitiesBySlot } from "@/src/services/activityService";
import type { Activity } from "@/src/types/itinerary";
import { generateTimeSlots } from "@/src/utils/itinerary/generateTimeSlots";
import { generateTripDays } from "@/src/utils/itinerary/generateTripDays";

function splitBackendSlotId(slotId: string) {
  const [dayId, ...slotParts] = slotId.split("_");
  return {
    dayId,
    slotId: slotParts.length > 0 ? slotParts.join("_") : slotId,
  };
}

function mapBackendActivity(
  activity: {
    activity_id: string;
    slot_id?: string;
    name: string;
    description?: string;
    address?: string;
    googleMapsUrl?: string;
    startTime?: string;
    endTime?: string;
    voteCount?: number;
    hasCurrentUserVote?: boolean;
    joinedCount?: number;
    hasCurrentUserJoined?: boolean;
    joinedMembers?: Activity["joinedMembers"];
    isAddedToFinalItinerary?: boolean;
  },
  fallback: { dayId: string; slotId: string }
): Activity {
  const backendSlot = activity.slot_id
    ? splitBackendSlotId(activity.slot_id)
    : fallback;

  return {
    id: activity.activity_id,
    dayId: backendSlot.dayId || fallback.dayId,
    slotId: backendSlot.slotId || fallback.slotId,
    name: activity.name,
    address: activity.address ?? "",
    googleMapsUrl: activity.googleMapsUrl ?? "",
    description: activity.description ?? "",
    voteCount: activity.voteCount ?? 0,
    hasCurrentUserVote: activity.hasCurrentUserVote ?? false,
    startTime: activity.startTime ?? "",
    endTime: activity.endTime ?? "",
    joinedCount: activity.joinedCount ?? 0,
    hasCurrentUserJoined: activity.hasCurrentUserJoined ?? false,
    joinedMembers: activity.joinedMembers ?? [],
    isAddedToFinalItinerary: activity.isAddedToFinalItinerary ?? false,
  };
}

export async function loadPlanningActivitiesForTrip(
  tripId: string,
  startDate: string,
  endDate: string,
  userId?: string
): Promise<Activity[]> {
  const slots = generateTimeSlots();
  const tripDays = generateTripDays(startDate, endDate);

  const allActivities = (
    await Promise.all(
      tripDays.flatMap((day) =>
        slots.map(async (slot) => {
          const slotIdWithDate = `${day.id}_${slot.id}`;
          const slotActivities = await getActivitiesBySlot(
            tripId,
            slotIdWithDate,
            userId
          );

          return slotActivities.map((activity) =>
            mapBackendActivity(activity, {
              dayId: day.id,
              slotId: slot.id,
            })
          );
        })
      )
    )
  ).flat();

  return allActivities;
}

export function mergeActivitiesById(
  existing: Activity[],
  incoming: Activity[]
): Activity[] {
  const merged = new Map(existing.map((activity) => [activity.id, activity]));
  incoming.forEach((activity) => {
    merged.set(activity.id, activity);
  });
  return Array.from(merged.values());
}
