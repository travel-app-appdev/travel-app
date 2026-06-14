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
    setMemberPlanningDone,
    resetPlanningDoneForTrip,
    updateTripState,
    updateTripById,
    getExpoPushTokensByUserIds,
    findTripAdminUserId,
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
    removeMemberDataFromTrip,
} from "../repositories/activityRepository";
import { sendPushNotifications } from "./notificationService";


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

            return buildTripForMembership(trip, membership, tripMembers);
        })
    );

    return tripResults.filter((trip): trip is Trip => trip !== null);
}

export async function getTripForUser(
    tripId: string,
    userId: string
): Promise<Trip> {
    const membership = await findMembership(tripId, userId);

    if (!membership || membership.invite_status !== "accepted") {
        throw { status: 404, message: "Trip not found" };
    }

    const trip = await advanceTripStateIfNeeded(tripId);
    const tripMembers = await findAcceptedMembersByTripId(tripId);

    return buildTripForMembership(trip, membership, tripMembers);
}

function buildTripForMembership(
    trip: Trip,
    membership: { role: string },
    tripMembers: {
        user_id: string;
        user_name?: string;
        role: string;
        planning_done?: boolean;
    }[]
): Trip {
    const members = tripMembers.map((member) => ({
        id: member.user_id,
        name: member.user_name ?? "Unknown User",
        role: member.role,
        planning_done: member.planning_done ?? false,
    }));

    return {
        ...trip,
        role: membership.role,
        members,
    };
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
        voting_end_at: input.voting_end_at,
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

    // Notify the trip admin that a new member joined
    notifyAdminMemberJoined(trip.trip_id, userId, trip.title).catch(
        (err) => console.error("[notifications] joinTripWithInviteCode:", err)
    );

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

    // Fetch trip title and leaving user's name before removing data
    const [trip, leavingUser] = await Promise.all([
        findTripById(input.tripId),
        findUserById(userId),
    ]);

    await removeMemberDataFromTrip(input.tripId, userId);
    await removeTripMember(input.tripId, userId);

    // Notify admin that a member left
    if (trip) {
        notifyAdminMemberLeft(
            input.tripId,
            leavingUser?.name ?? "A member",
            trip.title
        ).catch((err) => console.error("[notifications] leaveTripForMember:", err));
    }
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

    await removeMemberDataFromTrip(input.tripId, input.memberId);
    await removeTripMember(input.tripId, input.memberId);
}

export async function finishPlanningForMember(
    tripId: string,
    idToken: string,
    planningDone = true
): Promise<{ allDone: boolean; tripState: TripState; completedMembers: number; totalMembers: number; planningDone: boolean }> {

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

    await setMemberPlanningDone(tripId, userId, planningDone);

    const allMembers = await findAcceptedMembersByTripId(tripId);
    const completedMembers = allMembers.filter(m => m.planning_done).length;
    const totalMembers = allMembers.length;
    const allDone = totalMembers > 0 && completedMembers === totalMembers;

    let nextState: TripState = "Planning";

    if (allDone) {
        nextState = await moveCompletedPlanningToNextState(tripId, allMembers);

        // Notify all members about the state transition
        notifyAllMembersStateTransition(
            tripId,
            allMembers.map((m) => m.user_id),
            nextState,
            trip.title
        ).catch((err) =>
            console.error("[notifications] finishPlanningForMember allDone:", err)
        );
    } else {
        // Notify other members that this teammate finished planning
        const finishingUser = await findUserById(userId);
        const otherMemberIds = allMembers
            .map((m) => m.user_id)
            .filter((id) => id !== userId);

        notifyTeammateFinishedPlanning(
            otherMemberIds,
            finishingUser?.name ?? "A teammate",
            trip.title
        ).catch((err) =>
            console.error("[notifications] finishPlanningForMember teammate:", err)
        );
    }

    return {
        allDone,
        tripState: nextState,
        completedMembers,
        totalMembers,
        planningDone,
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

    // Notify all members that the final itinerary is ready
    const allMembers = await findAcceptedMembersByTripId(tripId);
    notifyAllMembersStateTransition(
        tripId,
        allMembers.map((m) => m.user_id),
        "Final",
        trip.title
    ).catch((err) =>
        console.error("[notifications] finishVotingForAdmin:", err)
    );

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

    // Past trips are read-only. Once the end date has elapsed the trip moves to
    // the "Past Trips" bucket and can no longer be edited by anyone, including
    // the admin. Uses the same end-date logic that determines that bucket.
    if (hasTripEndDatePassed(current.end_date)) {
        throw {
            status: 400,
            message: "This trip has ended and can no longer be edited",
        };
    }

    const effectiveTimeline = {
        start_date: input.start_date ?? current.start_date,
        end_date: input.end_date ?? current.end_date,
        planning_end_at: input.planning_end_at ?? current.planning_end_at,
        voting_end_at: input.voting_end_at ?? current.voting_end_at,
    };

    // Only validate the timeline when the request actually touches a timeline
    // field. A title- or destination-only edit must not be rejected because of
    // pre-existing (possibly inverted) stored timestamps.
    const touchesTimeline =
        input.start_date !== undefined ||
        input.end_date !== undefined ||
        input.planning_end_at !== undefined ||
        input.voting_end_at !== undefined;

    if (touchesTimeline) {
        ensureValidTripTimeline(effectiveTimeline);
    }

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

// ── Public preview by invite code — no auth required
export async function getTripByInviteCodePublic(
    inviteCode: string
): Promise<Pick<Trip, "trip_id" | "title" | "destination" | "start_date" | "end_date" | "state">> {
    const trip = await findTripByInviteCode(inviteCode);

    if (!trip) {
        throw { status: 404, message: "Invalid invite code" };
    }

    return {
        trip_id: trip.trip_id,
        title: trip.title,
        destination: trip.destination,
        start_date: trip.start_date,
        end_date: trip.end_date,
        state: trip.state,
    };
}

// ─────────────────────────────────────────────
// Notification helpers
// All fire-and-forget: called with .catch() so
// they never interrupt the main request flow.
// ─────────────────────────────────────────────

async function notifyAllMembersStateTransition(
    tripId: string,
    memberUserIds: string[],
    nextState: TripState,
    tripTitle: string
): Promise<void> {
    const tokens = await getExpoPushTokensByUserIds(memberUserIds);
    if (tokens.length === 0) return;

    let title: string;
    let body: string;

    if (nextState === "Voting") {
        title = "Time to vote! 🗳️";
        body = `Planning has ended for "${tripTitle}". Cast your votes now!`;
    } else {
        title = "Your itinerary is ready! 🎉";
        body = `Voting is over for "${tripTitle}". Check your final itinerary!`;
    }

    await sendPushNotifications(tokens, title, body, { tripId });
}

async function notifyAdminMemberJoined(
    tripId: string,
    joiningUserId: string,
    tripTitle: string
): Promise<void> {
    const [adminUserId, joiningUser] = await Promise.all([
        findTripAdminUserId(tripId),
        findUserById(joiningUserId),
    ]);

    if (!adminUserId) return;

    // Don't notify if the admin is the one joining (solo trip edge case)
    if (adminUserId === joiningUserId) return;

    const tokens = await getExpoPushTokensByUserIds([adminUserId]);
    if (tokens.length === 0) return;

    const memberName = joiningUser?.name ?? "Someone";
    await sendPushNotifications(
        tokens,
        "New member joined! 👋",
        `${memberName} joined your trip "${tripTitle}"`,
        { tripId }
    );
}

async function notifyAdminMemberLeft(
    tripId: string,
    leavingMemberName: string,
    tripTitle: string
): Promise<void> {
    const adminUserId = await findTripAdminUserId(tripId);
    if (!adminUserId) return;

    const tokens = await getExpoPushTokensByUserIds([adminUserId]);
    if (tokens.length === 0) return;

    await sendPushNotifications(
        tokens,
        "A member left the trip",
        `${leavingMemberName} left "${tripTitle}"`,
        { tripId }
    );
}

async function notifyTeammateFinishedPlanning(
    otherMemberIds: string[],
    finishingMemberName: string,
    tripTitle: string
): Promise<void> {
    const tokens = await getExpoPushTokensByUserIds(otherMemberIds);
    if (tokens.length === 0) return;

    await sendPushNotifications(
        tokens,
        "Teammate finished planning ✅",
        `${finishingMemberName} finished planning for "${tripTitle}"`,
        {}
    );
}

// ─────────────────────────────────────────────
// State transition logic (unchanged)
// ─────────────────────────────────────────────

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

    if (trip.state === "Final" && hasTripEndDatePassed(trip.end_date)) {
        await updateTripState(tripId, "Memories");

        const memoriesTrip = await findTripById(tripId);
        if (!memoriesTrip) {
            throw { status: 404, message: "Trip not found after memories transition" };
        }

        return memoriesTrip;
    }

    if (
        trip.state !== "Final" &&
        trip.state !== "Memories" &&
        hasTripEndDatePassed(trip.end_date)
    ) {
        await createFinalItineraryForTrip(tripId);
        await updateTripState(tripId, "Memories");

        const finalizedTrip = await findTripById(tripId);
        if (!finalizedTrip) {
            throw { status: 404, message: "Trip not found after end-date memories transition" };
        }

        return finalizedTrip;
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

    const nextState = await moveCompletedPlanningToNextState(tripId, members);

    // Notify all members of the automatic state transition
    notifyAllMembersStateTransition(
        tripId,
        members.map((m) => m.user_id),
        nextState,
        trip.title
    ).catch((err) =>
        console.error("[notifications] transitionPlanningToNextState:", err)
    );

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

export function hasTripEndDatePassed(endDateString?: string): boolean {
    if (!endDateString) return false;

    const endDate = parseLocalDate(endDateString);
    if (!endDate || Number.isNaN(endDate.getTime())) return false;

    endDate.setHours(0, 0, 0, 0);

    const today = new Date(Date.now());
    today.setHours(0, 0, 0, 0);

    return endDate < today;
}

function parseLocalDate(dateString: string): Date | null {
    const [year, month, day] = dateString.split("-").map(Number);

    if (year && month && day) {
        return new Date(year, month - 1, day);
    }

    const parsed = new Date(dateString);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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

    // Notify all members that voting ended and final itinerary is ready
    const allMembers = await findAcceptedMembersByTripId(tripId);
    notifyAllMembersStateTransition(
        tripId,
        allMembers.map((m) => m.user_id),
        "Final",
        trip.title
    ).catch((err) =>
        console.error("[notifications] transitionVotingToFinalIfNeeded:", err)
    );

    const updatedTrip = await findTripById(tripId);

    if (!updatedTrip) {
        throw { status: 404, message: "Trip not found after Voting transition" };
    }

    return updatedTrip;
}