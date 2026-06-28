// src/lib/auth/passwordReset.ts
// SERVER-ONLY (mongodb + crypto + bcrypt). Never import from a client/.svelte file.
//
// Reset tokens are stored ONLY as sha256(rawToken) — the raw token lives solely
// in the emailed link. Single-use is enforced by an atomic findOneAndUpdate claim.
import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { connectDB } from '../mongodb';

const TOKEN_TTL_MS = 30 * 60 * 1000;   // 30 minutes (AUTH_SCOPING)
const RESEND_GUARD_MS = 60 * 1000;     // at most one new token per user per 60s
const SALT_ROUNDS = 12;                // matches register.ts

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Issue a single-use reset token for a user. Invalidates the user's prior unused
 * tokens (latest-wins). Returns the RAW token to embed in the link, or null if a
 * fresh unused token was issued <60s ago (resend guard).
 */
export async function createPasswordResetToken(userId: string): Promise<string | null> {
  const db = await connectDB();
  const col = db.collection('passwordResetTokens');
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
export async function findValidResetToken(rawToken: string): Promise<string | null> {
  if (!rawToken) return null;
  const db = await connectDB();
  const col = db.collection('passwordResetTokens');
  const row = await col.findOne({
    tokenHash: hashToken(rawToken),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
  return row ? String(row.userId) : null;
}

/**
 * Atomically claim the token (single-use) and rewrite the user's password.
 * Returns true on success; false for invalid/expired/already-used tokens.
 */
export async function resetPasswordWithToken(rawToken: string, newPassword: string): Promise<boolean> {
  if (!rawToken) return false;
  const db = await connectDB();
  const tokens = db.collection('passwordResetTokens');

  // Atomic claim: only succeeds if the token is still unused + unexpired.
  // mongodb v6 findOneAndUpdate returns the matched document (or null) directly.
  const claimed = await tokens.findOneAndUpdate(
    { tokenHash: hashToken(rawToken), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } }
  );
  if (!claimed) return false;

  const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db.collection('users').updateOne(
    { _id: claimed.userId as ObjectId },
    { $set: { password: hashed, updatedAt: new Date().toISOString() } }
  );
  return true;
}
