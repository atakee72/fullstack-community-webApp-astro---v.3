// PURE (no imports beyond node:crypto, no env reads) — the salt is the
// caller's problem: contact.ts and accountDeletion.ts each read
// CONTACT_IP_SALT via import.meta.env; scripts replicate via process.env.
// Construction is byte-identical to contact.ts's hashIp so one salt
// serves both families. Callers pass the ALREADY-normalized (lowercase,
// trimmed) email — this function must not re-normalize.
import { createHash } from 'crypto';

export function hashContactEmail(email: string, salt: string): string {
  return createHash('sha256').update(email + salt).digest('hex').slice(0, 32);
}
