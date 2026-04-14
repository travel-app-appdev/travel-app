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
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockImplementation(() => {
          // invite code exists
          if (collectionName === 'trips') {
            return Promise.resolve({
              empty: false,
              docs: [{
                id: 'trip-123',
                data: () => ({
                  title: 'Test Trip',
                  destination: 'Vienna',
                  start_date: '2026-06-01',
                  end_date: '2026-06-10',
                  state: 'Planning',
                }),
              }],
            });
          }
          // user is not a member yet
          if (collectionName === 'trip_members') {
            return Promise.resolve({ empty: true });
          }
        }),
        doc: jest.fn().mockReturnThis(),
        set: jest.fn().mockResolvedValue({}),
      })),
    }),
  },
  db: {},
}));

describe('POST /trips/join', () => {

  it('should return 400 if fields are missing', async () => {
    const res = await request(app)
      .post('/trips/join')
      .send({ idToken: 'valid-token' }); // missing inviteCode

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('idToken and inviteCode are required');
  });

  it('should return 200 and trip data on success', async () => {
    const res = await request(app)
      .post('/trips/join')
      .send({
        idToken: 'valid-token',
        inviteCode: 'valid-invite-code',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('trip_id');
    expect(res.body).toHaveProperty('title');
    expect(res.body.role).toBe('member');
  });

  afterAll(done => {
    done();
  });

});