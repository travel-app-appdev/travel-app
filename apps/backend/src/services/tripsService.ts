import admin from "../config/firebase";
import { v4 as uuidv4 } from 'uuid';
import {
    createTripWithAdminMembership,
    findAcceptedMembershipsByUserId,
    findAcceptedMembersByTripId,
    findTripById,
    findUserById,
    findTripByInviteCode,
    findMembership,
    addTripMember,
    createTripWithInviteCode,
} from "../repositories/tripsRepository";
import {
    CreateTripWithAuthInput,
    CreateTripWithoutAuthInput,
    JoinTripInput,
    Trip,
} from "../types/trip";

export async function getTripsForUser(userId: string): Promise<Trip[]> {
    const memberships = await findAcceptedMembershipsByUserId(userId);

    if (memberships.length === 0) {
        return [];
    }

    const tripResults = await Promise.all(
        memberships.map(async (membership): Promise<Trip | null> => {
            const trip = await findTripById(membership.trip_id);

            if (!trip) return null;

            const tripMembers = await findAcceptedMembersByTripId(membership.trip_id);

            const members = await Promise.all(
                tripMembers.map(async (member) => {
                    const user = await findUserById(member.user_id);
                    return {
                        id: member.user_id,
                        name: user?.name ?? "Unknown User",
                        role: member.role,
                    };
                })
            );

            return { ...trip, role: membership.role, members };
        })
    );

    return tripResults.filter((trip): trip is Trip => trip !== null);
}

export async function createTripForAuthenticatedUser(
    input: CreateTripWithAuthInput
): Promise<Trip> {
    const decoded = await admin.auth().verifyIdToken(input.idToken);
    const inviteCode = uuidv4();

    return createTripWithInviteCode({
        userId: decoded.uid,
        title: input.title,
        destination: input.destination,
        start_date: input.start_date,
        end_date: input.end_date,
        invite_code: inviteCode,
    });
}

export async function createTripForUserWithoutAuth(
    input: CreateTripWithoutAuthInput
): Promise<Trip> {
    return createTripWithAdminMembership({
        userId: input.userId,
        title: input.title,
        destination: input.destination,
        start_date: input.start_date,
        end_date: input.end_date,
    });
}

export async function joinTripWithInviteCode(input: JoinTripInput): Promise<Trip> {
    const decoded = await admin.auth().verifyIdToken(input.idToken);
    const userId = decoded.uid;

    const trip = await findTripByInviteCode(input.inviteCode);

    if (!trip) {
        throw { status: 404, message: "Invalid invite code" };
    }

    const existing = await findMembership(trip.trip_id, userId);

    if (existing) {
        throw { status: 409, message: "User is already a member of this trip" };
    }

    await addTripMember(trip.trip_id, userId);

    return { ...trip, role: "member" };
}