import admin from "../config/firebase";
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
    deleteTripById,
    removeTripMember,
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
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

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

export async function deleteTripForAdmin(input: {
    idToken: string;
    tripId: string;
}): Promise<void> {
    const decoded = await admin.auth().verifyIdToken(input.idToken);
    const userId = decoded.uid;

    const membership = await findMembership(input.tripId, userId);

    if (!membership || membership.role !== "admin") {
        throw { status: 403, message: "Only the admin can delete this trip" };
    }

    await deleteTripById(input.tripId);
}

export async function leaveTripForMember(input: {
    idToken: string;
    tripId: string;
}): Promise<void> {
    const decoded = await admin.auth().verifyIdToken(input.idToken);
    const userId = decoded.uid;

    const membership = await findMembership(input.tripId, userId);

    if (!membership) {
        throw { status: 404, message: "You are not a member of this trip" };
    }

    if (membership.role === "admin") {
        throw { status: 403, message: "Admin cannot leave the trip. Delete it instead." };
    }

    await removeTripMember(input.tripId, userId);
}

export async function removeMemberForAdmin(input: {
    idToken: string;
    tripId: string;
    memberId: string;
}): Promise<void> {
    const decoded = await admin.auth().verifyIdToken(input.idToken);
    const adminUserId = decoded.uid;

    // Verify the requester is an admin of this trip
    const adminMembership = await findMembership(input.tripId, adminUserId);
    if (!adminMembership || adminMembership.role !== "admin") {
        throw { status: 403, message: "Only the admin can remove members" };
    }

    // Prevent admin from removing themselves
    if (input.memberId === adminUserId) {
        throw { status: 403, message: "Admin cannot remove themselves. Delete the trip instead." };
    }

    // Verify the member to remove actually belongs to this trip
    const memberMembership = await findMembership(input.tripId, input.memberId);
    if (!memberMembership) {
        throw { status: 404, message: "Member not found in this trip" };
    }

    await removeTripMember(input.tripId, input.memberId);
}