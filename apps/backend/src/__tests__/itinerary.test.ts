import { generateDaySlots, generateItinerary } from "../__helpers__/itineraryHelper";
import request from 'supertest';
import app from '../index';

jest.mock('../config/firebase', () => ({
    __esModule: true,
    default: {
        auth: () => ({}),
        firestore: () => ({
            collection: jest.fn().mockImplementation(() => ({
                doc: jest.fn().mockImplementation(() => ({
                    get: jest.fn().mockResolvedValue({
                        exists: true,
                        id: 'trip-123',
                        data: () => ({
                            title: 'Test Trip',
                            destination: 'Vienna',
                            start_date: '2026-06-01',
                            end_date: '2026-06-01',
                            state: 'Final',
                        }),
                    }),
                })),
                where: jest.fn().mockReturnThis(),
                get: jest.fn().mockResolvedValue({
                    empty: false,
                    docs: [{
                        id: 'trip-123_2026-06-01',
                        data: () => ({
                            trip_id: 'trip-123',
                            date: '2026-06-01',
                            slots: [],
                        }),
                    }],
                }),
            })),
        }),
    },
    db: {},
}));

describe("generateDaySlots()", () => {

    it("should return 6 slots", () => {
        const slots = generateDaySlots("2026-06-01");
        expect(slots).toHaveLength(6);
    });

    it("should start with Breakfast", () => {
        const slots = generateDaySlots("2026-06-01");
        expect(slots[0].slot_type).toBe("Breakfast");
    });

    it("should end with Evening Activity", () => {
        const slots = generateDaySlots("2026-06-01");
        expect(slots[5].slot_type).toBe("Evening Activity");
    });

    it("should have activityId null for all slots", () => {
        const slots = generateDaySlots("2026-06-01");
        slots.forEach((slot) => {
            expect(slot.activityId).toBeNull();
        });
    });

    it("should include date in slot_id", () => {
        const slots = generateDaySlots("2026-06-01");
        expect(slots[0].slot_id).toBe("2026-06-01_Breakfast");
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

    it("should include 6 slots per day", () => {
        const result = generateItinerary("trip-1", "2026-06-01", "2026-06-03");
        result.days.forEach((day) => {
            expect(day.slots).toHaveLength(6);
        });
    });

    it("should set correct trip_id", () => {
        const result = generateItinerary("trip-123", "2026-06-01", "2026-06-01");
        expect(result.trip_id).toBe("trip-123");
    });

});

describe('GET /trips/:id/itinerary', () => {

    it('should return 400 if trip state does not match', async () => {
        const res = await request(app)
            .get('/trips/trip-123/itinerary?state=planning');

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Trip is not in planning state');
    });

    it('should return 200 if no state param provided', async () => {
        const res = await request(app)
            .get('/trips/trip-123/itinerary');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('trip_id');
    });

    afterAll(done => {
        done();
    });

});
