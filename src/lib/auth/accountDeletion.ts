// src/lib/auth/accountDeletion.ts — SERVER-ONLY (mongodb + crypto). Never
// import from a client/.svelte file.
//
// Account-deletion scheduling with a 7-day grace period + single-use undo
// token. Mirrors src/lib/auth/emailChange.ts's token-lib shape exactly
// (sha256(rawToken) hash storage, latest-wins deleteMany before issuing a
// fresh token, atomic findOneAndUpdate single-use claim).
//
// SCOPE (Task 10, load-bearing): this module ONLY sets/clears
// `users.deletionScheduledAt` and manages the `accountDeletionTokens`
// lifecycle. It NEVER deletes or anonymizes user content — the day-7
// anonymization pipeline that actually acts on an elapsed
// `deletionScheduledAt` is Task 11 and does not exist yet. Do not add a
// deleteMany/anonymize step here.
import { randomBytes, createHash } from 'crypto';
import { ObjectId } from 'mongodb';
import { connectDB } from '../mongodb';

export const GRACE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Schedule the caller's account for deletion `GRACE_MS` from now:
 *  - `$set users.deletionScheduledAt` to the computed deletion date.
 *  - Issues a fresh single-use undo token (drops any prior unused tokens
 *    for this user first — latest-wins, same as createEmailChangeToken).
 *
 * `rawToken` is the token to embed in the emailed undo link; only its
 * sha256 hash is persisted. Returning `deletionDate` always (even if the
 * token insert somehow yields no raw value) lets the caller still report
 * success — the in-app Widerrufen button on the Konto card works
 * independently of whether the mail token exists.
 */
export async function scheduleDeletion(
  userId: string
): Promise<{ deletionDate: Date; rawToken: string | null }> {
  const db = await connectDB();
  const uid = new ObjectId(userId);
  const now = Date.now();
  const deletionDate = new Date(now + GRACE_MS);

  await db.collection('users').updateOne(
    { _id: uid },
    { $set: { deletionScheduledAt: deletionDate, updatedAt: new Date().toISOString() } }
  );

  const tokens = db.collection('accountDeletionTokens');
  await tokens.deleteMany({ userId: uid, usedAt: null });

  const raw = randomBytes(32).toString('hex');
  await tokens.insertOne({
    tokenHash: hashToken(raw),
    userId: uid,
    expiresAt: deletionDate,
    usedAt: null,
    createdAt: new Date(now),
  });

  return { deletionDate, rawToken: raw };
}

/**
 * Cancel a pending deletion: `$unset deletionScheduledAt` + drop every
 * undo token for this user. Idempotent — safe to call when nothing was
 * scheduled (used by both the in-app cancel endpoint and as the tail end
 * of `cancelDeletionWithToken` below).
 */
export async function cancelDeletion(userId: string): Promise<void> {
  const db = await connectDB();
  const uid = new ObjectId(userId);
  await db.collection('users').updateOne(
    { _id: uid },
    { $unset: { deletionScheduledAt: '' }, $set: { updatedAt: new Date().toISOString() } }
  );
  await db.collection('accountDeletionTokens').deleteMany({ userId: uid });
}

/**
 * Atomically claim (single-use) a mail undo token, then cancel the
 * scheduled deletion for its owner. Returns `false` for missing/expired/
 * already-used tokens — the sessionless caller (`/api/auth/cancel-deletion`)
 * must not distinguish which case occurred externally (no oracle), mirrors
 * emailChange.ts's confirmEmailChange 'invalid' handling.
 */
export async function cancelDeletionWithToken(rawToken: string): Promise<boolean> {
  if (!rawToken) return false;
  const db = await connectDB();
  const tokens = db.collection('accountDeletionTokens');

  const claimed = await tokens.findOneAndUpdate(
    { tokenHash: hashToken(rawToken), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } }
  );
  if (!claimed) return false;

  await cancelDeletion(String((claimed as any).userId));
  return true;
}
