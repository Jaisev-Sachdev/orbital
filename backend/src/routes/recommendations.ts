import { Router, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import prisma from '../lib/prisma';
import requireAuth, { AuthRequest } from '../middleware/requireAuth';
import { buildModulePoolWhere, widenModulePoolWhere } from '../lib/modulePool';

const router = Router();

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not defined in environment variables');
}
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODULE_POOL_SIZE = 50;

// POST /recommendations
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  // Read optional goals from request body (sent by frontend from localStorage)
  const { goals: rawGoals } = req.body ?? {};

  if (rawGoals !== undefined && typeof rawGoals !== 'string') {
    res.status(400).json({ error: 'goals must be a string when provided' });
    return;
  }

  const goals = rawGoals?.trim();

  // 1. Fetch user's profile and completed modules
  const profile = await prisma.profile.findUnique({
    where: { userId: req.userId! },
    include: { completedMods: true }
  });

  if (!profile) {
    res.status(404).json({ error: 'Profile not found. Please complete your profile first.' });
    return;
  }

  const completedCodes = profile.completedMods.map(m => m.moduleCode);

  // build the candidate pool, scoped to the student's declared major
  const poolWhere = buildModulePoolWhere({ major: profile.major, completedCodes });

  let availableModules = await prisma.module.findMany({
    where: poolWhere,
    take: MODULE_POOL_SIZE,
    orderBy: { moduleCode: 'asc' }
  });

  // If the major-scoped pool is empty, fall back to an unfiltered pool
  if (availableModules.length === 0) {
    availableModules = await prisma.module.findMany({
      where: widenModulePoolWhere(poolWhere),
      take: MODULE_POOL_SIZE,
      orderBy: { moduleCode: 'asc' }
    });
  }

  // Build the prompt, include goals if provided
  const prompt = `You are an academic advisor for NUS (National University of Singapore).

Student profile:
- Major: ${profile.major}
- Faculty: ${profile.faculty}
- Year of study: ${profile.yearOfStudy}
- Cohort: ${profile.cohortYear}
- Completed modules: ${completedCodes.length > 0 ? completedCodes.join(', ') : 'None yet'}
${goals ? `- Student's goals and focus areas: ${goals}` : ''}

Here are some available modules the student has not yet taken:
${availableModules.map(m => `- ${m.moduleCode}: ${m.title} (${m.credits} MCs) | Prerequisites: ${m.prerequisite ?? 'None'}`).join('\n')}

Recommend exactly 3 modules for this student to take next semester.
Only recommend modules from the list above.
Consider: prerequisite satisfaction, workload balance, relevance to their major${goals ? ', and the student\'s stated goals and focus areas' : ''}.

Respond in JSON only. No explanation outside the JSON. Use this exact format:
[
  {
    "moduleCode": "CS2040S",
    "title": "Data Structures and Algorithms",
    "reason": "One sentence explanation of why this is recommended"
  }
]`;

  try {
    // Call the Anthropic API
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    // Parse and return the recommendations
    const textBlock = message.content.find((b: any) => b?.type === 'text');
    const responseText = textBlock?.type === 'text' ? String(textBlock.text) : '';

    if (!responseText) {
      res.status(502).json({ error: 'Upstream model returned an empty response' });
      return;
    }

    let recommendations: unknown;
    const cleanedText = responseText
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');

    try {
      recommendations = JSON.parse(cleanedText);
    } catch {
      res.status(502).json({ error: 'Upstream model returned invalid JSON' });
      return;
    }

    res.json({ recommendations });
  } catch {
    res.status(502).json({ error: 'Failed to generate recommendations' });
  }
});

export default router;
