export type TripState = "Planning" | "Voting" | "Final";

export type TripMember = {
    id: string;
    name: string;
    role: string;
};

export type Trip = {
    trip_id: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    state: TripState;
    role?: string;
    members?: TripMember[];
    invite_code?: string;
    planning_started_at?: string;
    planning_end_at?: string;
    voting_end_at?: string;
};

export type TripDocument = {
    admin_user_id: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    state: TripState;
    invite_code?: string;
    planning_started_at?: any;
    planning_end_at?: any;
    voting_end_at?: any;
};

export type TripMembershipDocument = {
    user_id: string;
    trip_id: string;
    role: string;
    invite_status: string;
    planning_done?: boolean;
};

export type UserDocument = {
    uid: string;
    email?: string | null;
    name?: string | null;
    createdAt?: string;
    lastLogin?: string;
};

export type CreateTripInput = {
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    planning_end_at: string;
    voting_end_at: string;
};

export type CreateTripWithAuthInput = CreateTripInput & {
    idToken: string;
};

export type CreateTripWithoutAuthInput = CreateTripInput & {
    userId: string;
};

export type JoinTripInput = {
    idToken: string;
    inviteCode: string;
};

export type TimeSlot = {
    slot_type: string;
    activityId: null;
};

export type ItineraryDay = {
    date: string;
    slots: TimeSlot[];
};

export type Itinerary = {
    trip_id: string;
    days: ItineraryDay[];
};

export type Activity = {
    activity_id: string;
    trip_id: string;
    user_id: string;
    title: string;
    description?: string;
    location_link?: string;
    source_type: "manual";
};

export type TimeSlotActivity = {
    slot_id: string;
    activity_id: string;
    status: "candidate";
};

export type CreateActivityInput = {
    idToken: string;
    title: string;
    description?: string;
    location_link?: string;
};