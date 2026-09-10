// src/lib/initials.ts
// Avatar initials — the single source of truth for every disc in the app
// (kiosk nav, admin masthead, profile, marketplace seller). Dependency-pure:
// no imports, safe on server and client alike.

/**
 * First letters of the first two whitespace-split name words, uppercased.
 * Returns '·' for an empty/absent name or one that yields no letters.
 */
export function initialsOf(name?: string | null): string {
  if (!name) return '·';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '·';
}
