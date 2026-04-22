// src/types/trip.ts
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
    state: string;
    role?: string;
    members?: TripMember[];
    invite_code?: string;
};

export type TripDocument = {
    admin_user_id: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    state: string;
    invite_code?: string;
};

export type TripMembershipDocument = {
    user_id: string;
    trip_id: string;
    role: string;
    invite_status: string;
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