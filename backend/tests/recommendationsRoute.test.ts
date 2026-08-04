import express from 'express';
import request from 'supertest';

// Capture what the route actually asks Prisma for.
const findMany = jest.fn();
jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    profile: { findUnique: jest.fn() },
    module: { findMany: (...a: any[]) => findMany(...a) }
  }
}));

// Stub the model so no network call happens.
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: '[]' }] }) }
  }))
}));

jest.mock('../src/middleware/requireAuth', () => ({
  __esModule: true,
  default: (req: any, _res: any, next: any) => { req.userId = 'user-1'; next(); }
}));

// eslint-disable-next-line import/first
import prisma from '../src/lib/prisma';
// eslint-disable-next-line import/first
import recommendationsRouter from '../src/routes/recommendations';

const app = express();
app.use(express.json());
app.use('/recommendations', recommendationsRouter);

const asProfile = (major: string, completed: string[]) => ({
  major, faculty: 'F', yearOfStudy: 2, cohortYear: 'AY25/26',
  completedMods: completed.map(moduleCode => ({ moduleCode }))
});

const prefixesUsed = () => {
  const where = findMany.mock.calls[0][0].where;
  return (where.OR ?? []).map((c: any) => c.moduleCode.startsWith);
};

beforeEach(() => {
  findMany.mockReset();
  findMany.mockResolvedValue([{ moduleCode: 'EC2101', title: 'x', credits: 4, prerequisite: null }]);
  (prisma.profile.findUnique as jest.Mock).mockReset();
});

describe('POST /recommendations pool scoping', () => {
  // The end-to-end version of the MS3 finding: an Economics student who has  taken CS modules must not be handed a CS candidate pool.
  test('Economics student with completed CS modules gets an EC-scoped pool', async () => {
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue(
      asProfile('Economics', ['CS1101S', 'CS2030S', 'EC1101E'])
    );

    await request(app).post('/recommendations').send({});

    expect(prefixesUsed()).toEqual(['EC']);
    expect(prefixesUsed()).not.toContain('CS');
  });

  test('completed modules are still excluded from the pool', async () => {
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue(
      asProfile('Economics', ['EC1101E'])
    );

    await request(app).post('/recommendations').send({});

    expect(findMany.mock.calls[0][0].where.moduleCode.notIn).toEqual(['EC1101E']);
  });

  test('CS student still gets a CS-scoped pool', async () => {
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue(
      asProfile('Computer Science', [])
    );

    await request(app).post('/recommendations').send({});
    expect(prefixesUsed()).toContain('CS');
  });

  test('falls back to an unfiltered pool when the scoped pool is empty', async () => {
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue(
      asProfile('Economics', [])
    );
    findMany.mockResolvedValueOnce([]);   // scoped query returns nothing
    findMany.mockResolvedValueOnce([{ moduleCode: 'AAA1000', title: 'x', credits: 4, prerequisite: null }]);

    await request(app).post('/recommendations').send({});

    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany.mock.calls[1][0].where.OR).toBeUndefined();
  });

  test('the prompt tells the model to use only the supplied modules', async () => {
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue(asProfile('Economics', []));
    const Anthropic = require('@anthropic-ai/sdk').default;

    await request(app).post('/recommendations').send({});

    const create = Anthropic.mock.results[0].value.messages.create;
    expect(create.mock.calls[0][0].messages[0].content)
      .toContain('Only recommend modules from the list above.');
  });
});
