import { NUS_MAJORS, CS_MAJOR } from '../src/config/nusMajors';

describe('NUS_MAJORS', () => {
  test('includes Computer Science', () => {
    expect(NUS_MAJORS).toContain('Computer Science');
  });

  test('CS_MAJOR matches the exact string used in the list', () => {
    expect(CS_MAJOR).toBe('Computer Science');
  });

  test('has no duplicate entries', () => {
    expect(new Set(NUS_MAJORS).size).toBe(NUS_MAJORS.length);
  });

  test('is case-sensitive (a lowercase variant is not present)', () => {
    expect(NUS_MAJORS).not.toContain('computer science');
  });
});
