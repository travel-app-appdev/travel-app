// apps/frontend/__tests__/leaveTrip.api.test.ts
//
// Pure API / service-layer tests for the leaveTrip() function in src/api/trips.ts.
// No component rendering — just verifies that the fetch wrapper behaves correctly
// for every HTTP outcome the backend can return.

import { leaveTrip } from "@/src/api/trips";

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

describe("leaveTrip() — API layer", () => {
    const TRIP_ID = "trip-abc";
    const ID_TOKEN = "valid-member-token";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ── Happy path ────────────────────────────────────────────────────────────

    it("resolves without a value on a 200 response", async () => {
        mockFetch.mockReturnValueOnce(
            mockResponse(200, { message: "Left trip successfully" })
        );

        await expect(
            leaveTrip({ idToken: ID_TOKEN, tripId: TRIP_ID })
        ).resolves.toBeUndefined();
    });

    it("calls the correct endpoint with POST and the idToken in the body", async () => {
        mockFetch.mockReturnValueOnce(
            mockResponse(200, { message: "Left trip successfully" })
        );

        await leaveTrip({ idToken: ID_TOKEN, tripId: TRIP_ID });

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toContain(`/trips/${TRIP_ID}/leave`);
        expect(options.method).toBe("POST");

        const body = JSON.parse(options.body);
        expect(body).toEqual({ idToken: ID_TOKEN });
    });

    it("sends Content-Type: application/json", async () => {
        mockFetch.mockReturnValueOnce(
            mockResponse(200, { message: "Left trip successfully" })
        );

        await leaveTrip({ idToken: ID_TOKEN, tripId: TRIP_ID });

        const [, options] = mockFetch.mock.calls[0];
        expect(options.headers["Content-Type"]).toBe("application/json");
    });

    // ── Error responses from backend ──────────────────────────────────────────

    it("throws with the backend error message on a 403 (admin trying to leave)", async () => {
        mockFetch.mockReturnValueOnce(
            mockResponse(403, {
                error: "Admin cannot leave the trip. Delete it instead.",
            })
        );

        await expect(
            leaveTrip({ idToken: ID_TOKEN, tripId: TRIP_ID })
        ).rejects.toThrow("Admin cannot leave the trip. Delete it instead.");
    });

    it("throws with the backend error message on a 404 (not a member)", async () => {
        mockFetch.mockReturnValueOnce(
            mockResponse(404, { error: "You are not a member of this trip" })
        );

        await expect(
            leaveTrip({ idToken: ID_TOKEN, tripId: TRIP_ID })
        ).rejects.toThrow("You are not a member of this trip");
    });

    it("throws with the backend error message on a 401 (invalid token)", async () => {
        mockFetch.mockReturnValueOnce(
            mockResponse(401, {
                error: "Invalid token or failed to leave trip",
            })
        );

        await expect(
            leaveTrip({ idToken: "bad-token", tripId: TRIP_ID })
        ).rejects.toThrow("Invalid token or failed to leave trip");
    });

    it("throws a generic fallback message when the backend returns no error field", async () => {
        mockFetch.mockReturnValueOnce(mockResponse(500, {}));

        await expect(
            leaveTrip({ idToken: ID_TOKEN, tripId: TRIP_ID })
        ).rejects.toThrow("Failed to leave trip");
    });

    // ── Network failure ───────────────────────────────────────────────────────

    it("propagates a network-level error (fetch rejects)", async () => {
        mockFetch.mockRejectedValueOnce(new Error("Network request failed"));

        await expect(
            leaveTrip({ idToken: ID_TOKEN, tripId: TRIP_ID })
        ).rejects.toThrow("Network request failed");
    });
});