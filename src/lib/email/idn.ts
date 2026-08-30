// Dependency-pure (no imports) — safe for any import graph.
//
// Normalize an email's DOMAIN to punycode: register.ts's structural regex
// deliberately admits IDN addresses (ali@müller.de), but Resend rejects
// non-ASCII recipients outright ("Invalid to field") and SMTP relays vary.
// Local parts are left untouched (SMTPUTF8 locals are out of scope; the
// fail-soft return means such an address still attempts delivery as-is).
export function punycodeEmailDomain(address: string): string {
  const at = address.lastIndexOf('@');
  if (at < 0) return address;
  const domain = address.slice(at + 1);
  if (/^[\x00-\x7F]*$/.test(domain)) return address; // already ASCII — no-op
  try {
    // WHATWG URL applies IDNA to hostnames: müller.de → xn--mller-kva.de
    const ascii = new URL(`http://${domain}`).hostname;
    return ascii ? `${address.slice(0, at)}@${ascii}` : address;
  } catch {
    return address; // fail-soft: let the transport produce the real error
  }
}
