import type { ItineraryState } from "@/src/types/itinerary";

export function formatTripTimerText(
  deadline?: string | Date,
  now: number = Date.now()
): string {
  if (!deadline) return "0 days";

  const deadlineDate =
    deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime())) return "0 days";

  const msLeft = deadlineDate.getTime() - now;
  if (msLeft <= 0) return "0 hours";

  const hourMs = 1000 * 60 * 60;
  const dayMs = hourMs * 24;

  if (msLeft < dayMs) {
    const hours = Math.max(1, Math.ceil(msLeft / hourMs));
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }

  const days = Math.ceil(msLeft / dayMs);
  return days === 1 ? "1 day" : `${days} days`;
}

export function formatTripDurationText(
  start: string | Date,
  end: string | Date
): string {
  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "0 days";
  }

  const msDuration = endDate.getTime() - startDate.getTime();
  if (msDuration <= 0) return "0 hours";

  const hourMs = 1000 * 60 * 60;
  const dayMs = hourMs * 24;

  if (msDuration < dayMs) {
    const hours = Math.max(1, Math.ceil(msDuration / hourMs));
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }

  const days = Math.ceil(msDuration / dayMs);
  return days === 1 ? "1 day" : `${days} days`;
}

export function getActiveTripTimerText(
  state: ItineraryState,
  planningEndAt?: string,
  votingEndAt?: string
): string {
  if (state === "planning") return formatTripTimerText(planningEndAt);
  if (state === "voting") return formatTripTimerText(votingEndAt);
  return "0 days";
}
