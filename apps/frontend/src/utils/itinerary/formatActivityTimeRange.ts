import type { Activity } from "@/src/types/itinerary";

export function formatActivityTimeRange(
  activity?: Pick<Activity, "startTime" | "endTime">
) {
  if (!activity?.startTime || !activity?.endTime) return "";

  return `${activity.startTime} - ${activity.endTime}`;
}
