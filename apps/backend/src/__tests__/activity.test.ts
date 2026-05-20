jest.mock('../config/firebase', () => ({
    __esModule: true,
    default: {
        auth: () => ({
            verifyIdToken: jest.fn(),
            createUser: jest.fn(),
            updateUser: jest.fn(),
        }),
        firestore: () => ({
            collection: jest.fn(() => ({
                doc: jest.fn(() => ({
                    get: jest.fn(),
                    set: jest.fn(),
                    update: jest.fn(),
                    delete: jest.fn(),
                })),
                where: jest.fn().mockReturnThis(),
                get: jest.fn(),
                add: jest.fn(),
            })),
            batch: jest.fn(() => ({
                set: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                commit: jest.fn(),
            })),
        }),
    },
    db: {},
}));

jest.mock('../services/activityService', () => ({
    __esModule: true,
    suggestActivity: jest.fn(),
    getCandidateActivities: jest.fn(),
    getFinalActivities: jest.fn(),
    toggleFinalActivityAttendance: jest.fn(),
    updateSuggestedActivity: jest.fn(),
    voteForActivity: jest.fn(),
}));

import request from 'supertest';
import app from '../index';
import * as activityService from '../services/activityService';

const SLOT_ID = '2026-06-01_Morning Activity';
const ENCODED_SLOT_ID = encodeURIComponent(SLOT_ID);

describe('POST /itinerary/:tripId/slots/:slotId/activities', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return 400 if name is missing', async () => {
        const res = await request(app)
            .post(`/itinerary/trip-123/slots/${ENCODED_SLOT_ID}/activities`)
            .send({ idToken: 'valid-token' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('name is required');
    });

    it('should return 400 if idToken is missing', async () => {
        const res = await request(app)
            .post(`/itinerary/trip-123/slots/${ENCODED_SLOT_ID}/activities`)
            .send({ name: 'Visit Palace' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('idToken is required');
    });

    it('should return 400 if trip is not in Planning state', async () => {
        (activityService.suggestActivity as jest.Mock).mockRejectedValueOnce({
            status: 400,
            message: 'Trip is not in Planning state',
        });

        const res = await request(app)
            .post(`/itinerary/trip-123/slots/${ENCODED_SLOT_ID}/activities`)
            .send({
                idToken: 'valid-token',
                name: 'Visit Palace',
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Trip is not in Planning state');
    });

    it('should return 404 if user is not a member', async () => {
        (activityService.suggestActivity as jest.Mock).mockRejectedValueOnce({
            status: 404,
            message: 'User is not a member of this trip',
        });

        const res = await request(app)
            .post(`/itinerary/trip-123/slots/${ENCODED_SLOT_ID}/activities`)
            .send({
                idToken: 'valid-token',
                name: 'Visit Palace',
            });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('User is not a member of this trip');
    });

    it('should return 201 and activity data on success', async () => {
        (activityService.suggestActivity as jest.Mock).mockResolvedValueOnce({
            activity_id: 'activity-123',
            trip_id: 'trip-123',
            user_id: 'user-123',
            slot_id: SLOT_ID,
            name: 'Visit Schönbrunn Palace',
            description: 'Beautiful palace',
            address: 'Schönbrunner Schloßstraße 47',
            googleMapsUrl: 'https://maps.google.com',
            source_type: 'manual',
        });

        const res = await request(app)
            .post(`/itinerary/trip-123/slots/${ENCODED_SLOT_ID}/activities`)
            .send({
                idToken: 'valid-token',
                name: 'Visit Schönbrunn Palace',
                description: 'Beautiful palace',
                address: 'Schönbrunner Schloßstraße 47',
                googleMapsUrl: 'https://maps.google.com',
            });

        expect(activityService.suggestActivity).toHaveBeenCalledWith(
            'trip-123',
            SLOT_ID,
            {
                idToken: 'valid-token',
                name: 'Visit Schönbrunn Palace',
                description: 'Beautiful palace',
                address: 'Schönbrunner Schloßstraße 47',
                googleMapsUrl: 'https://maps.google.com',
            }
        );

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('name');
        expect(res.body).toHaveProperty('trip_id');
        expect(res.body).toHaveProperty('user_id');
        expect(res.body.source_type).toBe('manual');
    });
});

describe('GET /itinerary/:tripId/slots/:slotId/activities', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return 200 and list of activities', async () => {
        (activityService.getCandidateActivities as jest.Mock).mockResolvedValueOnce([
            {
                activity_id: 'activity-123',
                trip_id: 'trip-123',
                user_id: 'user-123',
                slot_id: SLOT_ID,
                name: 'Visit Schönbrunn Palace',
                source_type: 'manual',
            },
        ]);

        const res = await request(app)
            .get(`/itinerary/trip-123/slots/${ENCODED_SLOT_ID}/activities`);

        expect(activityService.getCandidateActivities).toHaveBeenCalledWith(
            'trip-123',
            SLOT_ID,
            undefined
        );
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});
