// Maps each NUS primary major to the module-code prefixes that are plausibly relevant to it.

export const MAJOR_MODULE_PREFIXES: Record<string, string[]> = {
  // ── School of Computing ──
  'Business Analytics': ['BT', 'CS', 'IS', 'ST', 'MA'],
  'Business Artificial Intelligence Systems': ['BT', 'CS', 'IS', 'MA'],
  'Computer Science': ['CS', 'IS', 'MA', 'ST', 'CP'],
  'Information Security': ['CS', 'IFS', 'IS', 'MA'],

  // ── School of Business ──
  'Business Administration': ['BSP', 'MKT', 'FIN', 'ACC', 'DAO', 'MNO', 'BIZ'],
  'Business Administration (Accountancy)': ['ACC', 'BIZ', 'BSP', 'FIN', 'DAO'],
  'Real Estate': ['RE', 'BSP', 'FIN'],

  // ── College of Design and Engineering ──
  'Architecture': ['AR'],
  'Biomedical Engineering': ['BN', 'EE', 'ME'],
  'Chemical Engineering': ['CN', 'CM'],
  'Civil Engineering': ['CE'],
  'Computer Engineering': ['CG', 'CS', 'EE'],
  'Electrical Engineering': ['EE', 'CG'],
  'Engineering Science': ['ESP', 'ME', 'EE'],
  'Environmental and Sustainability Engineering': ['ESE', 'CE', 'CN'],
  'Industrial Design': ['DID'],
  'Industrial and Systems Engineering': ['IE'],
  'Infrastructure and Project Management': ['PF', 'CE'],
  'Landscape Architecture': ['LA', 'AR'],
  'Materials Science and Engineering': ['MLE', 'CM', 'PC'],
  'Mechanical Engineering': ['ME'],
  'Robotics and Machine Intelligence': ['RB', 'ME', 'EE', 'CG'],

  // ── CHS: Arts and Social Sciences ──
  'Anthropology': ['SC'],
  'Chinese Languages and Cultures': ['CH', 'CL'],
  'Chinese Studies (Bilingual)': ['CH', 'CL'],
  'Communications and New Media': ['NM'],
  'Economics': ['EC'],
  'English Language and Linguistics': ['EL'],
  'English Literature': ['EN'],
  'Geography': ['GE'],
  'Global Studies': ['GL'],
  'History': ['HY'],
  'Japanese Studies': ['JS'],
  'Malay Studies': ['MS'],
  'Philosophy': ['PH'],
  'Political Science': ['PS'],
  'Psychology': ['PL'],
  'Social Work': ['SW'],
  'Sociology': ['SC'],
  'South Asian Studies': ['SN'],
  'Southeast Asian Studies': ['SE'],
  'Theatre and Performance Studies': ['TS'],

  // ── CHS: Sciences ──
  'Chemistry': ['CM'],
  'Data Science and Analytics': ['DSA', 'MA', 'ST', 'CS'],
  'Food Science and Technology': ['FST', 'CM', 'LSM'],
  'Life Sciences': ['LSM', 'CM'],
  'Mathematics': ['MA', 'ST'],
  'Physics': ['PC', 'MA'],
  'Quantitative Finance': ['QF', 'MA', 'ST', 'FIN'],
  'Statistics': ['ST', 'MA', 'DSA'],

  // ── CHS: Cross-Disciplinary Programmes ──
  'Data Science and Economics': ['DSE', 'EC', 'MA', 'ST'],
  'Environmental Studies': ['ENV', 'GE', 'LSM'],
  'Geospatial Intelligence': ['GE', 'CS'],
  'Philosophy, Politics, and Economics (PPE)': ['PPE', 'PH', 'PS', 'EC'],

  // ── Pharmacy ──
  'Pharmaceutical Science': ['PR', 'CM', 'LSM'],
  'Pharmacy': ['PR', 'CM', 'LSM'],

  // ── Law, Medicine, Dentistry, Music, Nursing ──
  'Dentistry': ['DEN'],
  'Law': ['LC', 'LL'],
  'Medicine': ['MED'],
  'Music': ['MUA', 'MUL', 'MUT'],
  'Nursing': ['NUR']
};

/**
 * Prefixes relevant to a major. Returns an empty array for an unknown major,
 * which callers should treat as "do not filter" rather than "match nothing".
 */
export function prefixesForMajor(major: string | null | undefined): string[] {
  if (!major) return [];
  return MAJOR_MODULE_PREFIXES[major.trim()] ?? [];
}
