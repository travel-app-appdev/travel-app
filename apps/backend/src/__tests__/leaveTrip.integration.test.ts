//
// Integration tests that verify the full HTTP layer end-to-end for
// POST /trips/:tripId/leave.
//
// Firebase is mocked (same pattern as trips.test.ts / joinTrip.test.ts) so no
// real emulator process is required. The mocks simulate the multi-user state
// that a real Firestore would hold so we can assert:
//   • a member who leaves no longer appears in their "Your Trips" list
//   • the remaining member and the admin still see the trip unchanged

import request from "supertest";
import app from "../index";

// ── Shared mutable state ──
// Declared at module scope so the jest.mock factory closes over the reference.
// Tests mutate this array directly; the mock reads it fresh on every .get() call.

type Membership = {
  user_id: string;
  trip_id: string;
  role: "admin" | "member";
  invite_status: "accepted" | "pending";
};

let memberships: Membership[] = [];

const TRIP_ID = "trip-001";
const ADMIN_UID = "user-admin";
const MEMBER_UID = "user-member";
const OTHER_UID = "user-other";

const TRIP_DATA = {
  admin_user_id: ADMIN_UID,
  title: "Vienna Trip",
  destination: "Vienna",
  start_date: "2026-08-01",
  end_date: "2026-08-07",
  state: "Planning",
};

// ── Firebase mock ──

jest.mock("../config/firebase", () => {
  return {
    __esModule: true,
    default: {
      auth: () => ({
        verifyIdToken: jest.fn().mockImplementation((token: string) => {
          const map: Record<string, string> = {
            "admin-token": "user-admin",
            "member-token": "user-member",
            "other-token": "user-other",
          };
          if (map[token]) return Promise.resolve({ uid: map[token] });
          return Promise.reject(new Error("Invalid token"));
        }),
      }),

      firestore: Object.assign(
        () => ({
          batch: () => ({
            delete: jest.fn(),
            commit: jest.fn().mockResolvedValue(undefined),
          }),
          collection: (name: string) => {
            // ── trip_members ──
            if (name === "trip_members") {
              return {
                where: jest
                  .fn()
                  .mockImplementation(
                    (field1: string, _op1: string, value1: string) => ({
                      where: jest
                        .fn()
                        .mockImplementation(
                          (field2: string, _op2: string, value2: string) => ({
                            get: jest.fn().mockImplementation(() => {
                              // Always read from the live array at call-time
                              const matched = memberships.filter(
                                (m) =>
                                  m[field1 as keyof Membership] === value1 &&
                                  m[field2 as keyof Membership] === value2,
                              );
                              return Promise.resolve({
                                empty: matched.length === 0,
                                docs: matched.map((m) => ({
                                  data: () => ({ ...m }),
                                  ref: {
                                    delete: jest.fn().mockImplementation(() => {
                                      // Simulate Firestore delete
                                      memberships = memberships.filter(
                                        (x) =>
                                          !(
                                            x.user_id === m.user_id &&
                                            x.trip_id === m.trip_id
                                          ),
                                      );
                                      return Promise.resolve();
                                    }),
                                  },
                                })),
                              });
                            }),
                          }),
                        ),
                    }),
                  ),
                doc: jest.fn().mockReturnValue({
                  set: jest.fn().mockResolvedValue({}),
                }),
              };
            }

            // ── trips ──
            if (name === "trips") {
              return {
                doc: jest.fn().mockImplementation((id: string) => ({
                  get: jest.fn().mockResolvedValue({
                    id,
                    exists: id === TRIP_ID,
                    data: () => (id === TRIP_ID ? TRIP_DATA : null),
                  }),
                  set: jest.fn().mockResolvedValue({}),
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
                      name:
                        id === MEMBER_UID
                          ? "Member User"
                          : id === ADMIN_UID
                            ? "Admin User"
                            : "Other User",
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

            if (name === "activity_votes" || name === "activity_attendance") {
              return {
                where: jest.fn().mockReturnThis(),
                get: jest.fn().mockResolvedValue({
                  empty: true,
                  docs: [],
                }),
              };
            }

            return {};
          },
        }),
        {
          Timestamp: {
            now: jest.fn(() => ({
              toDate: () => new Date("2026-01-01T00:00:00.000Z"),
            })),
          },
          FieldPath: {
            documentId: jest.fn(() => "__name__"),
          },
        },
      ),
    },
  };
});

// ── Helpers ──

function resetMemberships() {
  memberships = [
    {
      user_id: ADMIN_UID,
      trip_id: TRIP_ID,
      role: "admin",
      invite_status: "accepted",
    },
    {
      user_id: MEMBER_UID,
      trip_id: TRIP_ID,
      role: "member",
      invite_status: "accepted",
    },
    {
      user_id: OTHER_UID,
      trip_id: TRIP_ID,
      role: "member",
      invite_status: "accepted",
    },
  ];
}

// ── Tests ──

describe("POST /trips/:tripId/leave — integration", () => {
  beforeEach(resetMemberships);

  afterAll((done) => done());

  // ── Member leaves successfully ──

  it("returns 200 when a member successfully leaves", async () => {
    const res = await request(app)
      .post(`/trips/${TRIP_ID}/leave`)
      .send({ idToken: "member-token" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Left trip successfully");
  });

  it("removes the leaving member from the memberships list", async () => {
    await request(app)
      .post(`/trips/${TRIP_ID}/leave`)
      .send({ idToken: "member-token" });

    const memberStillPresent = memberships.some(
      (m) => m.user_id === MEMBER_UID && m.trip_id === TRIP_ID,
    );
    expect(memberStillPresent).toBe(false);
  });

  it("admin still has their membership after a member leaves", async () => {
    await request(app)
      .post(`/trips/${TRIP_ID}/leave`)
      .send({ idToken: "member-token" });

    const adminMembership = memberships.find(
      (m) => m.user_id === ADMIN_UID && m.trip_id === TRIP_ID,
    );
    expect(adminMembership).toBeDefined();
    expect(adminMembership?.role).toBe("admin");
  });

  it("other members still have their membership after an unrelated member leaves", async () => {
    await request(app)
      .post(`/trips/${TRIP_ID}/leave`)
      .send({ idToken: "member-token" });

    const otherMembership = memberships.find(
      (m) => m.user_id === OTHER_UID && m.trip_id === TRIP_ID,
    );
    expect(otherMembership).toBeDefined();
  });

  it("exactly one membership is removed when a member leaves", async () => {
    const countBefore = memberships.length;

    await request(app)
      .post(`/trips/${TRIP_ID}/leave`)
      .send({ idToken: "member-token" });

    expect(memberships).toHaveLength(countBefore - 1);
  });

  // ── Admin cannot leave ──

  it("returns 403 when the admin tries to leave", async () => {
    const res = await request(app)
      .post(`/trips/${TRIP_ID}/leave`)
      .send({ idToken: "admin-token" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe(
      "Admin cannot leave the trip. Delete it instead.",
    );
  });

  it("does not alter memberships when the admin tries to leave", async () => {
    const snapshot = JSON.stringify(memberships);

    await request(app)
      .post(`/trips/${TRIP_ID}/leave`)
      .send({ idToken: "admin-token" });

    expect(JSON.stringify(memberships)).toBe(snapshot);
  });

  // ── Missing fields ──

  it("returns 400 when idToken is missing", async () => {
    const res = await request(app).post(`/trips/${TRIP_ID}/leave`).send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("idToken and tripId are required");
  });

  // ── Invalid token ──

  it("returns 401 for an invalid token", async () => {
    const res = await request(app)
      .post(`/trips/${TRIP_ID}/leave`)
      .send({ idToken: "invalid-token" });

    expect(res.status).toBe(401);
  });

  // ── User not in trip ──

  it("returns 404 when the user is not a member of the trip", async () => {
    // Remove MEMBER_UID from memberships before the request
    memberships = memberships.filter((m) => m.user_id !== MEMBER_UID);

    const res = await request(app)
      .post(`/trips/${TRIP_ID}/leave`)
      .send({ idToken: "member-token" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("You are not a member of this trip");
  });
});
