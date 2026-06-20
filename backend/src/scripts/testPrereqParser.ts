import { parsePrerequisite, extractModuleCodes, evaluatePrerequisite } from '../lib/prereqParser';

const samples: Record<string, string> = {
  CS4218: 'if undertaking Undergraduate Degree then ( either of CS3213/CS3219 at a grade of at least D )',
  CS5260: 'If undertaking an Undergraduate Degree THEN must have completed CS5242 at a grade of at least D',
  CS3234: 'If undertaking an Undergraduate Degree THEN ( must have completed 1 of CS1231/CS1231S/MA1100/MA1100T at a grade of at least D)',
  CS2106: 'If undertaking an Undergraduate DegreeTHEN( must have completed 1 of CS2100/CS2100DE/EE2007/EE2024/EE2028 at a grade of at least D)',
  CS4248: 'If undertaking an Undergraduate DegreeTHEN(( must have completed 1 of CS2109S/CS3243 at a grade of at least DANDmust have completed 1 of EE2012/EE2012A/MA2116/MA2116T/MA2216/ST2131/ST2334/YSC2243 at a grade of at least D)AND( must have completed 1 of MA1102R/MA1505/MA1507/MA1521/MA2002/YSC1216 at a grade of at least DORmust have completed all of MA1511/MA1512 at a grade of at least D))',
  CS3282: 'If undertaking an Undergraduate DegreeTHEN( must have completed CS3281 at a grade of at least DAND( must have completed 2 of CS3230/CS3231/CS3236/CS4231/CS4232/CS4234 at a grade of at least DORmust have completed 2 of CS2109S/CS3243/CS3244/CS3263/CS3264/CS4244/CS4246/CS4248 at a grade of at least D))',
  CS3240: 'If undertaking an Undergraduate DegreeTHEN((must be undertaking 1 of 0300BZAHON Bachelor of Science (Business Analytics) (Hons), 0300CSHON Bachelor of Computing (Computer Science) (Hons)ANDmust have completed 1 of CS2030/CS2030DE/CS2030S/CS2113/CS2113T/YSC3232 at a grade of at least D)OR( must have completed 1 of CS2030/CS2030DE/CS2030S/CS2113/CS2113T/NM2207/NM2207Y/NM2217/NM3209 at a grade of at least D))',
  CS3242: 'If undertaking an Undergraduate Degree THEN (( must have completed 1 of 08 PHYSICS/ADD. PHYSICS/64 PHYSICS at a grade of at least E AND must be H2) OR ( must have completed 1 of PC1201/PC1221/PC1221X at a grade of at least D)) AND ( must have completed CS3241 at a grade of at least D)',
};

console.log('=== PARSE TREES ===\n');
for (const [code, raw] of Object.entries(samples)) {
  console.log(`--- ${code} ---`);
  const tree = parsePrerequisite(raw);
  console.log(JSON.stringify(tree, null, 2));
  console.log('Flat module codes:', extractModuleCodes(tree));
  console.log();
}

console.log('\n=== EVALUATOR TESTS ===\n');

function test(code: string, raw: string, completed: string[], expected: ReturnType<typeof evaluatePrerequisite>) {
  const tree = parsePrerequisite(raw);
  const result = evaluatePrerequisite(tree, new Set(completed));
  const pass = result === expected ? 'PASS' : 'FAIL';
  console.log(`[${pass}] ${code} with completed=[${completed.join(',')}] => ${result} (expected ${expected})`);
}

test('CS4218 (has prereq)', samples.CS4218, [], false);
test('CS4218 (has prereq)', samples.CS4218, ['CS3213'], true);
test('CS3234 (or group)', samples.CS3234, ['MA1100'], true);
test('CS3234 (or group)', samples.CS3234, [], false);
test('CS4248 (nested and/or)', samples.CS4248, ['CS2109S', 'EE2012', 'MA1511', 'MA1512'], true);
test('CS4248 (nested and/or, missing one branch)', samples.CS4248, ['CS2109S', 'EE2012'], false);
test('CS3282 (n_of group, satisfied)', samples.CS3282, ['CS3281', 'CS3230', 'CS3231'], true);
test('CS3282 (n_of group, only 1 of 2 needed)', samples.CS3282, ['CS3281', 'CS3230'], false);
test('CS3240 (no modules completed, fails on module requirement regardless of programme)', samples.CS3240, [], false);
test('CS3242 (grade clause => unverifiable)', samples.CS3242, ['CS3241'], 'unverifiable');