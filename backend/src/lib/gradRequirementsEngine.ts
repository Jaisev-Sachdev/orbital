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

// ---- Category classification (MC-bucket heuristic) --------------------
//
// The gradRequirements.json schema only tags a handful of categories with an
// explicit `modules` list (module_list categories). The remaining categories
// (`mc_total`) — common curriculum, breadth & depth, unrestricted electives —
// have no per-module tagging in NUSMods data (no GE-pillar or UE flag on the
// Module model), so we classify by moduleCode prefix as a heuristic:
//   - GE-prefixed codes (GEA/GEC/GEN/GEQ/GER/GES/GET) + a short list of known
//     common-curriculum codes (ES2660, IS1108) -> common curriculum
//   - Codes appearing in a module_list category from gradRequirements -> that
//     category (foundation / math & science / industry exp / focus area)
//   - CS/IFS/CP-prefixed codes not already claimed by foundation -> breadth & depth
//   - Everything else -> unrestricted electives (by elimination)
//
// This is an approximation, not a NUS-verified tagging system — it's noted
// as such in the API response.

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

export function classifyModule(code: string, gradRequirements: GradRequirements): ClassificationBucket {
  const foundationCodes = getModuleListCodes(gradRequirements, 'core_foundation_and_intermediate');
  const mathScienceCodes = getModuleListCodes(gradRequirements, 'math_science');

  if (foundationCodes.has(code)) return 'foundation';
  if (mathScienceCodes.has(code)) return 'math_science';
  if (GE_PREFIX_RE.test(code) || COMMON_CURRICULUM_EXTRA_CODES.has(code)) return 'common_curriculum';
  if (BREADTH_DEPTH_PREFIX_RE.test(code)) return 'breadth_and_depth';
  return 'unclassified';
}

// ---- Requirements progress --------------------------------------------

export function computeRequirementsProgress(
  gradRequirements: GradRequirements,
  plannedModules: PlannedModule[]
) {
  const plannedCodes = new Set(plannedModules.map(m => m.moduleCode));
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
//
// Only schedules concrete module_list gaps (foundation, math & science,
// industry experience, focus area primaries) — the mc_total categories
// (common curriculum / breadth & depth / unrestricted electives) don't map
// to specific required modules, so those are surfaced as an MC gap for the
// student to fill with electives of their choice, not auto-scheduled.

const MAX_YEARS = 4;
const SEMESTERS_PER_YEAR = 2;
const MAX_NEW_MODULES_PER_SEMESTER = 5;

function semesterKey(year: number, semester: number): string {
  return `year${year}_sem${semester}`;
}

function nextSemester(year: number, semester: number): { year: number; semester: number } {
  return semester >= SEMESTERS_PER_YEAR ? { year: year + 1, semester: 1 } : { year, semester: semester + 1 };
}

/** Collects moduleCodes still needed to satisfy module_list categories, in priority order. */
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
  const plannedCodes = new Set(plannedModules.map(m => m.moduleCode));
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

  // Build the list of upcoming (year, semester) slots up to year 4 sem 2.
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
    // Already at/past year 4 — nothing left to schedule.
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

    for (const code of [...remaining]) {
      if (newCount >= cap) break;

      const mod = candidateMap.get(code)!;
      const offeredThisSem = mod.semesters.length === 0 || mod.semesters.includes(semester);
      if (!offeredThisSem) continue;

      const tree = parsePrerequisite(mod.prerequisite);
      const evalResult = evaluatePrerequisite(tree, known);
      if (evalResult === false) continue; // prereqs not met yet — try again in a later semester

      if (!recommendedPlan[key]) recommendedPlan[key] = [];
      recommendedPlan[key].push({ moduleCode: mod.moduleCode, title: mod.title, credits: mod.credits });
      known.add(code);
      remaining.delete(code);
      newCount++;
    }
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

  const mcGapsToFillWithElectives = gradRequirements.categories
    .filter(cat => cat.type === 'mc_total')
    .map(cat => {
      const progress = computeRequirementsProgress(gradRequirements, plannedModules)
        .categories.find(c => c.key === cat.key) as any;
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
