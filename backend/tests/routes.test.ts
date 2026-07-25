import request from 'supertest';
import jwt from 'jsonwebtoken';


jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    profile: { upsert: jest.fn(), findUnique: jest.fn() },
    plan: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    user: { findUnique: jest.fn() }
  }
}));

// eslint-disable-next-line import/first
import app from '../src/app';
// eslint-disable-next-line import/first
import prisma from '../src/lib/prisma';

const authHeader = () => `Bearer ${jwt.sign({ userId: 'user-1' }, process.env.JWT_SECRET as string)}`;

const validProfileBody = {
  major: 'Computer Science',
  faculty: 'School of Computing',
  yearOfStudy: 2,
  cohortYear: 'AY25/26'
};

describe('POST /profile', () => {
  afterEach(() => jest.clearAllMocks());

  test('rejects requests with no auth token', async () => {
    const res = await request(app).post('/profile').send(validProfileBody);
    expect(res.status).toBe(401);
  });

  test('rejects a major not on the recognised NUS list', async () => {
    const res = await request(app)
      .post('/profile')
      .set('Authorization', authHeader())
      .send({ ...validProfileBody, major: 'Underwater Basket Weaving' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/recognised NUS majors/);
  });

  test('accepts a valid major and persists via prisma.profile.upsert', async () => {
    (prisma.profile.upsert as jest.Mock).mockResolvedValue({ id: 'p1', major: 'Computer Science' });

    const res = await request(app)
      .post('/profile')
      .set('Authorization', authHeader())
      .send(validProfileBody);

    expect(res.status).toBe(200);
    expect(prisma.profile.upsert).toHaveBeenCalledTimes(1);
  });
});

describe('POST /plans/:id/share', () => {
  afterEach(() => jest.clearAllMocks());

  test('is idempotent — reuses an existing shareToken instead of minting a new one', async () => {
    (prisma.plan.findFirst as jest.Mock).mockResolvedValue({ id: 'plan-1', userId: 'user-1', shareToken: 'existing-token' });
    (prisma.plan.update as jest.Mock).mockResolvedValue({ id: 'plan-1', shareToken: 'existing-token' });

    const res = await request(app).post('/plans/plan-1/share').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.shareToken).toBe('existing-token');
    expect(prisma.plan.update).toHaveBeenCalledWith({
      where: { id: 'plan-1' },
      data: { shareToken: 'existing-token' }
    });
  });

  test('returns 404 when the plan does not belong to the requesting user', async () => {
    (prisma.plan.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app).post('/plans/not-mine/share').set('Authorization', authHeader());
    expect(res.status).toBe(404);
  });
});

describe('GET /plans/shared/:token', () => {
  afterEach(() => jest.clearAllMocks());

  test('is publicly accessible (no auth header required)', async () => {
    (prisma.plan.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/plans/shared/does-not-exist');
    expect(res.status).not.toBe(401);
  });

  test('returns 404 for an unknown share token', async () => {
    (prisma.plan.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/plans/shared/does-not-exist');
    expect(res.status).toBe(404);
  });
});
