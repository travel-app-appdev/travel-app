export type ItineraryState = "planning" | "voting" | "final";

export type TripDay = {
  id: string;
  isoDate: string; // e.g. 2026-08-14
  dayNumber: number;
  weekdayShort: string; // Tue
  monthShort: string; // Aug
};

export type TimeSlot = {
  id: string; // e.g. 06:00-08:00
  start: string;
  end: string;
  label: string;
};

export type ItineraryActivity = {
  id: string;
  title: string;
  dayIsoDate: string;
  slotId: string;
  location?: string;
  googleMapsUrl?: string;
  participantsCount?: number;
};

export type PlanningMemberStatus = {
  userId: string;
  hasFinishedPlanning: boolean;
};

export type TripItinerary = {
  tripId: string;
  title: string;
  destination: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  state: ItineraryState;
  planningStatus: PlanningMemberStatus[];
  activities: ItineraryActivity[];
};
