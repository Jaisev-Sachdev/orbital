import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import requireAuth, { AuthRequest } from '../middleware/requireAuth';

const router = Router();

// POST /profile — create or update profile
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { major, faculty, yearOfStudy, cohortYear } = req.body;

  if (!major || !faculty || !yearOfStudy || !cohortYear) {
    res.status(400).json({ error: 'major, faculty, yearOfStudy and cohortYear are required' });
    return;
  }

  const profile = await prisma.profile.upsert({
    where: { userId: req.userId! },
    update: { major, faculty, yearOfStudy, cohortYear },
    create: { userId: req.userId!, major, faculty, yearOfStudy, cohortYear }
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

  const profile = await prisma.profile.findUnique({
    where: { userId: req.userId! }
  });

  if (!profile) {
    res.status(404).json({ error: 'Profile not found. Create a profile first.' });
    return;
  }

  const added = await prisma.completedModule.createMany({
    data: moduleCodes.map((code: string) => ({
      profileId: profile.id,
      moduleCode: code.toUpperCase().trim()
    })),
    skipDuplicates: true
  });

  res.json({ message: `${added.count} module(s) added`, count: added.count });
});

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