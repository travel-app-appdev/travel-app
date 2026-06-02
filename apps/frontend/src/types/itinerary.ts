export type ItineraryState = "planning" | "voting" | "final";

export type TimeSlot = {
  id: string;
  label: string;
  startHour: number;
};

export type TripDay = {
  id: string;
  dayNumber: number;
  weekdayShort: string;
};

export type ActivityJoinedMember = {
  user_id: string;
  name: string;
};

export type Activity = {
  id: string;
  slotId: string;
  dayId: string;
  name: string;
  address: string;
  googleMapsUrl?: string;
  startTime?: string;
  endTime?: string;
  joinedCount?: number;
  hasCurrentUserJoined?: boolean;
  joinedMembers?: ActivityJoinedMember[];
  voteCount?: number;
  hasCurrentUserVote?: boolean;
  description?: string;
  isAddedToFinalItinerary?: boolean;
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
  startDate: string;
  endDate: string;
  state: ItineraryState;
  planningStatus: PlanningStatus[];
  activities: Activity[];
};

export type SlotItem = {
  slot: TimeSlot;
  activity?: Activity;
};
