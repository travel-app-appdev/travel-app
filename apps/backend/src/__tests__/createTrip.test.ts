import { createTrip } from "../controllers/tripsController";

const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
const mockVerifyIdToken = jest.fn().mockResolvedValue({ uid: "test123" });

jest.mock("../config/firebase", () => ({
    __esModule: true,
    default: {
        auth: () => ({
            verifyIdToken: mockVerifyIdToken,
        }),
        firestore: () => ({
            collection: (name: string) => ({
                doc: jest.fn(() => ({
                    id: name === "trips" ? "trip123" : "member123",
                })),
            }),
            batch: () => ({
                set: mockBatchSet,
                commit: mockBatchCommit,
            }),
        }),
    },
}));

const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

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
            error: "idToken, title, destination, start_date and end_date are required",
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
            state: "Planning",
            role: "admin",
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
            },
        };
        const res = mockResponse();

        await createTrip(req, res);

        expect(mockVerifyIdToken).toHaveBeenCalledWith("fake-token");

        expect(mockBatchSet).toHaveBeenCalledTimes(2);

        expect(mockBatchSet).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ id: "trip123" }),
            {
                admin_user_id: "test123",
                title: "Paris Trip",
                destination: "Paris",
                start_date: "2026-05-10",
                end_date: "2026-05-15",
                state: "Planning",
            }
        );

        expect(mockBatchSet).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ id: "member123" }),
            {
                user_id: "test123",
                trip_id: "trip123",
                role: "admin",
                invite_status: "accepted",
            }
        );

        expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });
});