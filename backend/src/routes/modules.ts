import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { parsePrerequisite, extractModuleCodes, PrereqNode } from '../lib/prereqParser';

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

// GET /modules/:code/prerequisites/tree?depth=3
router.get('/:code/prerequisites/tree', async (req: Request, res: Response) => {
  const code = String(req.params.code).toUpperCase();
  const parsedDepth = Number.parseInt(String(req.query.depth ?? '3'), 10);
  const depth = Number.isFinite(parsedDepth) ? Math.min(Math.max(parsedDepth, 0), 5) : 3;

  type ResolvedNode =
    | { type: 'MODULE'; code: string; title: string; prerequisiteTree: ResolvedNode | null }
    | { type: 'AND'; children: ResolvedNode[] }
    | { type: 'OR'; children: ResolvedNode[] }
    | { type: 'N_OF'; n: number; children: ResolvedNode[] }
    | { type: 'PROGRAMME'; programmes: string[] }
    | { type: 'OTHER'; text: string };

  const moduleCache = new Map<string, { moduleCode: string; title: string; prerequisite: string | null } | null>();

  async function getCachedModule(moduleCode: string) {
    if (moduleCache.has(moduleCode)) return moduleCache.get(moduleCode)!;
    const mod = await prisma.module.findUnique({
      where: { moduleCode },
      select: { moduleCode: true, title: true, prerequisite: true }
    });
    moduleCache.set(moduleCode, mod);
    return mod;
  }

  async function resolveNode(node: PrereqNode, remaining: number): Promise<ResolvedNode> {
    if (node.type === 'MODULE') {
      const mod = await getCachedModule(node.code);
      if (!mod) {
        return { type: 'MODULE', code: node.code, title: '', prerequisiteTree: null };
      }
      if (remaining <= 0) {
        return { type: 'MODULE', code: mod.moduleCode, title: mod.title, prerequisiteTree: null };
      }
      const childTree = parsePrerequisite(mod.prerequisite);
      const resolvedChild = childTree ? await resolveNode(childTree, remaining - 1) : null;
      return { type: 'MODULE', code: mod.moduleCode, title: mod.title, prerequisiteTree: resolvedChild };
    }

    if (node.type === 'AND' || node.type === 'OR') {
      const children = await Promise.all(node.children.map(c => resolveNode(c, remaining)));
      return { type: node.type, children };
    }

    if (node.type === 'N_OF') {
      const children = await Promise.all(node.children.map(c => resolveNode(c, remaining)));
      return { type: 'N_OF', n: node.n, children };
    }

    return node;
  }

  const root = await getCachedModule(code);

  if (!root) {
    res.status(404).json({ error: 'Module not found' });
    return;
  }

  const tree = parsePrerequisite(root.prerequisite);
  const resolvedTree = tree ? await resolveNode(tree, depth) : null;

  res.json({
    moduleCode: root.moduleCode,
    title: root.title,
    depth,
    prerequisiteTree: resolvedTree
  });
});

export default router;