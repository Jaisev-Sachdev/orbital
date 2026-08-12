import { parsePrerequisite, evaluatePrerequisite } from './prereqParser';

// ---- Types -----------------------------------------------------------

interface GradCategory {
  key: string;
  label: string;
  type: 'module_list' | 'mc_total' | string;
  modules?: string[];
  mcsRequired?: number;
  minRequired?: number;
  notes?: string;
}

interface GradRequirements {
  programme: string;
  cohort: string;
  focusArea: string;
  totalMCsRequired: number;
  source: string;
  categories: GradCategory[];
}

export interface PlannedModule {
  moduleCode: string;
  credits: number;
}

export interface CandidateModule {
  moduleCode: string;
  title: string;
  credits: number;
  prerequisite: string | null;
  semesters: number[];
}

export interface ExistingSlot {
  year: number;
  semester: number;
  moduleCode: string;
}

// ---- Module equivalence (non-S-track alternates) -----------------------

/**
 * gradRequirements.json's module_list categories only enumerate the
 * "canonical" code for each requirement slot
 */
const MODULE_EQUIVALENTS: Record<string, string> = {
  CS1010S: 'CS1101S',
  CS1010: 'CS1101S',
  CS1010E: 'CS1101S',
  CS1010X: 'CS1101S',
  CS1231: 'CS1231S',
  CS2030: 'CS2030S',
  CS2040: 'CS2040S',
  CS2040C: 'CS2040S'
};

function canonicalize(code: string): string {
  return MODULE_EQUIVALENTS[code] ?? code;
}

// ---- Category classification (MC-bucket heuristic) --------------------

const GE_PREFIX_RE = /^GE[A-Z]/;
const COMMON_CURRICULUM_EXTRA_CODES = new Set(['ES2660', 'IS1108']);
const BREADTH_DEPTH_PREFIX_RE = /^(CS|IFS|CP)/;

function getModuleListCodes(gradRequirements: GradRequirements, key: string): Set<string> {
  const cat = gradRequirements.categories.find(c => c.key === key);
  return new Set(cat?.modules ?? []);
}

export type ClassificationBucket =
  | 'foundation'
  | 'math_science'
  | 'common_curriculum'
  | 'breadth_and_depth'
  | 'unclassified';

const BREADTH_DEPTH_CATEGORY_KEYS = ['industry_experience', 'focus_primary_ai'];

export function classifyModule(code: string, gradRequirements: GradRequirements): ClassificationBucket {
  const foundationCodes = getModuleListCodes(gradRequirements, 'core_foundation_and_intermediate');
  const mathScienceCodes = getModuleListCodes(gradRequirements, 'math_science');
  const breadthDepthEnumeratedCodes = new Set(
    BREADTH_DEPTH_CATEGORY_KEYS.flatMap(key => [...getModuleListCodes(gradRequirements, key)])
  );

  const canonical = canonicalize(code);

  if (foundationCodes.has(canonical)) return 'foundation';
  if (mathScienceCodes.has(canonical)) return 'math_science';
  if (breadthDepthEnumeratedCodes.has(canonical)) return 'breadth_and_depth';
  if (GE_PREFIX_RE.test(code) || COMMON_CURRICULUM_EXTRA_CODES.has(code)) return 'common_curriculum';
  if (BREADTH_DEPTH_PREFIX_RE.test(code)) return 'breadth_and_depth';
  return 'unclassified';
}

// ---- Requirements progress --------------------------------------------

export function computeRequirementsProgress(
  gradRequirements: GradRequirements,
  plannedModules: PlannedModule[]
) {
  // Canonicalized so a completed alternate (e.g. CS1010S) satisfies its canonical requirement slot (CS1101S) in module_list matching below.
  const plannedCodes = new Set(plannedModules.map(m => canonicalize(m.moduleCode)));
  const totalMCsPlanned = plannedModules.reduce((sum, m) => sum + (m.credits ?? 0), 0);

  // Bucket every planned module by MC-heuristic classification once.
  const bucketMCs: Record<ClassificationBucket, number> = {
    foundation: 0,
    math_science: 0,
    common_curriculum: 0,
    breadth_and_depth: 0,
    unclassified: 0
  };
  for (const mod of plannedModules) {
    const bucket = classifyModule(mod.moduleCode, gradRequirements);
    bucketMCs[bucket] += mod.credits ?? 0;
  }

  const unrestrictedElectiveMCs = bucketMCs.unclassified;

  const categories = gradRequirements.categories.map((cat) => {
    if (cat.type === 'module_list') {
      const modules = cat.modules ?? [];
      const taken = modules.filter(code => plannedCodes.has(code));
      const missing = modules.filter(code => !plannedCodes.has(code));
      const minRequired = cat.minRequired ?? modules.length;

      return {
        key: cat.key,
        label: cat.label,
        type: cat.type,
        required: modules,
        taken,
        missing,
        minRequired,
        satisfied: taken.length >= minRequired,
        notes: cat.notes ?? null
      };
    }

    if (cat.type === 'mc_total') {
      let mcsPlanned = 0;
      if (cat.key === 'common_curriculum') mcsPlanned = bucketMCs.common_curriculum;
      else if (cat.key === 'breadth_and_depth') mcsPlanned = bucketMCs.breadth_and_depth;
      else if (cat.key === 'unrestricted_electives') mcsPlanned = unrestrictedElectiveMCs;

      const mcsRequired = cat.mcsRequired ?? 0;

      return {
        key: cat.key,
        label: cat.label,
        type: cat.type,
        mcsRequired,
        mcsPlanned,
        satisfied: mcsPlanned >= mcsRequired,
        notes: (cat.notes ? cat.notes + ' ' : '') +
          'Category totals are estimated from moduleCode prefixes (GE*/CS*/IFS*/CP*), not official NUS bucket tagging — treat as approximate.'
      };
    }

    return { key: cat.key, label: cat.label, type: cat.type };
  });

  return {
    programme: gradRequirements.programme,
    focusArea: gradRequirements.focusArea,
    totalMCsRequired: gradRequirements.totalMCsRequired,
    totalMCsPlanned,
    categories
  };
}

// ---- Four-year recommendation ------------------------------------------

const MAX_YEARS = 4;
const SEMESTERS_PER_YEAR = 2;
const MAX_NEW_MODULES_PER_SEMESTER = 5;

function semesterKey(year: number, semester: number): string {
  return `year${year}_sem${semester}`;
}

function nextSemester(year: number, semester: number): { year: number; semester: number } {
  return semester >= SEMESTERS_PER_YEAR ? { year: year + 1, semester: 1 } : { year, semester: semester + 1 };
}

function collectMissingRequiredCodes(gradRequirements: GradRequirements, plannedCodes: Set<string>): string[] {
  const missing: string[] = [];
  const seen = new Set<string>();

  for (const cat of gradRequirements.categories) {
    if (cat.type !== 'module_list') continue;
    const modules = cat.modules ?? [];
    const taken = modules.filter(code => plannedCodes.has(code));
    const minRequired = cat.minRequired ?? modules.length;
    const stillNeeded = Math.max(0, minRequired - taken.length);
    if (stillNeeded === 0) continue;

    // picks the first `stillNeeded` missing codes in the JSON's listed order
    const candidates = modules.filter(code => !plannedCodes.has(code)).slice(0, stillNeeded);
    for (const code of candidates) {
      if (!seen.has(code)) {
        seen.add(code);
        missing.push(code);
      }
    }
  }

  return missing;
}

export interface FourYearPlanResult {
  recommendedPlan: Record<string, { moduleCode: string; title: string; credits: number }[]>;
  unscheduled: { moduleCode: string; reason: string }[];
  mcGapsToFillWithElectives: { key: string; label: string; mcsRemaining: number }[];
  note: string;
}

export function buildFourYearPlan(
  gradRequirements: GradRequirements,
  existingSlots: ExistingSlot[],
  plannedModules: PlannedModule[],
  candidateModules: CandidateModule[]
): FourYearPlanResult {
  // Canonicalized so an already-completed alternate (e.g. CS2030) clears its canonical slot (CS2030S) instead of being recommended as a
  // duplicate later in the plan.
  const plannedCodes = new Set(plannedModules.map(m => canonicalize(m.moduleCode)));
  const candidateMap = new Map(candidateModules.map(m => [m.moduleCode, m]));

  const missingCodes = collectMissingRequiredCodes(gradRequirements, plannedCodes)
    .filter(code => candidateMap.has(code)); // only schedule modules we actually have data for

  // Determine the next open semester slot after whatever is already planned.
  let startYear = 1;
  let startSemester = 1;
  if (existingSlots.length > 0) {
    const latest = existingSlots.reduce((max, s) => {
      const rank = s.year * SEMESTERS_PER_YEAR + s.semester;
      return rank > max.rank ? { rank, year: s.year, semester: s.semester } : max;
    }, { rank: -1, year: 1, semester: 1 });
    ({ year: startYear, semester: startSemester } = nextSemester(latest.year, latest.semester));
  }

  const upcomingSlots: { year: number; semester: number }[] = [];
  {
    let { year, semester } = { year: startYear, semester: startSemester };
    while (year <= MAX_YEARS) {
      upcomingSlots.push({ year, semester });
      ({ year, semester } = nextSemester(year, semester));
    }
  }

  const existingCountBySlot = new Map<string, number>();
  for (const slot of existingSlots) {
    const key = semesterKey(slot.year, slot.semester);
    existingCountBySlot.set(key, (existingCountBySlot.get(key) ?? 0) + 1);
  }

  const known = new Set(plannedCodes);
  const recommendedPlan: FourYearPlanResult['recommendedPlan'] = {};
  const remaining = new Set(missingCodes);

  if (upcomingSlots.length === 0) {
    return {
      recommendedPlan: {},
      unscheduled: [...remaining].map(code => ({
        moduleCode: code,
        reason: 'No remaining semesters within the 4-year horizon'
      })),
      mcGapsToFillWithElectives: [],
      note: 'Plan already extends through year 4 — no further semesters to schedule into.'
    };
  }

  for (const { year, semester } of upcomingSlots) {
    const key = semesterKey(year, semester);
    let newCount = 0;
    const cap = Math.max(0, MAX_NEW_MODULES_PER_SEMESTER - (existingCountBySlot.get(key) ?? 0));

    // Modules scheduled within THIS semester must not be usable as prerequisites for other modules scheduled in the same semester
    const scheduledThisSemester: string[] = [];

    for (const code of [...remaining]) {
      if (newCount >= cap) break;

      const mod = candidateMap.get(code)!;
      const offeredThisSem = mod.semesters.length === 0 || mod.semesters.includes(semester);
      if (!offeredThisSem) continue;

      const tree = parsePrerequisite(mod.prerequisite);
      const evalResult = evaluatePrerequisite(tree, known);
      if (evalResult === false) continue; 

      if (!recommendedPlan[key]) recommendedPlan[key] = [];
      recommendedPlan[key].push({ moduleCode: mod.moduleCode, title: mod.title, credits: mod.credits });
      scheduledThisSemester.push(code);
      remaining.delete(code);
      newCount++;
    }

    for (const code of scheduledThisSemester) known.add(code);
  }

  const unscheduled = [...remaining].map(code => {
    const mod = candidateMap.get(code);
    const tree = mod ? parsePrerequisite(mod.prerequisite) : null;
    const evalResult = mod ? evaluatePrerequisite(tree, known) : 'unverifiable';
    return {
      moduleCode: code,
      reason: evalResult === false
        ? 'Prerequisite chain does not resolve within the 4-year horizon'
        : 'Not offered in any remaining semester, or semester capacity was full'
    };
  });

  const progressCategories = computeRequirementsProgress(gradRequirements, plannedModules).categories;
  const mcGapsToFillWithElectives = gradRequirements.categories
    .filter(cat => cat.type === 'mc_total')
    .map(cat => {
      const progress = progressCategories.find(c => c.key === cat.key) as any;
      const mcsRemaining = Math.max(0, (cat.mcsRequired ?? 0) - (progress?.mcsPlanned ?? 0));
      return { key: cat.key, label: cat.label, mcsRemaining };
    })
    .filter(g => g.mcsRemaining > 0);

  return {
    recommendedPlan,
    unscheduled,
    mcGapsToFillWithElectives,
    note: 'Only concrete required modules (foundation, math & science, industry experience, focus area) are auto-scheduled. ' +
      'Common curriculum, breadth & depth, and unrestricted elective MC gaps are listed separately since they can be filled by any qualifying module.'
  };
}
