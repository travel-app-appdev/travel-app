// Integration-style tests for GET /trips/invite/:inviteCode
// Verifies the public invite preview endpoint behaves correctly
// for every outcome the backend can return.

import request from "supertest";
import { getTripByInviteCodePublic } from "../services/tripsService";

jest.mock("../services/tripsService", () => ({
    getTripsForUser: jest.fn(),
    createTripForAuthenticatedUser: jest.fn(),
    createTripForUserWithoutAuth: jest.fn(),
    joinTripWithInviteCode: jest.fn(),
    deleteTripForAdmin: jest.fn(),
    leaveTripForMember: jest.fn(),
    removeMemberForAdmin: jest.fn(),
    finishPlanningForMember: jest.fn(),
    updateTripForAdmin: jest.fn(),
    getTripByInviteCodePublic: jest.fn(),
}));

const mockGetTripByInviteCodePublic = getTripByInviteCodePublic as jest.Mock;

// import AFTER jest.mock
const app = require("../index").default;

describe("GET /trips/invite/:inviteCode", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ── Happy path ──

    it("returns 200 with public trip fields for a valid invite code", async () => {
        mockGetTripByInviteCodePublic.mockResolvedValue({
            trip_id: "trip-abc",
            title: "Vienna Adventure",
            destination: "Vienna",
            start_date: "2026-06-01",
            end_date: "2026-06-10",
            state: "Planning",
        });

        const res = await request(app).get("/trips/invite/ABC123");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            trip_id: "trip-abc",
            title: "Vienna Adventure",
            destination: "Vienna",
            start_date: "2026-06-01",
            end_date: "2026-06-10",
            state: "Planning",
        });
    });

    it("calls the service with the invite code uppercased", async () => {
        mockGetTripByInviteCodePublic.mockResolvedValue({
            trip_id: "trip-abc",
            title: "Vienna Adventure",
            destination: "Vienna",
            start_date: "2026-06-01",
            end_date: "2026-06-10",
            state: "Planning",
        });

        await request(app).get("/trips/invite/abc123");

        expect(mockGetTripByInviteCodePublic).toHaveBeenCalledWith("ABC123");
    });

    it("does not require an Authorization header", async () => {
        mockGetTripByInviteCodePublic.mockResolvedValue({
            trip_id: "trip-abc",
            title: "Vienna Adventure",
            destination: "Vienna",
            start_date: "2026-06-01",
            end_date: "2026-06-10",
            state: "Planning",
        });

        // No Authorization header — should still succeed
        const res = await request(app)
            .get("/trips/invite/ABC123");

        expect(res.status).toBe(200);
    });

    it("does not expose sensitive fields like invite_code or member data", async () => {
        mockGetTripByInviteCodePublic.mockResolvedValue({
            trip_id: "trip-abc",
            title: "Vienna Adventure",
            destination: "Vienna",
            start_date: "2026-06-01",
            end_date: "2026-06-10",
            state: "Planning",
        });

        const res = await request(app).get("/trips/invite/ABC123");

        expect(res.body).not.toHaveProperty("invite_code");
        expect(res.body).not.toHaveProperty("members");
        expect(res.body).not.toHaveProperty("planning_end_at");
        expect(res.body).not.toHaveProperty("voting_end_at");
    });

    // ── Error responses ──

    it("returns 404 when the invite code does not exist", async () => {
        mockGetTripByInviteCodePublic.mockRejectedValueOnce({
            status: 404,
            message: "Invalid invite code",
        });

        const res = await request(app).get("/trips/invite/BADCODE");

        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Invalid invite code");
    });

    it("returns 500 when the service throws an unexpected error", async () => {
        mockGetTripByInviteCodePublic.mockRejectedValueOnce(
            new Error("Unexpected database error")
        );

        const res = await request(app).get("/trips/invite/ABC123");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Failed to load trip preview");
    });
});