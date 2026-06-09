import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";

import ItineraryScreen from "@/app/itinerary";

const mockSetParams = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockFetchTripForUser = jest.fn();
const mockFinishPlanning = jest.fn();
const mockGetActivitiesBySlot = jest.fn();
const mockGetFinalItineraryActivities = jest.fn();
const mockToggleActivityAttendance = jest.fn();
const mockVoteForActivity = jest.fn();
const mockDaySelectorProps = jest.fn();
const mockPlanningDoneBarProps = jest.fn();
const mockPlanningSlotCardProps = jest.fn();

let mockParams: Record<string, string | undefined> = {};
let mockTripDays = [{ id: "2026-06-01", label: "1 Jun" }];

jest.mock("expo-router", () => ({
  router: {
    back: () => mockBack(),
    canGoBack: () => mockCanGoBack(),
    replace: (route: unknown) => mockReplace(route),
    setParams: (params: unknown) => mockSetParams(params),
  },
  useLocalSearchParams: () => mockParams,
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
}));

jest.mock("@/src/lib/firebase", () => ({
  db: {},
}));

jest.mock("@/src/context/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "user-123" },
    idToken: "token-123",
  }),
}));

jest.mock("@/src/api/trips", () => ({
  fetchTripForUser: (userId: unknown, tripId: unknown, options: unknown) =>
    mockFetchTripForUser(userId, tripId, options),
  finishPlanning: (payload: unknown) => mockFinishPlanning(payload),
}));

jest.mock("@/src/services/activityService", () => ({
  getActivitiesBySlot: (
    tripId: unknown,
    slotId: unknown,
    currentUserId: unknown
  ) => mockGetActivitiesBySlot(tripId, slotId, currentUserId),
  getFinalItineraryActivities: (tripId: unknown, currentUserId: unknown) =>
    mockGetFinalItineraryActivities(tripId, currentUserId),
  toggleActivityAttendance: (payload: unknown) =>
    mockToggleActivityAttendance(payload),
  voteForActivity: (payload: unknown) => mockVoteForActivity(payload),
}));

jest.mock("@/src/utils/itinerary/generateTimeSlots", () => ({
  generateTimeSlots: () => [{ id: "Breakfast", label: "Breakfast" }],
}));

jest.mock("@/src/utils/itinerary/generateTripDays", () => ({
  generateTripDays: () => mockTripDays,
}));

jest.mock("@/src/utils/itinerary/mapActivitiesToSlots", () => ({
  mapActivitiesToSlots: (
    slots: { id: string; label: string }[],
    activities: { dayId: string; slotId: string }[],
    selectedDayId: string
  ) =>
    slots.map((slot) => ({
      slot,
      activity: activities.find(
        (activity) =>
          activity.dayId === selectedDayId && activity.slotId === slot.id
      ),
    })),
}));

jest.mock("@/src/components/common/AppText", () => ({
  AppText: ({ children }: { children: React.ReactNode }) => {
    const { Text } = require("react-native");
    return <Text>{children}</Text>;
  },
}));

jest.mock("@/src/components/itinerary/ItineraryHeader", () => ({
  ItineraryHeader: ({ title }: { title: string }) => {
    const { Text } = require("react-native");
    return <Text>{title}</Text>;
  },
}));

jest.mock("@/src/components/itinerary/ItineraryDaySelector", () => ({
  ItineraryDaySelector: (props: unknown) => {
    mockDaySelectorProps(props);
    return null;
  },
}));

jest.mock("@/src/components/itinerary/PlanningSlotCard", () => ({
  PlanningSlotCard: (props: unknown) => {
    mockPlanningSlotCardProps(props);
    return null;
  },
}));

jest.mock("@/src/components/itinerary/SkeletonSlotCard", () => ({
  SkeletonSlotCard: () => null,
}));

jest.mock("@/src/components/itinerary/PlanningDoneBar", () => ({
  PlanningDoneBar: (props: unknown) => {
    mockPlanningDoneBarProps(props);
    return null;
  },
}));

jest.mock("@/src/components/itinerary/VoteSlotCard", () => ({
  VotingSlotCard: () => null,
}));

jest.mock("@/src/components/itinerary/VotingTimeFilter", () => ({
  VotingTimeFilter: () => null,
}));

jest.mock("@/src/components/itinerary/FinalSlotCard", () => ({
  FinalSlotCard: () => null,
}));

function setBaseParams(state: "planning" | "voting" | "final") {
  mockParams = {
    tripId: "trip-123",
    state,
    title: "Vienna Trip",
    destination: "Vienna",
    startDate: "2026-06-01",
    endDate: "2026-06-03",
    members: JSON.stringify([
      { userId: "user-123", hasFinishedPlanning: true },
      { userId: "user-456", hasFinishedPlanning: true },
    ]),
    planningEndAt: "2026-06-13T10:00:00.000Z",
    votingEndAt: "2026-06-13T11:00:00.000Z",
  };
}

function backendTrip(state: "Planning" | "Voting" | "Final") {
  return {
    trip_id: "trip-123",
    title: "Vienna Trip",
    destination: "Vienna",
    start_date: "2026-06-01",
    end_date: "2026-06-03",
    state,
    role: "member",
    planning_end_at: "2026-06-13T10:00:00.000Z",
    voting_end_at: "2026-06-13T11:00:00.000Z",
    members: [
      {
        id: "user-123",
        name: "Helen",
        role: "member",
        planning_done: true,
      },
      {
        id: "user-456",
        name: "Sam",
        role: "admin",
        planning_done: true,
      },
    ],
  };
}

describe("ItineraryScreen transition overlays", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTripDays = [{ id: "2026-06-01", label: "1 Jun" }];
    mockGetActivitiesBySlot.mockResolvedValue([]);
    mockGetFinalItineraryActivities.mockResolvedValue([]);
  });

  it("does not show the voting loading overlay when planning submit is not complete for all members", async () => {
    setBaseParams("planning");
    mockParams.members = JSON.stringify([
      { userId: "user-123", hasFinishedPlanning: false },
      { userId: "user-456", hasFinishedPlanning: false },
    ]);
    mockFinishPlanning.mockResolvedValueOnce({
      allDone: false,
      tripState: "Planning",
      completedMembers: 1,
      totalMembers: 2,
      planningDone: true,
    });
    mockFetchTripForUser.mockResolvedValue({
      ...backendTrip("Planning"),
      members: [
        {
          id: "user-123",
          name: "Helen",
          role: "member",
          planning_done: true,
        },
        {
          id: "user-456",
          name: "Sam",
          role: "admin",
          planning_done: false,
        },
      ],
    });

    const { queryByText, unmount } = render(<ItineraryScreen />);

    await waitFor(() => {
      expect(mockPlanningDoneBarProps).toHaveBeenCalled();
    });

    const uncheckedPlanningProps = mockPlanningDoneBarProps.mock.calls.find(
      ([props]) => (props as { checked: boolean }).checked === false
    )?.[0] as { onPress: () => Promise<void> } | undefined;

    expect(uncheckedPlanningProps).toBeTruthy();

    await act(async () => {
      await uncheckedPlanningProps?.onPress();
    });

    await waitFor(() => {
      expect(mockFinishPlanning).toHaveBeenCalledWith(
        expect.objectContaining({
          tripId: "trip-123",
          planningDone: true,
        })
      );
    });

    expect(queryByText("Getting voting ready")).toBeNull();
    expect(mockSetParams).not.toHaveBeenCalledWith(
      expect.objectContaining({ state: "voting" })
    );

    unmount();
  });

  it("shows a loading overlay before applying a Planning to Voting refresh", async () => {
    setBaseParams("planning");
    mockFetchTripForUser.mockResolvedValueOnce(backendTrip("Voting"));

    const { getByText, unmount } = render(<ItineraryScreen />);

    await waitFor(() => {
      expect(getByText("Getting voting ready")).toBeTruthy();
    });

    expect(mockSetParams).not.toHaveBeenCalledWith(
      expect.objectContaining({ state: "voting" })
    );

    await waitFor(
      () => {
        expect(mockSetParams).toHaveBeenCalledWith(
          expect.objectContaining({ state: "voting" })
        );
      },
      { timeout: 2500 }
    );

    unmount();
  });

  it("shows a loading overlay before applying a Voting to Final refresh", async () => {
    setBaseParams("voting");
    mockFetchTripForUser.mockResolvedValueOnce(backendTrip("Final"));

    const { getByText, unmount } = render(<ItineraryScreen />);

    await waitFor(() => {
      expect(getByText("Making your itinerary ready")).toBeTruthy();
    });

    expect(mockSetParams).not.toHaveBeenCalledWith(
      expect.objectContaining({ state: "final" })
    );

    await waitFor(
      () => {
        expect(mockSetParams).toHaveBeenCalledWith(
          expect.objectContaining({ state: "final" })
        );
      },
      { timeout: 2500 }
    );

    unmount();
  });

  it("enables voting days that have collisions beyond the first day", async () => {
    mockTripDays = [
      { id: "2026-06-01", label: "1 Jun" },
      { id: "2026-06-02", label: "2 Jun" },
    ];
    setBaseParams("voting");
    mockFetchTripForUser.mockResolvedValue(backendTrip("Voting"));
    mockGetActivitiesBySlot.mockImplementation(
      (_tripId: unknown, slotId: unknown) => {
        if (slotId === "2026-06-02_Breakfast") {
          return Promise.resolve([
            {
              activity_id: "activity-1",
              slot_id: "2026-06-02_Breakfast",
              name: "Museum",
            },
            {
              activity_id: "activity-2",
              slot_id: "2026-06-02_Breakfast",
              name: "Market",
            },
          ]);
        }

        return Promise.resolve([]);
      }
    );

    const { unmount } = render(<ItineraryScreen />);

    await waitFor(() => {
      expect(mockGetActivitiesBySlot).toHaveBeenCalledWith(
        "trip-123",
        "2026-06-01_Breakfast",
        "user-123"
      );
      expect(mockGetActivitiesBySlot).toHaveBeenCalledWith(
        "trip-123",
        "2026-06-02_Breakfast",
        "user-123"
      );
    });

    await waitFor(() => {
      const calls = mockDaySelectorProps.mock.calls;
      expect(
        calls.some(([props]) => {
          const enabledDayIds = (props as any).enabledDayIds as Set<string>;
          return (
            enabledDayIds?.has("2026-06-02") && !enabledDayIds.has("2026-06-01")
          );
        })
      ).toBe(true);
    });

    unmount();
  });

  it("shows an edited activity time immediately when returning from add activity", async () => {
    setBaseParams("planning");
    mockParams = {
      ...mockParams,
      selectedDay: "2026-06-01",
      newActivityId: "activity-123",
      newActivityDayId: "2026-06-01",
      newActivitySlotId: "Breakfast",
      newActivityName: "Late cafe",
      newActivityAddress: "Cafe Street",
      newActivityStartTime: "06:00",
      newActivityEndTime: "23:00",
    };
    mockFetchTripForUser.mockResolvedValue(backendTrip("Planning"));
    mockGetActivitiesBySlot.mockResolvedValue([
      {
        activity_id: "activity-123",
        slot_id: "2026-06-01_Breakfast",
        name: "Late cafe",
        address: "Cafe Street",
        startTime: "06:00",
        endTime: "11:00",
      },
    ]);

    const { unmount } = render(<ItineraryScreen />);

    await waitFor(() => {
      expect(
        mockPlanningSlotCardProps.mock.calls.some(([props]) => {
          const activity = (props as { activity?: { endTime?: string } })
            .activity;
          return activity?.endTime === "23:00";
        })
      ).toBe(true);
    });

    unmount();
  });
});
