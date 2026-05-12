const mockVerifyIdToken = jest.fn();

jest.mock("../config/firebase", () => ({
    __esModule: true,
    default: {
        auth: () => ({
            verifyIdToken: mockVerifyIdToken,
        }),
    },
}));

jest.mock("../repositories/tripsRepository", () => ({
    addTripMember: jest.fn(),
    createTripWithAdminMembership: jest.fn(),
    createTripWithInviteCode: jest.fn(),
    deleteTripById: jest.fn(),
    findAcceptedMembersByTripId: jest.fn(),
    findAcceptedMembershipsByUserId: jest.fn(),
    findMembership: jest.fn(),
    findTripById: jest.fn(),
    findTripByInviteCode: jest.fn(),
    findUserById: jest.fn(),
    markMemberPlanningDone: jest.fn(),
    removeMember: jest.fn(),
    removeTripMember: jest.fn(),
    resetPlanningDoneForTrip: jest.fn(),
    updateTripById: jest.fn(),
    updateTripState: jest.fn(),
}));

jest.mock("../repositories/activityRepository", () => ({
    createActivity: jest.fn(),
    createFinalItineraryForTrip: jest.fn(),
    getActivitiesBySlotId: jest.fn(),
    getActivityById: jest.fn(),
    getCandidateActivitiesByTripId: jest.fn(),
    getFinalActivitiesByTripId: jest.fn(),
    getVotingCompletionStatus: jest.fn(),
    toggleActivityAttendance: jest.fn(),
    updateActivityById: jest.fn(),
    upsertActivityVote: jest.fn(),
}));

import {
    findAcceptedMembersByTripId,
    findMembership,
    findTripById,
    markMemberPlanningDone,
    updateTripState,
} from "../repositories/tripsRepository";
import {
    createFinalItineraryForTrip,
    getActivitiesBySlotId,
    getVotingCompletionStatus,
    upsertActivityVote,
} from "../repositories/activityRepository";
import { voteForActivity } from "../services/activityService";
import {
    finishPlanningForMember,
    transitionPlanningToNextState,
    transitionVotingToFinalIfNeeded,
} from "../services/tripsService";

const TRIP_ID = "trip-123";
const SLOT_ID = "2026-06-01_06:00-08:00";
const ACTIVITY_ID = "activity-123";
const USER_ID = "user-123";
const TOKEN = "token-123";
const NOW = "2026-05-09T12:00:00.000Z";
const PAST_DEADLINE = "2026-05-09T11:59:00.000Z";
const FUTURE_DEADLINE = "2026-05-09T12:01:00.000Z";

function mocked<T extends (...args: any[]) => any>(fn: T) {
    return fn as jest.MockedFunction<T>;
}

describe("voting timer transition", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Date, "now").mockReturnValue(new Date(NOW).getTime());
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("keeps an incomplete voting trip in Voting before the deadline", async () => {
        const trip = {
            trip_id: TRIP_ID,
            title: "Vienna",
            destination: "Vienna",
            start_date: "2026-06-01",
            end_date: "2026-06-03",
            state: "Voting" as const,
            voting_end_at: FUTURE_DEADLINE,
        };

        mocked(findTripById).mockResolvedValue(trip);
        mocked(findAcceptedMembersByTripId).mockResolvedValue([
            { user_id: "user-a", trip_id: TRIP_ID, role: "admin", invite_status: "accepted" },
            { user_id: "user-b", trip_id: TRIP_ID, role: "member", invite_status: "accepted" },
        ]);
        mocked(getVotingCompletionStatus).mockResolvedValue({
            isComplete: false,
            requiredSlotIds: [SLOT_ID],
            completedUserIds: ["user-a"],
        });

        await expect(transitionVotingToFinalIfNeeded(TRIP_ID)).resolves.toBe(trip);

        expect(createFinalItineraryForTrip).not.toHaveBeenCalled();
        expect(updateTripState).not.toHaveBeenCalled();
    });

    it("finalizes an incomplete voting trip after the deadline", async () => {
        const votingTrip = {
            trip_id: TRIP_ID,
            title: "Vienna",
            destination: "Vienna",
            start_date: "2026-06-01",
            end_date: "2026-06-03",
            state: "Voting" as const,
            voting_end_at: PAST_DEADLINE,
        };
        const finalTrip = { ...votingTrip, state: "Final" as const };

        mocked(findTripById)
            .mockResolvedValueOnce(votingTrip)
            .mockResolvedValueOnce(finalTrip);
        mocked(findAcceptedMembersByTripId).mockResolvedValue([
            { user_id: "user-a", trip_id: TRIP_ID, role: "admin", invite_status: "accepted" },
            { user_id: "user-b", trip_id: TRIP_ID, role: "member", invite_status: "accepted" },
        ]);
        mocked(getVotingCompletionStatus).mockResolvedValue({
            isComplete: false,
            requiredSlotIds: [SLOT_ID],
            completedUserIds: ["user-a"],
        });

        await expect(transitionVotingToFinalIfNeeded(TRIP_ID)).resolves.toEqual(finalTrip);

        expect(createFinalItineraryForTrip).toHaveBeenCalledWith(TRIP_ID);
        expect(updateTripState).toHaveBeenCalledWith(TRIP_ID, "Final");
    });

    it("still finalizes before the deadline when voting is complete", async () => {
        const votingTrip = {
            trip_id: TRIP_ID,
            title: "Vienna",
            destination: "Vienna",
            start_date: "2026-06-01",
            end_date: "2026-06-03",
            state: "Voting" as const,
            voting_end_at: FUTURE_DEADLINE,
        };
        const finalTrip = { ...votingTrip, state: "Final" as const };

        mocked(findTripById)
            .mockResolvedValueOnce(votingTrip)
            .mockResolvedValueOnce(finalTrip);
        mocked(findAcceptedMembersByTripId).mockResolvedValue([
            { user_id: USER_ID, trip_id: TRIP_ID, role: "admin", invite_status: "accepted" },
        ]);
        mocked(getVotingCompletionStatus).mockResolvedValue({
            isComplete: true,
            requiredSlotIds: [SLOT_ID],
            completedUserIds: [USER_ID],
        });

        await expect(transitionVotingToFinalIfNeeded(TRIP_ID)).resolves.toEqual(finalTrip);

        expect(createFinalItineraryForTrip).toHaveBeenCalledWith(TRIP_ID);
        expect(updateTripState).toHaveBeenCalledWith(TRIP_ID, "Final");
    });

    it("does not count a vote submitted after the voting deadline", async () => {
        mocked(mockVerifyIdToken).mockResolvedValue({ uid: USER_ID });
        mocked(findTripById).mockResolvedValue({
            trip_id: TRIP_ID,
            title: "Vienna",
            destination: "Vienna",
            start_date: "2026-06-01",
            end_date: "2026-06-03",
            state: "Voting",
            voting_end_at: PAST_DEADLINE,
        });
        mocked(findMembership).mockResolvedValue({
            user_id: USER_ID,
            trip_id: TRIP_ID,
            role: "member",
            invite_status: "accepted",
        });

        await expect(
            voteForActivity({
                idToken: TOKEN,
                tripId: TRIP_ID,
                slotId: SLOT_ID,
                activityId: ACTIVITY_ID,
            })
        ).resolves.toEqual({
            activityId: ACTIVITY_ID,
            slotId: SLOT_ID,
            tripState: "Final",
            voteAccepted: false,
        });

        expect(createFinalItineraryForTrip).toHaveBeenCalledWith(TRIP_ID);
        expect(updateTripState).toHaveBeenCalledWith(TRIP_ID, "Final");
        expect(getActivitiesBySlotId).not.toHaveBeenCalled();
        expect(upsertActivityVote).not.toHaveBeenCalled();
    });

    it("counts an on-time vote and can finalize when it completes voting", async () => {
        mocked(mockVerifyIdToken).mockResolvedValue({ uid: USER_ID });
        mocked(findTripById).mockResolvedValue({
            trip_id: TRIP_ID,
            title: "Vienna",
            destination: "Vienna",
            start_date: "2026-06-01",
            end_date: "2026-06-03",
            state: "Voting",
            voting_end_at: FUTURE_DEADLINE,
        });
        mocked(findMembership).mockResolvedValue({
            user_id: USER_ID,
            trip_id: TRIP_ID,
            role: "member",
            invite_status: "accepted",
        });
        mocked(getActivitiesBySlotId).mockResolvedValue([
            {
                activity_id: ACTIVITY_ID,
                trip_id: TRIP_ID,
                user_id: "owner-123",
                slot_id: SLOT_ID,
                name: "Museum",
                source_type: "manual",
            },
        ]);
        mocked(findAcceptedMembersByTripId).mockResolvedValue([
            { user_id: USER_ID, trip_id: TRIP_ID, role: "member", invite_status: "accepted" },
        ]);
        mocked(getVotingCompletionStatus).mockResolvedValue({
            isComplete: true,
            requiredSlotIds: [SLOT_ID],
            completedUserIds: [USER_ID],
        });

        await expect(
            voteForActivity({
                idToken: TOKEN,
                tripId: TRIP_ID,
                slotId: SLOT_ID,
                activityId: ACTIVITY_ID,
            })
        ).resolves.toEqual({
            activityId: ACTIVITY_ID,
            slotId: SLOT_ID,
            tripState: "Final",
            voteAccepted: true,
        });

        expect(upsertActivityVote).toHaveBeenCalledWith({
            tripId: TRIP_ID,
            slotId: SLOT_ID,
            userId: USER_ID,
            activityId: ACTIVITY_ID,
        });
        expect(createFinalItineraryForTrip).toHaveBeenCalledWith(TRIP_ID);
        expect(updateTripState).toHaveBeenCalledWith(TRIP_ID, "Final");
    });
});

describe("planning collision transition", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mocked(mockVerifyIdToken).mockResolvedValue({ uid: USER_ID });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("moves a multi-person trip directly to Final when planning is done without collisions", async () => {
        mocked(findTripById).mockResolvedValue({
            trip_id: TRIP_ID,
            title: "Vienna",
            destination: "Vienna",
            start_date: "2026-06-01",
            end_date: "2026-06-03",
            state: "Planning",
        });
        mocked(findMembership).mockResolvedValue({
            user_id: USER_ID,
            trip_id: TRIP_ID,
            role: "member",
            invite_status: "accepted",
            planning_done: false,
        });
        mocked(findAcceptedMembersByTripId).mockResolvedValue([
            { user_id: "user-a", trip_id: TRIP_ID, role: "admin", invite_status: "accepted", planning_done: true },
            { user_id: USER_ID, trip_id: TRIP_ID, role: "member", invite_status: "accepted", planning_done: false },
        ]);
        mocked(getVotingCompletionStatus).mockResolvedValue({
            isComplete: true,
            requiredSlotIds: [],
            completedUserIds: ["user-a", USER_ID],
        });

        await expect(finishPlanningForMember(TRIP_ID, TOKEN)).resolves.toEqual({
            allDone: true,
            tripState: "Final",
            completedMembers: 2,
            totalMembers: 2,
        });

        expect(markMemberPlanningDone).toHaveBeenCalledWith(TRIP_ID, USER_ID);
        expect(getVotingCompletionStatus).toHaveBeenCalledWith(TRIP_ID, ["user-a", USER_ID]);
        expect(createFinalItineraryForTrip).toHaveBeenCalledWith(TRIP_ID);
        expect(updateTripState).toHaveBeenCalledWith(TRIP_ID, "Final");
    });

    it("moves a multi-person trip to Voting when planning is done with collisions", async () => {
        mocked(findTripById).mockResolvedValue({
            trip_id: TRIP_ID,
            title: "Vienna",
            destination: "Vienna",
            start_date: "2026-06-01",
            end_date: "2026-06-03",
            state: "Planning",
        });
        mocked(findMembership).mockResolvedValue({
            user_id: USER_ID,
            trip_id: TRIP_ID,
            role: "member",
            invite_status: "accepted",
            planning_done: false,
        });
        mocked(findAcceptedMembersByTripId).mockResolvedValue([
            { user_id: "user-a", trip_id: TRIP_ID, role: "admin", invite_status: "accepted", planning_done: true },
            { user_id: USER_ID, trip_id: TRIP_ID, role: "member", invite_status: "accepted", planning_done: false },
        ]);
        mocked(getVotingCompletionStatus).mockResolvedValue({
            isComplete: false,
            requiredSlotIds: [SLOT_ID],
            completedUserIds: [],
        });

        await expect(finishPlanningForMember(TRIP_ID, TOKEN)).resolves.toEqual({
            allDone: true,
            tripState: "Voting",
            completedMembers: 2,
            totalMembers: 2,
        });

        expect(createFinalItineraryForTrip).not.toHaveBeenCalled();
        expect(updateTripState).toHaveBeenCalledWith(TRIP_ID, "Voting");
    });

    it("keeps a single-person trip moving directly to Final", async () => {
        mocked(findTripById).mockResolvedValue({
            trip_id: TRIP_ID,
            title: "Vienna",
            destination: "Vienna",
            start_date: "2026-06-01",
            end_date: "2026-06-03",
            state: "Planning",
        });
        mocked(findMembership).mockResolvedValue({
            user_id: USER_ID,
            trip_id: TRIP_ID,
            role: "admin",
            invite_status: "accepted",
            planning_done: false,
        });
        mocked(findAcceptedMembersByTripId).mockResolvedValue([
            { user_id: USER_ID, trip_id: TRIP_ID, role: "admin", invite_status: "accepted", planning_done: false },
        ]);

        await expect(finishPlanningForMember(TRIP_ID, TOKEN)).resolves.toEqual({
            allDone: true,
            tripState: "Final",
            completedMembers: 1,
            totalMembers: 1,
        });

        expect(getVotingCompletionStatus).not.toHaveBeenCalled();
        expect(createFinalItineraryForTrip).toHaveBeenCalledWith(TRIP_ID);
        expect(updateTripState).toHaveBeenCalledWith(TRIP_ID, "Final");
    });

    it("uses the same no-collision rule for timer-based planning transitions", async () => {
        const planningTrip = {
            trip_id: TRIP_ID,
            title: "Vienna",
            destination: "Vienna",
            start_date: "2026-06-01",
            end_date: "2026-06-03",
            state: "Planning" as const,
            planning_end_at: PAST_DEADLINE,
        };
        const finalTrip = { ...planningTrip, state: "Final" as const };

        mocked(findTripById)
            .mockResolvedValueOnce(planningTrip)
            .mockResolvedValueOnce(finalTrip);
        mocked(findAcceptedMembersByTripId).mockResolvedValue([
            { user_id: "user-a", trip_id: TRIP_ID, role: "admin", invite_status: "accepted", planning_done: true },
            { user_id: USER_ID, trip_id: TRIP_ID, role: "member", invite_status: "accepted", planning_done: true },
        ]);
        mocked(getVotingCompletionStatus).mockResolvedValue({
            isComplete: true,
            requiredSlotIds: [],
            completedUserIds: ["user-a", USER_ID],
        });

        await expect(transitionPlanningToNextState(TRIP_ID)).resolves.toEqual(finalTrip);

        expect(createFinalItineraryForTrip).toHaveBeenCalledWith(TRIP_ID);
        expect(updateTripState).toHaveBeenCalledWith(TRIP_ID, "Final");
    });
});
