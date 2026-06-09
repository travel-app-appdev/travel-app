import type { Activity } from "@/src/types/itinerary";

type ActivityTimeRange = Pick<Activity, "startTime" | "endTime">;

export function isOvernightActivityTimeRange(
  activity?: ActivityTimeRange
): boolean {
  return Boolean(
    activity?.startTime &&
    activity?.endTime &&
    activity.endTime < activity.startTime
  );
}

export function formatActivityTimeRange(activity?: ActivityTimeRange) {
  if (!activity?.startTime || !activity?.endTime) return "";

  const nextDaySuffix = isOvernightActivityTimeRange(activity)
    ? " (+1 day)"
    : "";

  return `${activity.startTime} - ${activity.endTime}${nextDaySuffix}`;
}
