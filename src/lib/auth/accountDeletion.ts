// src/lib/auth/accountDeletion.ts — SERVER-ONLY (mongodb + crypto + cloudinary).
// Never import from a client/.svelte file.
//
// Account-deletion scheduling with a 7-day grace period + single-use undo
// token. Mirrors src/lib/auth/emailChange.ts's token-lib shape exactly
// (sha256(rawToken) hash storage, latest-wins deleteMany before issuing a
// fresh token, atomic findOneAndUpdate single-use claim).
//
// SCOPE (Task 10): scheduleDeletion/cancelDeletion/cancelDeletionWithToken
// ONLY set/clear `users.deletionScheduledAt` and manage the
// `accountDeletionTokens` lifecycle — they never delete or anonymize
// content.
//
// Task 11 adds `runDeletionPipeline()` below — the day-7 anonymization
// pipeline the cron (`/api/cron/process-deletions`) calls once
// `deletionScheduledAt` has elapsed. EVERY destructive query in that
// function MUST be scoped to the single target userId — this runs against
// the shared prod database with no undo.
import { randomBytes, createHash } from 'crypto';
import { ObjectId } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';
import { connectDB } from '../mongodb';

cloudinary.config({
  cloud_name: import.meta.env.CLOUD_NAME,
  api_key: import.meta.env.CLOUDINARY_API_KEY,
  api_secret: import.meta.env.CLOUDINARY_API_SECRET,
});

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
    {
      // deletionClaimedAt is only ever set by runDeletionPipeline's atomic
      // claim (see below) — a cancel landing after a claim was taken but
      // before the pipeline finished must still clear the marker so the
      // account doesn't carry a stale "claimed" breadcrumb.
      $unset: { deletionScheduledAt: '', deletionClaimedAt: '' },
      $set: { updatedAt: new Date().toISOString() },
    }
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

// Cloudinary URLs for profile avatars look like:
//   https://res.cloudinary.com/<cloud>/image/upload/v<version>/mahalle/profile/<public_id>.<ext>
// Only ever destroy an asset whose public_id lives under mahalle/profile/ —
// never derive/destroy anything outside that folder from a URL string.
function extractProfileAvatarPublicId(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(mahalle\/profile\/[^./]+)\.[a-zA-Z0-9]+(?:$|\?)/);
  return match ? match[1] : null;
}

/**
 * Day-7 anonymization pipeline (Task 11, Decision 6). Called by the cron
 * (`GET /api/cron/process-deletions`) for every user whose
 * `deletionScheduledAt` has elapsed. Executes the ordered steps below,
 * EVERY ONE scoped to the single `userId` passed in — this runs against the
 * shared prod database with no undo.
 *
 * Per-step try/catch: a failing step is recorded as `-1` in `steps` and
 * flips the overall `ok` to false, but does NOT stop the remaining steps
 * from running (best-effort, resumable — a re-run of the cron picks up
 * anything a prior partial run missed, since the tombstone step is last and
 * `deletionScheduledAt` only clears once it succeeds).
 *
 * ATOMIC CLAIM (first operation, before any destructive step): the cron's
 * `find()` takes a snapshot of due users, then loops sequentially — a user
 * who cancels (Widerrufen) between that snapshot and their turn arriving
 * would otherwise still be destroyed (TOCTOU). `findOneAndUpdate` here
 * re-verifies `deletionScheduledAt` is still due and the user isn't already
 * anonymized AT THE MOMENT of the claim, atomically stamping
 * `deletionClaimedAt`. If the claim doesn't match (cancelled, or already
 * processed), the pipeline returns `{ ok: true, skipped: true, steps: {} }`
 * without touching anything else. This shrinks the race window from
 * "however long the cron takes to reach this user" down to milliseconds.
 * `userPicture` is read off the claimed doc — needed by step 7, AFTER step
 * 6's tombstone `$unset`s it.
 */
export async function runDeletionPipeline(
  userId: string
): Promise<{ ok: boolean; steps: Record<string, number>; skipped?: boolean }> {
  const db = await connectDB();
  const uid = new ObjectId(userId);
  const steps: Record<string, number> = {};
  let ok = true;

  const fail = (step: string, err: unknown) => {
    console.error(`[runDeletionPipeline] step "${step}" failed for user ${userId}:`, err);
    steps[step] = -1;
    ok = false;
  };

  const claimed = await db.collection('users').findOneAndUpdate(
    { _id: uid, deletionScheduledAt: { $lte: new Date() }, anonymized: { $ne: true } },
    { $set: { deletionClaimedAt: new Date() } },
    { returnDocument: 'after', projection: { userPicture: 1 } }
  );
  if (!claimed) {
    return { ok: true, skipped: true, steps: {} };
  }

  const userPicture: string | null =
    typeof (claimed as any).userPicture === 'string' ? (claimed as any).userPicture : null;

  // Step 1: listings (collect ids first) + their audit-trail rows +
  // $unset authorName/authorEmail on their flaggedContent rows (rows kept
  // — Nachweispflicht).
  try {
    const listingDocs = await db
      .collection('listings')
      .find({ sellerId: userId }, { projection: { _id: 1 } })
      .toArray();
    const listingIds = listingDocs.map((l) => String(l._id));

    const delListings = await db.collection('listings').deleteMany({ sellerId: userId });
    steps.listings = delListings.deletedCount ?? 0;

    const delAudit = await db
      .collection('listingAuditTrail')
      .deleteMany({ listingId: { $in: listingIds } });
    steps.listingAuditTrail = delAudit.deletedCount ?? 0;

    const unsetListingFlags = await db.collection('flaggedContent').updateMany(
      { contentType: 'marketplace', contentId: { $in: listingIds } },
      { $unset: { authorName: '', authorEmail: '' } }
    );
    steps.flaggedContentListings = unsetListingFlags.modifiedCount ?? 0;
  } catch (err) {
    fail('listings', err);
  }

  // Step 2: saved footprints (this user's own bookmarks) + this user
  // removed from OTHER listings' savedBy arrays.
  try {
    const delSavedPosts = await db.collection('savedPosts').deleteMany({ userId });
    const delSavedNews = await db.collection('savedNews').deleteMany({ userId });
    const delSavedEvents = await db.collection('savedEvents').deleteMany({ userId });
    steps.savedPosts = delSavedPosts.deletedCount ?? 0;
    steps.savedNews = delSavedNews.deletedCount ?? 0;
    steps.savedEvents = delSavedEvents.deletedCount ?? 0;

    const savedByPullOp: Record<string, any> = { $pull: { savedBy: userId } };
    const pulledSavedBy = await db
      .collection('listings')
      .updateMany({ savedBy: userId }, savedByPullOp);
    steps.listingsSavedByPulled = pulledSavedBy.modifiedCount ?? 0;
  } catch (err) {
    fail('savedFootprints', err);
  }

  // Step 3: pull this user's OWN RSVPs from every event. Other users' RSVPs
  // on events this user authored are KEPT (their data, event stays).
  try {
    const rsvpPullOp: Record<string, any> = {
      $pull: { 'rsvps.going': userId, 'rsvps.maybe': userId },
    };
    const rsvpPulled = await db.collection('events').updateMany(
      { $or: [{ 'rsvps.going': userId }, { 'rsvps.maybe': userId }] },
      rsvpPullOp
    );
    steps.eventsRsvpPulled = rsvpPulled.modifiedCount ?? 0;
  } catch (err) {
    fail('rsvps', err);
  }

  // Step 4: authored content (topics/comments/announcements/recommendations/
  // events/news) STAYS — rendered as "Ehemaliges Mitglied" via the
  // tombstone (step 6). flaggedContent by authorId: unset name/email only.
  try {
    const unsetAuthorFlags = await db
      .collection('flaggedContent')
      .updateMany({ authorId: userId }, { $unset: { authorName: '', authorEmail: '' } });
    steps.flaggedContentByAuthor = unsetAuthorFlags.modifiedCount ?? 0;
  } catch (err) {
    fail('flaggedContentByAuthor', err);
  }

  // Step 5: tokens (ObjectId userId) + rateLimits (best-effort, baseKey
  // contains the userId string) + chronikCache.
  try {
    const [t1, t2, t3, t4] = await Promise.all([
      db.collection('emailVerifyTokens').deleteMany({ userId: uid }),
      db.collection('passwordResetTokens').deleteMany({ userId: uid }),
      db.collection('emailChangeTokens').deleteMany({ userId: uid }),
      db.collection('accountDeletionTokens').deleteMany({ userId: uid }),
    ]);
    steps.tokens =
      (t1.deletedCount ?? 0) + (t2.deletedCount ?? 0) + (t3.deletedCount ?? 0) + (t4.deletedCount ?? 0);
  } catch (err) {
    fail('tokens', err);
  }

  try {
    // Safety assumption: userId is a 24-char hex ObjectId string (no regex
    // metacharacters) — safe to use unescaped as a $regex operand here.
    const delRateLimits = await db
      .collection('rateLimits')
      .deleteMany({ baseKey: { $regex: userId } });
    steps.rateLimits = delRateLimits.deletedCount ?? 0;
  } catch (err) {
    fail('rateLimits', err);
  }

  try {
    const delChronik = await db.collection('chronikCache').deleteOne({ userId: uid });
    steps.chronikCache = delChronik.deletedCount ?? 0;
  } catch (err) {
    fail('chronikCache', err);
  }

  // Step 6: tombstone (Decision 6, verbatim). Naturally idempotent — the
  // $unset of deletionScheduledAt means a second cron pass no longer
  // matches this user (`anonymized: true` also excludes it explicitly).
  try {
    const tombstoneUpdate = await db.collection('users').updateOne(
      { _id: uid },
      {
        $set: {
          name: 'Ehemaliges Mitglied',
          anonymized: true,
          deletedAt: new Date(),
          updatedAt: new Date().toISOString(),
        },
        $unset: {
          email: '',
          password: '',
          image: '',
          userPicture: '',
          hobbies: '',
          handle: '',
          verified: '',
          emailVerified: '',
          roleBadge: '',
          role: '',
          motto: '',
          pendingEmail: '',
          dankeCrossedAt: '',
          deletionScheduledAt: '',
        },
      }
    );
    steps.tombstone = tombstoneUpdate.modifiedCount ?? 0;
  } catch (err) {
    fail('tombstone', err);
  }

  // Step 7: Cloudinary avatar destroy, best-effort. Only acts if the
  // captured userPicture URL resolves to a mahalle/profile/ public_id.
  try {
    const publicId = userPicture ? extractProfileAvatarPublicId(userPicture) : null;
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
      steps.avatarCloudinary = 1;
    } else {
      steps.avatarCloudinary = 0;
    }
  } catch (err) {
    fail('avatarCloudinary', err);
  }

  return { ok, steps };
}
