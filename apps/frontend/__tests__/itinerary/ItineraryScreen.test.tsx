import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import ItineraryScreen from "@/app/itinerary";

const mockSetParams = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockFetchMyTrips = jest.fn();
const mockFinishPlanning = jest.fn();
const mockGetActivitiesBySlot = jest.fn();
const mockGetFinalItineraryActivities = jest.fn();
const mockToggleActivityAttendance = jest.fn();
const mockVoteForActivity = jest.fn();

let mockParams: Record<string, string | undefined> = {};

jest.mock("expo-router", () => ({
  router: {
    back: () => mockBack(),
    canGoBack: () => mockCanGoBack(),
    replace: (route: unknown) => mockReplace(route),
    setParams: (params: unknown) => mockSetParams(params),
  },
  useLocalSearchParams: () => mockParams,
}));

jest.mock("@/src/context/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "user-123" },
    idToken: "token-123",
  }),
}));

jest.mock("@/src/api/trips", () => ({
  fetchMyTrips: (userId: unknown, options: unknown) =>
    mockFetchMyTrips(userId, options),
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
  generateTimeSlots: () => [{ id: "06:00-08:00", label: "06:00-08:00" }],
}));

jest.mock("@/src/utils/itinerary/generateTripDays", () => ({
  generateTripDays: () => [{ id: "2026-06-01", label: "1 Jun" }],
}));

jest.mock("@/src/utils/itinerary/mapActivitiesToSlots", () => ({
  mapActivitiesToSlots: () => [
    { slot: { id: "06:00-08:00", label: "06:00-08:00" }, activity: undefined },
  ],
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
  ItineraryDaySelector: () => null,
}));

jest.mock("@/src/components/itinerary/PlanningSlotCard", () => ({
  PlanningSlotCard: () => null,
}));

jest.mock("@/src/components/itinerary/SkeletonSlotCard", () => ({
  SkeletonSlotCard: () => null,
}));

jest.mock("@/src/components/itinerary/PlanningDoneBar", () => ({
  PlanningDoneBar: () => null,
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
    planningEndAt: "2026-05-13T10:00:00.000Z",
    votingEndAt: "2026-05-13T11:00:00.000Z",
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
    planning_end_at: "2026-05-13T10:00:00.000Z",
    voting_end_at: "2026-05-13T11:00:00.000Z",
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
    mockGetActivitiesBySlot.mockResolvedValue([]);
    mockGetFinalItineraryActivities.mockResolvedValue([]);
  });

  it("shows a loading overlay before applying a Planning to Voting refresh", async () => {
    setBaseParams("planning");
    mockFetchMyTrips.mockResolvedValueOnce([backendTrip("Voting")]);

    const { getByText, unmount } = render(<ItineraryScreen />);

    await waitFor(() => {
      expect(getByText("Getting voting ready")).toBeTruthy();
    });

    expect(mockSetParams).not.toHaveBeenCalledWith(
      expect.objectContaining({ state: "voting" })
    );

    await waitFor(() => {
      expect(mockSetParams).toHaveBeenCalledWith(
        expect.objectContaining({ state: "voting" })
      );
    }, { timeout: 2500 });

    unmount();
  });

  it("shows a loading overlay before applying a Voting to Final refresh", async () => {
    setBaseParams("voting");
    mockFetchMyTrips.mockResolvedValueOnce([backendTrip("Final")]);

    const { getByText, unmount } = render(<ItineraryScreen />);

    await waitFor(() => {
      expect(getByText("Making your itinerary ready")).toBeTruthy();
    });

    expect(mockSetParams).not.toHaveBeenCalledWith(
      expect.objectContaining({ state: "final" })
    );

    await waitFor(() => {
      expect(mockSetParams).toHaveBeenCalledWith(
        expect.objectContaining({ state: "final" })
      );
    }, { timeout: 2500 });

    unmount();
  });
});
