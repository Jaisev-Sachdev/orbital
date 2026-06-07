import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import requireAuth, { AuthRequest } from '../middleware/requireAuth';

const router = Router();

// POST /plans — create a new plan
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name } = req.body;

  const normalizedName = typeof name === 'string' && name.trim().length > 0
    ? name.trim()
    : 'My Plan';

  const plan = await prisma.plan.create({
    data: {
      userId: req.userId!,
      name: normalizedName
    }
  });

  res.status(201).json({ message: 'Plan created', plan });
});

// GET /plans — get all plans for logged in user
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const plans = await prisma.plan.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ plans });
});

// GET /plans/:id — get one plan with all semester slots
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const plan = await prisma.plan.findFirst({
    where: { id: String(req.params.id), userId: req.userId! },
    include: { semesters: true }
  });

  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  res.json({ plan });
});

// PUT /plans/:id — rename a plan
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const plan = await prisma.plan.findFirst({
    where: { id: String(req.params.id), userId: req.userId! }
  });

  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  const updated = await prisma.plan.update({
    where: { id: String(req.params.id) },
    data: { name: name.trim() }
  });

  res.json({ message: 'Plan updated', plan: updated });
});

// DELETE /plans/:id — delete a plan and all its slots
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const plan = await prisma.plan.findFirst({
    where: { id: String(req.params.id), userId: req.userId! }
  });

  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  // Delete all slots first, then the plan
  await prisma.$transaction([
    prisma.semesterSlot.deleteMany({ where: { planId: String(req.params.id) } }),
    prisma.plan.delete({ where: { id: String(req.params.id) } })
  ]);
  res.json({ message: 'Plan deleted' });
});

// POST /plans/:id/slots — add a module to a semester slot
router.post('/:id/slots', requireAuth, async (req: AuthRequest, res: Response) => {
  const { year, semester, moduleCode } = req.body;

  if (!year || !semester || !moduleCode) {
    res.status(400).json({ error: 'year, semester and moduleCode are required' });
    return;
  }

  const parsedYear = typeof year === 'string' ? Number(year) : year;
  const parsedSemester = typeof semester === 'string' ? Number(semester) : semester;

  if (!Number.isInteger(parsedYear) || !Number.isInteger(parsedSemester)) {
    res.status(400).json({ error: 'year and semester must be numbers' });
    return;
  }

  const plan = await prisma.plan.findFirst({
    where: { id: String(req.params.id), userId: req.userId! }
  });

  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  try {
    const slot = await prisma.semesterSlot.create({
      data: {
        planId: String(req.params.id),
        year: parsedYear,
        semester: parsedSemester,
        moduleCode: String(moduleCode).toUpperCase().trim()
      }
    });

    res.status(201).json({ message: 'Module added to plan', slot });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Module already exists in this semester' });
      return;
    }
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// DELETE /plans/:id/slots/:slotId — remove a module from a slot
router.delete('/:id/slots/:slotId', requireAuth, async (req: AuthRequest, res: Response) => {
  const slot = await prisma.semesterSlot.findFirst({
    where: {
      id: String(req.params.slotId),
      planId: String(req.params.id),
      plan: { userId: req.userId! }
    }

  if (!slot) {
    res.status(404).json({ error: 'Slot not found' });
    return;
  }

  await prisma.semesterSlot.delete({ where: { id: String(req.params.slotId) } });

  res.json({ message: 'Module removed from plan' });
});

// GET /plans/:id/slots — get all slots grouped by year and semester
router.get('/:id/slots', requireAuth, async (req: AuthRequest, res: Response) => {
  const plan = await prisma.plan.findFirst({
    where: { id: String(req.params.id), userId: req.userId! }
  });

  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  const slots = await prisma.semesterSlot.findMany({
    where: { planId: String(req.params.id) },
    orderBy: [{ year: 'asc' }, { semester: 'asc' }]
  });

  // Group slots by year and semester for easy frontend consumption
  const grouped: Record<string, typeof slots> = {};
  for (const slot of slots) {
    const key = `year${slot.year}_sem${slot.semester}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(slot);
  }

  res.json({ slots, grouped });
});

// POST /plans/:id/slots/bulk — add multiple modules to a semester at once
router.post('/:id/slots/bulk', requireAuth, async (req: AuthRequest, res: Response) => {
  const { year, semester, moduleCodes } = req.body;

  if (!year || !semester || !moduleCodes || !Array.isArray(moduleCodes)) {
    res.status(400).json({ error: 'year, semester and moduleCodes array are required' });
    return;
  }

  const parsedYear = typeof year === 'string' ? Number(year) : year;
  const parsedSemester = typeof semester === 'string' ? Number(semester) : semester;

  if (!Number.isInteger(parsedYear) || !Number.isInteger(parsedSemester)) {
    res.status(400).json({ error: 'year and semester must be numbers' });
    return;
  }

  const plan = await prisma.plan.findFirst({
    where: { id: String(req.params.id), userId: req.userId! }
  });

  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  const normalizedCodes = moduleCodes
    .filter((code: unknown): code is string => typeof code === 'string')
    .map(code => code.toUpperCase().trim())
    .filter(code => code.length > 0);

  if (normalizedCodes.length !== moduleCodes.length) {
    res.status(400).json({ error: 'moduleCodes must be an array of non-empty strings' });
    return;
  }

  const added = await prisma.semesterSlot.createMany({
    data: normalizedCodes.map(code => ({
      planId: String(req.params.id),
      year: parsedYear,
      semester: parsedSemester,
      moduleCode: code
    })),
    skipDuplicates: true
  });

  res.status(201).json({ message: `${added.count} module(s) added`, count: added.count });
});

export default router;