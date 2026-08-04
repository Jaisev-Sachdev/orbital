/**
 * Letter avatars derived from the display name a user gives at signup.
 * Deliberately not real image uploads
 */

const PLACEHOLDER_NAMES = new Set([
  'loading...',
  'student',
  'error loading user',
  'a courseway user'
]);

/**
 * Up to two initials for a user.
 */
export function initialsFrom(name?: string | null, email?: string | null): string {
  const cleaned = (name ?? '').trim();

  if (cleaned && !PLACEHOLDER_NAMES.has(cleaned.toLowerCase())) {
    // Strip anything that isn't a letter so "Qi Zao (Brian)" -> "QB" not "Q(".
    const parts = cleaned
      .split(/\s+/)
      .map(part => part.replace(/[^\p{L}]/gu, ''))
      .filter(Boolean);

    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
  }

  // Fall back to the email local part. Split on the usual separators so "jaisev.sachdev@u.nus.edu" gives JS rather than JA.
  const local = (email ?? '').trim().split('@')[0];
  const emailParts = local
    .split(/[._\-+]+/)
    .map(part => part.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);

  if (emailParts.length > 1) {
    return (emailParts[0][0] + emailParts[emailParts.length - 1][0]).toUpperCase();
  }
  if (emailParts.length === 1) return emailParts[0].slice(0, 2).toUpperCase();

  return '?';
}


const AVATAR_COLOURS = [
  'bg-teal-100 text-teal-900',
  'bg-sky-100 text-sky-900',
  'bg-indigo-100 text-indigo-900',
  'bg-violet-100 text-violet-900',
  'bg-amber-100 text-amber-900',
  'bg-rose-100 text-rose-900',
  'bg-emerald-100 text-emerald-900',
  'bg-cyan-100 text-cyan-900'
];

export function avatarColour(seed?: string | null): string {
  const key = (seed ?? '').trim().toLowerCase();
  if (!key) return AVATAR_COLOURS[0];

  // Simple deterministic string hash (djb2-ish)
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }

  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
}
