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
    resetPlanningDoneForTrip,
    updateTripState,
    updateTripById,
} from "../repositories/tripsRepository";
import {
    CreateTripWithAuthInput,
    CreateTripWithoutAuthInput,
    JoinTripInput,
    Trip,
    TripDocument,
    TripState,
} from "../types/trip";
import {
    createFinalItineraryForTrip,
    getVotingCompletionStatus,
} from "../repositories/activityRepository";


export async function getTripsForUser(userId: string): Promise<Trip[]> {
    const memberships = await findAcceptedMembershipsByUserId(userId);

    if (memberships.length === 0) {
        return [];
    }

    const tripResults = await Promise.all(
        memberships.map(async (membership): Promise<Trip | null> => {
            let trip: Trip;
            try {
                trip = await advanceTripStateIfNeeded(membership.trip_id);
            } catch (error: any) {
                if (error.status === 404) return null;
                throw error;
            }

            const tripMembers = await findAcceptedMembersByTripId(membership.trip_id);

            const members = tripMembers.map((member) => ({
                id: member.user_id,
                name: (member as any).user_name ?? "Unknown User",
                role: member.role,
                planning_done: member.planning_done ?? false,
            }));

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
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    ensureValidTripTimeline({
        start_date: input.start_date,
        end_date: input.end_date,
        planning_end_at: input.planning_end_at,
        voting_end_at: input.voting_end_at,
    });
    ensurePlanningEndIsFuture(input.planning_end_at);

    return createTripWithInviteCode({
        userId: decoded.uid,
        title: input.title,
        destination: input.destination,
        start_date: input.start_date,
        end_date: input.end_date,
        invite_code: inviteCode,
        planning_end_at: input.planning_end_at,
        voting_end_at: input.voting_end_at
    });
}

export async function createTripForUserWithoutAuth(
    input: CreateTripWithoutAuthInput
): Promise<Trip> {

    ensureValidTripTimeline({
        start_date: input.start_date,
        end_date: input.end_date,
        planning_end_at: input.planning_end_at,
        voting_end_at: input.voting_end_at,
    });
    ensurePlanningEndIsFuture(input.planning_end_at);

    return createTripWithAdminMembership({
        userId: input.userId,
        title: input.title,
        destination: input.destination,
        start_date: input.start_date,
        end_date: input.end_date,
        planning_end_at: input.planning_end_at,
        voting_end_at: input.voting_end_at,
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

    const adminMembership = await findMembership(input.tripId, adminUserId);
    if (!adminMembership || adminMembership.role !== "admin") {
        throw { status: 403, message: "Only the admin can remove members" };
    }

    if (input.memberId === adminUserId) {
        throw { status: 403, message: "Admin cannot remove themselves. Delete the trip instead." };
    }

    const memberMembership = await findMembership(input.tripId, input.memberId);
    if (!memberMembership) {
        throw { status: 404, message: "Member not found in this trip" };
    }

    await removeTripMember(input.tripId, input.memberId);
}

export async function finishPlanningForMember(
    tripId: string,
    idToken: string
): Promise<{ allDone: boolean; tripState: TripState; completedMembers: number; totalMembers: number }> {
    
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userId = decoded.uid;

    const trip = await findTripById(tripId);
    if (!trip) {
        throw { status: 404, message: "Trip not found" };
    }

    if (trip.state !== "Planning") {
        throw { status: 400, message: "Trip is not in Planning state" };
    }

    const membership = await findMembership(tripId, userId);
    if (!membership) {
        throw { status: 404, message: "User is not a member of this trip" };
    }

    if (!membership.planning_done) {
        await markMemberPlanningDone(tripId, userId);
    }

    const allMembers = await findAcceptedMembersByTripId(tripId);
    const completedMembers = allMembers.filter(m => m.planning_done || m.user_id === userId).length;
    const totalMembers = allMembers.length;
    const allDone = completedMembers === totalMembers;

    let nextState: TripState = "Planning";

    if (allDone) {
        nextState = await moveCompletedPlanningToNextState(tripId, allMembers);
    }

    return {
        allDone,
        tripState: nextState,
        completedMembers,
        totalMembers,
    };
}

export async function finishVotingForAdmin(
    tripId: string,
    idToken: string
): Promise<{ tripState: TripState }> {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userId = decoded.uid;

    const trip = await findTripById(tripId);
    if (!trip) {
        throw { status: 404, message: "Trip not found" };
    }

    if (trip.state !== "Voting") {
        throw { status: 400, message: "Trip is not in Voting state" };
    }

    const membership = await findMembership(tripId, userId);
    if (!membership || membership.role !== "admin") {
        throw { status: 403, message: "Only the admin can end voting" };
    }

    await createFinalItineraryForTrip(tripId);
    await updateTripState(tripId, "Final");

    return { tripState: "Final" };
}

export async function updateTripForAdmin(input: {
    idToken: string;
    tripId: string;
    title?: string;
    destination?: string;
    start_date?: string;
    end_date?: string;
    planning_end_at?: string;
    voting_end_at?: string;
}): Promise<Trip> {
    const decoded = await admin.auth().verifyIdToken(input.idToken);
    const userId = decoded.uid;

    const membership = await findMembership(input.tripId, userId);
    if (!membership || membership.role !== "admin") {
        throw { status: 403, message: "Only the admin can update this trip" };
    }

    const current = await findTripById(input.tripId);
    if (!current) {
        throw { status: 404, message: "Trip not found" };
    }

    const effectiveTimeline = {
        start_date: input.start_date ?? current.start_date,
        end_date: input.end_date ?? current.end_date,
        planning_end_at: input.planning_end_at ?? current.planning_end_at,
        voting_end_at: input.voting_end_at ?? current.voting_end_at,
    };

    ensureValidTripTimeline(effectiveTimeline);

    const nextPlanningEnd = input.planning_end_at
        ? parseIsoDate(input.planning_end_at)
        : null;
    const currentPlanningEnd = current.planning_end_at
        ? parseIsoDate(current.planning_end_at)
        : null;
    const planningEndChanged =
        nextPlanningEnd !== null &&
        (currentPlanningEnd === null ||
            nextPlanningEnd.getTime() !== currentPlanningEnd.getTime());

    const members = planningEndChanged
        ? await findAcceptedMembersByTripId(input.tripId)
        : [];
    const allMembersFinishedPlanning =
        members.length > 0 && members.every((member) => member.planning_done);
    const shouldReopenPlanning =
        planningEndChanged &&
        nextPlanningEnd !== null &&
        !isPast(nextPlanningEnd) &&
        (current.state !== "Planning" || allMembersFinishedPlanning);
    const shouldDeriveStateFromTimeline =
        current.state === "Planning" || planningEndChanged;
    const nextState = shouldReopenPlanning
        ? "Planning"
        : shouldDeriveStateFromTimeline
            ? deriveTripStateFromTimeline(effectiveTimeline)
            : current.state;

    const updates: Partial<TripDocument> = {};
    if (input.title !== undefined)       updates.title = input.title;
    if (input.destination !== undefined) updates.destination = input.destination;
    if (input.start_date !== undefined)  updates.start_date = input.start_date;
    if (input.end_date !== undefined)    updates.end_date = input.end_date;
    if (input.planning_end_at !== undefined) updates.planning_end_at = input.planning_end_at;
    if (input.voting_end_at !== undefined) updates.voting_end_at = input.voting_end_at;

    updates.state = nextState;

    await updateTripById(input.tripId, updates);

    if (shouldReopenPlanning) {
        await resetPlanningDoneForTrip(input.tripId);
    }

    const trip = await findTripById(input.tripId);
    if (!trip) throw { status: 404, message: "Trip not found after update" };

    return { ...trip, role: "admin" };
}

function deriveTripStateFromTimeline(input: {
    planning_end_at?: string;
    voting_end_at?: string;
}): TripState {
    const now = new Date();

    const planningEnd = input.planning_end_at ? new Date(input.planning_end_at) : null;
    const votingEnd = input.voting_end_at ? new Date(input.voting_end_at) : null;

    if (planningEnd && now < planningEnd) {
        return "Planning";
    }

    if (votingEnd && now < votingEnd) {
        return "Voting";
    }

    return "Final";
}

function ensureValidTripTimeline(input: {
    start_date?: string;
    end_date?: string;
    planning_end_at?: string;
    voting_end_at?: string;
}) {
    const start = input.start_date ? new Date(input.start_date) : null;
    const end = input.end_date ? new Date(input.end_date) : null;
    const planningEnd = input.planning_end_at ? new Date(input.planning_end_at) : null;
    const votingEnd = input.voting_end_at ? new Date(input.voting_end_at) : null;

    const isInvalid = (d: Date | null) => d !== null && Number.isNaN(d.getTime());

    if (isInvalid(start) || isInvalid(end) || isInvalid(planningEnd) || isInvalid(votingEnd)) {
        throw { status: 400, message: "Invalid date format" };
    }

    if (end) {
        end.setHours(23, 59, 59, 999);
    }

    if (planningEnd && end && planningEnd > end) {
        throw {
            status: 400,
            message: "Planning end cannot be after the trip end date",
        };
    }

    if (votingEnd && planningEnd && votingEnd <= planningEnd) {
        throw {
            status: 400,
            message: "Voting end must be after planning end",
        };
    }

    if (votingEnd && end && votingEnd > end) {
        throw {
            status: 400,
            message: "Voting end cannot be after the trip end date",
        };
    }
}

function ensurePlanningEndIsFuture(planningEndAt?: string) {
    const planningEnd = parseIsoDate(planningEndAt);

    if (planningEnd && isPast(planningEnd)) {
        throw {
            status: 400,
            message: "Planning end must be in the future",
        };
    }
}

export async function advanceTripStateIfNeeded(tripId: string): Promise<Trip> {
    const trip = await findTripById(tripId);

    if (!trip) {
        throw { status: 404, message: "Trip not found" };
    }

    if (trip.state === "Planning") {
        return transitionPlanningToNextState(tripId);
    }

    if (trip.state === "Voting" || trip.state === "Final") {
        const repairedTrip = await repairAdvancedTripWithoutFinishedPlanning(tripId, trip);
        if (repairedTrip.state === "Planning") {
            return repairedTrip;
        }

        if (repairedTrip.state === "Voting") {
            return transitionVotingToFinalIfNeeded(tripId);
        }

        return repairedTrip;
    }

    return trip;
}

async function repairAdvancedTripWithoutFinishedPlanning(
    tripId: string,
    trip: Trip
): Promise<Trip> {
    const members = await findAcceptedMembersByTripId(tripId);

    if (members.length === 0) {
        return trip;
    }

    const planningEnd = parseIsoDate(trip.planning_end_at);
    const planningEnded = planningEnd ? isPast(planningEnd) : false;
    const allMembersFinished = members.every((member) => member.planning_done);

    if (allMembersFinished || planningEnded) {
        return trip;
    }

    await updateTripState(tripId, "Planning");

    const repairedTrip = await findTripById(tripId);
    if (!repairedTrip) {
        throw { status: 404, message: "Trip not found after state repair" };
    }

    return repairedTrip;
}

export async function transitionPlanningToNextState(tripId: string): Promise<Trip> {
    const trip = await findTripById(tripId);

    if (!trip) {
        throw { status: 404, message: "Trip not found" };
    }

    if (trip.state !== "Planning") {
        return trip;
    }

    const members = await findAcceptedMembersByTripId(tripId);
    const planningEnd = parseIsoDate(trip.planning_end_at);
    const planningEnded = planningEnd ? isPast(planningEnd) : false;
    const allMembersFinished =
        members.length > 0 && members.every((member) => member.planning_done);

    if (members.length === 0 || (!planningEnded && !allMembersFinished)) {
        return trip;
    }

    await moveCompletedPlanningToNextState(tripId, members);

    const updatedTrip = await findTripById(tripId);

    if (!updatedTrip) {
        throw { status: 404, message: "Trip not found after Planning transition" };
    }

    return updatedTrip;
}

async function moveCompletedPlanningToNextState(
    tripId: string,
    members: { user_id: string }[]
): Promise<TripState> {
    if (members.length <= 1) {
        await createFinalItineraryForTrip(tripId);
        await updateTripState(tripId, "Final");
        return "Final";
    }

    const completion = await getVotingCompletionStatus(
        tripId,
        members.map((member) => member.user_id)
    );

    if (completion.requiredSlotIds.length === 0) {
        await createFinalItineraryForTrip(tripId);
        await updateTripState(tripId, "Final");
        return "Final";
    }

    await updateTripState(tripId, "Voting");
    return "Voting";
}

function parseIsoDate(value?: string): Date | null {
    if (!value) return null;

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isPast(date: Date): boolean {
    return date.getTime() <= Date.now();
}

export async function transitionVotingToFinalIfNeeded(tripId: string): Promise<Trip> {
    const trip = await findTripById(tripId);

    if (!trip) {
        throw { status: 404, message: "Trip not found" };
    }

    if (trip.state !== "Voting") {
        return trip;
    }

    const votingEnd = parseIsoDate(trip.voting_end_at);
    const votingEnded = votingEnd ? isPast(votingEnd) : false;

    if (!votingEnded) {
        return trip;
    }

    await createFinalItineraryForTrip(tripId);
    await updateTripState(tripId, "Final");

    const updatedTrip = await findTripById(tripId);

    if (!updatedTrip) {
        throw { status: 404, message: "Trip not found after Voting transition" };
    }

    return updatedTrip;
}