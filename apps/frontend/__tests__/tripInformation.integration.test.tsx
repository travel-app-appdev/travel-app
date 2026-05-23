import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import TripInformationScreen from "@/app/trip-overview-member";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockLeaveTrip = jest.fn();
const mockGetIdToken = jest.fn();

const mockRouter = {
  replace: mockReplace,
  push: mockPush,
  back: mockBack,
};

// expo-router
jest.mock("expo-router", () => ({
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
jest.mock("@/src/api/trips", () => ({
  leaveTrip: (...args: any[]) => mockLeaveTrip(...args),
}));

jest.mock("@/app/home", () => ({
  invalidateTripsCache: jest.fn(),
}));

// Firebase — inline object so Jest hoisting doesn't cause reference errors.
jest.mock("@/src/lib/firebase", () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn(),
    },
  },
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
jest.mock("@/assets/mascots/Votey_Yellow.svg", () => svgMock);
jest.mock("@/assets/mascots/Votey_Pink.svg", () => svgMock);
jest.mock("@/assets/mascots/Votey_Green.svg", () => svgMock);

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
    auth.currentUser = { getIdToken: () => mockGetIdToken() };
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

  it("shows a confirmation Alert when 'Leave trip' is pressed", () => {
    const { Alert } = require("react-native");
    const alertSpy = jest.spyOn(Alert, "alert");

    const { getByText } = render(<TripInformationScreen />);
    fireEvent.press(getByText("Leave trip"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Leave trip",
      "Are you sure you want to leave this trip?",
      expect.any(Array)
    );
  });

  it("calls leaveTrip with the correct idToken and tripId after confirming", async () => {
    mockLeaveTrip.mockResolvedValueOnce(undefined);

    const { Alert } = require("react-native");
    jest
      .spyOn(Alert, "alert")
      .mockImplementationOnce((_title: any, _msg: any, buttons: any) => {
        buttons?.find((b: any) => b.text === "Leave")?.onPress?.();
      });

    const { getByText } = render(<TripInformationScreen />);
    fireEvent.press(getByText("Leave trip"));

    await waitFor(() => {
      expect(mockLeaveTrip).toHaveBeenCalledWith({
        idToken: "member-id-token",
        tripId: "trip-001",
      });
    });
  });

  it("does NOT call leaveTrip when the user presses Cancel", async () => {
    const { Alert } = require("react-native");
    jest
      .spyOn(Alert, "alert")
      .mockImplementationOnce((_title: any, _msg: any, buttons: any) => {
        buttons?.find((b: any) => b.text === "Cancel")?.onPress?.();
      });

    const { getByText } = render(<TripInformationScreen />);
    fireEvent.press(getByText("Leave trip"));

    await waitFor(() => {
      expect(mockLeaveTrip).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  // ── Leave trip — API error ────────────────────────────────────────────────

  it("shows a failure Alert and does NOT redirect when leaveTrip rejects", async () => {
    mockLeaveTrip.mockRejectedValueOnce(
      new Error("Admin cannot leave the trip. Delete it instead.")
    );

    const { Alert } = require("react-native");
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementationOnce((_title: any, _msg: any, buttons: any) => {
        buttons?.find((b: any) => b.text === "Leave")?.onPress?.();
      })
      .mockImplementationOnce(() => {});

    const { getByText } = render(<TripInformationScreen />);
    fireEvent.press(getByText("Leave trip"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledTimes(2);
      expect(alertSpy).toHaveBeenLastCalledWith(
        "Leave failed",
        "Admin cannot leave the trip. Delete it instead."
      );
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("shows a generic failure message when leaveTrip throws a non-Error", async () => {
    mockLeaveTrip.mockRejectedValueOnce("unknown error");

    const { Alert } = require("react-native");
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementationOnce((_title: any, _msg: any, buttons: any) => {
        buttons?.find((b: any) => b.text === "Leave")?.onPress?.();
      })
      .mockImplementationOnce(() => {});

    const { getByText } = render(<TripInformationScreen />);
    fireEvent.press(getByText("Leave trip"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenLastCalledWith(
        "Leave failed",
        "Failed to leave trip"
      );
    });
  });

  // ── Not logged in ─────────────────────────────────────────────────────────

  it("shows 'Not logged in' Alert and skips the API call when currentUser is null", async () => {
    getMockedAuth().currentUser = null;

    const { Alert } = require("react-native");
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementationOnce((_title: any, _msg: any, buttons: any) => {
        buttons?.find((b: any) => b.text === "Leave")?.onPress?.();
      })
      .mockImplementationOnce(() => {});

    const { getByText } = render(<TripInformationScreen />);
    fireEvent.press(getByText("Leave trip"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Not logged in",
        "Please log in again."
      );
    });

    expect(mockLeaveTrip).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
