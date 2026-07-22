import { classifyModule, computeRequirementsProgress } from '../src/lib/gradRequirementsEngine';
import gradRequirements from '../src/config/gradRequirements.json';

// Regression tests for the 3 bugs Qi Zao reported against the graduation
// planner: CS1010S not recognised as equivalent to CS1101S, and CS2030/
// CS2040 (non-S track) being misclassified into the wrong MC bucket.
describe('gradRequirementsEngine', () => {
  const plannedModules = [
    { moduleCode: 'CS1010S', credits: 4 },
    { moduleCode: 'CS2030', credits: 4 },
    { moduleCode: 'IS1108', credits: 4 },
    { moduleCode: 'CS2040', credits: 4 }
  ];

  test('CS2030 (non-S) classifies as foundation, not breadth_and_depth', () => {
    expect(classifyModule('CS2030', gradRequirements as any)).toBe('foundation');
  });

  test('CS2040 (non-S) classifies as foundation, not breadth_and_depth', () => {
    expect(classifyModule('CS2040', gradRequirements as any)).toBe('foundation');
  });

  test('CS1010S classifies as foundation (equivalent to CS1101S)', () => {
    expect(classifyModule('CS1010S', gradRequirements as any)).toBe('foundation');
  });

  test('S-track codes still classify correctly (no regression)', () => {
    expect(classifyModule('CS2030S', gradRequirements as any)).toBe('foundation');
    expect(classifyModule('CS4248', gradRequirements as any)).toBe('breadth_and_depth');
  });

  test('CS1101S counts as taken once CS1010S is planned (no duplicate recommendation)', () => {
    const progress = computeRequirementsProgress(gradRequirements as any, plannedModules);
    const foundationCat = progress.categories.find((c: any) => c.key === 'core_foundation_and_intermediate') as any;
    expect(foundationCat.taken).toContain('CS1101S');
    expect(foundationCat.missing).not.toContain('CS1101S');
  });

  test('CS2030/CS2040 are excluded from the breadth_and_depth MC bucket', () => {
    const progress = computeRequirementsProgress(gradRequirements as any, plannedModules);
    const breadthCat = progress.categories.find((c: any) => c.key === 'breadth_and_depth') as any;
    expect(breadthCat.mcsPlanned).toBe(0);
  });

  test('IS1108 counts toward common_curriculum MCs', () => {
    const progress = computeRequirementsProgress(gradRequirements as any, plannedModules);
    const commonCat = progress.categories.find((c: any) => c.key === 'common_curriculum') as any;
    expect(commonCat.mcsPlanned).toBe(4);
  });
});
