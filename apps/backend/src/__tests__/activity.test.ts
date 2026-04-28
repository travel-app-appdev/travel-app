import request from 'supertest';
import app from '../index';

jest.mock('../config/firebase', () => ({
    __esModule: true,
    default: {
        auth: () => ({
            verifyIdToken: jest.fn().mockImplementation((token) => {
                if (token === 'valid-token') {
                    return Promise.resolve({ uid: 'user-123' });
                }
                throw new Error('Invalid token');
            }),
        }),
        firestore: () => ({
            collection: jest.fn().mockImplementation((collectionName) => ({
                doc: jest.fn().mockImplementation(() => ({
                    get: jest.fn().mockResolvedValue({
                        exists: true,
                        id: 'trip-123',
                        data: () => ({
                            title: 'Test Trip',
                            destination: 'Vienna',
                            start_date: '2026-05-01',
                            end_date: '2026-05-03',
                            state: 'Planning',
                        }),
                    }),
                })),
                where: jest.fn().mockReturnThis(),
                get: jest.fn().mockImplementation(() => {
                    if (collectionName === 'trip_members') {
                        return Promise.resolve({
                            empty: false,
                            docs: [{
                                data: () => ({
                                    user_id: 'user-123',
                                    trip_id: 'trip-123',
                                    role: 'admin',
                                    invite_status: 'accepted',
                                }),
                            }],
                        });
                    }
                    if (collectionName === 'timeslot_activities') {
                        return Promise.resolve({
                            empty: false,
                            docs: [{
                                data: () => ({
                                    slot_id: '06:00-08:00',
                                    activity_id: 'activity-123',
                                    status: 'candidate',
                                }),
                            }],
                        });
                    }
                    return Promise.resolve({ empty: true, docs: [] });
                }),
            })),
            batch: jest.fn().mockReturnValue({
                set: jest.fn(),
                commit: jest.fn().mockResolvedValue({}),
            }),
        }),
    },
    db: {},
}));

describe('POST /itinerary/:tripId/slots/:slotId/activities', () => {

    it('should return 400 if name is missing', async () => {
        const res = await request(app)
            .post('/itinerary/trip-123/slots/06:00-08:00/activities')
            .send({ idToken: 'valid-token' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('name is required');
    });

    it('should return 400 if idToken is missing', async () => {
        const res = await request(app)
            .post('/itinerary/trip-123/slots/06:00-08:00/activities')
            .send({ name: 'Visit Palace' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('idToken is required');
    });

    it('should return 400 if trip is not in Planning state', async () => {
        jest.spyOn(require('../repositories/tripsRepository'), 'findTripById')
            .mockResolvedValueOnce({
                trip_id: 'trip-123',
                title: 'Test Trip',
                destination: 'Vienna',
                start_date: '2026-05-01',
                end_date: '2026-05-03',
                state: 'Voting',
            });

        const res = await request(app)
            .post('/itinerary/trip-123/slots/06:00-08:00/activities')
            .send({
                idToken: 'valid-token',
                name: 'Visit Palace',
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Trip is not in Planning state');
    });

    it('should return 404 if user is not a member', async () => {
        jest.spyOn(require('../repositories/tripsRepository'), 'findMembership')
            .mockResolvedValueOnce(null);

        const res = await request(app)
            .post('/itinerary/trip-123/slots/06:00-08:00/activities')
            .send({
                idToken: 'valid-token',
                name: 'Visit Palace',
            });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('User is not a member of this trip');
    });

    it('should return 201 and activity data on success', async () => {
        const res = await request(app)
            .post('/itinerary/trip-123/slots/06:00-08:00/activities')
            .send({
                idToken: 'valid-token',
                name: 'Visit Schönbrunn Palace',
                description: 'Beautiful palace',
                address: 'Schönbrunner Schloßstraße 47',
                googleMapsUrl: 'https://maps.google.com',
            });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('name');
        expect(res.body).toHaveProperty('trip_id');
        expect(res.body).toHaveProperty('user_id');
        expect(res.body.source_type).toBe('manual');
    });

    afterAll(done => {
        done();
    });

});

describe('GET /itinerary/:tripId/slots/:slotId/activities', () => {

    it('should return 200 and list of activities', async () => {
        const res = await request(app)
            .get('/itinerary/trip-123/slots/06:00-08:00/activities');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    afterAll(done => {
        done();
    });

});