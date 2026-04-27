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
    markMemberPlanningDone,
    updateTripState,
    updateTripById,
} from "../repositories/tripsRepository";
import {
    CreateTripWithAuthInput,
    CreateTripWithoutAuthInput,
    JoinTripInput,
    Trip,
    TripDocument,
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

export async function finishPlanningForMember(
    tripId: string,
    idToken: string
): Promise<{ allDone: boolean; tripState: string; completedMembers: number; totalMembers: number }> {
    
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userId = decoded.uid;

    // check trip exists
    const trip = await findTripById(tripId);
    if (!trip) {
        throw { status: 404, message: "Trip not found" };
    }

    // check trip is in Planning state
    if (trip.state !== "Planning") {
        throw { status: 400, message: "Trip is not in Planning state" };
    }

    // check user is a member
    const membership = await findMembership(tripId, userId);
    if (!membership) {
        throw { status: 404, message: "User is not a member of this trip" };
    }

    // check if already done
    if (membership.planning_done) {
        throw { status: 409, message: "Member already finished planning" };
    }

    // mark member as done
    await markMemberPlanningDone(tripId, userId);

    // get all members and check if all are done
    const allMembers = await findAcceptedMembersByTripId(tripId);
    const completedMembers = allMembers.filter(m => m.planning_done || m.user_id === userId).length;
    const totalMembers = allMembers.length;
    const allDone = completedMembers === totalMembers;

    // if all done → switch trip state to Voting
    if (allDone) {
        await updateTripState(tripId, "Voting");
    }

    return {
        allDone,
        tripState: allDone ? "Voting" : "Planning",
        completedMembers,
        totalMembers,
    };
    } 
// New function to update trip details by admin

export async function updateTripForAdmin(input: {
    idToken: string;
    tripId: string;
    title?: string;
    destination?: string;
    start_date?: string;
    end_date?: string;
}): Promise<Trip> {
    const decoded = await admin.auth().verifyIdToken(input.idToken);
    const userId = decoded.uid;

    const membership = await findMembership(input.tripId, userId);
    if (!membership || membership.role !== "admin") {
        throw { status: 403, message: "Only the admin can update this trip" };
    }

    const updates: Partial<Pick<TripDocument, "title" | "destination" | "start_date" | "end_date">> = {};
    if (input.title !== undefined)       updates.title = input.title;
    if (input.destination !== undefined) updates.destination = input.destination;
    if (input.start_date !== undefined)  updates.start_date = input.start_date;
    if (input.end_date !== undefined)    updates.end_date = input.end_date;

    await updateTripById(input.tripId, updates);

    const trip = await findTripById(input.tripId);
    if (!trip) throw { status: 404, message: "Trip not found after update" };

    return { ...trip, role: "admin" };
}