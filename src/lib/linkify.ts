// src/lib/linkify.ts — dependency-pure (imported by client islands).
// Splits plain text into text/link segments so Svelte can render URLs as
// real <a> elements WITHOUT @html (Svelte escapes each segment — XSS-safe).
// Only http(s) URLs are recognized, so javascript:/data: URIs can never
// become hrefs.

export interface LinkifySegment {
  type: 'text' | 'link';
  value: string;
}

const URL_RE = /https?:\/\/[^\s<>"']+/g;

// Trailing punctuation that is far more likely to be sentence punctuation
// than part of the URL („… siehe https://example.com/pfad.")
const TRAILING_PUNCT = /[.,!?;:)\]]+$/;

export function linkifySegments(text: string): LinkifySegment[] {
  const segments: LinkifySegment[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    let url = match[0];
    const trimmed = url.replace(TRAILING_PUNCT, '');
    // Keep balanced closing parens (e.g. wikipedia_(band)) — only strip a
    // trailing ")" when the URL has no matching "(".
    url = trimmed.includes('(') && url.endsWith(')') ? trimmed + ')' : trimmed;
    const start = match.index ?? 0;
    if (start > last) segments.push({ type: 'text', value: text.slice(last, start) });
    segments.push({ type: 'link', value: url });
    last = start + url.length;
  }
  if (last < text.length) segments.push({ type: 'text', value: text.slice(last) });
  return segments;
}
