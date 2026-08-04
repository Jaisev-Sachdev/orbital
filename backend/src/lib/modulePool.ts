import { prefixesForMajor } from '../config/majorModulePrefixes';


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
 * Drops the prefix filter, keeping the exclusions. Used as a fallback when the  major-scoped query returns nothing 
 */
export function widenModulePoolWhere(where: ModulePoolWhere): ModulePoolWhere {
  const { OR, ...rest } = where;
  return rest;
}
