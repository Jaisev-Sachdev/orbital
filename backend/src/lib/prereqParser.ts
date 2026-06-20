export type PrereqNode =
  | { type: 'MODULE'; code: string }
  | { type: 'AND'; children: PrereqNode[] }
  | { type: 'OR'; children: PrereqNode[] }
  | { type: 'N_OF'; n: number; children: PrereqNode[] }
  | { type: 'PROGRAMME'; programmes: string[] }
  | { type: 'OTHER'; text: string };

function isModuleCode(s: string): boolean {
  return /^[A-Z]{2,4}\d{4}[A-Z]*$/.test(s.trim());
}

function cleanText(raw: string): string {
  return raw
    .replace(/\\"/g, '')
    .replace(/"/g, '')
    .replace(/\bagrade\b/gi, 'a grade')
    .replace(/\bofCS/gi, 'of CS')
    .replace(/If undertaking an? Undergraduate Degree\s*THEN/i, '')
    .trim();
}

function splitTopLevel(text: string): { parts: string[]; connector: 'AND' | 'OR' | null } {
  let depth = 0;
  let lastSplit = 0;
  const parts: string[] = [];
  let connector: 'AND' | 'OR' | null = null;

  const CONNECTOR_RE = /^(AND|OR)\s*(?=must|either|\(|[A-Z]{2,4}\d)/i;
  let i = 0;
  while (i < text.length) {
    const remainder = text.slice(i);
    const ch = text[i];

    if (ch === '(') depth++;
    if (ch === ')') depth--;

    if (depth === 0) {
      const m = CONNECTOR_RE.exec(remainder);
      if (m) {
        const found = m[1].toUpperCase() as 'AND' | 'OR';
        connector = connector ?? found;
        parts.push(text.slice(lastSplit, i).trim());
        i += m[1].length;
        lastSplit = i;
        continue;
      }
    }
    i++;
  }
  parts.push(text.slice(lastSplit).trim());

  return { parts: parts.filter(p => p.length > 0), connector };
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

function codesFromSlashList(list: string): string[] {
  return list.split('/').map(c => c.trim()).filter(isModuleCode);
}

function parseLeaf(text: string): PrereqNode {
  const clean = unwrapParens(text.trim());

  if (/must be undertaking \d+ of\b/i.test(clean)) {
    return { type: 'OTHER', text: clean };
  }

  const allOfMatch = /must have completed all of ([\w/.]+) at a grade/i.exec(clean);
  if (allOfMatch) {
    const codes = codesFromSlashList(allOfMatch[1]);
    return { type: 'AND', children: codes.map(code => ({ type: 'MODULE', code } as PrereqNode)) };
  }

  const nOfMatch = /must have completed (\d+) of ([\w/.]+) at a grade/i.exec(clean);
  if (nOfMatch) {
    const n = parseInt(nOfMatch[1], 10);
    const codes = codesFromSlashList(nOfMatch[2]);
    const moduleNodes = codes.map(code => ({ type: 'MODULE', code } as PrereqNode));
    return n === 1
      ? { type: 'OR', children: moduleNodes }
      : { type: 'N_OF', n, children: moduleNodes };
  }

  const eitherOfMatch = /either of ([\w/.]+) at a grade/i.exec(clean);
  if (eitherOfMatch) {
    const codes = codesFromSlashList(eitherOfMatch[1]);
    return { type: 'OR', children: codes.map(code => ({ type: 'MODULE', code } as PrereqNode)) };
  }

  const singleMatch = /must have completed ([A-Z]{2,4}\d{4}[A-Z]*) at a grade/i.exec(clean);
  if (singleMatch) {
    return { type: 'MODULE', code: singleMatch[1] };
  }

  return { type: 'OTHER', text: clean };
}

function parseExpression(text: string): PrereqNode {
  const unwrapped = unwrapParens(text);
  const { parts, connector } = splitTopLevel(unwrapped);

  if (parts.length <= 1 || !connector) {
    return parseLeaf(unwrapped);
  }

  const children = parts.map(p => parseExpression(p));
  return connector === 'AND'
    ? { type: 'AND', children }
    : { type: 'OR', children };
}

export function parsePrerequisite(raw: string | null | undefined): PrereqNode | null {
  if (!raw || raw.trim() === '') return null;
  const cleaned = cleanText(raw);
  if (cleaned === '') return null;
  return parseExpression(cleaned);
}

export function extractModuleCodes(node: PrereqNode | null): string[] {
  if (!node) return [];
  switch (node.type) {
    case 'MODULE':
      return [node.code];
    case 'AND':
    case 'OR':
    case 'N_OF':
      return node.children.flatMap(extractModuleCodes);
    default:
      return [];
  }
}

// true/false reflect module-based logic; 'unverifiable' means the tree contains
// PROGRAMME/OTHER conditions the app has no data to check — never silently assumed true.
export type EvalResult = true | false | 'unverifiable';

export function evaluatePrerequisite(node: PrereqNode | null, completedModules: Set<string>): EvalResult {
  if (!node) return true;

  switch (node.type) {
    case 'MODULE':
      return completedModules.has(node.code);

    case 'AND': {
      const results = node.children.map(c => evaluatePrerequisite(c, completedModules));
      if (results.some(r => r === false)) return false;
      if (results.some(r => r === 'unverifiable')) return 'unverifiable';
      return true;
    }

    case 'OR': {
      const results = node.children.map(c => evaluatePrerequisite(c, completedModules));
      if (results.some(r => r === true)) return true;
      if (results.some(r => r === 'unverifiable')) return 'unverifiable';
      return false;
    }

    case 'N_OF': {
      const results = node.children.map(c => evaluatePrerequisite(c, completedModules));
      const trueCount = results.filter(r => r === true).length;
      const hasUnverifiable = results.some(r => r === 'unverifiable');
      if (trueCount >= node.n) return true;
      if (hasUnverifiable) return 'unverifiable';
      return false;
    }

    case 'PROGRAMME':
    case 'OTHER':
      return 'unverifiable';
  }
}