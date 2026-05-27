import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import requireAuth, { AuthRequest } from '../middleware/requireAuth';

const router = Router();

// POST /profile — create or update profile
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { major, faculty, yearOfStudy, cohortYear } = req.body;

  const parsedYearOfStudy = (() => {
    if (typeof yearOfStudy === 'string') {
      const trimmed = yearOfStudy.trim();
      if (!/^\d+$/.test(trimmed)) return NaN;
      return Number.parseInt(trimmed, 10);
    }
    return yearOfStudy;
  })();

  if (
    typeof major !== 'string' || major.trim().length === 0 ||
    typeof faculty !== 'string' || faculty.trim().length === 0 ||
    !Number.isInteger(parsedYearOfStudy) ||
    typeof cohortYear !== 'string' || cohortYear.trim().length === 0
  ) {
    res.status(400).json({ error: 'major, faculty, yearOfStudy (integer) and cohortYear are required' });
    return;
  }

  const profile = await prisma.profile.upsert({
    where: { userId: req.userId! },
    update: {
      major: major.trim(),
      faculty: faculty.trim(),
      yearOfStudy: parsedYearOfStudy,
      cohortYear: cohortYear.trim()
    },
    create: {
      userId: req.userId!,
      major: major.trim(),
      faculty: faculty.trim(),
      yearOfStudy: parsedYearOfStudy,
      cohortYear: cohortYear.trim()
    }
  });

  res.json({ message: 'Profile saved', profile });
});

// GET /profile — get your own profile
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({
    where: { userId: req.userId! },
    include: { completedMods: true }
  });

  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  res.json({ profile });
});

// POST /profile/modules — add completed modules
router.post('/modules', requireAuth, async (req: AuthRequest, res: Response) => {
  const { moduleCodes } = req.body;

  if (!moduleCodes || !Array.isArray(moduleCodes)) {
    res.status(400).json({ error: 'moduleCodes must be an array' });
    return;
  }

  const normalizedCodes = moduleCodes
    .filter((code): code is string => typeof code === 'string')
    .map(code => code.toUpperCase().trim())
    .filter(code => code.length > 0);

  if (normalizedCodes.length !== moduleCodes.length) {
    res.status(400).json({ error: 'moduleCodes must be an array of non-empty strings' });
    return;
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: req.userId! }
  });

  if (!profile) {
    res.status(404).json({ error: 'Profile not found. Create a profile first.' });
    return;
  }

  const added = await prisma.completedModule.createMany({
    data: normalizedCodes.map(moduleCode => ({
      profileId: profile.id,
      moduleCode
    })),
    skipDuplicates: true
  });

  res.json({ message: `${added.count} module(s) added`, count: added.count });

// GET /profile/modules — list completed modules
router.get('/modules', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({
    where: { userId: req.userId! },
    include: { completedMods: true }
  });

  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  res.json({ modules: profile.completedMods.map(m => m.moduleCode) });
});

export default router;