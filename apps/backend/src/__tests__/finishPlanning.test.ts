import request from 'supertest';
import app from '../index';

const mockMarkDone = jest.fn().mockResolvedValue(undefined);
const mockUpdateState = jest.fn().mockResolvedValue(undefined);

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
                    update: mockUpdateState,
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
                                    planning_done: false,
                                }),
                                ref: { update: mockMarkDone },
                            }],
                        });
                    }
                }),
            })),
        }),
    },
    db: {},
}));

describe('POST /trips/:tripId/finish-planning', () => {

    it('should return 400 if idToken is missing', async () => {
        const res = await request(app)
            .post('/trips/trip-123/finish-planning')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('idToken is required');
    });

    it('should return 200 and switch state when all members done', async () => {
        const res = await request(app)
            .post('/trips/trip-123/finish-planning')
            .send({ idToken: 'valid-token' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('allDone');
        expect(res.body).toHaveProperty('tripState');
        expect(res.body).toHaveProperty('completedMembers');
        expect(res.body).toHaveProperty('totalMembers');
    });

    afterAll(done => {
        done();
    });

});