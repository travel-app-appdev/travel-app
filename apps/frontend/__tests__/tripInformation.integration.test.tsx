import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import TripInformationScreen from "@/app/trip-overview-member";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockLeaveTrip = jest.fn();
const mockGetIdToken = jest.fn();

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => "mock-server-timestamp"),
}));

const mockRouter = {
  replace: mockReplace,
  push: mockPush,
  back: mockBack,
};

// expo-router
jest.mock("expo-router", () => ({
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({
    tripId: "trip-001",
    title: "Vienna Trip",
    destination: "Vienna",
    startDate: "2026-08-01",
    endDate: "2026-08-07",
    members: JSON.stringify([
      { id: "user-admin", name: "Alice", initials: "AL", color: "#f00" },
      { id: "user-other", name: "Bob", initials: "BO", color: "#00f" },
    ]),
  }),
  useRouter: () => mockRouter,
}));

// src/api/trips
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children, ...props }: any) => {
    const { View } = require("react-native");
    return <View {...props}>{children}</View>;
  },
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/src/api/trips", () => ({
  fetchMyTrips: jest.fn().mockResolvedValue([]),
  getCachedMyTrips: jest.fn().mockReturnValue(null),
  fetchTripForUser: jest.fn().mockResolvedValue(null),
  getMemberPreferences: jest.fn().mockResolvedValue([]),
  updateMemberPreferences: jest.fn().mockResolvedValue(undefined),
  leaveTrip: (...args: any[]) => mockLeaveTrip(...args),
}));

jest.mock("@/app/home", () => ({
  invalidateTripsCache: jest.fn(),
}));

jest.mock("@/src/hooks/useSinglePress", () => ({
  useSinglePress: (fn: unknown) => fn,
}));

// Firebase — inline object so Jest hoisting doesn't cause reference errors.
jest.mock("@/src/lib/firebase", () => ({
  auth: {
    currentUser: {
      uid: "user-123",
      getIdToken: jest.fn(),
    },
  },
  db: {},
}));

jest.mock("@/src/context/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "user-123" },
    setUser: jest.fn(),
    setIdToken: jest.fn(),
  }),
}));

// BackLink
jest.mock("@/src/components/common/BackLink", () => ({
  BackLink: () => {
    const { View } = require("react-native");
    return <View testID="back-link" />;
  },
}));

// ActionCard
jest.mock("@/src/components/common/ActionCard", () => ({
  ActionCard: ({ label, onPress }: { label: string; onPress: () => void }) => {
    const { TouchableOpacity, Text } = require("react-native");
    return (
      <TouchableOpacity onPress={onPress}>
        <Text>{label}</Text>
      </TouchableOpacity>
    );
  },
  ACTION_CARD_HEIGHT: 60,
}));

// SVG assets
const svgMock = () => null;
jest.mock("@/assets/icons/plane.svg", () => svgMock);
jest.mock("@/assets/icons/info.svg", () => svgMock);
jest.mock("@/assets/icons/trip_title.svg", () => svgMock);
jest.mock("@/assets/icons/calendar.svg", () => svgMock);
jest.mock("@/assets/icons/location.svg", () => svgMock);
jest.mock("@/assets/icons/add_people.svg", () => svgMock);
jest.mock("@/assets/icons/hourglass_0.svg", () => svgMock);
jest.mock("@/assets/icons/hourglass_1.svg", () => svgMock);
jest.mock("@/assets/icons/timepoint.svg", () => svgMock);
jest.mock("@/assets/icons/check_mark.svg", () => svgMock);
jest.mock("@/assets/icons/unchecked.svg", () => svgMock);
jest.mock("@/assets/icons/key_frame.svg", () => svgMock);
jest.mock("@/assets/icons/copy.svg", () => svgMock);
jest.mock("@/assets/icons/exit.svg", () => svgMock);
jest.mock("@/assets/icons/arrow-itinerary.svg", () => svgMock);
jest.mock("@/assets/mascots/Votey_Yellow.svg", () => svgMock);
jest.mock("@/assets/mascots/Votey_Pink.svg", () => svgMock);
jest.mock("@/assets/mascots/Votey_Green.svg", () => svgMock);
jest.mock("@/assets/icons/settings.svg", () => svgMock);
jest.mock("@/assets/icons/arrow_up.svg", () => svgMock);
jest.mock("@/assets/icons/arrow_down.svg", () => svgMock);
jest.mock("@/assets/mascots/Votey-Blue-Memory.svg", () => svgMock);

// ─── Helper to get the mocked firebase module at runtime ─────────────────────

function getMockedAuth() {
  return require("@/src/lib/firebase").auth;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("TripInformationScreen — leave trip flow", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    const auth = getMockedAuth();
    auth.currentUser = {
      uid: "user-123",
      getIdToken: () => mockGetIdToken(),
    };
    mockGetIdToken.mockResolvedValue("member-id-token");
  });

  // ── Renders trip details ───────────────────────────────────────────────────

  it("renders the trip title, destination and member names", () => {
    const { getByText } = render(<TripInformationScreen />);

    expect(getByText("Vienna Trip")).toBeTruthy();
    expect(getByText("Vienna")).toBeTruthy();
    expect(getByText("Alice, Bob")).toBeTruthy();
  });

  it("renders the formatted trip dates", () => {
    const { getByText } = render(<TripInformationScreen />);

    expect(getByText("01.08.2026 – 07.08.2026")).toBeTruthy();
  });

  it("renders the 'Leave trip' action card", () => {
    const { getByText } = render(<TripInformationScreen />);

    expect(getByText("Leave trip")).toBeTruthy();
  });

  // ── Leave trip — happy path ────────────────────────────────────────────────

  it("shows a confirmation modal when 'Leave trip' is pressed", () => {
    const { getByText } = render(<TripInformationScreen />);
    fireEvent.press(getByText("Leave trip"));

    expect(getByText("Are you sure you want to leave this trip?")).toBeTruthy();
  });

  it("calls leaveTrip with the correct idToken and tripId after confirming", async () => {
    mockLeaveTrip.mockResolvedValueOnce(undefined);

    const { getByText } = render(<TripInformationScreen />);
    fireEvent.press(getByText("Leave trip"));
    fireEvent.press(getByText("Leave"));

    await waitFor(() => {
      expect(mockLeaveTrip).toHaveBeenCalledWith({
        idToken: "member-id-token",
        tripId: "trip-001",
      });
    });
  });

  it("does NOT call leaveTrip when the user presses Cancel", async () => {
    const { getByText } = render(<TripInformationScreen />);
    fireEvent.press(getByText("Leave trip"));
    fireEvent.press(getByText("Cancel"));

    await waitFor(() => {
      expect(mockLeaveTrip).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  // ── Leave trip — API error ────────────────────────────────────────────────

  it("shows a failure message and does NOT redirect when leaveTrip rejects", async () => {
    mockLeaveTrip.mockRejectedValueOnce(
      new Error("Admin cannot leave the trip. Delete it instead.")
    );

    const { getByText } = render(<TripInformationScreen />);
    fireEvent.press(getByText("Leave trip"));
    fireEvent.press(getByText("Leave"));

    await waitFor(() => {
      expect(getByText("Leave failed")).toBeTruthy();
      expect(
        getByText("Admin cannot leave the trip. Delete it instead.")
      ).toBeTruthy();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("shows the raw failure message when leaveTrip throws a non-Error", async () => {
    mockLeaveTrip.mockRejectedValueOnce("unknown error");

    const { getByText } = render(<TripInformationScreen />);
    fireEvent.press(getByText("Leave trip"));
    fireEvent.press(getByText("Leave"));

    await waitFor(() => {
      expect(getByText("Leave failed")).toBeTruthy();
      expect(getByText("unknown error")).toBeTruthy();
    });
  });

  // ── Not logged in ─────────────────────────────────────────────────────────

  it("shows 'Not logged in' message and skips the API call when currentUser is null", async () => {
    getMockedAuth().currentUser = null;

    const { getByText } = render(<TripInformationScreen />);
    fireEvent.press(getByText("Leave trip"));
    fireEvent.press(getByText("Leave"));

    await waitFor(() => {
      expect(getByText("Not logged in")).toBeTruthy();
      expect(getByText("Please log in again.")).toBeTruthy();
    });

    expect(mockLeaveTrip).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
