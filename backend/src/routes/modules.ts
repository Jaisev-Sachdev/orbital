import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /modules?search=CS2040
router.get('/', async (req: Request, res: Response) => {
  const { search } = req.query;

  const modules = await prisma.module.findMany({
    where: search ? {
      OR: [
        { moduleCode: { contains: String(search).toUpperCase() } },
        { title: { contains: String(search), mode: 'insensitive' } }
      ]
    } : undefined,
    take: 20,
    orderBy: { moduleCode: 'asc' }
  });

  res.json({ modules });
});

// GET /modules/:code
router.get('/:code', async (req: Request, res: Response) => {
  const module = await prisma.module.findUnique({
    where: { moduleCode: String(req.params.code).toUpperCase() }
  });

  if (!module) {
    res.status(404).json({ error: 'Module not found' });
    return;
  }

  res.json({ module });
});

// GET /modules/:code/prerequisites
router.get('/:code/prerequisites', async (req: Request, res: Response) => {
  const module = await prisma.module.findUnique({
    where: { moduleCode: String(req.params.code).toUpperCase() }
  });

  if (!module) {
    res.status(404).json({ error: 'Module not found' });
    return;
  }

  // Extract module codes from the raw prerequisite text
  // Module codes follow the pattern: 2-4 letters followed by 4 digits and optional letter
  const prereqCodes = module.prerequisite
    ? [...new Set(module.prerequisite.match(/[A-Z]{2,4}\d{4}[A-Z]*/g) ?? [])]
    : [];

  res.json({
    moduleCode: module.moduleCode,
    title: module.title,
    prerequisites: prereqCodes,
    prerequisiteText: module.prerequisite ?? 'No prerequisites'
  });
});

export default router;