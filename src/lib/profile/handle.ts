// src/lib/profile/handle.ts
// PURE module — imported by server code AND scripts. Never import DB here.

export const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;
export const HANDLE_FALLBACK = 'nachbar';

/** Chars NFD can't decompose. German ö/ü/ä decompose to o/u/a via NFD —
 *  deliberately NOT oe/ue/ae, to keep one rule for Turkish + German names. */
const MANUAL_MAP: Record<string, string> = {
  ß: 'ss', ı: 'i', ø: 'o', æ: 'ae', œ: 'oe', đ: 'd', ł: 'l', þ: 'th',
};

/** "Emre Aydın" -> "emre_aydin". Deterministic; caller handles collisions. */
export function slugifyHandle(name: string): string {
  let s = name
    .toLowerCase()
    .replace(/[ßıøæœđłþ]/g, (c) => MANUAL_MAP[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics (escaped range — do not paste literal combining chars)
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (s.length > 20) s = s.slice(0, 20).replace(/_$/, '');
  if (s.length < 3) s = HANDLE_FALLBACK; // suffixing at the caller keeps it unique
  return s;
}
