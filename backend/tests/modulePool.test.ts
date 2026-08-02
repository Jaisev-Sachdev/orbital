import { buildModulePoolWhere, widenModulePoolWhere } from '../src/lib/modulePool';
import { MAJOR_MODULE_PREFIXES, prefixesForMajor } from '../src/config/majorModulePrefixes';
import { NUS_MAJORS } from '../src/config/nusMajors';

const prefixesIn = (where: ReturnType<typeof buildModulePoolWhere>) =>
  (where.OR ?? []).map(c => c.moduleCode.startsWith);

describe('buildModulePoolWhere', () => {
  // Regression test for the bug reported in MS3 user testing: a Statistics and
  // Economics student who had completed CS modules was recommended CS modules.
  test('a Statistics major who completed CS modules is not offered a CS pool', () => {
    const where = buildModulePoolWhere({
      major: 'Statistics',
      completedCodes: ['CS1101S', 'CS2030S', 'ST2131']
    });

    expect(prefixesIn(where)).toEqual(expect.arrayContaining(['ST', 'MA']));
    expect(prefixesIn(where)).not.toContain('CS');
  });

  test('an Economics major who completed CS modules is not offered a CS pool', () => {
    const where = buildModulePoolWhere({
      major: 'Economics',
      completedCodes: ['CS1010S', 'EC1101E']
    });

    expect(prefixesIn(where)).toEqual(['EC']);
  });

  test('a CS major still gets a CS pool', () => {
    const where = buildModulePoolWhere({ major: 'Computer Science', completedCodes: [] });
    expect(prefixesIn(where)).toContain('CS');
  });

  test('completed modules are always excluded', () => {
    const where = buildModulePoolWhere({
      major: 'Computer Science',
      completedCodes: ['CS1101S', 'MA1521']
    });
    expect(where.moduleCode.notIn).toEqual(['CS1101S', 'MA1521']);
  });

  test('only modules offered in some semester are eligible', () => {
    const where = buildModulePoolWhere({ major: 'Computer Science', completedCodes: [] });
    expect(where.semesters).toEqual({ isEmpty: false });
  });

  test('an unknown major applies no prefix filter rather than matching nothing', () => {
    const where = buildModulePoolWhere({ major: 'Underwater Basket Weaving', completedCodes: [] });
    expect(where.OR).toBeUndefined();
  });

  test('a missing major applies no prefix filter', () => {
    expect(buildModulePoolWhere({ major: null, completedCodes: [] }).OR).toBeUndefined();
    expect(buildModulePoolWhere({ major: undefined, completedCodes: [] }).OR).toBeUndefined();
  });

  test('major lookup tolerates surrounding whitespace', () => {
    expect(prefixesForMajor('  Computer Science  ')).toContain('CS');
  });
});

describe('widenModulePoolWhere', () => {
  test('drops the prefix filter but keeps exclusions', () => {
    const narrow = buildModulePoolWhere({ major: 'Statistics', completedCodes: ['ST2131'] });
    const wide = widenModulePoolWhere(narrow);

    expect(wide.OR).toBeUndefined();
    expect(wide.moduleCode.notIn).toEqual(['ST2131']);
    expect(wide.semesters).toEqual({ isEmpty: false });
  });
});

describe('MAJOR_MODULE_PREFIXES', () => {
  test('every major in NUS_MAJORS has a prefix mapping', () => {
    const missing = NUS_MAJORS.filter(m => !(m in MAJOR_MODULE_PREFIXES));
    expect(missing).toEqual([]);
  });

  test('has no entries for majors that are not in NUS_MAJORS', () => {
    const extra = Object.keys(MAJOR_MODULE_PREFIXES).filter(m => !NUS_MAJORS.includes(m));
    expect(extra).toEqual([]);
  });

  test('every mapping is a non-empty list of uppercase prefixes', () => {
    for (const [, prefixes] of Object.entries(MAJOR_MODULE_PREFIXES)) {
      expect(prefixes.length).toBeGreaterThan(0);
      for (const p of prefixes) {
        expect(p).toMatch(/^[A-Z]{2,3}$/);
      }
    }
  });
});
