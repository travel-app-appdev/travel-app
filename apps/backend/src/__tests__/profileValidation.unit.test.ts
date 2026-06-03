//
// Unit tests for the updateProfile controller — validation rules and
// error handling, fully mocked (no real Firebase, no HTTP layer).

import { updateProfile } from "../controllers/authController";

// ─── Firebase mock ────────────────────────────────────────────────────────────

const mockVerifyIdToken = jest.fn();
const mockUpdateUser = jest.fn();
const mockFirestoreSet = jest.fn();

jest.mock("../config/firebase", () => ({
    __esModule: true,
    default: {
        auth: () => ({
            verifyIdToken: mockVerifyIdToken,
            updateUser: mockUpdateUser,
        }),
        firestore: () => ({
            collection: () => ({
                doc: () => ({
                    set: mockFirestoreSet,
                }),
            }),
        }),
    },
}));

// ─── Response mock ────────────────────────────────────────────────────────────

const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("updateProfile controller — validation", () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        mockVerifyIdToken.mockResolvedValue({ uid: "user-123" });
        mockFirestoreSet.mockResolvedValue(undefined);
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    // ── Missing idToken ───────────────────────────────────────────────────────

    it("returns 400 when idToken is missing", async () => {
        const req: any = { body: { name: "Helen" } };
        const res = mockResponse();

        await updateProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "idToken is required" });
    });

    // ── No fields to update ───────────────────────────────────────────────────

    it("returns 400 when neither name nor email is provided", async () => {
        const req: any = { body: { idToken: "valid-token" } };
        const res = mockResponse();

        await updateProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: "At least one of name or email is required",
        });
    });

    // ── Successful name update ────────────────────────────────────────────────

    it("returns 200 with updated user when name is provided", async () => {
        mockUpdateUser.mockResolvedValueOnce({
            uid: "user-123",
            email: "helen@example.com",
            displayName: "Helen Updated",
        });

        const req: any = {
            body: { idToken: "valid-token", name: "Helen Updated" },
        };
        const res = mockResponse();

        await updateProfile(req, res);

        expect(mockVerifyIdToken).toHaveBeenCalledWith("valid-token");
        expect(mockUpdateUser).toHaveBeenCalledWith(
            "user-123",
            expect.objectContaining({ displayName: "Helen Updated" })
        );
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ name: "Helen Updated" })
        );
    });

    // ── Successful email update ───────────────────────────────────────────────

    it("returns 200 with updated user when email is provided", async () => {
        mockUpdateUser.mockResolvedValueOnce({
            uid: "user-123",
            email: "new@example.com",
            displayName: "Helen",
        });

        const req: any = {
            body: { idToken: "valid-token", email: "new@example.com" },
        };
        const res = mockResponse();

        await updateProfile(req, res);

        expect(mockUpdateUser).toHaveBeenCalledWith(
            "user-123",
            expect.objectContaining({ email: "new@example.com" })
        );
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ email: "new@example.com" })
        );
    });

    // ── Email already in use ──────────────────────────────────────────────────

    it("returns 409 when email is already in use", async () => {
        const error: any = new Error("Email already exists");
        error.code = "auth/email-already-exists";
        mockUpdateUser.mockRejectedValueOnce(error);

        const req: any = {
            body: { idToken: "valid-token", email: "taken@example.com" },
        };
        const res = mockResponse();

        await updateProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({ error: "Email is already in use" });
    });

    // ── Invalid email ─────────────────────────────────────────────────────────

    it("returns 400 when email format is invalid", async () => {
        const error: any = new Error("Invalid email");
        error.code = "auth/invalid-email";
        mockUpdateUser.mockRejectedValueOnce(error);

        const req: any = {
            body: { idToken: "valid-token", email: "not-an-email" },
        };
        const res = mockResponse();

        await updateProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid email address" });
    });

    // ── Invalid token ─────────────────────────────────────────────────────────

    it("returns 401 when idToken is invalid", async () => {
        mockVerifyIdToken.mockRejectedValueOnce(new Error("Token expired"));

        const req: any = {
            body: { idToken: "bad-token", name: "Helen" },
        };
        const res = mockResponse();

        await updateProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            error: "Invalid token or failed to update profile",
        });
    });

    // ── Both name and email ───────────────────────────────────────────────────

    it("updates both name and email when both are provided", async () => {
        mockUpdateUser.mockResolvedValueOnce({
            uid: "user-123",
            email: "new@example.com",
            displayName: "Helen New",
        });

        const req: any = {
            body: {
                idToken: "valid-token",
                name: "Helen New",
                email: "new@example.com",
            },
        };
        const res = mockResponse();

        await updateProfile(req, res);

        expect(mockUpdateUser).toHaveBeenCalledWith("user-123", {
            displayName: "Helen New",
            email: "new@example.com",
        });
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Helen New",
                email: "new@example.com",
            })
        );
    });

    // ── Firestore is also updated ─────────────────────────────────────────────

    it("writes the updated fields to Firestore after Auth update", async () => {
        mockUpdateUser.mockResolvedValueOnce({
            uid: "user-123",
            email: "helen@example.com",
            displayName: "Helen Updated",
        });

        const req: any = {
            body: { idToken: "valid-token", name: "Helen Updated" },
        };
        const res = mockResponse();

        await updateProfile(req, res);

        expect(mockFirestoreSet).toHaveBeenCalledWith(
            expect.objectContaining({ name: "Helen Updated" }),
            { merge: true }
        );
    });
});
