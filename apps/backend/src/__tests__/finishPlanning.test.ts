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

jest.mock('../services/tripsService', () => ({
    __esModule: true,
    getTripsForUser: jest.fn(),
    createTripForAuthenticatedUser: jest.fn(),
    createTripForUserWithoutAuth: jest.fn(),
    joinTripWithInviteCode: jest.fn(),
    deleteTripForAdmin: jest.fn(),
    leaveTripForMember: jest.fn(),
    removeMemberForAdmin: jest.fn(),
    finishPlanningForMember: jest.fn(),
    updateTripForAdmin: jest.fn(),
}));

import request from 'supertest';
import app from '../index';
import * as tripsService from '../services/tripsService';

describe('POST /trips/:tripId/finish-planning', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return 400 if idToken is missing', async () => {
        const res = await request(app)
            .post('/trips/trip-123/finish-planning')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('idToken is required');
    });

    it('should return 200 and switch state when all members done', async () => {
        (tripsService.finishPlanningForMember as jest.Mock).mockResolvedValueOnce({
            allDone: true,
            tripState: 'Voting',
            completedMembers: 3,
            totalMembers: 3,
        });

        const res = await request(app)
            .post('/trips/trip-123/finish-planning')
            .send({ idToken: 'valid-token' });

        expect(tripsService.finishPlanningForMember).toHaveBeenCalledWith('trip-123', 'valid-token', undefined);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('allDone');
        expect(res.body).toHaveProperty('tripState');
        expect(res.body).toHaveProperty('completedMembers');
        expect(res.body).toHaveProperty('totalMembers');
    });

    it('should return 400 if planningDone is not a boolean', async () => {
        const res = await request(app)
            .post('/trips/trip-123/finish-planning')
            .send({ idToken: 'valid-token', planningDone: 'false' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('planningDone must be a boolean');
        expect(tripsService.finishPlanningForMember).not.toHaveBeenCalled();
    });
});
