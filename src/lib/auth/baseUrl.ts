// src/lib/auth/baseUrl.ts — SERVER-ONLY.
// Trusted absolute origin for links we EMAIL to users (password-reset, email-verify).
//
// SECURITY (CWE-640): never build emailed links from the request Host header —
// a poisoned Host would mail the victim a link pointing at an attacker domain
// (token leak → account takeover). The base comes from the configured
// NEXTAUTH_URL and FAILS CLOSED in production: if unset, this returns '' and
// the caller must SKIP sending rather than fall back to the untrusted Host.
// The request-origin fallback is allowed ONLY in dev.
export function getTrustedBaseUrl(request: Request): string {
  return (
    (import.meta.env.NEXTAUTH_URL || '').replace(/\/+$/, '') ||
    (import.meta.env.PROD ? '' : new URL(request.url).origin)
  );
}
