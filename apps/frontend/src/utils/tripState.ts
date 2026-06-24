import type { TripState } from "@/src/types/trip";

export type { TripState };

export type PhaseKey = "planning" | "voting" | "final" | "memories";
export type PhaseStatus = "past" | "active" | "future";

export function getPhaseStatus(
  phaseId: PhaseKey,
  tripState: TripState,
  tripEnded: boolean,
  isTripStarted: boolean
): PhaseStatus {
  if (tripState === "Planning") {
    if (phaseId === "planning") return "active";
    return "future";
  }
  if (tripState === "Voting") {
    if (phaseId === "planning") return "past";
    if (phaseId === "voting") return "active";
    return "future";
  }
  if (tripState === "Memories" || tripEnded) {
    if (phaseId === "final") return "active";
    if (phaseId === "memories") return isTripStarted ? "active" : "future";
    return "past";
  }
  if (tripState === "Final") {
    if (phaseId === "final") return "active";
    if (phaseId === "memories") return isTripStarted ? "active" : "future";
    return "past";
  }
  return "future";
}

export function parseLocalTripDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);

  if (year && month && day) {
    return new Date(year, month - 1, day);
  }

  return new Date(dateString);
}

export function isTripStartedByStartDate(
  startDateString: string,
  today = new Date()
): boolean {
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);

  const tripStartDate = parseLocalTripDate(startDateString);
  tripStartDate.setHours(0, 0, 0, 0);

  return tripStartDate <= todayStart;
}

export function isPastTripByEndDate(
  endDateString: string,
  today = new Date()
): boolean {
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);

  const tripEndDate = parseLocalTripDate(endDateString);
  tripEndDate.setHours(0, 0, 0, 0);

  return tripEndDate < todayStart;
}

export function getEffectiveTripState(
  trip: { state: TripState; end_date: string },
  today = new Date()
): TripState {
  return isPastTripByEndDate(trip.end_date, today) ? "Memories" : trip.state;
}

export function getChecklistDisplayState(
  tripState: TripState,
  isTripStarted: boolean
): TripState {
  if (tripState === "Final" || tripState === "Memories") {
    return isTripStarted ? "Memories" : "Final";
  }

  return tripState;
}

export function getChecklistSubtitle(tripState: TripState): string {
  switch (tripState) {
    case "Memories":
      return "Here you can upload your photos of the trip and share it to the other members.";
    case "Voting":
      return "Vote on conflicting activities in the itinerary.";
    case "Final":
      return "Here you find your final itinerary of your group.";
    case "Planning":
    default:
      return "Let's plan your trip step by step by adding activities to your itinerary.";
  }
}
