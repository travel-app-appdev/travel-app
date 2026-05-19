import { createTrip } from "../controllers/tripsController";
import { createTripForAuthenticatedUser } from "../services/tripsService";

jest.mock("../services/tripsService", () => ({
    createTripForAuthenticatedUser: jest.fn(),
}));

const mockCreateTripForAuthenticatedUser = createTripForAuthenticatedUser as jest.Mock;
const originalConsoleError = console.error;

beforeAll(() => {
    console.error = jest.fn();
});

afterAll(() => {
    console.error = originalConsoleError;
});

const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("createTrip controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 400 if required fields are missing", async () => {
        const req: any = { body: {} };
        const res = mockResponse();

        await createTrip(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: "idToken, title, destination, start_date, end_date, planning_end_at and voting_end_at are required",
        });
    });

    it("returns 400 if end_date is before start_date", async () => {
        const req: any = {
            body: {
                idToken: "fake-token",
                title: "Test Trip",
                destination: "Paris",
                start_date: "2026-05-10",
                end_date: "2026-05-01",
                planning_end_at: "2026-05-08T12:00:00.000Z",
                voting_end_at: "2026-05-09T12:00:00.000Z",
            },
        };
        const res = mockResponse();

        await createTrip(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: "end_date cannot be before start_date",
        });
    });

    it("creates a trip and returns 201 with correct data", async () => {
        mockCreateTripForAuthenticatedUser.mockResolvedValue({
            trip_id: "trip123",
            title: "Paris Trip",
            destination: "Paris",
            start_date: "2026-05-10",
            end_date: "2026-05-15",
            planning_end_at: "2026-05-12T12:00:00.000Z",
            voting_end_at: "2026-05-13T12:00:00.000Z",
            planning_started_at: "2026-05-01T12:00:00.000Z",
            state: "Planning",
            role: "admin",
            invite_code: "ABC123",
        });

        const req: any = {
            body: {
                idToken: "fake-token",
                title: "Paris Trip",
                destination: "Paris",
                start_date: "2026-05-10",
                end_date: "2026-05-15",
                planning_end_at: "2026-05-12T12:00:00.000Z",
                voting_end_at: "2026-05-13T12:00:00.000Z",
            },
        };
        const res = mockResponse();

        await createTrip(req, res);

        expect(mockCreateTripForAuthenticatedUser).toHaveBeenCalledWith({
            idToken: "fake-token",
            title: "Paris Trip",
            destination: "Paris",
            start_date: "2026-05-10",
            end_date: "2026-05-15",
            planning_end_at: "2026-05-12T12:00:00.000Z",
            voting_end_at: "2026-05-13T12:00:00.000Z",
        });

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            trip_id: "trip123",
            title: "Paris Trip",
            destination: "Paris",
            start_date: "2026-05-10",
            end_date: "2026-05-15",
            planning_end_at: "2026-05-12T12:00:00.000Z",
            voting_end_at: "2026-05-13T12:00:00.000Z",
            planning_started_at: "2026-05-01T12:00:00.000Z",
            state: "Planning",
            role: "admin",
            invite_code: "ABC123",
        });
    });

    it("returns 401 if service throws", async () => {
        mockCreateTripForAuthenticatedUser.mockRejectedValueOnce(new Error("Invalid token"));

        const req: any = {
            body: {
                idToken: "bad-token",
                title: "Paris Trip",
                destination: "Paris",
                start_date: "2026-05-10",
                end_date: "2026-05-15",
                planning_end_at: "2026-05-12T12:00:00.000Z",
                voting_end_at: "2026-05-13T12:00:00.000Z",
            },
        };
        const res = mockResponse();

        await createTrip(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            error: "Invalid token or failed to create trip",
        });
    });
});