// apps/frontend/__tests__/updateProfile.api.test.ts
//
// Pure API layer tests for the updateProfile() function in src/api/auth.ts.
// Verifies fetch calls, request shape, and every error branch.

import { updateProfile } from "@/src/api/auth";

// ─── Mock global fetch ────────────────────────────────────────────────────────

const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockResponse(status: number, body: object) {
    return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
    } as Response);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("updateProfile() — API layer", () => {
    const ID_TOKEN = "valid-id-token";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ── Happy paths ───────────────────────────────────────────────────────────

    it("resolves with updated user on 200 when updating name", async () => {
        const updated = { uid: "user-123", email: "helen@example.com", name: "Helen New" };
        mockFetch.mockReturnValueOnce(mockResponse(200, updated));

        const result = await updateProfile({ idToken: ID_TOKEN, name: "Helen New" });

        expect(result).toEqual(updated);
    });

    it("resolves with updated user on 200 when updating email", async () => {
        const updated = { uid: "user-123", email: "new@example.com", name: "Helen" };
        mockFetch.mockReturnValueOnce(mockResponse(200, updated));

        const result = await updateProfile({ idToken: ID_TOKEN, email: "new@example.com" });

        expect(result).toEqual(updated);
    });

    it("resolves with updated user on 200 when updating both name and email", async () => {
        const updated = { uid: "user-123", email: "new@example.com", name: "Helen New" };
        mockFetch.mockReturnValueOnce(mockResponse(200, updated));

        const result = await updateProfile({
            idToken: ID_TOKEN,
            name: "Helen New",
            email: "new@example.com",
        });

        expect(result).toEqual(updated);
    });

    // ── Request shape ─────────────────────────────────────────────────────────

    it("calls PATCH /auth/profile with the correct URL and method", async () => {
        mockFetch.mockReturnValueOnce(
            mockResponse(200, { uid: "u1", email: "e@e.com", name: "N" })
        );

        await updateProfile({ idToken: ID_TOKEN, name: "Helen" });

        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toContain("/auth/profile");
        expect(options.method).toBe("PATCH");
    });

    it("sends Content-Type: application/json", async () => {
        mockFetch.mockReturnValueOnce(
            mockResponse(200, { uid: "u1", email: "e@e.com", name: "N" })
        );

        await updateProfile({ idToken: ID_TOKEN, name: "Helen" });

        const [, options] = mockFetch.mock.calls[0];
        expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("includes idToken and name in the request body", async () => {
        mockFetch.mockReturnValueOnce(
            mockResponse(200, { uid: "u1", email: "e@e.com", name: "Helen" })
        );

        await updateProfile({ idToken: ID_TOKEN, name: "Helen" });

        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body).toEqual({ idToken: ID_TOKEN, name: "Helen" });
    });

    it("includes idToken and email in the request body", async () => {
        mockFetch.mockReturnValueOnce(
            mockResponse(200, { uid: "u1", email: "new@example.com", name: null })
        );

        await updateProfile({ idToken: ID_TOKEN, email: "new@example.com" });

        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body).toEqual({ idToken: ID_TOKEN, email: "new@example.com" });
    });

    // ── Error responses ───────────────────────────────────────────────────────

    it("throws with backend message on 409 (email already in use)", async () => {
        mockFetch.mockReturnValueOnce(
            mockResponse(409, { error: "Email is already in use" })
        );

        await expect(
            updateProfile({ idToken: ID_TOKEN, email: "taken@example.com" })
        ).rejects.toThrow("Email is already in use");
    });

    it("throws with backend message on 400 (invalid email)", async () => {
        mockFetch.mockReturnValueOnce(
            mockResponse(400, { error: "Invalid email address" })
        );

        await expect(
            updateProfile({ idToken: ID_TOKEN, email: "bad-email" })
        ).rejects.toThrow("Invalid email address");
    });

    it("throws with backend message on 401 (invalid token)", async () => {
        mockFetch.mockReturnValueOnce(
            mockResponse(401, { error: "Invalid token or failed to update profile" })
        );

        await expect(
            updateProfile({ idToken: "bad-token", name: "Helen" })
        ).rejects.toThrow("Invalid token or failed to update profile");
    });

    it("throws a generic fallback message when backend returns no error field", async () => {
        mockFetch.mockReturnValueOnce(mockResponse(500, {}));

        await expect(
            updateProfile({ idToken: ID_TOKEN, name: "Helen" })
        ).rejects.toThrow("Failed to update profile");
    });

    // ── Network failure ───────────────────────────────────────────────────────

    it("propagates a network-level error when fetch rejects", async () => {
        mockFetch.mockRejectedValueOnce(new Error("Network request failed"));

        await expect(
            updateProfile({ idToken: ID_TOKEN, name: "Helen" })
        ).rejects.toThrow("Network request failed");
    });
});