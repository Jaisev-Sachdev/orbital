import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import requireAuth, { AuthRequest } from '../middleware/requireAuth';
import { NUS_MAJORS } from '../config/nusMajors';

const router = Router();

const NUS_MAJORS_SET = new Set(NUS_MAJORS);

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

  const trimmedMajor = major.trim();

  // major must be one of NUS's primary majors (see config/nusMajors.ts) — no
  // longer accepted as arbitrary free text now that the frontend offers a
  // fixed autocomplete list.
  if (!NUS_MAJORS_SET.has(trimmedMajor)) {
    res.status(400).json({ error: `major must be one of the recognised NUS majors (got "${trimmedMajor}")` });
    return;
  }

  const profile = await prisma.profile.upsert({
    where: { userId: req.userId! },
    update: {
      major: trimmedMajor,
      faculty: faculty.trim(),
      yearOfStudy: parsedYearOfStudy,
      cohortYear: cohortYear.trim()
    },
    create: {
      userId: req.userId!,
      major: trimmedMajor,
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
    res.status(200).json({ hasProfile: false, profile: null });
    return;
  }

  res.json({ hasProfile: true, profile });
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
});

// GET /profile/modules — list completed modules with title and credits
router.get('/modules', requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.profile.findUnique({
    where: { userId: req.userId! },
    include: { completedMods: true }
  });

  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  const codes = profile.completedMods.map(m => m.moduleCode);

  if (codes.length === 0) {
    res.json({ modules: [] });
    return;
  }

  const modules = await prisma.module.findMany({
    where: { moduleCode: { in: codes } },
    select: { moduleCode: true, title: true, credits: true }
  });

  const moduleMap = new Map(modules.map(m => [m.moduleCode, m]));

  const enriched = profile.completedMods.map(m => {
    const mod = moduleMap.get(m.moduleCode);
    return {
      moduleCode: m.moduleCode,
      title: mod?.title ?? null,
      credits: mod?.credits ?? null
    };
  });

  res.json({ modules: enriched });
});

// DELETE /profile/modules — remove completed modules
router.delete('/modules', requireAuth, async (req: AuthRequest, res: Response) => {
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
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  const deleted = await prisma.completedModule.deleteMany({
    where: {
      profileId: profile.id,
      moduleCode: { in: normalizedCodes }
    }
  });

  res.json({ message: `${deleted.count} module(s) removed`, count: deleted.count });
});

export default router;
