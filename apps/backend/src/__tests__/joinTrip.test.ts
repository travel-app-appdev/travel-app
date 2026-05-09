import request from "supertest";
import { joinTripWithInviteCode } from "../services/tripsService";

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
}));

const mockJoinTripWithInviteCode = joinTripWithInviteCode as jest.Mock;

// import AFTER jest.mock
const app = require("../index").default;

describe("POST /trips/join", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return 400 if fields are missing", async () => {
        const res = await request(app)
            .post("/trips/join")
            .send({ idToken: "valid-token" });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("idToken and inviteCode are required");
    });

    it("should return 200 and trip data on success", async () => {
        mockJoinTripWithInviteCode.mockResolvedValue({
            trip_id: "trip-123",
            title: "Test Trip",
            destination: "Vienna",
            start_date: "2026-06-01",
            end_date: "2026-06-10",
            state: "Planning",
            role: "member",
        });

        const res = await request(app)
            .post("/trips/join")
            .send({
                idToken: "valid-token",
                inviteCode: "valid-invite-code",
            });

        expect(mockJoinTripWithInviteCode).toHaveBeenCalledWith({
            idToken: "valid-token",
            inviteCode: "valid-invite-code",
        });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("trip_id");
        expect(res.body).toHaveProperty("title");
        expect(res.body.role).toBe("member");
    });

    it("should return 404 if service throws 404", async () => {
        mockJoinTripWithInviteCode.mockRejectedValueOnce({
            status: 404,
            message: "Trip not found",
        });

        const res = await request(app)
            .post("/trips/join")
            .send({
                idToken: "valid-token",
                inviteCode: "bad-code",
            });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Trip not found");
    });

    it("should return 409 if service throws 409", async () => {
        mockJoinTripWithInviteCode.mockRejectedValueOnce({
            status: 409,
            message: "User already joined this trip",
        });

        const res = await request(app)
            .post("/trips/join")
            .send({
                idToken: "valid-token",
                inviteCode: "valid-invite-code",
            });

        expect(res.status).toBe(409);
        expect(res.body.error).toBe("User already joined this trip");
    });

    it("should return 401 for other errors", async () => {
        mockJoinTripWithInviteCode.mockRejectedValueOnce(new Error("Invalid token"));

        const res = await request(app)
            .post("/trips/join")
            .send({
                idToken: "bad-token",
                inviteCode: "valid-invite-code",
            });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe("Invalid token or failed to join trip");
    });
});