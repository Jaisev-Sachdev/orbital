import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { parsePrerequisite, extractModuleCodes } from '../lib/prereqParser';

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

  const tree = parsePrerequisite(module.prerequisite);
  const prereqCodes = extractModuleCodes(tree);

  res.json({
    moduleCode: module.moduleCode,
    title: module.title,
    prerequisites: prereqCodes,
    prerequisiteTree: tree,
    prerequisiteText: module.prerequisite ?? 'No prerequisites'
  });
});

export default router;