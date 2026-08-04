/**
 * Letter avatars derived from the display name a user gives at signup.
 *
 * Deliberately not real image uploads: Render's filesystem is ephemeral, so
 * uploads would need external object storage, and no user testing feedback
 * asked for profile pictures. Initials give the same visual anchor for free.
 */

/** Placeholder names the sidebar shows before or instead of real data. */
const PLACEHOLDER_NAMES = new Set([
  'loading...',
  'student',
  'error loading user',
  'a courseway user'
]);

/**
 * Up to two initials for a user.
 *
 * Prefers the display name (first + last initial, or the first two letters of
 * a single-word name). Falls back to the email local part, then to "?" so the
 * avatar is never blank.
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

  const local = (email ?? '').trim().split('@')[0].replace(/[^\p{L}\p{N}]/gu, '');
  if (local) return local.slice(0, 2).toUpperCase();

  return '?';
}

/**
 * Tailwind classes for the avatar background and text, chosen deterministically
 * from a seed so a given user always gets the same colour across sessions and
 * devices. Tuned for the light theme introduced in PR #34.
 */
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

  // Simple deterministic string hash (djb2-ish). Not security-sensitive.
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }

  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
}
