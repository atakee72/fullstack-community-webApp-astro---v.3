# On-Demand Content Translation ("Übersetzung anzeigen") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Facebook-style "Übersetzung anzeigen" control on content detail views that translates user content into the reader's language via DeepL, with a Mongo cache keyed by content hash.

**Architecture:** Server-authoritative: `POST /api/translate` receives `{contentType, contentId, targetLang}`, loads the content from Mongo itself, enforces the same visibility rules the detail views use, then returns a cached or fresh DeepL translation of title+body. The client never sends text to be translated (that would be an open DeepL proxy). A shared Svelte control + tiny client lib wire into the four existing detail surfaces; the original text stays primary and the translation is an explicit, labeled, reversible swap.

**Tech Stack:** DeepL REST API v2 (free tier host `api-free.deepl.com`), MongoDB cache collection `translationCache` (90d TTL), existing `rateLimits` fixed-window helper, Svelte 5 kiosk islands, kiosk-i18n.

**Spec:** No standalone spec — the agreed sketch lives in project memory (`project_open_followups.md`, "QUEUED FEATURE: on-demand content translation", user-agreed 2026-08-25) and is restated in full by this header + Global Constraints.

## Global Constraints

- **Never translate client-supplied text.** The API accepts only `contentType + contentId + targetLang`; text always comes from the DB after a visibility check.
- **Visibility parity:** a user may translate exactly what they may read: content whose `moderationStatus` is `'approved'` or absent, or content they authored. No existence oracle: every not-visible case returns 404 (same body as not-found).
- **Provider is DeepL only** (user decision; no OpenAI fallback in v1). `DEEPL_API_KEY` unset ⇒ endpoint returns 503 `translate_unavailable`; the UI shows an error toast. No dev mock.
- **Fail-soft UI:** translation failure never breaks the reading experience — the original stays rendered; errors surface as a toast/inline note only.
- **Env var:** `DEEPL_API_KEY` (server-only secret — never `PUBLIC_`-prefixed, never in client bundles, never committed). Keys ending `:fx` are free-tier and must call `https://api-free.deepl.com`; all others `https://api.deepl.com`.
- **External calls carry a 10s timeout** (project rule from the mailer/push incidents — a bare fetch would hold the serverless function open).
- **Rate limit:** 30 translations per rolling hour per user via the existing `consumeRateLimit` (`src/lib/auth/rateLimit.ts`), baseKey `tr:<userId>`.
- **Size cap:** title+body over 6000 chars ⇒ 422 `too_long` (protects the 500k chars/month free quota).
- **Dependency purity:** anything imported by Svelte islands must not transitively import `mongodb`/server modules (project gotcha "Server-only modules bleeding into client bundles"). Client code imports ONLY `src/lib/translation/client.ts`.
- **Nested-island CSS gotcha:** `TranslateControl.svelte` is imported only by other islands, so its styles go in `src/styles/global.css` under a namespaced `.ktr-*` prefix — NOT a scoped `<style>` block (prod build would orphan it).
- **Commits:** simple concise messages, no "Generated with Claude Code" signature, no Co-Authored-By footer. Never stage secrets.
- **Type/svelte budgets:** CI gates tsc ≤27 errors, svelte-check ≤94 — do not add new errors.
- **Testing:** server modules get `tsx` sanity scripts under `scripts/tmp-*` (run then delete before commit, or keep out of git); UI changes get a browser gate (playwright-cli against the dev server — NEVER snapshot a filled password field).
- **A parallel session works in a worktree on `feat/kiez-verification`.** This plan must not touch: `src/lib/profile/profileQuery.ts`, `src/lib/profile/publicProfile.ts`, `src/pages/api/auth/register.ts`, anything under `src/pages/admin/` or `src/pages/api/admin/`.
- **Task ordering (merge-conflict mitigation):** `ForumPostDetail.svelte`'s title render (~555-559) is directly adjacent to the byline hunk (~561-597) the verification branch is editing. Execute in order **1 → 2 → 3 → 4 → 6 → 5 → 7**: Task 5 runs LAST among code tasks, and if `feat/kiez-verification` has merged to main by then, rebase/merge main into this branch BEFORE starting Task 5.

---

### Task 1: DeepL client module (server)

**Files:**
- Create: `src/lib/translation/deepl.ts`
- Test: `scripts/tmp-test-deepl.ts` (throwaway, not committed)

**Interfaces:**
- Consumes: nothing (pure fetch + env).
- Produces: `translateTexts(texts: string[], targetLang: string): Promise<{ texts: string[]; detectedSource: string | null }>` — throws `DeepLError` with `.code: 'unavailable' | 'quota' | 'bad_lang' | 'upstream'`. Also `deeplTargetFor(lang: string): string | null` and `ALLOWED_TARGET_LANGS: readonly string[]`.

- [ ] **Step 1: Write the module**

```typescript
// src/lib/translation/deepl.ts
// SERVER-ONLY: calls the DeepL REST API. Never import from client code.

export const ALLOWED_TARGET_LANGS = [
  'de', 'en', 'tr', 'pl', 'ru', 'uk', 'ar', 'fr', 'es', 'it', 'ro', 'bg', 'el', 'nl', 'pt',
] as const;

const DEEPL_TARGET_MAP: Record<string, string> = {
  en: 'EN-US',
  pt: 'PT-PT',
};

export class DeepLError extends Error {
  code: 'unavailable' | 'quota' | 'bad_lang' | 'upstream';
  constructor(code: DeepLError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

/** Lowercase primary-subtag → DeepL target code, or null if unsupported. */
export function deeplTargetFor(lang: string): string | null {
  const primary = lang.trim().toLowerCase().split('-')[0];
  if (!(ALLOWED_TARGET_LANGS as readonly string[]).includes(primary)) return null;
  return DEEPL_TARGET_MAP[primary] ?? primary.toUpperCase();
}

export async function translateTexts(
  texts: string[],
  targetLang: string
): Promise<{ texts: string[]; detectedSource: string | null }> {
  const apiKey = import.meta.env.DEEPL_API_KEY;
  if (!apiKey) throw new DeepLError('unavailable', 'DEEPL_API_KEY not configured');

  const target = deeplTargetFor(targetLang);
  if (!target) throw new DeepLError('bad_lang', `Unsupported target language: ${targetLang}`);

  const host = apiKey.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(`${host}/v2/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: texts, target_lang: target }),
      signal: controller.signal,
    });
  } catch (e) {
    throw new DeepLError('upstream', `DeepL request failed: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 456) throw new DeepLError('quota', 'DeepL quota exceeded');
  if (res.status === 429) throw new DeepLError('upstream', 'DeepL rate-limited');
  if (!res.ok) throw new DeepLError('upstream', `DeepL HTTP ${res.status}`);

  const data = (await res.json()) as {
    translations?: { detected_source_language?: string; text?: string }[];
  };
  const translations = data.translations ?? [];
  if (translations.length !== texts.length) {
    throw new DeepLError('upstream', `DeepL returned ${translations.length} of ${texts.length} texts`);
  }
  return {
    texts: translations.map((t) => t.text ?? ''),
    detectedSource: translations[0]?.detected_source_language?.toLowerCase() ?? null,
  };
}
```

- [ ] **Step 2: Sanity-test with a stubbed fetch**

Write `scripts/tmp-test-deepl.ts`:

```typescript
// throwaway sanity script — DO NOT COMMIT
import { deeplTargetFor, translateTexts, DeepLError } from '../src/lib/translation/deepl';

// deeplTargetFor mapping
const cases: [string, string | null][] = [
  ['de', 'DE'], ['en', 'EN-US'], ['en-GB', 'EN-US'], ['tr', 'TR'],
  ['pt-BR', 'PT-PT'], ['ja', null], ['', null], ['DE-de', 'DE'],
];
for (const [input, expected] of cases) {
  const got = deeplTargetFor(input);
  if (got !== expected) throw new Error(`deeplTargetFor(${input}) = ${got}, expected ${expected}`);
}

// translateTexts against a stubbed fetch
(globalThis as any).fetch = async (url: string, init: any) => {
  const body = JSON.parse(init.body);
  if (body.target_lang !== 'EN-US') throw new Error(`wrong target: ${body.target_lang}`);
  return new Response(
    JSON.stringify({
      translations: body.text.map((t: string) => ({ detected_source_language: 'DE', text: `<${t}>` })),
    }),
    { status: 200 }
  );
};
process.env.DEEPL_API_KEY = 'dummy:fx';
// NOTE: import.meta.env in tsx reads process.env via Vite define — if import.meta.env
// is empty under tsx, temporarily verify via the endpoint task instead; the mapping
// tests above are the load-bearing part.
const out = await translateTexts(['Hallo', 'Welt'], 'en').catch((e: DeepLError) => e);
console.log('RESULT', out);
console.log('ALL PASS');
```

Run: `pnpm tsx scripts/tmp-test-deepl.ts`
Expected: `ALL PASS` (or, if `import.meta.env` is inert under tsx, all `deeplTargetFor` cases pass and `translateTexts` returns an `unavailable` DeepLError — acceptable; the fetch path is covered by Task 3's endpoint test).

- [ ] **Step 3: Type-check**

Run: `pnpm type-check 2>&1 | tail -3`
Expected: error count ≤ the current baseline (27); no NEW errors mentioning `translation/`.

- [ ] **Step 4: Delete the tmp script, commit**

```bash
rm scripts/tmp-test-deepl.ts
git add src/lib/translation/deepl.ts
git commit -m "feat: DeepL client module for content translation"
```

---

### Task 2: Translation service — content loading, visibility, cache

**Files:**
- Create: `src/lib/translation/translateContent.ts`
- Create: `scripts/create-translation-indexes.ts`
- Test: `scripts/tmp-test-translate-content.ts` (throwaway, not committed)

**Interfaces:**
- Consumes: `translateTexts`, `deeplTargetFor`, `DeepLError` from Task 1; `connectDB` from `src/lib/mongodb.ts`.
- Produces:
  ```typescript
  type TranslateOutcome =
    | { status: 'ok'; title: string | null; body: string; detectedSource: string | null; cached: boolean }
    | { status: 'not_found' }        // missing, not visible, or empty body — same response, no oracle
    | { status: 'bad_lang' }
    | { status: 'too_long' }
    | { status: 'unavailable' }      // no key / quota / upstream failure
  translateContent(input: { contentType: TranslatableType; contentId: string; targetLang: string; userId: string }): Promise<TranslateOutcome>
  type TranslatableType = 'topic' | 'announcement' | 'recommendation' | 'comment' | 'event' | 'listing'
  TRANSLATABLE_TYPES: readonly TranslatableType[]
  ```

- [ ] **Step 1: Write the service**

```typescript
// src/lib/translation/translateContent.ts
// SERVER-ONLY: loads content, enforces visibility, returns cached or fresh translation.
import { createHash } from 'crypto';
import { ObjectId } from 'mongodb';
import { connectDB } from '../mongodb';
import { translateTexts, deeplTargetFor, DeepLError } from './deepl';

export const TRANSLATABLE_TYPES = [
  'topic', 'announcement', 'recommendation', 'comment', 'event', 'listing',
] as const;
export type TranslatableType = (typeof TRANSLATABLE_TYPES)[number];

const COLLECTION_FOR: Record<TranslatableType, string> = {
  topic: 'topics',
  announcement: 'announcements',
  recommendation: 'recommendations',
  comment: 'comments',
  event: 'events',
  listing: 'listings',
};

const MAX_CHARS = 6000;
const CACHE_COLLECTION = 'translationCache';

export type TranslateOutcome =
  | { status: 'ok'; title: string | null; body: string; detectedSource: string | null; cached: boolean }
  | { status: 'not_found' }
  | { status: 'bad_lang' }
  | { status: 'too_long' }
  | { status: 'unavailable' };

/** Author id fields differ per collection (VERIFIED in the create endpoints):
 *  topics/announcements/recommendations/events/comments store `author` (userId string),
 *  listings store `sellerId`. Tolerate string/ObjectId forms. */
function isAuthor(doc: any, userId: string): boolean {
  const candidates = [doc.author, doc.sellerId];
  return candidates.some((c) => c != null && String(c) === userId);
}

function isVisibleTo(doc: any, contentType: TranslatableType, userId: string): boolean {
  const approved = doc.moderationStatus === 'approved' || doc.moderationStatus == null;
  if (contentType === 'listing') {
    // Mirror marketplace detail visibility: publicly listed states, or the owner.
    const publicStatus = doc.status == null || doc.status === 'active' || doc.status === 'reserved';
    return (approved && publicStatus) || isAuthor(doc, userId);
  }
  return approved || isAuthor(doc, userId);
}

function extractFields(doc: any, contentType: TranslatableType): { title: string | null; body: string } {
  if (contentType === 'comment') {
    return { title: null, body: String(doc.body ?? doc.content ?? '') };
  }
  const title = typeof doc.title === 'string' ? doc.title : null;
  const body = String(doc.body ?? doc.content ?? doc.description ?? '');
  return { title, body };
}

export async function translateContent(input: {
  contentType: TranslatableType;
  contentId: string;
  targetLang: string;
  userId: string;
}): Promise<TranslateOutcome> {
  const { contentType, contentId, targetLang, userId } = input;

  const target = deeplTargetFor(targetLang);
  if (!target) return { status: 'bad_lang' };
  const normLang = targetLang.trim().toLowerCase().split('-')[0];

  if (!ObjectId.isValid(contentId)) return { status: 'not_found' };

  const db = await connectDB();
  const doc = await db
    .collection(COLLECTION_FOR[contentType])
    .findOne(
      { _id: new ObjectId(contentId) },
      { projection: { title: 1, body: 1, content: 1, description: 1, moderationStatus: 1, status: 1, author: 1, sellerId: 1 } }
    );
  if (!doc || !isVisibleTo(doc, contentType, userId)) return { status: 'not_found' };

  const { title, body } = extractFields(doc, contentType);
  if (!body.trim() && !title?.trim()) return { status: 'not_found' };
  if ((title?.length ?? 0) + body.length > MAX_CHARS) return { status: 'too_long' };

  const contentHash = createHash('sha256')
    .update(`${title ?? ''}\n${body}`)
    .digest('hex')
    .slice(0, 32);
  const cacheKey = `${contentType}:${contentId}:${normLang}:${contentHash}`;

  const cacheCol = db.collection(CACHE_COLLECTION);
  const hit = await cacheCol.findOne({ key: cacheKey });
  if (hit) {
    return {
      status: 'ok',
      title: (hit.title as string | null) ?? null,
      body: hit.body as string,
      detectedSource: (hit.detectedSource as string | null) ?? null,
      cached: true,
    };
  }

  const texts = title != null ? [title, body] : [body];
  let result: Awaited<ReturnType<typeof translateTexts>>;
  try {
    result = await translateTexts(texts, normLang);
  } catch (e) {
    if (e instanceof DeepLError && e.code === 'bad_lang') return { status: 'bad_lang' };
    return { status: 'unavailable' };
  }

  const trTitle = title != null ? result.texts[0] : null;
  const trBody = title != null ? result.texts[1] : result.texts[0];

  // Upsert (not insert): two concurrent misses on the same key must not throw
  // on the unique index — last write wins, both translated the same input.
  await cacheCol.updateOne(
    { key: cacheKey },
    {
      $set: {
        key: cacheKey,
        contentType,
        contentId,
        targetLang: normLang,
        contentHash,
        title: trTitle,
        body: trBody,
        detectedSource: result.detectedSource,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  return { status: 'ok', title: trTitle, body: trBody, detectedSource: result.detectedSource, cached: false };
}
```

- [ ] **Step 2: Write the index script**

```typescript
// scripts/create-translation-indexes.ts
// Idempotent: ensures translationCache indexes. Run once per environment:
//   MONGODB_URI="..." pnpm tsx scripts/create-translation-indexes.ts
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

const NINETY_DAYS_S = 90 * 24 * 60 * 60;

async function main() {
  const client = new MongoClient(uri!);
  await client.connect();
  const db = client.db();
  console.log(`DB: ${db.databaseName}`);
  const col = db.collection('translationCache');

  await col.createIndex({ key: 1 }, { unique: true, name: 'translationCache_key_unique' });
  console.log('ensured translationCache_key_unique');

  await col.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: NINETY_DAYS_S, name: 'translationCache_createdAt_ttl' }
  );
  console.log('ensured translationCache_createdAt_ttl (90d)');

  const indexes = await col.indexes();
  console.log(JSON.stringify(indexes, null, 2));
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 3: Run the index script against dev**

Run: `pnpm tsx scripts/create-translation-indexes.ts`
Expected: prints `DB: mahalle-dev`, both `ensured …` lines, and an index listing containing `translationCache_key_unique` and `translationCache_createdAt_ttl` with `expireAfterSeconds: 7776000`.

- [ ] **Step 4: Sanity-test visibility + hashing against dev DB**

Write `scripts/tmp-test-translate-content.ts` (throwaway):

```typescript
// throwaway — DO NOT COMMIT. Exercises everything except the real DeepL call.
import 'dotenv/config';
import { connectDB } from '../src/lib/mongodb';
import { translateContent } from '../src/lib/translation/translateContent';

const db = await connectDB();
console.log('DB:', db.databaseName); // must be mahalle-dev

// 1. bad ObjectId → not_found
console.log('bad id:', (await translateContent({ contentType: 'topic', contentId: 'nope', targetLang: 'en', userId: 'x' })).status); // not_found

// 2. bad lang → bad_lang
const anyTopic = await db.collection('topics').findOne({}, { projection: { _id: 1 } });
console.log('bad lang:', (await translateContent({ contentType: 'topic', contentId: String(anyTopic!._id), targetLang: 'ja', userId: 'x' })).status); // bad_lang

// 3. approved topic + valid lang, NO DEEPL KEY in dev .env yet → unavailable
//    (if the key IS set, expect status ok with cached:false, then run again → cached:true)
const approved = await db.collection('topics').findOne(
  { $or: [{ moderationStatus: 'approved' }, { moderationStatus: { $exists: false } }] },
  { projection: { _id: 1 } }
);
const r1 = await translateContent({ contentType: 'topic', contentId: String(approved!._id), targetLang: 'en', userId: 'x' });
console.log('approved topic:', r1.status, 'cached' in r1 ? `cached=${r1.cached}` : '');

// 4. rejected content invisible to a stranger → not_found
const rejected = await db.collection('topics').findOne({ moderationStatus: 'rejected' }, { projection: { _id: 1 } });
if (rejected) {
  console.log('rejected topic:', (await translateContent({ contentType: 'topic', contentId: String(rejected._id), targetLang: 'en', userId: 'nobody' })).status); // not_found
} else {
  console.log('rejected topic: (none in dev DB — skipped)');
}
process.exit(0);
```

Run: `pnpm tsx scripts/tmp-test-translate-content.ts`
Expected: `DB: mahalle-dev`; `not_found`, `bad_lang`, then `unavailable` (no key) or `ok cached=false` → rerun → `ok cached=true` (key present); `not_found` for the rejected doc.

- [ ] **Step 5: Type-check, delete tmp script, commit**

Run: `pnpm type-check 2>&1 | tail -3` — no new errors.

```bash
rm scripts/tmp-test-translate-content.ts
git add src/lib/translation/translateContent.ts scripts/create-translation-indexes.ts
git commit -m "feat: translation service with visibility gate and Mongo cache"
```

---

### Task 3: `POST /api/translate` endpoint

**Files:**
- Create: `src/schemas/translate.schema.ts`
- Create: `src/pages/api/translate.ts`

**Interfaces:**
- Consumes: `translateContent`, `TRANSLATABLE_TYPES` (Task 2); `getSession` from `auth-astro/server`; `consumeRateLimit` from `src/lib/auth/rateLimit.ts`.
- Produces: HTTP contract used by Task 4's client:
  - 200 `{ title: string | null, body: string, detectedSource: string | null, cached: boolean }`
  - 400 `{ error: 'invalid_request' }` · 401 `{ error: 'Unauthorized' }` · 404 `{ error: 'not_found' }`
  - 422 `{ error: 'too_long' }` · 429 `{ error: 'rate_limited' }` · 503 `{ error: 'translate_unavailable' }`

- [ ] **Step 1: Write the zod schema**

```typescript
// src/schemas/translate.schema.ts
// SERVER-ONLY: transitively imports mongodb via translateContent — never
// import this from a Svelte island or any client:* component.
import { z } from 'zod';
import { TRANSLATABLE_TYPES } from '../lib/translation/translateContent';

export const TranslateRequestSchema = z.object({
  contentType: z.enum(TRANSLATABLE_TYPES),
  contentId: z.string().regex(/^[0-9a-f]{24}$/i),
  targetLang: z.string().min(2).max(12),
});
```

- [ ] **Step 2: Write the endpoint**

```typescript
// src/pages/api/translate.ts
import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { translateContent } from '../../lib/translation/translateContent';
import { TranslateRequestSchema } from '../../schemas/translate.schema';
import { consumeRateLimit } from '../../lib/auth/rateLimit';

export const prerender = false;

const TRANSLATE_MAX_PER_HOUR = 30;
const HOUR_MS = 60 * 60 * 1000;

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  const userId = session?.user?.id;
  if (!userId) return json(401, { error: 'Unauthorized' });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json(400, { error: 'invalid_request' });
  }
  const parsed = TranslateRequestSchema.safeParse(raw);
  if (!parsed.success) return json(400, { error: 'invalid_request' });

  const rl = await consumeRateLimit(`tr:${userId}`, TRANSLATE_MAX_PER_HOUR, HOUR_MS);
  if (rl.limited) return json(429, { error: 'rate_limited' });

  const outcome = await translateContent({ ...parsed.data, userId });
  switch (outcome.status) {
    case 'ok':
      return json(200, {
        title: outcome.title,
        body: outcome.body,
        detectedSource: outcome.detectedSource,
        cached: outcome.cached,
      });
    case 'not_found':
      return json(404, { error: 'not_found' });
    case 'bad_lang':
      return json(400, { error: 'invalid_request' });
    case 'too_long':
      return json(422, { error: 'too_long' });
    case 'unavailable':
      return json(503, { error: 'translate_unavailable' });
  }
};
```

- [ ] **Step 3: Endpoint smoke over HTTP**

The dev server may already be running on port 3000 (curl it first; only start one on another port if it isn't). Unauthenticated:

Run: `curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/translate -H 'Content-Type: application/json' -d '{"contentType":"topic","contentId":"000000000000000000000000","targetLang":"en"}'`
Expected: `401`

Authenticated (playwright-cli page-context fetch, the established recipe — login per `reference_playwright_auth`, then run in page context):

```javascript
const r = await fetch('/api/translate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contentType: 'topic', contentId: '<real approved topic id>', targetLang: 'en' }),
});
document.title = `${r.status}:` + JSON.stringify(await r.json()).slice(0, 120);
```

Expected: `503:{"error":"translate_unavailable"}` without a DeepL key, or `200:{"title":…` with one. Also send `contentId: "zzz"` → expect `400`, and a rejected/other-user-draft id → `404`.

- [ ] **Step 4: Type-check + commit**

Run: `pnpm type-check 2>&1 | tail -3` — no new errors.

```bash
git add src/schemas/translate.schema.ts src/pages/api/translate.ts
git commit -m "feat: session-gated POST /api/translate endpoint"
```

---

### Task 4: Client lib + TranslateControl component + i18n + CSS

**Files:**
- Create: `src/lib/translation/client.ts` (dependency-pure)
- Create: `src/components/forum/kiosk/TranslateControl.svelte`
- Modify: `src/lib/kiosk-i18n.ts` (add keys to BOTH locales)
- Modify: `src/styles/global.css` (append `.ktr-*` block)

**Interfaces:**
- Consumes: Task 3's HTTP contract.
- Produces:
  ```typescript
  // client.ts
  pickTargetLang(kioskLocale: string): string   // navigator.language primary subtag if in CLIENT_LANGS, else kioskLocale
  requestTranslation(contentType: string, contentId: string, targetLang: string):
    Promise<{ ok: true; title: string | null; body: string } | { ok: false; error: string }>
  ```
  ```svelte
  <!-- TranslateControl.svelte props -->
  contentType: string; contentId: string;
  onTranslated: (t: { title: string | null; body: string } | null) => void;  // null = revert to original
  accent?: string;  // CSS color for the control text, defaults to inherit
  ```

- [ ] **Step 1: Write the client lib**

```typescript
// src/lib/translation/client.ts
// DEPENDENCY-PURE: imported by Svelte islands. No server imports, ever.

const CLIENT_LANGS = ['de', 'en', 'tr', 'pl', 'ru', 'uk', 'ar', 'fr', 'es', 'it', 'ro', 'bg', 'el', 'nl', 'pt'];

export function pickTargetLang(kioskLocale: string): string {
  try {
    const nav = (navigator.language || '').toLowerCase().split('-')[0];
    if (CLIENT_LANGS.includes(nav)) return nav;
  } catch {
    /* SSR or exotic env */
  }
  return kioskLocale || 'de';
}

export async function requestTranslation(
  contentType: string,
  contentId: string,
  targetLang: string
): Promise<{ ok: true; title: string | null; body: string } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType, contentId, targetLang }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: (data as any).error ?? `http_${res.status}` };
    return { ok: true, title: (data as any).title ?? null, body: (data as any).body ?? '' };
  } catch {
    return { ok: false, error: 'network' };
  }
}
```

- [ ] **Step 2: Add i18n keys**

In `src/lib/kiosk-i18n.ts`, add to the `de` dictionary:

```typescript
'tr.show': 'Übersetzung anzeigen',
'tr.working': 'Übersetzen …',
'tr.original': 'Original anzeigen',
'tr.label': 'Automatisch übersetzt',
'tr.err.unavailable': 'Übersetzung derzeit nicht verfügbar',
'tr.err.rate_limited': 'Zu viele Übersetzungen — bitte später erneut versuchen',
'tr.err.too_long': 'Beitrag zu lang für die Übersetzung',
'tr.err.generic': 'Übersetzung fehlgeschlagen',
```

and to `en`:

```typescript
'tr.show': 'Show translation',
'tr.working': 'Translating …',
'tr.original': 'Show original',
'tr.label': 'Automatically translated',
'tr.err.unavailable': 'Translation is currently unavailable',
'tr.err.rate_limited': 'Too many translations — please try again later',
'tr.err.too_long': 'Post too long to translate',
'tr.err.generic': 'Translation failed',
```

(Match the file's existing dictionary structure exactly — if keys live in per-page sections, add a `// translation control` group.)

- [ ] **Step 3: Write the component (NO scoped styles)**

```svelte
<!-- src/components/forum/kiosk/TranslateControl.svelte -->
<!-- Styles live in global.css (.ktr-*) — this component is only imported by
     other islands, and nested-island <style> blocks get orphaned in prod. -->
<script lang="ts">
  import { t, locale } from '../../../lib/kiosk-i18n';
  import { pickTargetLang, requestTranslation } from '../../../lib/translation/client';

  let {
    contentType,
    contentId,
    onTranslated,
    accent = 'inherit',
  }: {
    contentType: string;
    contentId: string;
    onTranslated: (t: { title: string | null; body: string } | null) => void;
    accent?: string;
  } = $props();

  let state = $state<'idle' | 'working' | 'shown'>('idle');
  let error = $state<string | null>(null);
  let cache: { title: string | null; body: string } | null = null;

  async function toggle() {
    error = null;
    if (state === 'shown') {
      state = 'idle';
      onTranslated(null);
      return;
    }
    if (cache) {
      state = 'shown';
      onTranslated(cache);
      return;
    }
    state = 'working';
    const target = pickTargetLang($locale);
    const res = await requestTranslation(contentType, contentId, target);
    if (!res.ok) {
      state = 'idle';
      const known = ['translate_unavailable', 'rate_limited', 'too_long'];
      const key = res.error === 'translate_unavailable' ? 'unavailable' : res.error;
      error = $t[known.includes(res.error) ? `tr.err.${key}` : 'tr.err.generic'] ?? $t['tr.err.generic'];
      return;
    }
    cache = { title: res.title, body: res.body };
    state = 'shown';
    onTranslated(cache);
  }
</script>

<div class="ktr">
  {#if state === 'shown'}
    <span class="ktr-label">● {$t['tr.label']}</span>
  {/if}
  <button type="button" class="ktr-btn" style={`color:${accent}`} onclick={toggle} disabled={state === 'working'}>
    {state === 'working' ? $t['tr.working'] : state === 'shown' ? $t['tr.original'] : $t['tr.show']}
  </button>
  {#if error}
    <span class="ktr-err" role="status">{error}</span>
  {/if}
</div>
```

(Verified: `kiosk-i18n.ts` exports `locale` as a writable store and `t` as a derived dictionary store — `$t['key']` / `$locale` as used above is the codebase's exact consumer pattern.)

- [ ] **Step 4: Append CSS to `global.css`**

```css
/* ── TranslateControl (.ktr-*) — nested-island component, styles must live here ── */
.ktr {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.ktr-btn {
  font-family: 'DM Mono', ui-monospace, monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
}
.ktr-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.ktr-label {
  font-family: 'DM Mono', ui-monospace, monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--k-ink-mute, #6b6b6b);
}
.ktr-err {
  font-family: 'DM Mono', ui-monospace, monospace;
  font-size: 10px;
  color: var(--k-danger, #b23a3a);
}
```

(Use the project's existing font/token names — check how `.kiosk-toast*` or `.am-*` blocks reference fonts/colors in `global.css` and mirror that.)

- [ ] **Step 5: Type/svelte sanity + commit**

Run: `pnpm type-check 2>&1 | tail -3` and `npx -y svelte-check@4 2>&1 | tail -3` — no NEW errors beyond baselines (27 / 94).

```bash
git add src/lib/translation/client.ts src/components/forum/kiosk/TranslateControl.svelte src/lib/kiosk-i18n.ts src/styles/global.css
git commit -m "feat: translation client lib, TranslateControl component, i18n keys"
```

---

### Task 5: Wire forum detail + comments

**Files:**
- Modify: `src/components/forum/kiosk/ForumPostDetail.svelte` (title render ~line 555-560, body render further down — NOT the `isVerified` block ~244 nor the byline badge ~561-597, which the parallel `feat/kiez-verification` branch owns)
- Modify: `src/components/forum/kiosk/ForumComment.svelte` (body render ~line 74+)

**Interfaces:**
- Consumes: `TranslateControl.svelte` (Task 4). ForumPostDetail already knows its content type: it receives a `collectionType` (or similarly named) prop distinguishing topic/announcement/recommendation — find its exact name and map it to the API's `contentType` values (`'topic' | 'announcement' | 'recommendation'`).
- Produces: nothing downstream.

- [ ] **Step 1: ForumPostDetail — add translation state + swap displayed text**

In the script block:

```typescript
import TranslateControl from './TranslateControl.svelte';

let translation = $state<{ title: string | null; body: string } | null>(null);
const displayTitle = $derived(translation?.title ?? topic.title);
const displayBody = $derived(translation?.body ?? (topic.body ?? topic.description ?? ''));
```

Then:
1. Replace the `{topic.title}` render in the `<h1>` with `{displayTitle}`.
2. Find the body render (search for where `topic.body ?? topic.description` reaches the template — possibly via an existing derived like `bodyText`; reuse that variable by making IT the `$derived` above instead of adding a parallel one) and make it render `displayBody`.
3. Mount the control directly under the body block (visible in read mode only, `{#if !editing}`):

```svelte
<TranslateControl
  contentType={apiContentType}
  contentId={topic._id}
  onTranslated={(t) => (translation = t)}
  accent="var(--k-wine, #b23a5b)"
/>
```

where `apiContentType` is the component's EXISTING plural→singular mapping: ForumPostDetail already maps `collectionType` (`'topics' | 'announcements' | 'recommendations'`, default `'topics'`) to a singular contentType for `/api/reports/submit` (~line 75) — reuse that derived value; do not invent a second mapping.

**Edit-mode guard:** when `editing` becomes true, reset `translation = null` (the edit form must always start from the original text — a translated string must never be saved back).

- [ ] **Step 2: ForumComment — same pattern, body only**

```typescript
import TranslateControl from './TranslateControl.svelte';
let translation = $state<{ title: string | null; body: string } | null>(null);
// line ~74 becomes:
const body = $derived(translation?.body ?? comment.body ?? comment.content ?? '');
```

Mount `<TranslateControl contentType="comment" contentId={comment._id} onTranslated={(t) => (translation = t)} />` in the comment footer next to the existing action links (report/like), matching their size/typography. If the comment has an edit mode, apply the same reset-on-edit guard.

- [ ] **Step 3: Browser gate**

Dev server (port 3000 if already running, else start on 3001): log in via the playwright recipe, open a topic detail page, then:
- Click "Übersetzung anzeigen" → expect either the body text to change + "● Automatisch übersetzt" label + button reads "Original anzeigen" (DeepL key set), or the inline error "Übersetzung derzeit nicht verfügbar" (no key) — both are passes for wiring.
- Click "Original anzeigen" → original text returns.
- Repeat once on a comment, once on an announcement detail (`/announcements/<id>`) to prove the type mapping.
- Toggle the kiosk locale to EN → button reads "Show translation".

- [ ] **Step 4: Type/svelte sanity + commit**

Run: `pnpm type-check 2>&1 | tail -3` and `npx -y svelte-check@4 2>&1 | tail -3` — no new errors.

```bash
git add src/components/forum/kiosk/ForumPostDetail.svelte src/components/forum/kiosk/ForumComment.svelte
git commit -m "feat: translation control on forum detail and comments"
```

---

### Task 6: Wire event modal + marketplace detail

**Files:**
- Modify: `src/components/calendar/kiosk/EventDetailModal.svelte` (body render ~line 448)
- Modify: `src/components/marketplace/kiosk/detail/MarketDetailInner.svelte` (description render ~line 111)

**Interfaces:**
- Consumes: `TranslateControl.svelte` (Task 4).
- Produces: nothing downstream.

- [ ] **Step 1: EventDetailModal**

```typescript
import TranslateControl from '../../forum/kiosk/TranslateControl.svelte';
let translation = $state<{ title: string | null; body: string } | null>(null);
const displayEventBody = $derived(translation?.body ?? event.body ?? '');
```

The body at ~448 renders through `linkifySegments(event.body)` — change it to `linkifySegments(displayEventBody)` (translated text flows through the same linkify path; URLs survive translation untouched or degrade to plain text — acceptable). Title: replace the title render with `{translation?.title ?? event.title}`. Mount the control under the body block with `accent="var(--k-teal, #3f8f9f)"`, `contentType="event"`, `contentId={event._id}`. Guard: if the modal can switch to an edit view, reset `translation = null` on that switch; also reset when the modal's event changes (`$effect` on `event._id`).

- [ ] **Step 2: MarketDetailInner**

Same pattern: `contentType="listing"`, `contentId={listing._id}`, `accent="var(--k-wine, #b23a5b)"` (marketplace shares wine). `const displayDescription = $derived(translation?.body ?? listing.description ?? '')` replacing the ~111 usage; title render swaps to `{translation?.title ?? listing.title}`. Mount under the description. Same reset-on-edit guard if an owner-edit mode exists in this component.

- [ ] **Step 3: Browser gate**

Same recipe as Task 5: open an event (calendar → event modal) and a listing detail; verify toggle → label → revert on both; verify the event modal reset when opening a different event.

- [ ] **Step 4: Type/svelte sanity + commit**

Run: `pnpm type-check 2>&1 | tail -3` and `npx -y svelte-check@4 2>&1 | tail -3` — no new errors.

```bash
git add src/components/calendar/kiosk/EventDetailModal.svelte src/components/marketplace/kiosk/detail/MarketDetailInner.svelte
git commit -m "feat: translation control on event modal and marketplace detail"
```

---

### Task 7: Documentation

**Files:**
- Modify: `CLAUDE.md` (root — env section + Database Collections)

**Interfaces:** none.

- [ ] **Step 1: Env var entry**

Add to the Environment Variables block, after `NEWSDATA_API_KEY`:

```
DEEPL_API_KEY=          # DeepL API key for on-demand content translation (POST /api/translate). Free-tier keys end ":fx" → api-free.deepl.com host is auto-selected. SERVER-ONLY secret. Unset ⇒ endpoint 503s translate_unavailable and the UI shows an inline error — no other feature affected.
```

- [ ] **Step 2: Collection entry**

Add to Database Collections, near the other cache collections:

```
- `translationCache` - 90d-TTL cache of DeepL translations (`{ key (unique: contentType:contentId:lang:contentHash), contentType, contentId, targetLang, contentHash, title, body, detectedSource, createdAt }`). Content-hash keying means edits miss the cache naturally (no invalidation hook needed); stale rows for edited content just age out via TTL. Translations of later-DELETED content also persist until TTL — accepted TTL-bounded residue, same precedent as `kiezKontextCache` snapshots. Indexes via `scripts/create-translation-indexes.ts`. Written by `src/lib/translation/translateContent.ts` (server-authoritative: visibility-checked content only, never client-supplied text).
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: DEEPL_API_KEY env + translationCache collection"
```

---

## Rollout (after merge — controller/user steps, not implementer tasks)

1. User creates a DeepL API Free account → key into local `.env` (`DEEPL_API_KEY=…:fx`) and Vercel Production (Sensitive).
2. Run `scripts/create-translation-indexes.ts` against prod (user runs via `!` — prod writes are user-run per standing rule).
3. Deploy; smoke on prod: one translation on a forum post (DE→EN via kiosk-EN browser), verify the second click of the same content returns instantly (cache hit), verify `translationCache` has the row + TTL index.
