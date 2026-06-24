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
  findAcceptedMembersByTripId: jest.fn(),
  findMembership: jest.fn(),
  findTripById: jest.fn(),
  resetPlanningDoneForTrip: jest.fn(),
  updateTripById: jest.fn(),
}));

import { findMembership, findTripById } from "../repositories/tripsRepository";
import { updateTripForAdmin } from "../services/tripsService";

const TRIP_ID = "trip-123";
const USER_ID = "admin-123";
const TOKEN = "token-123";

function mocked<T extends (...args: any[]) => any>(fn: T) {
  return fn as jest.MockedFunction<T>;
}

describe("updateTripForAdmin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: USER_ID });
    mocked(findMembership).mockResolvedValue({
      trip_id: TRIP_ID,
      user_id: USER_ID,
      role: "admin",
      invite_status: "accepted",
    });
  });

  it("rejects trip date changes after voting has ended", async () => {
    mocked(findTripById).mockResolvedValue({
      trip_id: TRIP_ID,
      title: "Summer trip",
      destination: "Barcelona",
      start_date: "2026-07-01",
      end_date: "2026-07-10",
      planning_end_at: "2026-06-01T12:00:00.000Z",
      voting_end_at: "2026-06-10T12:00:00.000Z",
      state: "Final" as const,
    });

    await expect(
      updateTripForAdmin({
        idToken: TOKEN,
        tripId: TRIP_ID,
        start_date: "2026-07-02",
        end_date: "2026-07-11",
      })
    ).rejects.toMatchObject({
      status: 400,
      message: "Trip dates cannot be changed after voting has ended",
    });
  });

  it("still allows title updates after voting has ended", async () => {
    const updatedTrip = {
      trip_id: TRIP_ID,
      title: "Renamed trip",
      destination: "Barcelona",
      start_date: "2026-07-01",
      end_date: "2026-07-10",
      planning_end_at: "2026-06-01T12:00:00.000Z",
      voting_end_at: "2026-06-10T12:00:00.000Z",
      state: "Final" as const,
    };

    mocked(findTripById)
      .mockResolvedValueOnce({
        ...updatedTrip,
        title: "Summer trip",
      })
      .mockResolvedValueOnce(updatedTrip);

    const result = await updateTripForAdmin({
      idToken: TOKEN,
      tripId: TRIP_ID,
      title: "Renamed trip",
    });

    expect(result.title).toBe("Renamed trip");
  });
});
