import { prefixesForMajor } from '../config/majorModulePrefixes';

/**
 * Shape of the Prisma `where` clause used to build the AI recommendation pool.
 * Kept as a plain object so it can be unit-tested without a database.
 */
export interface ModulePoolWhere {
  moduleCode: { notIn: string[] };
  semesters: { isEmpty: false };
  OR?: Array<{ moduleCode: { startsWith: string } }>;
}

export interface ModulePoolInput {
  major: string | null | undefined;
  completedCodes: string[];
}

/**
 * Builds the candidate-module filter for POST /recommendations.
 *
 * The pool is scoped by the student's *declared major*, not by the departments
 * they happen to have taken modules in. Filtering on completed-module prefixes
 * (the previous behaviour) meant a Statistics and Economics student who had
 * taken any CS module was offered a CS-only pool, which is what user testing
 * surfaced.
 *
 * When the major is unknown, or is known but has no prefix mapping, no prefix
 * filter is applied at all. An unfiltered pool is a worse recommendation but a
 * far better failure mode than an empty one.
 */
export function buildModulePoolWhere({ major, completedCodes }: ModulePoolInput): ModulePoolWhere {
  const where: ModulePoolWhere = {
    moduleCode: { notIn: completedCodes },
    semesters: { isEmpty: false }
  };

  const prefixes = prefixesForMajor(major);
  if (prefixes.length > 0) {
    where.OR = prefixes.map(prefix => ({ moduleCode: { startsWith: prefix } }));
  }

  return where;
}

/**
 * Drops the prefix filter, keeping the exclusions. Used as a fallback when the
 * major-scoped query returns nothing, so a wrong or incomplete prefix list
 * degrades to a generic pool instead of no recommendations at all.
 */
export function widenModulePoolWhere(where: ModulePoolWhere): ModulePoolWhere {
  const { OR, ...rest } = where;
  return rest;
}
