// src/lib/auth/rateLimit.ts
// SERVER-ONLY (mongodb + crypto). Fixed-window rate limiting backed by the
// `rateLimits` collection. Buckets are keyed `<baseKey>#<windowId>` so every
// window upserts a fresh doc (atomic $inc — no cross-window races); expired
// buckets are removed by the TTL index (scripts/create-auth-indexes.ts).
//
// Semantics: `max` = allowed attempts per window. consume() flags the
// attempt that EXCEEDS max; peek() flags once max attempts are already
// recorded (so a gate checked before work closes on attempt max+1).
import { createHash } from 'crypto';
import { connectDB } from '../mongodb';

// Reuses the contact relay's IP salt (same semantics: keyed hashing so raw
// IPs never land in the DB). Fixed across deploys.
const IP_SALT = import.meta.env.CONTACT_IP_SALT || '';
if (!IP_SALT && import.meta.env.PROD) {
  console.error('[rateLimit] CONTACT_IP_SALT is required in production');
}

// Login lockout policy (design state 05: "triggers after 5 failed attempts").
export const LOGIN_MAX_FAILS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export interface RateLimitResult {
  limited: boolean;
  retryAfterSec: number;
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip + IP_SALT).digest('hex').slice(0, 32);
}

/** Best-effort client IP: Astro's clientAddress, else first X-Forwarded-For hop. */
export function clientIpFrom(request: Request, clientAddress?: string): string {
  return (
    clientAddress ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}

function windowInfo(windowMs: number) {
  const windowId = Math.floor(Date.now() / windowMs);
  const windowEnd = (windowId + 1) * windowMs;
  return {
    windowId,
    retryAfterSec: Math.max(1, Math.ceil((windowEnd - Date.now()) / 1000)),
    // Keep the bucket one extra window past its end so peek() near a
    // boundary never reads a just-TTL'd doc; TTL cleanup is hygiene only.
    expiresAt: new Date(windowEnd + windowMs),
  };
}

/** Count one attempt against `baseKey`; report whether the limit is now exceeded. */
export async function consumeRateLimit(
  baseKey: string,
  max: number,
  windowMs: number
): Promise<RateLimitResult> {
  const db = await connectDB();
  const col = db.collection('rateLimits');
  const { windowId, retryAfterSec, expiresAt } = windowInfo(windowMs);
  const filter = { key: `${baseKey}#${windowId}` };
  const update = { $inc: { count: 1 }, $setOnInsert: { baseKey, expiresAt } };
  let doc;
  try {
    doc = await col.findOneAndUpdate(filter, update, { upsert: true, returnDocument: 'after' });
  } catch (err: any) {
    // Two concurrent first-attempts can race the upsert against the unique
    // key index (E11000). The doc exists now — retry once, non-upsert path.
    if (err?.code !== 11000) throw err;
    doc = await col.findOneAndUpdate(filter, update, { returnDocument: 'after' });
  }
  const count = (doc as any)?.count ?? 1;
  return { limited: count > max, retryAfterSec };
}

/** Report the current window's state WITHOUT counting an attempt. */
export async function peekRateLimit(
  baseKey: string,
  max: number,
  windowMs: number
): Promise<RateLimitResult> {
  const db = await connectDB();
  const { windowId, retryAfterSec } = windowInfo(windowMs);
  const doc = await db.collection('rateLimits').findOne({ key: `${baseKey}#${windowId}` });
  return { limited: ((doc as any)?.count ?? 0) >= max, retryAfterSec };
}

/** Drop all windows for `baseKey` (e.g. successful login clears the lockout). */
export async function clearRateLimit(baseKey: string): Promise<void> {
  const db = await connectDB();
  await db.collection('rateLimits').deleteMany({ baseKey });
}
