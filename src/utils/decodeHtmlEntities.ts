/**
 * Decode HTML character references into real characters.
 *
 * News feeds (RSS, NewsData.io) and pasted headlines frequently deliver text
 * with entity-encoded punctuation — German quotes arrive as `&#8222;`/`&#8220;`,
 * dashes as `&ndash;`, umlauts as `&auml;`. The newsboard renders titles as
 * escaped TEXT (correct — that is what prevents injection), so anything left
 * encoded at ingest shows up literally on the page (real bug, 2026-09-08).
 *
 * Decode ONCE at the ingest boundary (fetch-daily, submit, preview) so the
 * stored value is the real character. Never decode at render.
 *
 * Handles numeric decimal (`&#8222;`), numeric hex (`&#x201E;`), and the named
 * entities that actually occur in German/English news copy. `&amp;` is decoded
 * LAST so a double-encoded reference (`&amp;lt;`) decodes exactly one level
 * (`&lt;`), which is the standard, non-surprising behaviour. Unknown named
 * entities are left untouched.
 *
 * Dependency-pure: safe to import from server routes, scripts, or islands.
 */

const NAMED: Record<string, string> = {
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  // Quotes / punctuation common in DE + EN headlines
  bdquo: '„', // „
  ldquo: '“', // "
  rdquo: '”', // "
  lsquo: '‘', // '
  rsquo: '’', // '
  sbquo: '‚', // ‚
  laquo: '«', // «
  raquo: '»', // »
  ndash: '–', // –
  mdash: '—', // —
  hellip: '…', // …
  middot: '·', // ·
  bull: '•', // •
  euro: '€', // €
  copy: '©',
  reg: '®',
  deg: '°',
  // German letters
  szlig: 'ß',
  auml: 'ä',
  ouml: 'ö',
  uuml: 'ü',
  Auml: 'Ä',
  Ouml: 'Ö',
  Uuml: 'Ü',
};

function fromCodePointSafe(cp: number, original: string): string {
  // Reject out-of-range and lone-surrogate code points rather than throwing —
  // a malformed reference in a feed must never take the whole cron down.
  if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) {
    return original;
  }
  try {
    return String.fromCodePoint(cp);
  } catch {
    return original;
  }
}

export function decodeHtmlEntities(input: string | null | undefined): string {
  if (!input) return '';
  if (input.indexOf('&') === -1) return input;
  return (
    input
      // Numeric first, so `&amp;#8222;` is NOT touched here (it decodes one
      // level to `&#8222;` via the final `&amp;` pass — correct).
      .replace(/&#(\d+);/g, (m, d: string) => fromCodePointSafe(parseInt(d, 10), m))
      .replace(/&#[xX]([0-9a-fA-F]+);/g, (m, h: string) => fromCodePointSafe(parseInt(h, 16), m))
      // Named entities, excluding `amp` (handled last on purpose).
      .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name: string) => (name === 'amp' ? m : NAMED[name] ?? m))
      // `&amp;` LAST: one level of decoding only.
      .replace(/&amp;/g, '&')
  );
}
