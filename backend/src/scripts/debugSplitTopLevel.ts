import { parsePrerequisite } from '../lib/prereqParser';

const raw = 'If undertaking an Undergraduate DegreeTHEN((must be undertaking 1 of 0300BZAHON Bachelor of Science (Business Analytics) (Hons), 0300CSHON Bachelor of Computing (Computer Science) (Hons)ANDmust have completed 1 of CS2030/CS2030DE/CS2030S/CS2113/CS2113T/YSC3232 at a grade of at least D)OR( must have completed 1 of CS2030/CS2030DE/CS2030S/CS2113/CS2113T/NM2207/NM2207Y/NM2217/NM3209 at a grade of at least D))';

function cleanText(text: string): string {
  return text
    .replace(/\\"/g, '')
    .replace(/"/g, '')
    .replace(/\bagrade\b/gi, 'a grade')
    .replace(/\bofCS/gi, 'of CS')
    .replace(/If undertaking an? Undergraduate Degree\s*THEN/i, '')
    .trim();
}

function unwrapParens(text: string): string {
  let t = text.trim();
  while (t.startsWith('(') && t.endsWith(')')) {
    let depth = 0;
    let matches = true;
    for (let i = 0; i < t.length - 1; i++) {
      if (t[i] === '(') depth++;
      if (t[i] === ')') depth--;
      if (depth === 0 && i < t.length - 1) { matches = false; break; }
    }
    if (!matches) break;
    t = t.slice(1, -1).trim();
  }
  return t;
}

const cleaned = cleanText(raw);
const unwrapped = unwrapParens(cleaned);
console.log('AFTER unwrapParens:\n', JSON.stringify(unwrapped), '\n');

const CONNECTOR_RE = /^(AND|OR)\b\s*(?=must|either|\(|[A-Z]{2,4}\d)/i;

let depth = 0;
let inProgrammeClause = false;
let programmeClauseBaseDepth = 0;
let i = 0;

console.log('TRACE:');
while (i < unwrapped.length) {
  const remainder = unwrapped.slice(i);

  if (!inProgrammeClause && /^must be undertaking \d+ of\b/i.test(remainder)) {
    inProgrammeClause = true;
    programmeClauseBaseDepth = depth;
    console.log(`  [${i}] ENTER programme clause, baseDepth=${depth}`);
  }

  const ch = unwrapped[i];

  if (inProgrammeClause) {
    const m = CONNECTOR_RE.exec(remainder);
    if (m) {
      console.log(`  [${i}] (in programme clause) CONNECTOR_RE matched "${m[1]}" -- depth=${depth}, baseDepth=${programmeClauseBaseDepth}, equal=${depth === programmeClauseBaseDepth}`);
    }
    if (depth === programmeClauseBaseDepth && m) {
      console.log(`  [${i}] EXIT programme clause via "${m[1]}"`);
      inProgrammeClause = false;
      i += m[1].length;
      continue;
    }
    i++;
    continue;
  }

  if (ch === '(') { depth++; }
  if (ch === ')') { depth--; }

  if (depth === 0) {
    const m = CONNECTOR_RE.exec(remainder);
    if (m) {
      console.log(`  [${i}] (depth=0) FOUND "${m[1]}"`);
      i += m[1].length;
      continue;
    }
  }
  i++;
}

console.log('\n=== FULL PARSE RESULT ===');
console.log(JSON.stringify(parsePrerequisite(raw), null, 2));