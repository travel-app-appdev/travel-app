import request from 'supertest';
import app from '../index';

jest.mock('../config/firebase', () => ({
    __esModule: true,
    default: {
        firestore: () => ({
            collection: (name: string) => {
                if (name === 'trip_members') {
                    return {
                        where: jest.fn().mockImplementation((field, op, value) => {
                            if (field === 'user_id' && value === 'test123') {
                                return {
                                    where: jest.fn().mockImplementation((field2, op2, value2) => {
                                        if (field2 === 'invite_status' && value2 === 'accepted') {
                                            return {
                                                get: jest.fn().mockResolvedValue({
                                                    empty: false,
                                                    docs: [
                                                        {
                                                            data: () => ({
                                                                user_id: 'test123',
                                                                trip_id: 'trip1',
                                                                role: 'admin',
                                                                invite_status: 'accepted',
                                                            }),
                                                        },
                                                    ],
                                                }),
                                            };
                                        }

                                        return {
                                            get: jest.fn().mockResolvedValue({
                                                empty: true,
                                                docs: [],
                                            }),
                                        };
                                    }),
                                };
                            }

                            return {
                                where: jest.fn().mockReturnValue({
                                    get: jest.fn().mockResolvedValue({
                                        empty: true,
                                        docs: [],
                                    }),
                                }),
                            };
                        }),
                    };
                }

                if (name === 'trips') {
                    return {
                        doc: jest.fn().mockImplementation((tripId: string) => ({
                            get: jest.fn().mockResolvedValue({
                                id: tripId,
                                exists: tripId === 'trip1',
                                data: () => ({
                                    title: 'Vienna Trip',
                                    destination: 'Vienna',
                                    start_date: '2026-04-10',
                                    end_date: '2026-04-15',
                                    state: 'Planning',
                                }),
                            }),
                        })),
                    };
                }

                return {};
            },
        }),
    },
}));

describe('GET /trips/my', () => {
    it('should return 400 if userId is missing', async () => {
        const res = await request(app).get('/trips/my');

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('userId is required');
    });

    it('should return trips for the current user', async () => {
        const res = await request(app).get('/trips/my?userId=test123');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            {
                trip_id: 'trip1',
                title: 'Vienna Trip',
                destination: 'Vienna',
                start_date: '2026-04-10',
                end_date: '2026-04-15',
                state: 'Planning',
                role: 'admin',
                 members: [], 
            },
        ]);
    });

    afterAll(done => {
        done();
    });
});