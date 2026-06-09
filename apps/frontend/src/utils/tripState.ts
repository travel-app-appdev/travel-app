type TripState = "Planning" | "Voting" | "Final";

export function parseLocalTripDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);

  if (year && month && day) {
    return new Date(year, month - 1, day);
  }

  return new Date(dateString);
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
  return isPastTripByEndDate(trip.end_date, today) ? "Final" : trip.state;
}
