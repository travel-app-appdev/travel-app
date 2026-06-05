import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import TripOverviewAdminScreen from "@/app/trip-overview-admin";
import TripOverviewMemberScreen from "@/app/trip-overview-member";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockFetchTripForUser = jest.fn();
const mockGetCachedMyTrips = jest.fn();
const mockUpdateTrip = jest.fn();
const mockGetIdToken = jest.fn();

let mockParams: Record<string, string | undefined> = {};

jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(() => {
      const cleanup = callback();
      return typeof cleanup === "function" ? cleanup : undefined;
    }, []);
  },
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({
    push: (route: unknown) => mockPush(route),
    replace: (route: unknown) => mockReplace(route),
  }),
}));

jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(),
}));

jest.mock("react-native-calendars", () => ({
  Calendar: () => null,
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children, ...props }: any) => {
    const { View } = require("react-native");
    return <View {...props}>{children}</View>;
  },
}));

jest.mock("@/src/api/trips", () => ({
  fetchTripForUser: (userId: unknown, tripId: unknown, options: unknown) =>
    mockFetchTripForUser(userId, tripId, options),
  getCachedMyTrips: (userId: unknown) => mockGetCachedMyTrips(userId),
  updateTrip: (payload: unknown) => mockUpdateTrip(payload),
  deleteTrip: jest.fn(),
  leaveTrip: jest.fn(),
  removeMember: jest.fn(),
}));

jest.mock("@/src/lib/firebase", () => ({
  auth: {
    currentUser: {
      uid: "user-123",
      getIdToken: () => mockGetIdToken(),
    },
  },
  db: {},
}));

jest.mock("@/app/home", () => ({
  invalidateTripsCache: jest.fn(),
}));

jest.mock("@/src/hooks/useSinglePress", () => ({
  useSinglePress: (fn: unknown) => fn,
}));

jest.mock("@/src/components/common/AppText", () => ({
  AppText: ({ children, ...props }: any) => {
    const { Text } = require("react-native");
    return <Text {...props}>{children}</Text>;
  },
}));

jest.mock("@/src/components/common/AppButton", () => ({
  AppButton: ({ title, onPress, accessibilityLabel, disabled }: any) => {
    const { Text, TouchableOpacity } = require("react-native");
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        disabled={disabled}
        onPress={onPress}
      >
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock("@/src/components/common/AppInput", () => ({
  AppInput: () => null,
}));

jest.mock("@/src/components/common/BackLink", () => ({
  BackLink: () => null,
}));

jest.mock("@/src/components/common/ActionCard", () => ({
  ActionCard: ({ label, onPress }: any) => {
    const { Text, TouchableOpacity } = require("react-native");
    return (
      <TouchableOpacity onPress={onPress}>
        <Text>{label}</Text>
      </TouchableOpacity>
    );
  },
  ACTION_CARD_HEIGHT: 60,
}));

jest.mock("@/assets/icons/plane.svg", () => () => null);
jest.mock("@/assets/icons/trip_title.svg", () => () => null);
jest.mock("@/assets/icons/calendar.svg", () => () => null);
jest.mock("@/assets/icons/location.svg", () => () => null);
jest.mock("@/assets/icons/add_people.svg", () => () => null);
jest.mock("@/assets/icons/remove_person.svg", () => () => null);
jest.mock("@/assets/icons/arrow_up.svg", () => () => null);
jest.mock("@/assets/icons/arrow_down.svg", () => () => null);
jest.mock("@/assets/icons/hourglass_0.svg", () => () => null);
jest.mock("@/assets/icons/hourglass_1.svg", () => () => null);
jest.mock("@/assets/icons/timepoint.svg", () => () => null);
jest.mock("@/assets/icons/check_mark.svg", () => () => null);
jest.mock("@/assets/icons/unchecked.svg", () => () => null);
jest.mock("@/assets/icons/trash.svg", () => () => null);
jest.mock("@/assets/icons/key_frame.svg", () => () => null);
jest.mock("@/assets/icons/copy.svg", () => () => null);
jest.mock("@/assets/icons/timer.svg", () => () => null);
jest.mock("@/assets/icons/arrow-itinerary.svg", () => () => null);
jest.mock("@/assets/icons/exit.svg", () => () => null);
jest.mock("@/assets/mascots/Votey_Yellow.svg", () => () => null);
jest.mock("@/assets/mascots/Votey_Pink.svg", () => () => null);
jest.mock("@/assets/mascots/Votey_Green.svg", () => () => null);

const NOW = "2026-06-02T10:00:00.000Z";
const PLANNING_END = "2026-06-02T10:00:01.000Z";
const VOTING_END = "2026-06-02T10:05:00.000Z";

function setOverviewParams(
  state: "Planning" | "Voting" | "Final",
  overrides: Record<string, string> = {}
) {
  mockParams = {
    tripId: "trip-123",
    title: "Vienna Trip",
    destination: "Vienna",
    startDate: "2026-06-02",
    endDate: "2026-06-05",
    members: JSON.stringify([
      { id: "user-123", name: "Helen", initials: "HE", color: "#ff0" },
      { id: "user-456", name: "Sam", initials: "SA", color: "#0ff" },
    ]),
    inviteCode: "ABC123",
    state,
    planningStartedAt: "2026-06-02T09:00:00.000Z",
    planningEndAt: PLANNING_END,
    votingEndAt: VOTING_END,
    ...overrides,
  };
}

function backendTrip(state: "Planning" | "Voting" | "Final") {
  return {
    trip_id: "trip-123",
    title: "Vienna Trip",
    destination: "Vienna",
    start_date: "2026-06-02",
    end_date: "2026-06-05",
    state,
    role: "admin",
    invite_code: "ABC123",
    planning_started_at: "2026-06-02T09:00:00.000Z",
    planning_end_at: PLANNING_END,
    voting_end_at: VOTING_END,
    members: [
      { id: "user-123", name: "Helen", role: "admin", planning_done: false },
      { id: "user-456", name: "Sam", role: "member", planning_done: false },
    ],
  };
}

describe("trip overview checklist timer transitions", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(NOW));
    jest.clearAllMocks();
    mockGetIdToken.mockResolvedValue("token-123");
    mockGetCachedMyTrips.mockReturnValue(null);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("updates member overview from Planning to Voting when the planning timer expires", async () => {
    setOverviewParams("Planning");
    mockFetchTripForUser
      .mockResolvedValueOnce(backendTrip("Planning"))
      .mockResolvedValueOnce(backendTrip("Voting"));

    const screen = render(<TripOverviewMemberScreen />);

    try {
      expect(
        screen.getByText(
          "Let's plan your trip step by step by adding activities to your itinerary."
        )
      ).toBeTruthy();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(2500);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Vote on conflicting activities in the itinerary.")
        ).toBeTruthy();
      });
    } finally {
      screen.unmount();
    }
  });

  it("does not let stale cached member data mask a forced Voting refresh", async () => {
    setOverviewParams("Planning", {
      planningEndAt: "2026-06-02T09:59:00.000Z",
    });
    mockGetCachedMyTrips.mockReturnValue([backendTrip("Planning")]);
    mockFetchTripForUser.mockResolvedValue(backendTrip("Voting"));

    const screen = render(<TripOverviewMemberScreen />);

    try {
      await waitFor(() => {
        expect(
          screen.getByText("Vote on conflicting activities in the itinerary.")
        ).toBeTruthy();
      });

      expect(mockGetCachedMyTrips).not.toHaveBeenCalled();
    } finally {
      screen.unmount();
    }
  });

  it("updates admin overview from Planning to Voting when the planning timer expires", async () => {
    setOverviewParams("Planning");
    mockFetchTripForUser
      .mockResolvedValueOnce(backendTrip("Planning"))
      .mockResolvedValueOnce(backendTrip("Voting"));

    const screen = render(<TripOverviewAdminScreen />);

    try {
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2500);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Vote on conflicting activities in the itinerary.")
        ).toBeTruthy();
      });
    } finally {
      screen.unmount();
    }
  });

  it("updates admin overview from Voting to Final when the voting timer expires", async () => {
    setOverviewParams("Voting", {
      votingEndAt: PLANNING_END,
    });
    mockFetchTripForUser
      .mockResolvedValueOnce(backendTrip("Voting"))
      .mockResolvedValueOnce(backendTrip("Final"));

    const screen = render(<TripOverviewAdminScreen />);

    try {
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2500);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Here you find your final itinerary of your group.")
        ).toBeTruthy();
      });
    } finally {
      screen.unmount();
    }
  });

  it("updates admin checklist immediately from the timer edit response", async () => {
    setOverviewParams("Planning");
    mockFetchTripForUser.mockResolvedValue(backendTrip("Planning"));
    mockUpdateTrip.mockResolvedValue(backendTrip("Voting"));

    const screen = render(<TripOverviewAdminScreen />);

    try {
      await act(async () => {
        fireEvent.press(screen.getByLabelText(/Planning phase, .*remaining/));
      });

      const { TouchableOpacity } = require("react-native");
      const updateButton = await waitFor(() => {
        const match = screen
          .UNSAFE_getAllByType(TouchableOpacity)
          .find(
            (node) => node.props.accessibilityLabel === "Update Planning phase"
          );
        expect(match).toBeTruthy();
        return match;
      });

      await act(async () => {
        updateButton?.props.onPress();
      });

      await waitFor(() => {
        expect(mockUpdateTrip).toHaveBeenCalled();
        expect(
          screen.getByText("Vote on conflicting activities in the itinerary.")
        ).toBeTruthy();
      });
    } finally {
      screen.unmount();
    }
  });
});
