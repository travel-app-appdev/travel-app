import { createTrip } from "../controllers/tripsController";

const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
const mockVerifyIdToken = jest.fn().mockResolvedValue({ uid: "test123" });
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

jest.mock("../config/firebase", () => {
    const mockServerTimestamp = jest.fn(() => ({ _methodName: "serverTimestamp" }));
    const mockTimestampNow = jest.fn(() => ({
        toDate: () => new Date("2026-05-01T12:00:00.000Z"),
        seconds: Math.floor(new Date("2026-05-01T12:00:00.000Z").getTime() / 1000),
        nanoseconds: 0,
    }));

    const firestoreFn: any = () => ({
        collection: (name: string) => ({
            doc: jest.fn(() => ({
                id: name === "trips" ? "trip123" : "member123",
            })),
        }),
        batch: () => ({
            set: mockBatchSet,
            commit: mockBatchCommit,
        }),
    });

    firestoreFn.Timestamp = {
        now: mockTimestampNow,
    };

    firestoreFn.FieldValue = {
        serverTimestamp: mockServerTimestamp,
    };

    return {
        __esModule: true,
        default: {
            auth: () => ({
                verifyIdToken: mockVerifyIdToken,
            }),
            firestore: firestoreFn,
        },
    };
});

describe("createTrip controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockVerifyIdToken.mockResolvedValue({ uid: "test123" });
        mockBatchCommit.mockResolvedValue(undefined);
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

        expect(mockVerifyIdToken).toHaveBeenCalledWith("fake-token");
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            trip_id: "trip123",
            title: "Paris Trip",
            destination: "Paris",
            start_date: "2026-05-10",
            end_date: "2026-05-15",
            planning_end_at: "2026-05-12T12:00:00.000Z",
            voting_end_at: "2026-05-13T12:00:00.000Z",
            planning_started_at: "2026-05-01T12:00:00.000Z",  // This comes from your mock Timestamp.now()
            state: "Planning",
            role: "admin",
            invite_code: expect.any(String),
        });
    });

    it("returns 401 if token is invalid", async () => {
        mockVerifyIdToken.mockRejectedValueOnce(new Error("Invalid token"));

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

    it("writes the correct trip and membership data to Firestore", async () => {
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

        expect(mockVerifyIdToken).toHaveBeenCalledWith("fake-token");
        expect(mockBatchSet).toHaveBeenCalledTimes(2);

        expect(mockBatchSet).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ id: "trip123" }),
            expect.objectContaining({
                admin_user_id: "test123",
                title: "Paris Trip",
                destination: "Paris",
                start_date: "2026-05-10",
                end_date: "2026-05-15",
                planning_end_at: "2026-05-12T12:00:00.000Z",
                voting_end_at: "2026-05-13T12:00:00.000Z",
                state: "Planning",
                invite_code: expect.any(String),
            })
        );

        expect(mockBatchSet).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ id: "member123" }),
            expect.objectContaining({
                user_id: "test123",
                trip_id: "trip123",
                role: "admin",
                invite_status: "accepted",
            })
        );

        expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });
});