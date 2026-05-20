// src/types/itinerary.ts

export type ItineraryState = "planning" | "voting" | "final";

export type TimeSlot = {
  id: string;
  label: string; // e.g. "Morning Activity"
  startHour: number;
};

export type TripDay = {
  id: string; // ISO date string "2024-08-14"
  dayNumber: number; // 14
  weekdayShort: string; // "Tue"
};

export type ActivityJoinedMember = {
  user_id: string;
  name: string;
};

export type Activity = {
  id: string;
  slotId: string; // matches TimeSlot.id
  dayId: string; // ISO date string
  name: string;
  address: string;
  googleMapsUrl?: string;
  joinedCount?: number; // for final state
  hasCurrentUserJoined?: boolean;
  joinedMembers?: ActivityJoinedMember[];
  voteCount?: number;
  hasCurrentUserVote?: boolean;
  description?: string;
};

export type VotingActivity = Activity & {
  voteCount?: number;
};

export type PlanningStatus = {
  userId: string;
  hasFinishedPlanning: boolean;
};

export type TripItinerary = {
  tripId: string;
  title: string;
  destination: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  state: ItineraryState;
  planningStatus: PlanningStatus[];
  activities: Activity[];
};

export type SlotItem = {
  slot: TimeSlot;
  activity?: Activity;
};
