/**
 * Same-origin redirect-target validation. Dependency-pure (no imports) —
 * usable from both client islands and the middleware.
 *
 * Character-enumeration guards (startsWith('//') etc.) are bypassable via
 * WHATWG URL normalization: the parser strips ASCII tab/CR/LF BEFORE
 * resolving, so '/\t/evil.com' navigates as '//evil.com'. Instead we run
 * the candidate through the same parser the browser will use, against a
 * fixed private base origin, and accept it only if it stayed ON that
 * origin — returning the PARSED components, never the raw string.
 */
export function safeInternalPath(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  try {
    const base = 'http://mahalle.internal';
    const u = new URL(raw, base);
    if (u.origin !== base) return fallback; // escaped the base → absolute/protocol-relative/backslash trick
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
