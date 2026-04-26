// apps/backend/src/__tests__/itinerary.test.ts
import { generateDaySlots, generateItinerary } from "../__helpers__/itineraryHelper";

describe("generateDaySlots()", () => {

    it("should return 8 slots", () => {
        const slots = generateDaySlots();
        expect(slots).toHaveLength(8);
    });

    it("should start with 06:00-08:00", () => {
        const slots = generateDaySlots();
        expect(slots[0].slot_type).toBe("06:00-08:00");
    });

    it("should end with 20:00-22:00", () => {
        const slots = generateDaySlots();
        expect(slots[7].slot_type).toBe("20:00-22:00");
    });

    it("should have activityId null for all slots", () => {
        const slots = generateDaySlots();
        slots.forEach((slot) => {
            expect(slot.activityId).toBeNull();
        });
    });

});

describe("generateItinerary()", () => {

    it("should generate 1 day if start and end are the same", () => {
        const result = generateItinerary("trip-1", "2026-06-01", "2026-06-01");
        expect(result.days).toHaveLength(1);
        expect(result.days[0].date).toBe("2026-06-01");
    });

    it("should generate 3 days for a 3 day trip", () => {
        const result = generateItinerary("trip-1", "2026-06-01", "2026-06-03");
        expect(result.days).toHaveLength(3);
        expect(result.days[0].date).toBe("2026-06-01");
        expect(result.days[1].date).toBe("2026-06-02");
        expect(result.days[2].date).toBe("2026-06-03");
    });

    it("should include 8 slots per day", () => {
        const result = generateItinerary("trip-1", "2026-06-01", "2026-06-03");
        result.days.forEach((day) => {
            expect(day.slots).toHaveLength(8);
        });
    });

    it("should set correct trip_id", () => {
        const result = generateItinerary("trip-123", "2026-06-01", "2026-06-01");
        expect(result.trip_id).toBe("trip-123");
    });

});