// src/__tests__/register.test.ts
import request from 'supertest';
import app from '../index';

// Mock Firebase Admin
jest.mock('../config/firebase', () => ({
  __esModule: true,
  default: {
    auth: () => ({
      createUser: jest.fn().mockImplementation(({ email }) => {
        if (email === 'test@example.com') {
          const error: any = new Error('Email already exists');
          error.code = 'auth/email-already-exists';
          throw error;
        }
        return Promise.resolve({
          uid: 'mock-uid-123',
          email,
        });
      }),
    }),
    firestore: () => ({
      collection: () => ({
        doc: () => ({
          set: jest.fn().mockResolvedValue({}),
        }),
      }),
    }),
  },
  db: {},
}));

describe('POST /auth/register', () => {

  it('should return 400 if fields are missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('email, password and name are required');
  });

  it('should return 409 if email already exists', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'secret123',
        name: 'Milena'
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email is already registered');
  });

  it('should return 201 and user data on success', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: 'newuser@example.com',
        password: 'secret123',
        name: 'Milena'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('uid');
    expect(res.body).toHaveProperty('email');
    expect(res.body).toHaveProperty('name');
  });

  afterAll(done => {
    done();
  });

});