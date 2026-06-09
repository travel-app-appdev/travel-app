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
  getExpoPushTokensByUserIds: jest.fn(),
  markMemberPlanningDone: jest.fn(),
  setMemberPlanningDone: jest.fn(),
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
  findAcceptedMembershipsByUserId,
  findMembership,
  findTripById,
  getExpoPushTokensByUserIds,
  markMemberPlanningDone,
  setMemberPlanningDone,
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
  advanceTripStateIfNeeded,
  getTripsForUser,
  transitionPlanningToNextState,
  transitionVotingToFinalIfNeeded,
} from "../services/tripsService";

const TRIP_ID = "trip-123";
const SLOT_ID = "2026-06-01_Morning Activity";
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
    jest.resetAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(new Date(NOW).getTime());
    mocked(getExpoPushTokensByUserIds).mockResolvedValue([]);
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
    await expect(transitionVotingToFinalIfNeeded(TRIP_ID)).resolves.toBe(trip);

    expect(findAcceptedMembersByTripId).not.toHaveBeenCalled();
    expect(getVotingCompletionStatus).not.toHaveBeenCalled();
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
      {
        user_id: "user-a",
        trip_id: TRIP_ID,
        role: "admin",
        invite_status: "accepted",
      },
      {
        user_id: USER_ID,
        trip_id: TRIP_ID,
        role: "member",
        invite_status: "accepted",
      },
    ]);

    await expect(transitionVotingToFinalIfNeeded(TRIP_ID)).resolves.toEqual(
      finalTrip,
    );

    expect(findAcceptedMembersByTripId).toHaveBeenCalledWith(TRIP_ID);
    expect(getVotingCompletionStatus).not.toHaveBeenCalled();
    expect(createFinalItineraryForTrip).toHaveBeenCalledWith(TRIP_ID);
    expect(updateTripState).toHaveBeenCalledWith(TRIP_ID, "Final");
  });

  it("keeps a complete voting trip in Voting until the deadline", async () => {
    const votingTrip = {
      trip_id: TRIP_ID,
      title: "Vienna",
      destination: "Vienna",
      start_date: "2026-06-01",
      end_date: "2026-06-03",
      state: "Voting" as const,
      voting_end_at: FUTURE_DEADLINE,
    };

    mocked(findTripById).mockResolvedValue(votingTrip);

    await expect(transitionVotingToFinalIfNeeded(TRIP_ID)).resolves.toBe(
      votingTrip,
    );

    expect(findAcceptedMembersByTripId).not.toHaveBeenCalled();
    expect(getVotingCompletionStatus).not.toHaveBeenCalled();
    expect(createFinalItineraryForTrip).not.toHaveBeenCalled();
    expect(updateTripState).not.toHaveBeenCalled();
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
      }),
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

  it("counts an on-time vote and stays in Voting until the deadline", async () => {
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

    await expect(
      voteForActivity({
        idToken: TOKEN,
        tripId: TRIP_ID,
        slotId: SLOT_ID,
        activityId: ACTIVITY_ID,
      }),
    ).resolves.toEqual({
      activityId: ACTIVITY_ID,
      slotId: SLOT_ID,
      tripState: "Voting",
      voteAccepted: true,
    });

    expect(upsertActivityVote).toHaveBeenCalledWith({
      tripId: TRIP_ID,
      slotId: SLOT_ID,
      userId: USER_ID,
      activityId: ACTIVITY_ID,
    });
    expect(findAcceptedMembersByTripId).not.toHaveBeenCalled();
    expect(getVotingCompletionStatus).not.toHaveBeenCalled();
    expect(createFinalItineraryForTrip).not.toHaveBeenCalled();
    expect(updateTripState).not.toHaveBeenCalled();
  });
});

describe("trip list state repair", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(new Date(NOW).getTime());
    mocked(getExpoPushTokensByUserIds).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("advances trips before returning them from the user trip list", async () => {
    const planningTrip = {
      trip_id: TRIP_ID,
      title: "Vienna",
      destination: "Vienna",
      start_date: "2026-06-01",
      end_date: "2026-06-03",
      state: "Planning" as const,
      planning_end_at: PAST_DEADLINE,
    };
    const votingTrip = { ...planningTrip, state: "Voting" as const };

    mocked(findAcceptedMembershipsByUserId).mockResolvedValue([
      {
        user_id: USER_ID,
        trip_id: TRIP_ID,
        role: "member",
        invite_status: "accepted",
      },
    ]);
    mocked(findTripById)
      .mockResolvedValueOnce(planningTrip)
      .mockResolvedValueOnce(planningTrip)
      .mockResolvedValueOnce(votingTrip);
    mocked(findAcceptedMembersByTripId).mockResolvedValue([
      {
        user_id: "user-a",
        trip_id: TRIP_ID,
        role: "admin",
        invite_status: "accepted",
        planning_done: false,
      },
      {
        user_id: USER_ID,
        trip_id: TRIP_ID,
        role: "member",
        invite_status: "accepted",
        planning_done: false,
      },
    ]);
    mocked(getVotingCompletionStatus).mockResolvedValue({
      isComplete: false,
      requiredSlotIds: [SLOT_ID],
      completedUserIds: [],
    });

    await expect(getTripsForUser(USER_ID)).resolves.toEqual([
      {
        ...votingTrip,
        role: "member",
        members: [
          {
            id: "user-a",
            name: "Unknown User",
            role: "admin",
            planning_done: false,
          },
          {
            id: USER_ID,
            name: "Unknown User",
            role: "member",
            planning_done: false,
          },
        ],
      },
    ]);

    expect(updateTripState).toHaveBeenCalledWith(TRIP_ID, "Voting");
  });

  it("finalizes an ended trip even when it was still stored as Planning", async () => {
    const planningTrip = {
      trip_id: TRIP_ID,
      title: "Spain",
      destination: "Spain",
      start_date: "2026-04-23",
      end_date: "2026-04-23",
      state: "Planning" as const,
      planning_end_at: FUTURE_DEADLINE,
      voting_end_at: FUTURE_DEADLINE,
    };
    const finalTrip = { ...planningTrip, state: "Final" as const };

    mocked(findTripById)
      .mockResolvedValueOnce(planningTrip)
      .mockResolvedValueOnce(finalTrip);

    await expect(advanceTripStateIfNeeded(TRIP_ID)).resolves.toEqual(finalTrip);

    expect(createFinalItineraryForTrip).toHaveBeenCalledWith(TRIP_ID);
    expect(updateTripState).toHaveBeenCalledWith(TRIP_ID, "Final");
    expect(findAcceptedMembersByTripId).not.toHaveBeenCalled();
  });
});

describe("planning collision transition", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mocked(mockVerifyIdToken).mockResolvedValue({ uid: USER_ID });
    mocked(getExpoPushTokensByUserIds).mockResolvedValue([]);
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
      {
        user_id: "user-a",
        trip_id: TRIP_ID,
        role: "admin",
        invite_status: "accepted",
        planning_done: true,
      },
      {
        user_id: USER_ID,
        trip_id: TRIP_ID,
        role: "member",
        invite_status: "accepted",
        planning_done: true,
      },
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
      planningDone: true,
    });

    expect(setMemberPlanningDone).toHaveBeenCalledWith(TRIP_ID, USER_ID, true);
    expect(markMemberPlanningDone).not.toHaveBeenCalled();
    expect(getVotingCompletionStatus).toHaveBeenCalledWith(TRIP_ID, [
      "user-a",
      USER_ID,
    ]);
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
      {
        user_id: "user-a",
        trip_id: TRIP_ID,
        role: "admin",
        invite_status: "accepted",
        planning_done: true,
      },
      {
        user_id: USER_ID,
        trip_id: TRIP_ID,
        role: "member",
        invite_status: "accepted",
        planning_done: true,
      },
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
      planningDone: true,
    });

    expect(setMemberPlanningDone).toHaveBeenCalledWith(TRIP_ID, USER_ID, true);
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
      {
        user_id: USER_ID,
        trip_id: TRIP_ID,
        role: "admin",
        invite_status: "accepted",
        planning_done: true,
      },
    ]);

    await expect(finishPlanningForMember(TRIP_ID, TOKEN)).resolves.toEqual({
      allDone: true,
      tripState: "Final",
      completedMembers: 1,
      totalMembers: 1,
      planningDone: true,
    });

    expect(setMemberPlanningDone).toHaveBeenCalledWith(TRIP_ID, USER_ID, true);
    expect(getVotingCompletionStatus).not.toHaveBeenCalled();
    expect(createFinalItineraryForTrip).toHaveBeenCalledWith(TRIP_ID);
    expect(updateTripState).toHaveBeenCalledWith(TRIP_ID, "Final");
  });

  it("lets a member unmark planning done without advancing the trip", async () => {
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
      planning_done: true,
    });
    mocked(findAcceptedMembersByTripId).mockResolvedValue([
      {
        user_id: "user-a",
        trip_id: TRIP_ID,
        role: "admin",
        invite_status: "accepted",
        planning_done: true,
      },
      {
        user_id: USER_ID,
        trip_id: TRIP_ID,
        role: "member",
        invite_status: "accepted",
        planning_done: false,
      },
    ]);

    await expect(
      finishPlanningForMember(TRIP_ID, TOKEN, false),
    ).resolves.toEqual({
      allDone: false,
      tripState: "Planning",
      completedMembers: 1,
      totalMembers: 2,
      planningDone: false,
    });

    expect(setMemberPlanningDone).toHaveBeenCalledWith(TRIP_ID, USER_ID, false);
    expect(getVotingCompletionStatus).not.toHaveBeenCalled();
    expect(createFinalItineraryForTrip).not.toHaveBeenCalled();
    expect(updateTripState).not.toHaveBeenCalled();
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
      {
        user_id: "user-a",
        trip_id: TRIP_ID,
        role: "admin",
        invite_status: "accepted",
        planning_done: true,
      },
      {
        user_id: USER_ID,
        trip_id: TRIP_ID,
        role: "member",
        invite_status: "accepted",
        planning_done: true,
      },
    ]);
    mocked(getVotingCompletionStatus).mockResolvedValue({
      isComplete: true,
      requiredSlotIds: [],
      completedUserIds: ["user-a", USER_ID],
    });

    await expect(transitionPlanningToNextState(TRIP_ID)).resolves.toEqual(
      finalTrip,
    );

    expect(createFinalItineraryForTrip).toHaveBeenCalledWith(TRIP_ID);
    expect(updateTripState).toHaveBeenCalledWith(TRIP_ID, "Final");
  });
});
