// src/lib/auth/emailVerify.ts
// SERVER-ONLY (mongodb + crypto). Never import from a client/.svelte file.
//
// Verify tokens are stored ONLY as sha256(rawToken) — the raw token lives solely
// in the emailed link. Single-use is enforced by an atomic findOneAndUpdate claim.
// Mirrors src/lib/auth/passwordReset.ts (same collection shape, longer TTL).
import { randomBytes, createHash } from 'crypto';
import { ObjectId } from 'mongodb';
import { connectDB } from '../mongodb';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (email-verify decision)
const RESEND_GUARD_MS = 60 * 1000;        // at most one new token per user per 60s

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Issue a single-use email-verify token for a user. Invalidates the user's prior
 * unused tokens (latest-wins). Returns the RAW token to embed in the link, or
 * null if a fresh unused token was issued <60s ago (resend guard).
 */
export async function createEmailVerifyToken(userId: string): Promise<string | null> {
  const db = await connectDB();
  const col = db.collection('emailVerifyTokens');
  const uid = new ObjectId(userId);
  const now = Date.now();

  const recent = await col.findOne({
    userId: uid,
    usedAt: null,
    createdAt: { $gte: new Date(now - RESEND_GUARD_MS) },
  });
  if (recent) return null;

  await col.deleteMany({ userId: uid, usedAt: null });

  const raw = randomBytes(32).toString('hex');
  await col.insertOne({
    tokenHash: hashToken(raw),
    userId: uid,
    expiresAt: new Date(now + TOKEN_TTL_MS),
    usedAt: null,
    createdAt: new Date(now),
  });
  return raw;
}

/** Return the owning userId if the token is valid (unused + unexpired), else null. */
export async function findValidVerifyToken(rawToken: string): Promise<string | null> {
  if (!rawToken) return null;
  const db = await connectDB();
  const col = db.collection('emailVerifyTokens');
  const row = await col.findOne({
    tokenHash: hashToken(rawToken),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
  return row ? String(row.userId) : null;
}

/**
 * Atomically claim the token (single-use) and set the user's emailVerified flag.
 * Returns true on success; false for invalid/expired/already-used tokens.
 */
export async function verifyEmailWithToken(rawToken: string): Promise<boolean> {
  if (!rawToken) return false;
  const db = await connectDB();
  const tokens = db.collection('emailVerifyTokens');

  // Atomic claim: only succeeds if the token is still unused + unexpired.
  const claimed = await tokens.findOneAndUpdate(
    { tokenHash: hashToken(rawToken), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } }
  );
  if (!claimed) return false;

  try {
    await db.collection('users').updateOne(
      { _id: claimed.userId as ObjectId },
      { $set: { emailVerified: true, updatedAt: new Date().toISOString() } }
    );
  } catch (err) {
    // The user write failed AFTER the token was claimed — roll the claim back
    // so the link stays usable and the user isn't stuck unverified.
    await tokens.updateOne({ _id: (claimed as any)._id }, { $set: { usedAt: null } })
      .catch((rollbackErr) => {
        console.error('verifyEmailWithToken: rollback ALSO failed — token may be permanently burnt:', rollbackErr);
      });
    console.error('verifyEmailWithToken: user write failed, rolled back claim:', err);
    return false;
  }

  // Flag is already flipped — clear any other unused tokens for this user.
  // Best-effort + POST-success: a failure here must NOT undo the verification.
  await tokens.deleteMany({ userId: claimed.userId, usedAt: null })
    .catch((cleanupErr) => {
      console.error('verifyEmailWithToken: sibling-token cleanup failed (verify still succeeded):', cleanupErr);
    });
  return true;
}
