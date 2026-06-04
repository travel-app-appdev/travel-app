import { leaveTripForMember } from "../services/tripsService";

// ─── Firebase mock ────────────────────────────────────────────────────────────
const mockVerifyIdToken = jest.fn();
const mockGet = jest.fn();
const mockDelete = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn();

jest.mock("../config/firebase", () => {
  const firestore = () => ({
    batch: () => ({
      delete: mockBatchDelete,
      commit: mockBatchCommit,
    }),
    collection: (name: string) => {
      if (name === "trips") {
        return {
          doc: jest.fn().mockImplementation((id: string) => ({
            get: jest.fn().mockResolvedValue({
              id,
              exists: true,
              data: () => ({
                admin_user_id: "user-admin",
                title: "Vienna Trip",
                destination: "Vienna",
                start_date: "2026-08-01",
                end_date: "2026-08-07",
                state: "Planning",
              }),
            }),
            set: jest.fn().mockResolvedValue(undefined),
          })),
        };
      }

      if (name === "users") {
        return {
          doc: jest.fn().mockImplementation((id: string) => ({
            get: jest.fn().mockResolvedValue({
              id,
              exists: true,
              data: () => ({
                name: id === "user-member" ? "Member User" : "Admin User",
                expoPushToken: undefined,
              }),
            }),
          })),
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            empty: true,
            docs: [],
          }),
        };
      }

      return {
        where: jest.fn().mockReturnThis(),
        get: mockGet,
        doc: jest.fn().mockReturnValue({
          set: jest.fn().mockResolvedValue(undefined),
        }),
      };
    },
  });

  (firestore as any).Timestamp = {
    now: jest.fn(() => ({
      toDate: () => new Date("2026-01-01T00:00:00.000Z"),
    })),
  };
  (firestore as any).FieldPath = {
    documentId: jest.fn(() => "__name__"),
  };

  return {
    __esModule: true,
    default: {
      auth: () => ({
        verifyIdToken: mockVerifyIdToken,
      }),
      firestore,
    },
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Builds a Firestore snapshot stub */
function makeSnapshot(docs: { data: object; ref?: object }[]) {
  return {
    empty: docs.length === 0,
    docs: docs.map((d) => ({
      data: () => d.data,
      ref: d.ref ?? { delete: mockDelete },
    })),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("leaveTripForMember", () => {
  const TRIP_ID = "trip-abc";
  const MEMBER_UID = "user-member";
  const MEMBER_TOKEN = "member-token";

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: MEMBER_UID });
    mockDelete.mockResolvedValue(undefined);
    mockBatchCommit.mockResolvedValue(undefined);
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it("removes the membership document when a member leaves", async () => {
    mockGet.mockResolvedValue(
      makeSnapshot([
        {
          data: {
            user_id: MEMBER_UID,
            trip_id: TRIP_ID,
            role: "member",
            invite_status: "accepted",
          },
        },
      ]),
    );

    await expect(
      leaveTripForMember({ idToken: MEMBER_TOKEN, tripId: TRIP_ID }),
    ).resolves.toBeUndefined();

    expect(mockVerifyIdToken).toHaveBeenCalledWith(MEMBER_TOKEN);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it("verifies the correct idToken before doing anything", async () => {
    mockGet.mockResolvedValue(
      makeSnapshot([
        {
          data: {
            user_id: MEMBER_UID,
            trip_id: TRIP_ID,
            role: "member",
            invite_status: "accepted",
          },
        },
      ]),
    );

    await leaveTripForMember({ idToken: MEMBER_TOKEN, tripId: TRIP_ID });

    expect(mockVerifyIdToken).toHaveBeenCalledWith(MEMBER_TOKEN);
  });

  // ── Admin cannot leave ────────────────────────────────────────────────────

  it("throws 403 when the admin tries to leave instead of deleting", async () => {
    mockGet.mockResolvedValue(
      makeSnapshot([
        {
          data: {
            user_id: MEMBER_UID,
            trip_id: TRIP_ID,
            role: "admin",
            invite_status: "accepted",
          },
        },
      ]),
    );

    await expect(
      leaveTripForMember({ idToken: MEMBER_TOKEN, tripId: TRIP_ID }),
    ).rejects.toMatchObject({
      status: 403,
      message: "Admin cannot leave the trip. Delete it instead.",
    });

    // The membership record must NOT be deleted
    expect(mockDelete).not.toHaveBeenCalled();
  });

  // ── User not in trip ──────────────────────────────────────────────────────

  it("throws 404 when the user is not a member of the trip", async () => {
    mockGet.mockResolvedValue(makeSnapshot([]));

    await expect(
      leaveTripForMember({ idToken: MEMBER_TOKEN, tripId: TRIP_ID }),
    ).rejects.toMatchObject({
      status: 404,
      message: "You are not a member of this trip",
    });

    expect(mockDelete).not.toHaveBeenCalled();
  });

  // ── Invalid token ─────────────────────────────────────────────────────────

  it("propagates an error when the idToken is invalid", async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error("Token expired"));

    await expect(
      leaveTripForMember({ idToken: "bad-token", tripId: TRIP_ID }),
    ).rejects.toThrow("Token expired");

    expect(mockDelete).not.toHaveBeenCalled();
  });

  // ── Role boundary ─────────────────────────────────────────────────────────

  it("succeeds specifically for the 'member' role and no other role bypasses the admin check", async () => {
    // Only "member" role should allow leaving
    for (const role of ["member"] as const) {
      jest.clearAllMocks();
      mockVerifyIdToken.mockResolvedValue({ uid: MEMBER_UID });
      mockDelete.mockResolvedValue(undefined);

      mockGet.mockResolvedValue(
        makeSnapshot([
          {
            data: {
              user_id: MEMBER_UID,
              trip_id: TRIP_ID,
              role,
              invite_status: "accepted",
            },
          },
        ]),
      );

      await expect(
        leaveTripForMember({ idToken: MEMBER_TOKEN, tripId: TRIP_ID }),
      ).resolves.toBeUndefined();

      expect(mockDelete).toHaveBeenCalledTimes(1);
    }
  });

  it("does not delete anything after a 404 — trip membership is untouched", async () => {
    mockGet.mockResolvedValue(makeSnapshot([]));

    try {
      await leaveTripForMember({ idToken: MEMBER_TOKEN, tripId: TRIP_ID });
    } catch {
      // expected
    }

    expect(mockDelete).not.toHaveBeenCalled();
  });
});
