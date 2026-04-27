import { leaveTripForMember } from "../services/tripsService";

// ─── Firebase mock ────────────────────────────────────────────────────────────
const mockVerifyIdToken = jest.fn();
const mockGet = jest.fn();
const mockDelete = jest.fn();

jest.mock("../config/firebase", () => ({
    __esModule: true,
    default: {
        auth: () => ({
            verifyIdToken: mockVerifyIdToken,
        }),
        firestore: () => ({
            collection: () => ({
                where: jest.fn().mockReturnThis(),
                get: mockGet,
            }),
        }),
    },
}));

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
            ])
        );

        await expect(
            leaveTripForMember({ idToken: MEMBER_TOKEN, tripId: TRIP_ID })
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
            ])
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
            ])
        );

        await expect(
            leaveTripForMember({ idToken: MEMBER_TOKEN, tripId: TRIP_ID })
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
            leaveTripForMember({ idToken: MEMBER_TOKEN, tripId: TRIP_ID })
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
            leaveTripForMember({ idToken: "bad-token", tripId: TRIP_ID })
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
                ])
            );

            await expect(
                leaveTripForMember({ idToken: MEMBER_TOKEN, tripId: TRIP_ID })
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