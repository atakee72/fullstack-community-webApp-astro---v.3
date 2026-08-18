# Notification Center — Release 1 (in-app) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In-app notification center — `notifications` collection, four write hooks, session-gated API, bell + panel in `KioskNav` with read/unread and 90s polling.

**Architecture:** Fan-out on write (one doc per recipient per event, broadcasts via `insertMany`). Actor names are a read-time `$in` join, never stored; no rendered copy stored — the client renders DE/EN from `kiosk-i18n` by `type`. Bell + panel are new Svelte components inside the `KioskNav` island, structurally mirroring `AvatarMenu` (dropdown desktop / bottom sheet mobile).

**Tech Stack:** MongoDB driver (direct), Astro API routes, Svelte 5 runes, kiosk i18n (`t`/`tStr`), Tailwind + kiosk CSS vars, Sentry.

**Spec:** `docs/superpowers/specs/2026-08-18-notification-center-design.md` — the binding authority. This plan implements its Release 1 only (PWA/push is Release 2, out of scope here).

## Global Constraints

- **Never-throw write hooks:** a failed notification write must never fail the parent request — catch → `console.error` + `Sentry.captureException` + `await Sentry.flush(2000)` (best-effort), then continue. (Spec "Write hooks".)
- **Actor name never stored** — read-time join only, allowlist projection `{ name: 1 }` (NEVER `{ password: 0 }`). (Spec "Data model".)
- **No rendered copy stored** — API returns structured docs; client renders from i18n. Both DE and EN keys for every string; no color words in user-facing copy.
- **Types:** exactly `'comment' | 'moderation' | 'official' | 'market_contact'`.
- **Fixed values:** list limit 30; poll interval 90 000 ms (visible tab only); TTL `expireAfterSeconds: 7776000` (90 days); badge caps at „9+".
- **API caching:** both endpoints send `'Cache-Control': 'no-store'` + `'Vary': 'Cookie'`.
- **Self-notification suppressed** at write time (`actorId === userId` → skip); broadcasts exclude the actor and `anonymized: true` users.
- **Panel styles live in `src/styles/global.css`** under an `.nc-*` prefix — NEVER in a component `<style>` block (nested-island CSS orphan rule; the components are reachable only through the `KioskNav` island).
- **Mobile sheet mechanics copied from `AvatarMenu`:** dual html+body scroll-lock with inline-style save/restore; scrim `z-49`; header z-bump to 50 while open; `prefers-reduced-motion` block LAST in the `.nc-*` CSS with the source-order guard comment.
- **Do not touch port 3000** (user's dev server). Browser checks: port 4655 only after `ss -tlnp | grep 4655` shows it free; tear down by PID if `pkill -f "astro dev --port 4655"` misses.
- **Test cycle** (no component-test framework): `pnpm type-check 2>&1 | grep -c "error"` must equal the pre-existing baseline (record in Task 1 Step 1) + `pnpm build` green + Task 4 browser verification against the seeded dev DB (`mahalle-dev` — NEVER prod `mahalle`).
- **Commit style:** simple/concise message, NO AI signature, NO Co-Authored-By footer. Stage only the named files.

---

### Task 1: Data layer + API endpoints

**Files:**
- Create: `src/types/notification.ts`
- Create: `src/lib/notifications.ts`
- Create: `scripts/create-notification-indexes.ts`
- Create: `src/pages/api/notifications/index.ts`
- Create: `src/pages/api/notifications/read.ts`
- Modify: `src/lib/auth/accountDeletion.ts` (add one pipeline step after the savedPosts block, ~line 225)

**Interfaces:**
- Consumes: `connectDB` (`src/lib/mongodb.ts`), `getSession` (`auth-astro/server`), `@sentry/astro`.
- Produces (Tasks 2–3 rely on these exact signatures):
  - `notify(input: NotifyInput): Promise<void>` and `notifyAllMembers(input: Omit<NotifyInput, 'userId'>): Promise<void>` from `src/lib/notifications.ts`
  - `commentTarget(parentCollection: string, parentId: string, title: string): NotificationTarget`
  - `moderationTarget(contentType: string, contentId: string, title: string): NotificationTarget`
  - `GET /api/notifications` (`?count=1` → `{ unreadCount }`; full → `{ items: NotificationItem[], unreadCount }`) and `POST /api/notifications/read` → `{ ok: true }`
  - `NotificationItem` from `src/types/notification.ts`

- [ ] **Step 1: Record the type-check baseline**

Run: `pnpm type-check 2>&1 | grep -c "error"` — note the number; later checks must not exceed it.

- [ ] **Step 2: Create `src/types/notification.ts`**

```ts
import type { ObjectId } from 'mongodb';

export type NotificationType = 'comment' | 'moderation' | 'official' | 'market_contact';

export interface NotificationTarget {
  /** The page kind the row deep-links to (mirrors the href, not necessarily
   *  the moderated doc itself — a moderated comment links to its parent). */
  contentType: 'topic' | 'announcement' | 'recommendation' | 'event' | 'listing' | 'news' | 'forum';
  contentId: string;
  title: string; // snapshot at event time
  href: string;
}

export interface NotificationMeta {
  outcome?: 'approved' | 'warned' | 'rejected';
  strike?: boolean;
}

/** DB shape — one doc per recipient per event. */
export interface NotificationDoc {
  _id?: ObjectId;
  userId: string; // recipient, user-id string (like all content refs)
  type: NotificationType;
  actorId?: string; // who triggered it — NO name stored (read-time join)
  target: NotificationTarget;
  meta?: NotificationMeta;
  createdAt: Date;
  readAt: Date | null;
}

/** API/client shape returned by GET /api/notifications. */
export interface NotificationItem {
  id: string;
  type: NotificationType;
  actorName: string | null; // null → deleted account or no actor; client renders tombstone label
  target: NotificationTarget;
  meta?: NotificationMeta;
  createdAt: string; // ISO
  readAt: string | null; // ISO
}
```

- [ ] **Step 3: Create `src/lib/notifications.ts`**

```ts
/**
 * Notification write + read helpers. SERVER-ONLY (imports connectDB).
 *
 * Write side is NEVER-THROW by contract: a failed notification write must
 * never fail the parent request (comment create, review action, contact
 * relay). Failures are swallowed but Sentry-captured with flush — Vercel
 * freezes the function when the response leaves, eating unflushed events.
 *
 * Actor names are a read-time join (populateSellers pattern), never stored:
 * a deleted user's tombstone doc already carries name "Ehemaliges Mitglied",
 * and hard-missing users render as null → client tombstone label.
 */
import { ObjectId } from 'mongodb';
import * as Sentry from '@sentry/astro';
import { connectDB } from './mongodb';
import type {
  NotificationDoc,
  NotificationItem,
  NotificationTarget,
  NotificationType,
  NotificationMeta,
} from '../types/notification';

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  actorId?: string;
  target: NotificationTarget;
  meta?: NotificationMeta;
}

const LIST_LIMIT = 30;

async function capture(err: unknown): Promise<void> {
  console.error('[notifications] write failed:', err);
  try {
    Sentry.captureException(err);
    await Sentry.flush(2000);
  } catch {
    /* best-effort */
  }
}

/** Insert one notification. Self-notifications are silently skipped. */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    if (input.actorId && input.actorId === input.userId) return;
    const db = await connectDB();
    await db.collection<NotificationDoc>('notifications').insertOne({
      ...input,
      createdAt: new Date(),
      readAt: null,
    });
  } catch (err) {
    await capture(err);
  }
}

/** Broadcast to every member (all non-anonymized users) except the actor. */
export async function notifyAllMembers(input: Omit<NotifyInput, 'userId'>): Promise<void> {
  try {
    const db = await connectDB();
    const users = await db
      .collection('users')
      .find({ anonymized: { $ne: true } }, { projection: { _id: 1 } })
      .toArray();
    const now = new Date();
    const docs: NotificationDoc[] = users
      .map((u) => u._id.toString())
      .filter((id) => id !== input.actorId)
      .map((userId) => ({ userId, ...input, createdAt: now, readAt: null }));
    if (!docs.length) return;
    await db.collection<NotificationDoc>('notifications').insertMany(docs, { ordered: false });
  } catch (err) {
    await capture(err);
  }
}

// Comment hooks know the PARENT collection name ('topics' | 'announcements'
// | 'recommendations' | 'events'); events have no detail route yet, so their
// rows link to the calendar page.
const PARENT_CONTENT_TYPE: Record<string, NotificationTarget['contentType']> = {
  topics: 'topic',
  announcements: 'announcement',
  recommendations: 'recommendation',
  events: 'event',
};

export function commentTarget(
  parentCollection: string,
  parentId: string,
  title: string,
): NotificationTarget {
  const contentType = PARENT_CONTENT_TYPE[parentCollection] ?? 'topic';
  const href = contentType === 'event' ? '/calendar' : `/${parentCollection}/${parentId}`;
  return { contentType, contentId: parentId, title, href };
}

// Moderation hooks know the flaggedContent contentType (singular forms).
export function moderationTarget(
  contentType: string,
  contentId: string,
  title: string,
): NotificationTarget {
  switch (contentType) {
    case 'topic':
      return { contentType: 'topic', contentId, title, href: `/topics/${contentId}` };
    case 'announcement':
      return { contentType: 'announcement', contentId, title, href: `/announcements/${contentId}` };
    case 'recommendation':
      return { contentType: 'recommendation', contentId, title, href: `/recommendations/${contentId}` };
    case 'event':
      return { contentType: 'event', contentId, title, href: '/calendar' };
    case 'marketplace':
      return { contentType: 'listing', contentId, title, href: `/marketplace/${contentId}` };
    case 'news':
      return { contentType: 'news', contentId, title, href: '/newsboard' };
    default:
      // 'comment' without a resolvable parent, or anything unknown → forum index
      return { contentType: 'forum', contentId, title, href: '/' };
  }
}

/** Newest LIST_LIMIT notifications with actor names joined (allowlist projection). */
export async function listNotifications(userId: string): Promise<NotificationItem[]> {
  const db = await connectDB();
  const docs = await db
    .collection<NotificationDoc>('notifications')
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(LIST_LIMIT)
    .toArray();

  const actorIds = [
    ...new Set(
      docs
        .map((d) => d.actorId)
        .filter((s): s is string => !!s && ObjectId.isValid(s))
        .map((s) => new ObjectId(s).toHexString()),
    ),
  ];
  let byId = new Map<string, { name?: string }>();
  if (actorIds.length) {
    const users = await db
      .collection('users')
      .find(
        { _id: { $in: actorIds.map((id) => new ObjectId(id)) } },
        { projection: { name: 1 } },
      )
      .toArray();
    byId = new Map(users.map((u) => [u._id.toString(), u]));
  }

  return docs.map((d) => ({
    id: d._id!.toString(),
    type: d.type,
    actorName:
      d.actorId && ObjectId.isValid(d.actorId)
        ? (byId.get(new ObjectId(d.actorId).toHexString())?.name ?? null)
        : null,
    target: d.target,
    meta: d.meta,
    createdAt: d.createdAt.toISOString(),
    readAt: d.readAt ? d.readAt.toISOString() : null,
  }));
}

export async function countUnread(userId: string): Promise<number> {
  const db = await connectDB();
  return db.collection('notifications').countDocuments({ userId, readAt: null });
}

export async function markAllRead(userId: string): Promise<void> {
  const db = await connectDB();
  await db
    .collection('notifications')
    .updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
}
```

- [ ] **Step 4: Create `scripts/create-notification-indexes.ts`**

Copy the `ensureIndex` helper VERBATIM from `scripts/create-auth-indexes.ts` (lines 1–45: header comment style, `dotenv/config` import, the 85/86 conflict handling), then:

```ts
async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required (set in .env or shell env).');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = new URL(uri).pathname.slice(1) || 'mahalle-dev';
  const db = client.db(dbName);

  // List + unread count: both queries filter userId and sort/filter on the
  // second key, so one compound index serves both.
  await ensureIndex(db, 'notifications', { userId: 1, createdAt: -1 }, {
    name: 'notifications_user_created',
  });

  // Retention: a REAL Mongo TTL index (unlike chronikCache's in-code check).
  // Read and unread expire alike after 90 days; no prune script.
  await ensureIndex(db, 'notifications', { createdAt: 1 }, {
    name: 'notifications_ttl',
    expireAfterSeconds: 7776000, // 90 days
  });

  console.log(`Done (db: ${dbName}).`);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 5: Run the index script against the dev DB**

Run: `npx tsx scripts/create-notification-indexes.ts`
Expected: `Done (db: mahalle-dev).` — the local `.env` URI points at `mahalle-dev`. (Prod gets the same run at release time; note it in the commit message body if you like, nothing else to do here.)

- [ ] **Step 6: Create `src/pages/api/notifications/index.ts`**

```ts
import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { countUnread, listNotifications } from '../../../lib/notifications';

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  Vary: 'Cookie',
};

export const GET: APIRoute = async ({ request, url }) => {
  const session = await getSession(request);
  const userId = session?.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS });
  }

  try {
    // ?count=1 — the 90s polling target: one indexed countDocuments, no list.
    if (url.searchParams.get('count') === '1') {
      const unreadCount = await countUnread(userId);
      return new Response(JSON.stringify({ unreadCount }), { status: 200, headers: HEADERS });
    }

    const [items, unreadCount] = await Promise.all([
      listNotifications(userId),
      countUnread(userId),
    ]);
    return new Response(JSON.stringify({ items, unreadCount }), { status: 200, headers: HEADERS });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: HEADERS });
  }
};
```

- [ ] **Step 7: Create `src/pages/api/notifications/read.ts`**

```ts
import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { markAllRead } from '../../../lib/notifications';

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  Vary: 'Cookie',
};

// Marks ALL of the caller's unread notifications read (fired on panel open).
// Idempotent, self-scoped — no CSRF/origin guard needed.
export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  const userId = session?.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS });
  }

  try {
    await markAllRead(userId);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS });
  } catch (error) {
    console.error('Notifications read error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: HEADERS });
  }
};
```

- [ ] **Step 8: Add the deletion-pipeline step**

In `src/lib/auth/accountDeletion.ts`, directly AFTER the saved-items block (the one ending `steps.savedEvents = delSavedEvents.deletedCount ?? 0;` around line 230, followed by its closing `} catch` — place the new block after that whole try/catch), add a sibling step following the file's per-step try/catch pattern:

```ts
  // Received notifications are orphaned junk once the account tombstones;
  // the user's actorId in OTHERS' notifications stays and tombstones at
  // read time (read-time name join).
  try {
    const delNotifications = await db.collection('notifications').deleteMany({ userId });
    steps.notifications = delNotifications.deletedCount ?? 0;
  } catch (err) {
    fail('notifications', err);
  }
```

(`userId` is already the string form in this scope — same as the `savedPosts` deleteMany above it.)

- [ ] **Step 9: Verify**

Run: `pnpm type-check 2>&1 | grep -c "error"` → must equal Step 1 baseline.
Run: `pnpm build 2>&1 | tail -3` → green.

- [ ] **Step 10: Commit**

```bash
git add src/types/notification.ts src/lib/notifications.ts scripts/create-notification-indexes.ts src/pages/api/notifications/index.ts src/pages/api/notifications/read.ts src/lib/auth/accountDeletion.ts
git commit -m "feat: notifications data layer, API endpoints, indexes, deletion step"
```

---

### Task 2: Write hooks (4 emit points)

**Files:**
- Modify: `src/pages/api/comments/create.ts` (~lines 94–102, the approved-branch parent update)
- Modify: `src/lib/reviewAction.ts` (comment-approval branch ~line 112, and after the strike block ~line 183)
- Modify: `src/pages/api/admin/announcements/create.ts` (after `insertOne`, ~line 60)
- Modify: `src/pages/api/listings/[id]/contact.ts` (after the `contactsCol.insertOne`, ~line 236)

**Interfaces:**
- Consumes (from Task 1, exact signatures): `notify(input)`, `notifyAllMembers(input)`, `commentTarget(parentCollection, parentId, title)`, `moderationTarget(contentType, contentId, title)` — all from `src/lib/notifications.ts`. All calls are `await`ed but can never throw (never-throw contract lives inside the lib — do NOT wrap call sites in extra try/catch).
- Produces: notification docs for Task 4's browser verification.

- [ ] **Step 1: Hook — comment created & immediately approved**

In `src/pages/api/comments/create.ts`, add to the imports:

```ts
import { notify, commentTarget } from '../../../lib/notifications';
```

Then replace the approved-branch parent update (currently `const postsCollection = db.collection(parentCollection); await postsCollection.updateOne(...)` with the `$push`/`$set`) with a `findOneAndUpdate` that also returns the parent's author + title, followed by the notify:

```ts
      // Only add to parent's comments array if approved immediately.
      // findOneAndUpdate (not updateOne) so the parent's author + title come
      // back in the same round-trip for the notification below.
      const postsCollection = db.collection(parentCollection);
      const parentDoc = await postsCollection.findOneAndUpdate(
        { _id: new ObjectId(topicId) },
        {
          $push: { comments: result.insertedId } as any,
          $set: { updatedAt: new Date() }
        },
        { projection: { author: 1, title: 1 } }
      );

      if (parentDoc?.author) {
        await notify({
          userId: String(parentDoc.author),
          type: 'comment',
          actorId: userId,
          target: commentTarget(parentCollection, topicId, parentDoc.title ?? ''),
        });
      }
```

(The `as any` on `$push` only if the untyped collection generics complain — omit it if the existing code compiles without.)

- [ ] **Step 2: Hooks — review decisions (moderation notice + deferred comment notice)**

In `src/lib/reviewAction.ts`, add to the imports:

```ts
import { notify, commentTarget, moderationTarget } from './notifications';
```

**2a — deferred comment notification.** Inside the comment-APPROVED branch, the parent update currently ends with the `$addToSet` `updateOne` on `parentCollectionRef`. Replace that `updateOne` with `findOneAndUpdate` + notify:

```ts
          if (parentPostId && parentCollection) {
            const parentCollectionRef = db.collection(parentCollection);
            const parentDoc = await parentCollectionRef.findOneAndUpdate(
              { _id: new ObjectId(parentPostId) },
              {
                $addToSet: { comments: new ObjectId(flaggedContent.contentId) },
                $set: { updatedAt: new Date() }
              },
              { projection: { author: 1, title: 1 } }
            );

            // The comment just became visible — fire the "someone replied"
            // notification that create.ts skipped while it was pending.
            if (parentDoc?.author) {
              await notify({
                userId: String(parentDoc.author),
                type: 'comment',
                actorId: flaggedContent.authorId,
                target: commentTarget(parentCollection, parentPostId, parentDoc.title ?? ''),
              });
            }
          }
```

**2b — moderation decision to the content author.** At the end of `processReviewAction`, directly BEFORE the final `return { ... }`, add:

```ts
  // Notify the author of the decision — every reviewed item, including clean
  // approvals (silent rejection was the dark pattern this feature fixes; a
  // reviewed-and-approved reported item reads as "geprüft und freigegeben").
  if (flaggedContent.contentId && flaggedContent.contentType && flaggedContent.authorId) {
    const excerpt = (flaggedContent.title ?? flaggedContent.body ?? '').slice(0, 80);
    const flaggedAny = flaggedContent as any;
    // A moderated COMMENT deep-links to its parent post when we know it
    // (approve path stores parentPostId/parentCollection on the flagged
    // record); otherwise moderationTarget's fallback links to the forum.
    const target =
      flaggedContent.contentType === 'comment' && flaggedAny.parentPostId && flaggedAny.parentCollection
        ? commentTarget(flaggedAny.parentCollection, flaggedAny.parentPostId, excerpt)
        : moderationTarget(flaggedContent.contentType, flaggedContent.contentId, excerpt);
    await notify({
      userId: flaggedContent.authorId,
      type: 'moderation',
      target,
      meta: {
        outcome: isRejection ? 'rejected' : hasWarning ? 'warned' : 'approved',
        ...(isRejection ? { strike: true } : {}),
      },
    });
  }
```

(No `actorId` — the reviewer stays anonymous; every rejection increments strikes, hence `strike: true` on rejection.)

- [ ] **Step 3: Hook — official announcement broadcast**

In `src/pages/api/admin/announcements/create.ts`, add to the imports:

```ts
import { notifyAllMembers } from '../../../../lib/notifications';
```

After `const result = await announcementsCollection.insertOne(newAnnouncement);`, add:

```ts
    // Broadcast to every member (fan-out on write; excludes the posting
    // admin and anonymized accounts inside the helper).
    await notifyAllMembers({
      type: 'official',
      actorId: userId,
      target: {
        contentType: 'announcement',
        contentId: result.insertedId.toString(),
        title,
        href: `/announcements/${result.insertedId.toString()}`,
      },
    });
```

- [ ] **Step 4: Hook — marketplace contact**

In `src/pages/api/listings/[id]/contact.ts`, add to the imports:

```ts
import { notify } from '../../../../lib/notifications';
```

After the `await contactsCol.insertOne({ ... })` metadata write (and BEFORE the best-effort confirmation-email block), add:

```ts
    // In-app mirror of the owner email. No actorId — the buyer is anonymous
    // by design (metadata-only GDPR stance of listingContacts).
    await notify({
      userId: listing.sellerId.toString(),
      type: 'market_contact',
      target: {
        contentType: 'listing',
        contentId: id,
        title: listing.title ?? '',
        href: `/marketplace/${id}`,
      },
    });
```

- [ ] **Step 5: Verify**

Run: `pnpm type-check 2>&1 | grep -c "error"` → must equal Task 1 baseline.
Run: `pnpm build 2>&1 | tail -3` → green.

- [ ] **Step 6: Commit**

```bash
git add src/pages/api/comments/create.ts src/lib/reviewAction.ts src/pages/api/admin/announcements/create.ts src/pages/api/listings/\[id\]/contact.ts
git commit -m "feat: notification write hooks (comments, moderation, official broadcast, marketplace contact)"
```

---

### Task 3: Bell + panel UI

**Files:**
- Create: `src/components/forum/kiosk/NotificationBell.svelte`
- Create: `src/components/forum/kiosk/NotificationPanel.svelte`
- Modify: `src/components/forum/kiosk/KioskNav.svelte` (import, `bellOpen` state, header z class, mount in the right cluster)
- Modify: `src/lib/kiosk-i18n.ts` (keys in BOTH the DE and EN blocks)
- Modify: `src/styles/global.css` (new `.nc-*` block directly after the `.am-*` block)

**Interfaces:**
- Consumes: `GET /api/notifications` (`?count=1` → `{ unreadCount }`; full → `{ items: NotificationItem[], unreadCount }`), `POST /api/notifications/read`; `t`, `tStr` from `src/lib/kiosk-i18n`.
- Produces: nothing later tasks build on (Task 4 verifies in the browser).

- [ ] **Step 1: Add the i18n keys**

In `src/lib/kiosk-i18n.ts`, next to the existing `'nav.menu.*'` keys in the **DE** block (~line 82), add:

```ts
  'nav.bell.aria': 'Mitteilungen',
  'nc.title': 'MITTEILUNGEN',
  'nc.empty': 'Noch nichts — wenn im Kiez etwas für dich passiert, steht es hier.',
  'nc.error': 'Konnte nicht geladen werden.',
  'nc.tombstone': 'Ehemaliges Mitglied',
  'nc.row.comment': '{actor} hat auf „{title}" geantwortet',
  'nc.row.official': 'Offizielle Ankündigung: „{title}"',
  'nc.row.market_contact': 'Neue Anfrage zu deinem Inserat „{title}"',
  'nc.row.moderation.approved': 'Dein Beitrag „{title}" wurde geprüft und freigegeben',
  'nc.row.moderation.warned': 'Dein Beitrag „{title}" wurde freigegeben — mit einem Hinweis versehen',
  'nc.row.moderation.rejected': 'Dein Beitrag „{title}" wurde abgelehnt',
  'nc.row.moderation.rejectedStrike': 'Dein Beitrag „{title}" wurde abgelehnt — eine Verwarnung wurde vermerkt',
  'nc.time.now': 'jetzt',
  'nc.time.m': 'vor {n} Min.',
  'nc.time.h': 'vor {n} Std.',
  'nc.time.d': 'vor {n} Tg.',
```

And next to `'nav.menu.*'` in the **EN** block (~line 1869), add:

```ts
  'nav.bell.aria': 'Notifications',
  'nc.title': 'NOTIFICATIONS',
  'nc.empty': 'Nothing yet — when something happens for you in the Kiez, it shows up here.',
  'nc.error': 'Could not load.',
  'nc.tombstone': 'Former member',
  'nc.row.comment': '{actor} replied to "{title}"',
  'nc.row.official': 'Official announcement: "{title}"',
  'nc.row.market_contact': 'New inquiry about your listing "{title}"',
  'nc.row.moderation.approved': 'Your post "{title}" was reviewed and approved',
  'nc.row.moderation.warned': 'Your post "{title}" was approved — with a notice attached',
  'nc.row.moderation.rejected': 'Your post "{title}" was rejected',
  'nc.row.moderation.rejectedStrike': 'Your post "{title}" was rejected — a strike was recorded',
  'nc.time.now': 'now',
  'nc.time.m': '{n} min ago',
  'nc.time.h': '{n} h ago',
  'nc.time.d': '{n} d ago',
```

- [ ] **Step 2: Create `src/components/forum/kiosk/NotificationBell.svelte`**

```svelte
<script lang="ts">
  // Bell + unread badge in the kiosk nav's right cluster. Owns the 90s
  // count polling (visible tab only) and the panel open state. Mounted
  // only for logged-in users (KioskNav gates on user?.name).
  import { t } from '../../../lib/kiosk-i18n';
  import NotificationPanel from './NotificationPanel.svelte';

  let { onOpenChange = (_open: boolean) => {} } = $props<{
    onOpenChange?: (open: boolean) => void;
  }>();

  let unreadCount = $state(0);
  let open = $state(false);
  let bellEl = $state<HTMLElement | null>(null);

  async function refreshCount() {
    try {
      const r = await fetch('/api/notifications?count=1');
      if (!r.ok) return;
      const d = await r.json();
      unreadCount = d.unreadCount ?? 0;
    } catch {
      /* offline/transient — badge keeps its last value */
    }
  }

  $effect(() => {
    refreshCount();
    const onWake = () => {
      if (!document.hidden) refreshCount();
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    const id = setInterval(onWake, 90_000);
    return () => {
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      clearInterval(id);
    };
  });

  function toggle() {
    open = !open;
    onOpenChange(open);
  }
  function closePanel(restoreFocus: boolean) {
    open = false;
    onOpenChange(false);
    // Panel open marked everything read server-side — clear the badge
    // locally instead of waiting for the next poll.
    unreadCount = 0;
    if (restoreFocus) bellEl?.focus();
  }
</script>

<div class="relative">
  <button
    bind:this={bellEl}
    type="button"
    onclick={toggle}
    aria-haspopup="dialog"
    aria-expanded={open}
    aria-label={$t['nav.bell.aria']}
    class="relative w-9 h-9 rounded-full border-2 border-ink flex items-center justify-center bg-transparent text-ink hover:scale-105 transition-transform duration-[180ms] ease-out"
  >
    <svg viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M6 9a6 6 0 0 1 12 0c0 5 1.8 6.5 1.8 6.5H4.2S6 14 6 9" />
      <path d="M10.3 19.5a2 2 0 0 0 3.4 0" />
    </svg>
    {#if unreadCount > 0}
      <span class="nc-badge font-dmmono">{unreadCount > 9 ? '9+' : unreadCount}</span>
    {/if}
  </button>
  {#if open}
    <NotificationPanel onClose={closePanel} />
  {/if}
</div>

<!-- Styles live in src/styles/global.css (`.nc-*` block), NOT a component
     <style>: this component is reachable only through the KioskNav island —
     Astro's prod build would orphan scoped CSS (same rule as AvatarMenu). -->
```

- [ ] **Step 3: Create `src/components/forum/kiosk/NotificationPanel.svelte`**

```svelte
<script lang="ts">
  // Notification list panel — desktop dropdown / mobile bottom sheet.
  // Structural sibling of AvatarMenu.svelte: same close semantics (140ms
  // fade, instant under reduced motion), outside-click a tick late,
  // Escape, and the dual html+body scroll-lock on mobile.
  import { t, tStr } from '../../../lib/kiosk-i18n';
  import type { NotificationItem } from '../../../types/notification';

  let { onClose } = $props<{ onClose: (restoreFocus: boolean) => void }>();

  let items = $state<NotificationItem[] | null>(null);
  let failed = $state(false);
  // Ids that were unread at fetch time — POST /read marks them server-side,
  // but this session still renders them as fresh so nothing feels swallowed.
  let freshIds = $state<Set<string>>(new Set());

  $effect(() => {
    let alive = true;
    fetch('/api/notifications')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!alive) return;
        const list: NotificationItem[] = d.items ?? [];
        items = list;
        freshIds = new Set(list.filter((i) => !i.readAt).map((i) => i.id));
        if ((d.unreadCount ?? 0) > 0) {
          fetch('/api/notifications/read', { method: 'POST' }).catch(() => {});
        }
      })
      .catch(() => {
        if (alive) failed = true;
      });
    return () => {
      alive = false;
    };
  });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let closing = $state(false);
  let menuEl = $state<HTMLElement | null>(null);

  function close(fromEscape = false) {
    if (closing) return;
    const restoreFocus = fromEscape || (menuEl?.contains(document.activeElement) ?? false);
    if (reduced) {
      onClose(restoreFocus);
      return;
    }
    closing = true;
    setTimeout(() => onClose(restoreFocus), 140);
  }

  function onDocPointerDown(e: PointerEvent) {
    if (menuEl && !menuEl.contains(e.target as Node)) close();
  }
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    }
  }
  $effect(() => {
    // Listener a tick late so the opening click doesn't instantly close.
    const id = setTimeout(() => document.addEventListener('pointerdown', onDocPointerDown), 0);
    document.addEventListener('keydown', onKeydown);
    return () => {
      clearTimeout(id);
      document.removeEventListener('pointerdown', onDocPointerDown);
      document.removeEventListener('keydown', onKeydown);
    };
  });

  // Mobile bottom-sheet scroll-lock: must lock <html> too — global.css sets
  // `html { overflow-x: clip }` (sticky fix), which stops body overflow from
  // propagating to the viewport, so a body-only lock does nothing.
  $effect(() => {
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  });

  const ICON: Record<string, string> = {
    comment: '✎',
    moderation: '§',
    official: '◉',
    market_contact: '◈',
  };

  function rowText(it: NotificationItem): string {
    const title = it.target?.title || '…';
    const actor = it.actorName ?? $t['nc.tombstone'];
    switch (it.type) {
      case 'comment':
        return tStr($t['nc.row.comment'], { actor, title });
      case 'official':
        return tStr($t['nc.row.official'], { title });
      case 'market_contact':
        return tStr($t['nc.row.market_contact'], { title });
      case 'moderation': {
        const o = it.meta?.outcome;
        if (o === 'rejected') {
          return tStr(
            $t[it.meta?.strike ? 'nc.row.moderation.rejectedStrike' : 'nc.row.moderation.rejected'],
            { title },
          );
        }
        if (o === 'warned') return tStr($t['nc.row.moderation.warned'], { title });
        return tStr($t['nc.row.moderation.approved'], { title });
      }
      default:
        return title;
    }
  }

  function relTime(iso: string): string {
    const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
    if (mins < 1) return $t['nc.time.now'];
    if (mins < 60) return tStr($t['nc.time.m'], { n: String(mins) });
    const h = Math.round(mins / 60);
    if (h < 24) return tStr($t['nc.time.h'], { n: String(h) });
    return tStr($t['nc.time.d'], { n: String(Math.round(h / 24)) });
  }
</script>

<div class="nc-scrim" class:nc-closing={closing} aria-hidden="true"></div>
<div bind:this={menuEl} class="nc-menu" class:nc-closing={closing} role="dialog" aria-label={$t['nc.title']}>
  <div class="nc-caret"></div>
  <div class="nc-card">
    <div class="nc-head font-dmmono">{$t['nc.title']}</div>
    {#if failed}
      <div class="nc-empty font-instrument">{$t['nc.error']}</div>
    {:else if items === null}
      <div class="nc-empty font-instrument">…</div>
    {:else if items.length === 0}
      <div class="nc-empty font-instrument">{$t['nc.empty']}</div>
    {:else}
      <div class="nc-list">
        {#each items as it (it.id)}
          <a href={it.target?.href || '/'} class="nc-row" class:nc-fresh={freshIds.has(it.id)}>
            <span class="nc-icon font-dmmono" aria-hidden="true">{ICON[it.type] ?? '•'}</span>
            <span class="nc-text font-bricolage">{rowText(it)}</span>
            <span class="nc-time font-dmmono">{relTime(it.createdAt)}</span>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Styles live in src/styles/global.css (`.nc-*` block) — nested-island
     CSS orphan rule, same as AvatarMenu. -->
```

(`tStr` interpolation note: if `tStr` in `kiosk-i18n.ts` replaces only the first occurrence per key, that's fine here — each placeholder appears once per string. Check its implementation only if output looks wrong.)

- [ ] **Step 4: Mount in `KioskNav.svelte`**

Three edits:

1. Import (next to the AvatarMenu import):
```ts
  import NotificationBell from './NotificationBell.svelte';
```

2. State + header class. Add below `let menuOpen = $state(false);`:
```ts
  let bellOpen = $state(false);
```
and change the header's class from `{menuOpen ? 'z-50' : 'z-40'}` to:
```svelte
<header class="sticky top-0 {menuOpen || bellOpen ? 'z-50' : 'z-40'} border-b-2 border-ink k-paper-bg">
```

3. Mount the bell inside the existing `{#if user?.name}` block, directly BEFORE the `<div class="relative">` that wraps the avatar:
```svelte
        <NotificationBell onOpenChange={(o: boolean) => (bellOpen = o)} />
```

(No mutual-exclusion wiring needed: opening one overlay is an outside-pointerdown for the other, which closes it — both use the same click-outside pattern.)

- [ ] **Step 5: Add the `.nc-*` CSS block to `src/styles/global.css`**

Insert directly AFTER the `.am-*` block's closing reduced-motion rules (after the `@media (prefers-reduced-motion: reduce) { .am-menu ... }` block, ~line 899):

```css
/* ─── Notification bell + panel (KioskNav) ─────────────────────────────
   Same escape hatch as .am-*: NotificationBell/NotificationPanel are
   reachable only through the KioskNav island, so component <style> would
   be orphaned in prod builds. Structure mirrors the avatar menu. */
.nc-badge {
  position: absolute; top: -4px; right: -4px;
  min-width: 16px; height: 16px; padding: 0 3px;
  border-radius: 9999px; background: var(--k-wine); color: var(--k-paper);
  font-size: 9px; font-weight: 700; line-height: 13px; text-align: center;
  border: 1.5px solid var(--k-paper);
}
.nc-menu {
  position: absolute; top: calc(100% + 10px); right: 0; width: 300px; z-index: 50;
  transform-origin: top right;
  animation: amStampIn 220ms cubic-bezier(0.2, 0.7, 0.3, 1);
}
.nc-menu.nc-closing { animation: none; transition: opacity 140ms cubic-bezier(0.4, 0, 0.2, 1); opacity: 0; }
.nc-caret {
  position: absolute; top: -7px; right: 16px; width: 12px; height: 12px;
  background: var(--k-paper); border: 1.5px solid var(--k-ink);
  border-right: none; border-bottom: none; transform: rotate(45deg);
}
.nc-card {
  background: var(--k-paper); border: 1.5px solid var(--k-ink);
  border-radius: var(--k-radius-md); box-shadow: 3px 3px 0 var(--k-ink);
  overflow: hidden; position: relative;
}
.nc-head {
  padding: 10px 14px; border-bottom: 1.5px solid var(--k-ink);
  background: var(--k-paper-warm); font-size: 10px; font-weight: 700;
  letter-spacing: 0.14em; color: var(--k-ink);
}
.nc-list { max-height: 60vh; overflow-y: auto; }
.nc-empty { padding: 18px 14px; font-size: 13px; font-style: italic; color: var(--k-ink-mute); }
.nc-row {
  display: flex; align-items: baseline; gap: 8px;
  padding: 10px 14px; text-decoration: none; cursor: pointer;
  border-bottom: 1px dashed var(--k-rule);
}
.nc-row:last-child { border-bottom: none; }
.nc-row:hover, .nc-row:focus-visible { background: var(--k-paper-soft); outline: none; }
.nc-row.nc-fresh { border-left: 3px solid var(--k-wine); padding-left: 11px; }
.nc-icon { font-size: 12px; color: var(--k-ink-mute); flex-shrink: 0; }
.nc-text { font-size: 12.5px; font-weight: 500; line-height: 1.4; color: var(--k-ink); flex: 1; }
.nc-time { font-size: 9px; color: var(--k-ink-mute); letter-spacing: 0.06em; flex-shrink: 0; }

/* Scrim behind the mobile bottom sheet (hidden on desktop — dropdown has
   no scrim by design, matching the avatar menu). */
.nc-scrim { display: none; }
@media (max-width: 1023px) {
  .nc-scrim {
    display: block; position: fixed; inset: 0; z-index: 49;
    background: rgba(27, 26, 23, 0.45);
    animation: amScrimIn 180ms ease-out;
  }
  .nc-scrim.nc-closing { animation: none; transition: opacity 140ms ease-out; opacity: 0; }

  /* Bottom sheet: same DOM as the dropdown, repositioned. */
  .nc-menu {
    position: fixed; top: auto; right: 0; bottom: 0; left: 0; width: auto;
    transform-origin: bottom center;
    animation: amSheetIn 220ms cubic-bezier(0.2, 0.7, 0.3, 1);
  }
  .nc-caret { display: none; }
  .nc-card {
    border-radius: var(--k-radius-md) var(--k-radius-md) 0 0;
    border-bottom: none; box-shadow: 0 -3px 0 var(--k-ink);
    max-height: 80vh; overflow-y: auto;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    max-width: 28rem; margin-inline: auto;
  }
  .nc-list { max-height: none; }
  .nc-row { min-height: 44px; }
}

/* MUST stay AFTER the max-width:1023px block above and remain the LAST
   .nc-* animation/transition rules in this file — media queries add no
   specificity, so source order is the ONLY thing letting `none` beat the
   mobile `animation: amSheetIn`. Reordering silently re-enables motion
   for prefers-reduced-motion users. */
@media (prefers-reduced-motion: reduce) {
  .nc-menu { animation: none; }
  .nc-menu.nc-closing { transition: none; }
  .nc-scrim { animation: none; }
  .nc-scrim.nc-closing { transition: none; }
}
```

(The keyframes `amStampIn`, `amSheetIn`, `amScrimIn` are reused from the `.am-*` block — do not redefine them.)

- [ ] **Step 6: Verify**

Run: `pnpm type-check 2>&1 | grep -c "error"` → must equal Task 1 baseline.
Run: `pnpm build 2>&1 | tail -3` → green.
Run the nested-island manifest check on the two new components (they must have NO `<style>` blocks — confirm none were added): `grep -c "<style" src/components/forum/kiosk/NotificationBell.svelte src/components/forum/kiosk/NotificationPanel.svelte` → both `0`.

- [ ] **Step 7: Commit**

```bash
git add src/components/forum/kiosk/NotificationBell.svelte src/components/forum/kiosk/NotificationPanel.svelte src/components/forum/kiosk/KioskNav.svelte src/lib/kiosk-i18n.ts src/styles/global.css
git commit -m "feat: notification bell + panel in kiosk nav"
```

---

### Task 4: Browser verification + docs

**Files:**
- Modify: `src/components/forum/kiosk/CLAUDE.md` (new "Notification bell + panel" section)
- Modify: `CLAUDE.md` (root — add the `notifications` collection to the Database Collections list)

**Interfaces:**
- Consumes: Tasks 1–3 shipped behavior; the seeded dev DB (`mahalle-dev`).

- [ ] **Step 1: Reseed the dev DB and capture credentials**

Run: `npx tsx scripts/seed-dev-db.ts` — it targets `mahalle-dev` (interlock refuses non-dev DB names) and PRINTS the fresh password for the seeded accounts (`admin@mahalle-dev.test`, `ayse@mahalle-dev.test`, `jonas@mahalle-dev.test`). Note the password; do NOT write it into any committed file.

- [ ] **Step 2: Start a throwaway dev server**

`ss -tlnp | grep 4655` (must be free) → `pnpm dev --port 4655` in background → poll `curl -s -o /dev/null -w "%{http_code}" http://localhost:4655/ --max-time 5` until 200 (first compile can take ~30s).

- [ ] **Step 3: End-to-end comment notification (desktop 1280×800)**

playwright-cli flow:
1. Open `http://localhost:4655/login`, log in as `ayse@mahalle-dev.test`.
2. Open a forum topic authored by `admin` (seeded data has admin-authored topics; pick one on `/`), post a comment ("Schöner Beitrag!").
3. Log out (avatar menu → Abmelden), log in as `admin@mahalle-dev.test`.
4. Expect: bell in the nav shows a badge (≥1). Click the bell → panel opens with a row "Ayşe … hat auf „<topic title>" geantwortet" + relative time. (If moderation flagged the comment as pending, it notifies only after review — post a blander comment or approve it via `/admin/moderation`, then recheck.)
5. Click elsewhere (outside-click closes), reopen → badge is gone (marked read), row no longer shows the fresh left-border.
6. Click the row → navigates to the topic detail page.

- [ ] **Step 4: Broadcast + badge polling check**

Still as admin: go to `/admin/announcements`, publish a short official announcement. Log out, log in as `ayse@mahalle-dev.test`: bell badge ≥1, panel shows "Offizielle Ankündigung: „<title>"", row links to `/announcements/<id>`. Confirm admin's own panel does NOT contain the broadcast (actor excluded).

- [ ] **Step 5: Mobile sheet spot-check (390×844)**

As ayse with the panel open: sheet rises from the bottom, scrim covers the page, bottom nav is covered/darkened (not tappable above the scrim), page behind does not scroll while open (actually attempt to scroll — scrollY must not move), body scroll restores on close. Toggle EN via the locale pill: panel copy switches ("Official announcement: …").

- [ ] **Step 6: Teardown**

`playwright-cli close` and kill the dev server (`pkill -f "astro dev --port 4655"`; if the process survives — the pattern has missed `astro.js` cmdlines before — find the PID via `ss -tlnp | grep 4655` and kill it directly). Confirm port 4655 is free.

- [ ] **Step 7: Update docs**

1. Root `CLAUDE.md`, Database Collections list — add after the `savedPosts` entry:
```markdown
- `notifications` - In-app notification center docs, one per recipient per event (`{ userId, type: 'comment'|'moderation'|'official'|'market_contact', actorId?, target: { contentType, contentId, title, href }, meta?, createdAt, readAt }`). Fan-out on write (broadcasts insertMany one doc per member); actor names are a read-time join, never stored; no rendered copy stored (client renders DE/EN from kiosk-i18n by type). Real Mongo TTL index on `createdAt` (90d) + `{userId, createdAt}` compound (`scripts/create-notification-indexes.ts`). Write helpers in `src/lib/notifications.ts` are never-throw (Sentry capture + flush). See `src/components/forum/kiosk/CLAUDE.md` "Notification bell + panel".
```
2. `src/components/forum/kiosk/CLAUDE.md` — add a "### Notification bell + panel" section after the avatar-menu section covering: bell in KioskNav's right cluster (logged-in only) with 90s visible-tab count polling (`?count=1`); panel = structural sibling of AvatarMenu (same close semantics, outside-click a tick late, Escape, dual html+body scroll-lock on mobile, header z-50 bump via `bellOpen`, styles in `global.css` `.nc-*` — orphan rule); open marks all read (`POST /api/notifications/read`) while `freshIds` keeps this session's unread rows visually fresh; mutual exclusion with the avatar menu is free via each other's outside-click handlers; copy rendered client-side from `nc.*` i18n keys so the locale toggle works retroactively; write side + hooks documented in root CLAUDE.md + spec (`docs/superpowers/specs/2026-08-18-notification-center-design.md`).

- [ ] **Step 8: Commit**

```bash
git add CLAUDE.md src/components/forum/kiosk/CLAUDE.md
git commit -m "docs: notification center (collection entry + kiosk bell/panel notes)"
```
