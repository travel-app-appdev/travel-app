import admin from "../config/firebase";
import {
    createTripWithAdminMembership,
    findAcceptedMembershipsByUserId,
    findAcceptedMembersByTripId,
    findTripById,
    findUserById,
} from "../repositories/tripsRepository";
import {
    CreateTripWithAuthInput,
    CreateTripWithoutAuthInput,
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

            if (!trip) {
                return null;
            }

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

            return {
                ...trip,
                role: membership.role,
                members,
            };
        })
    );

    return tripResults.filter((trip): trip is Trip => trip !== null);
}

export async function createTripForAuthenticatedUser(
    input: CreateTripWithAuthInput
): Promise<Trip> {
    const decoded = await admin.auth().verifyIdToken(input.idToken);

    return createTripWithAdminMembership({
        userId: decoded.uid,
        title: input.title,
        destination: input.destination,
        start_date: input.start_date,
        end_date: input.end_date,
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