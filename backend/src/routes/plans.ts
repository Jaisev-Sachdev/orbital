import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import requireAuth, { AuthRequest } from '../middleware/requireAuth';
import gradRequirements from '../config/gradRequirements.json';
import { computeRequirementsProgress, buildFourYearPlan } from '../lib/gradRequirementsEngine';
import { CS_MAJOR } from '../config/nusMajors';

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

// GET /plans/shared/:token — public, unauthenticated, read-only view of a shared plan.
router.get('/shared/:token', async (req: Request, res: Response) => {
  const token = String(req.params.token);

  const plan = await prisma.plan.findFirst({
    where: { shareToken: token },
    include: {
      semesters: true,
      user: { select: { name: true } }
    }
  });

  if (!plan) {
    res.status(404).json({ error: 'Shared plan not found' });
    return;
  }

  const moduleCodes = [...new Set(plan.semesters.map(s => s.moduleCode))];
  const modules = await prisma.module.findMany({
    where: { moduleCode: { in: moduleCodes } }
  });
  const moduleMap = new Map(modules.map(m => [m.moduleCode, m]));

  const enrichedSlots = plan.semesters
    .map(slot => ({
      year: slot.year,
      semester: slot.semester,
      moduleCode: slot.moduleCode,
      title: moduleMap.get(slot.moduleCode)?.title ?? null,
      credits: moduleMap.get(slot.moduleCode)?.credits ?? null
    }))
    .sort((a, b) => a.year - b.year || a.semester - b.semester);

  const grouped: Record<string, typeof enrichedSlots> = {};
  for (const slot of enrichedSlots) {
    const key = `year${slot.year}_sem${slot.semester}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(slot);
  }

  // Read-only view — no userId, no email, no edit-capable fields exposed.
  res.json({
    planName: plan.name,
    ownerName: plan.user.name ?? 'A Courseway user',
    slots: enrichedSlots,
    grouped
  });
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

  // Cascade delete is handled by the schema (onDelete: Cascade on SemesterSlot)
  await prisma.plan.delete({ where: { id: String(req.params.id) } });
  res.json({ message: 'Plan deleted' });
});

// POST /plans/:id/share — enable sharing.
router.post('/:id/share', requireAuth, async (req: AuthRequest, res: Response) => {
  const plan = await prisma.plan.findFirst({
    where: { id: String(req.params.id), userId: req.userId! }
  });

  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  const shareToken = plan.shareToken ?? crypto.randomBytes(16).toString('hex');

  const updated = await prisma.plan.update({
    where: { id: plan.id },
    data: { shareToken }
  });

  res.json({ message: 'Sharing enabled', shareToken: updated.shareToken });
});

// POST /plans/:id/share/rotate — invalidate the current link and issue a new one
router.post('/:id/share/rotate', requireAuth, async (req: AuthRequest, res: Response) => {
  const plan = await prisma.plan.findFirst({
    where: { id: String(req.params.id), userId: req.userId! }
  });

  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  const updated = await prisma.plan.update({
    where: { id: plan.id },
    data: { shareToken: crypto.randomBytes(16).toString('hex') }
  });

  res.json({ message: 'Share link rotated', shareToken: updated.shareToken });
});

// DELETE /plans/:id/share — disable sharing
router.delete('/:id/share', requireAuth, async (req: AuthRequest, res: Response) => {
  const plan = await prisma.plan.findFirst({
    where: { id: String(req.params.id), userId: req.userId! }
  });

  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  await prisma.plan.update({
    where: { id: plan.id },
    data: { shareToken: null }
  });

  res.json({ message: 'Sharing disabled' });
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
    const normalizedModuleCode = typeof moduleCode === 'string'
      ? moduleCode.toUpperCase().trim()
      : '';

    if (!normalizedModuleCode) {
      res.status(400).json({ error: 'moduleCode must be a non-empty string' });
      return;
    }

    // Validate the module exists in the database
    const moduleExists = await prisma.module.findUnique({
      where: { moduleCode: normalizedModuleCode }
    });

    if (!moduleExists) {
      res.status(404).json({ error: `Module ${normalizedModuleCode} not found` });
      return;
    }

    const slot = await prisma.semesterSlot.create({
      data: {
        planId: String(req.params.id),
        year: parsedYear,
        semester: parsedSemester,
        moduleCode: normalizedModuleCode
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
  });

  if (!slot) {
    res.status(404).json({ error: 'Slot not found' });
    return;
  }

  await prisma.semesterSlot.delete({ where: { id: String(req.params.slotId) } });

  res.json({ message: 'Module removed from plan' });
});

// GET /plans/:id/slots — get all slots grouped by year and semester, enriched with module info
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

  // Fetch module details (title, credits) for all moduleCodes in this plan
  const moduleCodes = [...new Set(slots.map(s => s.moduleCode))];
  const modules = await prisma.module.findMany({
    where: { moduleCode: { in: moduleCodes } }
  });
  const moduleMap = new Map(modules.map(m => [m.moduleCode, m]));

  // Enrich each slot with title and credits
  const enrichedSlots = slots.map(slot => ({
    ...slot,
    title: moduleMap.get(slot.moduleCode)?.title ?? null,
    credits: moduleMap.get(slot.moduleCode)?.credits ?? null
  }));

  // Group slots by year and semester for easy frontend consumption
  const grouped: Record<string, typeof enrichedSlots> = {};
  for (const slot of enrichedSlots) {
    const key = `year${slot.year}_sem${slot.semester}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(slot);
  }

  res.json({ slots: enrichedSlots, grouped });
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

// GET /plans/:id/workload — per-semester workload breakdown and overload flags
router.get('/:id/workload', requireAuth, async (req: AuthRequest, res: Response) => {
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

  const moduleCodes = [...new Set(slots.map(s => s.moduleCode))];
  const modules = await prisma.module.findMany({
    where: { moduleCode: { in: moduleCodes } }
  });
  const moduleMap = new Map(modules.map(m => [m.moduleCode, m]));

  // Group slots by semester
  const grouped: Record<string, typeof slots> = {};
  for (const slot of slots) {
    const key = `year${slot.year}_sem${slot.semester}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(slot);
  }

  const OVERLOAD_MC_THRESHOLD = 23;
  const OVERLOAD_HOURS_THRESHOLD = 50;
  const PROJECT_HEAVY_HOURS = 6; // lab + project hours/week to count a module as "project-heavy"
  const PROJECT_HEAVY_COUNT = 2;

  const workload: Record<string, any> = {};

  for (const [key, semSlots] of Object.entries(grouped)) {
    let totalMCs = 0;
    const breakdown = { lecture: 0, tutorial: 0, lab: 0, project: 0, prep: 0 };
    let projectHeavyCount = 0;
    let incompleteData = false;

    for (const slot of semSlots) {
      const mod = moduleMap.get(slot.moduleCode);
      totalMCs += mod?.credits ?? 0;

      const w = mod?.workload ?? [];
      if (w.length < 5) {
        incompleteData = true;
        continue;
      }

      const [lecture, tutorial, lab, project, prep] = w;
      breakdown.lecture += lecture;
      breakdown.tutorial += tutorial;
      breakdown.lab += lab;
      breakdown.project += project;
      breakdown.prep += prep;

      if (lab + project >= PROJECT_HEAVY_HOURS) {
        projectHeavyCount++;
      }
    }

    const totalHours = Object.values(breakdown).reduce((sum, h) => sum + h, 0);

    const flags: string[] = [];
    if (totalMCs > OVERLOAD_MC_THRESHOLD || totalHours > OVERLOAD_HOURS_THRESHOLD) {
      flags.push('overloaded');
    }
    if (projectHeavyCount >= PROJECT_HEAVY_COUNT) {
      flags.push('project-heavy');
    }
    if (incompleteData) {
      flags.push('incomplete-data');
    }

    workload[key] = {
      totalMCs,
      totalHours,
      breakdown,
      flags
    };
  }

  res.json({ workload });
});

// GET /plans/:id/requirements — graduation requirements progress + 4-year recommendation.
// Only available for the Computer Science major: gradRequirements.json 
router.get('/:id/requirements', requireAuth, async (req: AuthRequest, res: Response) => {
  const plan = await prisma.plan.findFirst({
    where: { id: String(req.params.id), userId: req.userId! }
  });

  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: req.userId! }
  });

  if (!profile || profile.major !== CS_MAJOR) {
    res.json({
      available: false,
      message: 'Graduation requirements tracking is currently only available for the Computer Science major.'
    });
    return;
  }

  const slots = await prisma.semesterSlot.findMany({
    where: { planId: String(req.params.id) }
  });

  const moduleCodes = [...new Set(slots.map(s => s.moduleCode))];
  const modules = await prisma.module.findMany({
    where: { moduleCode: { in: moduleCodes } }
  });

  const plannedModules = modules.map(m => ({ moduleCode: m.moduleCode, credits: m.credits ?? 0 }));

  const progress = computeRequirementsProgress(gradRequirements, plannedModules);

  // Fetch full module data (prerequisite, semesters offered) for every module
  const allModuleListCodes = [...new Set(
    gradRequirements.categories
      .filter((cat: any) => cat.type === 'module_list')
      .flatMap((cat: any) => cat.modules as string[])
  )];

  const candidateModuleRecords = await prisma.module.findMany({
    where: { moduleCode: { in: allModuleListCodes } }
  });
  const candidateModules = candidateModuleRecords.map(m => ({
    moduleCode: m.moduleCode,
    title: m.title,
    credits: m.credits ?? 0,
    prerequisite: m.prerequisite,
    semesters: m.semesters ?? []
  }));

  const fourYearRecommendation = buildFourYearPlan(
    gradRequirements,
    slots.map(s => ({ year: s.year, semester: s.semester, moduleCode: s.moduleCode })),
    plannedModules,
    candidateModules
  );

  res.json({
    available: true,
    ...progress,
    fourYearRecommendation
  });
});

export default router;
