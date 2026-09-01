# Admin Moderation Exemption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Content created or edited by an admin (`session.user.role === 'admin'`) skips the AI moderation pipeline entirely and lands as `moderationStatus: 'approved'`, with no `flaggedContent` record and no OpenAI API calls.

**Architecture:** Purely per-endpoint gates, mirroring the 2026-08-30 daily-limit exemption. Each of the 12 in-scope endpoints gets a `const skipModeration = session.user.role === 'admin';` and wraps its existing moderation `Promise.all` + merge block in `if (!skipModeration)`, leaving `mergedResult = null` for admins so the existing "clean content" branch runs unchanged. No shared helper, no schema change, no frontend change (compose UIs already branch on the returned `moderationStatus`).

**Tech Stack:** Astro API routes (TypeScript), MongoDB driver, existing `src/lib/moderation.ts` (unchanged).

**Spec:** No separate spec file — requirement recorded in memory `project_open_followups.md` ("admin creates/edits skip AI moderation → straight to approved; ride the same role==='admin' gates as the 08-30 limit exemption") and in this header. This plan is the authority.

## Global Constraints

- Exemption predicate is exactly `session.user.role === 'admin'` (same as the daily-limit gates). Never trust client input for it.
- Skipping moderation must also skip the OpenAI calls (cost), the blocklist (it runs inside `moderateText`), and `flaggedContent` record creation.
- **Out of scope:** `POST /api/listings/[id]/contact` (buyer→seller relay). Its moderation guards outbound email sent in the app's name — different threat model, stays on for admins.
- Response JSON shapes must not change — only which branch executes.
- The `edit_blocked_by_moderation` gates (edits blocked while content is pending/rejected/warning-labelled) stay as-is for admins — out of scope.
- CI budgets are ratchets: `pnpm type-check` errors ≤27, `npx -y svelte-check@4` errors ≤94. Never raise.
- This repo has **no unit test framework**. Per-task verification = `pnpm type-check` (error count must stay ≤27). End-to-end verification is Task 5 (Playwright against the dev server).
- Commits: simple concise messages, NO Claude signature, NO Co-Authored-By footer.
- Comment style: one short comment at each gate, e.g. `// Admins are exempt from AI moderation (their content is auto-approved — they run the review queue).`

---

### Task 1: Merge-pattern create endpoints (5 files)

**Files:**
- Modify: `src/pages/api/topics/create.ts:60-82`
- Modify: `src/pages/api/events/create.ts:60-78`
- Modify: `src/pages/api/announcements/create.ts:60-82`
- Modify: `src/pages/api/recommendations/create.ts:60-82`
- Modify: `src/pages/api/comments/create.ts:38-45`

**Interfaces:**
- Consumes: existing `mergeModerationResults(...results): ModerationResult | null` from `src/lib/moderation.ts` (unchanged).
- Produces: the gate idiom (`skipModeration` + `let mergedResult: ReturnType<typeof mergeModerationResults> = null;` + `if (!skipModeration) { ... }`) reused verbatim by Tasks 2–4.

All five share one shape: build checks → `Promise.all` → `mergeModerationResults` → `moderationStatus = mergedResult ? 'pending' : 'approved'`. The transformation is identical: hoist `mergedResult` to a `let` initialized `null`, wrap everything from the `contentText` build through the merge call in `if (!skipModeration)`. Everything downstream (`moderationStatus`, flagged-record `if (mergedResult)`, response branches on `mergedResult.userMessage`) already handles `mergedResult === null` correctly — do not touch it.

- [ ] **Step 1: Edit `src/pages/api/topics/create.ts`**

Replace this exact block (currently lines 60–79):

```typescript
    // Run content moderation + spam check + image moderation in parallel
    const contentText = `${title}\n\n${body}`;
    const moderationChecks: Promise<any>[] = [
      moderateText(contentText),
      checkSpamWithGPT(contentText, 'neighborhood community forum post')
    ];
    if (tags?.length) {
      moderationChecks.push(moderateText(tags.join(' ')));
    }
    if (images?.length) {
      moderationChecks.push(checkImagesWithGPT(images.map(img => img.url)));
    }

    const [mainModerationResult, spamResult, tagsModerationResult, imageModerationResult] = await Promise.all(moderationChecks);

    // Merge all moderation results — returns null if all passed
    const resultsToMerge = [mainModerationResult, spamResult];
    if (tagsModerationResult) resultsToMerge.push(tagsModerationResult);
    if (imageModerationResult) resultsToMerge.push(imageModerationResult);
    const mergedResult = mergeModerationResults(...resultsToMerge);
```

with:

```typescript
    // Admins are exempt from AI moderation (their content is auto-approved —
    // they run the review queue). Skips the OpenAI calls entirely.
    const skipModeration = session.user.role === 'admin';

    let mergedResult: ReturnType<typeof mergeModerationResults> = null;
    if (!skipModeration) {
      // Run content moderation + spam check + image moderation in parallel
      const contentText = `${title}\n\n${body}`;
      const moderationChecks: Promise<any>[] = [
        moderateText(contentText),
        checkSpamWithGPT(contentText, 'neighborhood community forum post')
      ];
      if (tags?.length) {
        moderationChecks.push(moderateText(tags.join(' ')));
      }
      if (images?.length) {
        moderationChecks.push(checkImagesWithGPT(images.map(img => img.url)));
      }

      const [mainModerationResult, spamResult, tagsModerationResult, imageModerationResult] = await Promise.all(moderationChecks);

      // Merge all moderation results — returns null if all passed
      const resultsToMerge = [mainModerationResult, spamResult];
      if (tagsModerationResult) resultsToMerge.push(tagsModerationResult);
      if (imageModerationResult) resultsToMerge.push(imageModerationResult);
      mergedResult = mergeModerationResults(...resultsToMerge);
    }
```

The following line `const moderationStatus = mergedResult ? 'pending' : 'approved';` and everything after stays untouched.

- [ ] **Step 2: Edit `src/pages/api/events/create.ts`**

Same transformation. Replace (currently lines 60–75):

```typescript
    // Run content moderation + spam check in parallel (FAIL-SAFE: queues for review on any error)
    const contentText = `${title}\n\n${body || ''}\n\n${location || ''}`;
    const moderationChecks: Promise<any>[] = [
      moderateText(contentText),
      checkSpamWithGPT(contentText, 'neighborhood community event')
    ];
    if (tags?.length) {
      moderationChecks.push(moderateText(tags.join(' ')));
    }

    const [mainModerationResult, spamResult, tagsModerationResult] = await Promise.all(moderationChecks);

    // Merge all moderation results — returns null if all passed
    const resultsToMerge = [mainModerationResult, spamResult];
    if (tagsModerationResult) resultsToMerge.push(tagsModerationResult);
    const mergedResult = mergeModerationResults(...resultsToMerge);
```

with:

```typescript
    // Admins are exempt from AI moderation (their content is auto-approved —
    // they run the review queue). Skips the OpenAI calls entirely.
    const skipModeration = session.user.role === 'admin';

    let mergedResult: ReturnType<typeof mergeModerationResults> = null;
    if (!skipModeration) {
      // Run content moderation + spam check in parallel (FAIL-SAFE: queues for review on any error)
      const contentText = `${title}\n\n${body || ''}\n\n${location || ''}`;
      const moderationChecks: Promise<any>[] = [
        moderateText(contentText),
        checkSpamWithGPT(contentText, 'neighborhood community event')
      ];
      if (tags?.length) {
        moderationChecks.push(moderateText(tags.join(' ')));
      }

      const [mainModerationResult, spamResult, tagsModerationResult] = await Promise.all(moderationChecks);

      // Merge all moderation results — returns null if all passed
      const resultsToMerge = [mainModerationResult, spamResult];
      if (tagsModerationResult) resultsToMerge.push(tagsModerationResult);
      mergedResult = mergeModerationResults(...resultsToMerge);
    }
```

- [ ] **Step 3: Edit `src/pages/api/announcements/create.ts`**

Same transformation as Step 1 (announcements has the identical 4-check shape). The only textual differences from topics: the GPT context string is `'neighborhood community announcement'`. Wrap the block from `// Run content moderation + spam check + image moderation in parallel` through `const mergedResult = mergeModerationResults(...resultsToMerge);` in the same `skipModeration` gate, converting `const mergedResult` to the hoisted `let mergedResult: ReturnType<typeof mergeModerationResults> = null;` + assignment.

- [ ] **Step 4: Edit `src/pages/api/recommendations/create.ts`**

Same transformation as Step 1. GPT context string is `'neighborhood place/business recommendation'`; destructured field list includes `category` (untouched). Same gate, same hoist.

- [ ] **Step 5: Edit `src/pages/api/comments/create.ts`**

Replace (currently lines 38–44):

```typescript
    // Run AI content moderation + spam check in parallel
    const [textModerationResult, spamResult] = await Promise.all([
      moderateText(body),
      checkSpamWithGPT(body, 'community forum comment')
    ]);

    const mergedResult = mergeModerationResults(textModerationResult, spamResult);
```

with:

```typescript
    // Admins are exempt from AI moderation (their content is auto-approved —
    // they run the review queue). Skips the OpenAI calls entirely.
    const skipModeration = session.user.role === 'admin';

    let mergedResult: ReturnType<typeof mergeModerationResults> = null;
    if (!skipModeration) {
      // Run AI content moderation + spam check in parallel
      const [textModerationResult, spamResult] = await Promise.all([
        moderateText(body),
        checkSpamWithGPT(body, 'community forum comment')
      ]);

      mergedResult = mergeModerationResults(textModerationResult, spamResult);
    }
```

- [ ] **Step 6: Verify type-check budget**

Run: `pnpm type-check 2>&1 | tail -5`
Expected: error count ≤27 (unchanged baseline).

- [ ] **Step 7: Commit**

```bash
git add src/pages/api/topics/create.ts src/pages/api/events/create.ts src/pages/api/announcements/create.ts src/pages/api/recommendations/create.ts src/pages/api/comments/create.ts
git commit -m "feat: admin content skips AI moderation on create endpoints"
```

---

### Task 2: Merge-pattern edit endpoints (3 files)

**Files:**
- Modify: `src/pages/api/topics/edit/[id].ts:85-115`
- Modify: `src/pages/api/events/edit/[id].ts:80-101`
- Modify: `src/pages/api/comments/edit/[commentId].ts:83-89`

**Interfaces:**
- Consumes: the gate idiom from Task 1 (same `skipModeration` + hoisted `let mergedResult`).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Edit `src/pages/api/topics/edit/[id].ts`**

Replace (currently lines ~85–109, immediately after the `edit_blocked_by_moderation` gate):

```typescript
    // Run content moderation on edited content (FAIL-SAFE: queues for review on any error).
    // Mirrors the create-path checks: moderateText + checkSpamWithGPT + tag moderation + image moderation.
    const contentText = `${title}\n\n${body}`;
    const moderationChecks: Promise<any>[] = [
      moderateText(contentText),
      checkSpamWithGPT(contentText, 'neighborhood community forum post')
    ];
    if (tags?.length) {
      moderationChecks.push(moderateText(tags.join(' ')));
    }
    if (images?.length) {
      moderationChecks.push(checkImagesWithGPT(images.map(img => img.url)));
    }

    const [mainModerationResult, spamResult, tagsModerationResult, imageModerationResult] = await Promise.all(moderationChecks);

    // Merge all moderation results
    const resultsToMerge = [mainModerationResult, spamResult];
    if (tagsModerationResult) resultsToMerge.push(tagsModerationResult);
    if (imageModerationResult) resultsToMerge.push(imageModerationResult);
    const mergedModerationResult = mergeModerationResults(...resultsToMerge);

    // Use merged result for moderation decision
    const moderationResult = mergedModerationResult || mainModerationResult;
```

with:

```typescript
    // Admins are exempt from AI moderation (their content is auto-approved —
    // they run the review queue). Skips the OpenAI calls entirely.
    const skipModeration = session.user.role === 'admin';

    let mergedModerationResult: ReturnType<typeof mergeModerationResults> = null;
    if (!skipModeration) {
      // Run content moderation on edited content (FAIL-SAFE: queues for review on any error).
      // Mirrors the create-path checks: moderateText + checkSpamWithGPT + tag moderation + image moderation.
      const contentText = `${title}\n\n${body}`;
      const moderationChecks: Promise<any>[] = [
        moderateText(contentText),
        checkSpamWithGPT(contentText, 'neighborhood community forum post')
      ];
      if (tags?.length) {
        moderationChecks.push(moderateText(tags.join(' ')));
      }
      if (images?.length) {
        moderationChecks.push(checkImagesWithGPT(images.map(img => img.url)));
      }

      const [mainModerationResult, spamResult, tagsModerationResult, imageModerationResult] = await Promise.all(moderationChecks);

      // Merge all moderation results
      const resultsToMerge = [mainModerationResult, spamResult];
      if (tagsModerationResult) resultsToMerge.push(tagsModerationResult);
      if (imageModerationResult) resultsToMerge.push(imageModerationResult);
      mergedModerationResult = mergeModerationResults(...resultsToMerge);
    }
```

Then fix BOTH remaining references to the deleted `moderationResult` alias (inside `if (mergedModerationResult)` branches the two were identical, since the alias was `mergedModerationResult || mainModerationResult`):
1. Flagged-record block (~line 163): change the `createFlaggedContentRecord(...)` call's last argument from `moderationResult` to `mergedModerationResult`.
2. Flagged response branch (~line 198): change `message: moderationResult.userMessage,` to `message: mergedModerationResult.userMessage,`.

Verify no references remain: `grep -n 'moderationResult\b' 'src/pages/api/topics/edit/[id].ts'` must show only `mergedModerationResult`-prefixed hits.

- [ ] **Step 2: Edit `src/pages/api/events/edit/[id].ts`**

The four `const nextTitle/nextBody/nextLocation/nextTags = ...` derivations at lines 82–85 MUST STAY OUTSIDE the gate — `nextTitle`/`nextBody`/`nextTags` are also used at line ~156 in the flagged-record block (verified). Wrap only from `const contentText` onward. Replace:

```typescript
    const contentText = `${nextTitle}\n\n${nextBody}\n\n${nextLocation}`;

    const moderationChecks: Promise<any>[] = [
      moderateText(contentText),
      checkSpamWithGPT(contentText, 'neighborhood community event')
    ];
    if (nextTags.length) {
      moderationChecks.push(moderateText(nextTags.join(' ')));
    }

    const [mainModerationResult, spamResult, tagsModerationResult] =
      await Promise.all(moderationChecks);
    const resultsToMerge = [mainModerationResult, spamResult];
    if (tagsModerationResult) resultsToMerge.push(tagsModerationResult);
    const mergedResult = mergeModerationResults(...resultsToMerge);
```

with:

```typescript
    // Admins are exempt from AI moderation (their content is auto-approved —
    // they run the review queue). Skips the OpenAI calls entirely.
    const skipModeration = session.user.role === 'admin';

    let mergedResult: ReturnType<typeof mergeModerationResults> = null;
    if (!skipModeration) {
      const contentText = `${nextTitle}\n\n${nextBody}\n\n${nextLocation}`;

      const moderationChecks: Promise<any>[] = [
        moderateText(contentText),
        checkSpamWithGPT(contentText, 'neighborhood community event')
      ];
      if (nextTags.length) {
        moderationChecks.push(moderateText(nextTags.join(' ')));
      }

      const [mainModerationResult, spamResult, tagsModerationResult] =
        await Promise.all(moderationChecks);
      const resultsToMerge = [mainModerationResult, spamResult];
      if (tagsModerationResult) resultsToMerge.push(tagsModerationResult);
      mergedResult = mergeModerationResults(...resultsToMerge);
    }
```

The flagged-record block further down (using `mergedResult` and `nextTitle`/`nextBody`/`nextTags` at ~line 156) stays untouched — `if (mergedResult)` guards it, so it never runs for admins.

- [ ] **Step 3: Edit `src/pages/api/comments/edit/[commentId].ts`**

Replace (currently lines ~83–89):

```typescript
    const [textModerationResult, spamResult] = await Promise.all([
      moderateText(body),
      checkSpamWithGPT(body, 'community forum comment')
    ]);

    const mergedResult = mergeModerationResults(textModerationResult, spamResult);
```

with:

```typescript
    // Admins are exempt from AI moderation (their content is auto-approved —
    // they run the review queue). Skips the OpenAI calls entirely.
    const skipModeration = session.user.role === 'admin';

    let mergedResult: ReturnType<typeof mergeModerationResults> = null;
    if (!skipModeration) {
      const [textModerationResult, spamResult] = await Promise.all([
        moderateText(body),
        checkSpamWithGPT(body, 'community forum comment')
      ]);

      mergedResult = mergeModerationResults(textModerationResult, spamResult);
    }
```

The next line `const newModerationStatus = mergedResult ? 'pending' : 'approved';` stays untouched.

- [ ] **Step 4: Verify type-check budget**

Run: `pnpm type-check 2>&1 | tail -5`
Expected: error count ≤27.

- [ ] **Step 5: Commit**

```bash
git add 'src/pages/api/topics/edit/[id].ts' 'src/pages/api/events/edit/[id].ts' 'src/pages/api/comments/edit/[commentId].ts'
git commit -m "feat: admin content skips AI moderation on edit endpoints"
```

---

### Task 3: Marketplace listings (3 files, canPublish-pattern)

**Files:**
- Modify: `src/pages/api/listings/create.ts:64-127`
- Modify: `src/pages/api/listings/draft/[id]/publish.ts:105-142`
- Modify: `src/pages/api/listings/edit/[id].ts:133-185`

**Interfaces:**
- Consumes: gate idiom from Task 1.
- Produces: nothing new.

These three use `moderatePost` + a `canPublish`-based status instead of the merge-only pattern, and listings/edit carries audit-trail logic that must KEEP running for admins (the pre-edit snapshot is a provenance record, not a moderation act).

- [ ] **Step 1: Edit `src/pages/api/listings/create.ts`**

Replace (currently lines ~64–74):

```typescript
    // Run all moderation checks in parallel: text safety, spam check, and image safety (GPT-4o vision)
    const contentText = `${title}\n\n${descriptionPlainText}`;
    const [moderationResult, spamResult, imageResult] = await Promise.all([
      moderatePost(contentText, images),
      checkSpamWithGPT(contentText, 'neighborhood marketplace listing'),
      checkImagesWithGPT(images)
    ]);

    // All checks must pass for auto-approval
    const moderationStatus = (moderationResult.canPublish && spamResult.canPublish && imageResult.canPublish) ? 'approved' : 'pending';
```

with:

```typescript
    // Admins are exempt from AI moderation (their content is auto-approved —
    // they run the review queue). Skips the OpenAI calls entirely.
    const skipModeration = session.user.role === 'admin';

    let mergedResult: ReturnType<typeof mergeModerationResults> = null;
    let moderationStatus: 'approved' | 'pending' = 'approved';
    if (!skipModeration) {
      // Run all moderation checks in parallel: text safety, spam check, and image safety (GPT-4o vision)
      const contentText = `${title}\n\n${descriptionPlainText}`;
      const [moderationResult, spamResult, imageResult] = await Promise.all([
        moderatePost(contentText, images),
        checkSpamWithGPT(contentText, 'neighborhood marketplace listing'),
        checkImagesWithGPT(images)
      ]);

      // All checks must pass for auto-approval
      moderationStatus = (moderationResult.canPublish && spamResult.canPublish && imageResult.canPublish) ? 'approved' : 'pending';
      mergedResult = mergeModerationResults(moderationResult, spamResult, imageResult);
    }
```

Then two follow-up edits in the same file:
1. Delete the now-duplicate line further down: `const mergedResult = mergeModerationResults(moderationResult, spamResult, imageResult);` (keep the `if (mergedResult) { ...flagged record... }` block that follows it).
2. In the flagged response branch near the bottom, change `message: moderationResult.userMessage,` to `message: mergedResult.userMessage,` (`moderationResult` no longer exists at that scope; inside `if (mergedResult)` it is non-null — this matches how the four Task-1 creates already phrase it).

- [ ] **Step 2: Edit `src/pages/api/listings/draft/[id]/publish.ts`**

Replace (currently lines ~106–115):

```typescript
    // Run full moderation pipeline
    const contentText = `${draft.title}\n\n${draft.descriptionPlainText}`;
    const [moderationResult, spamResult, imageResult] = await Promise.all([
      moderatePost(contentText, draft.images),
      checkSpamWithGPT(contentText, 'neighborhood marketplace listing'),
      checkImagesWithGPT(draft.images)
    ]);

    const moderationStatus = (moderationResult.canPublish && spamResult.canPublish && imageResult.canPublish) ? 'approved' : 'pending';
```

with:

```typescript
    // Admins are exempt from AI moderation (their content is auto-approved —
    // they run the review queue). Skips the OpenAI calls entirely.
    const skipModeration = session.user.role === 'admin';

    let mergedResult: ReturnType<typeof mergeModerationResults> = null;
    let moderationStatus: 'approved' | 'pending' = 'approved';
    if (!skipModeration) {
      // Run full moderation pipeline
      const contentText = `${draft.title}\n\n${draft.descriptionPlainText}`;
      const [moderationResult, spamResult, imageResult] = await Promise.all([
        moderatePost(contentText, draft.images),
        checkSpamWithGPT(contentText, 'neighborhood marketplace listing'),
        checkImagesWithGPT(draft.images)
      ]);

      moderationStatus = (moderationResult.canPublish && spamResult.canPublish && imageResult.canPublish) ? 'approved' : 'pending';
      mergedResult = mergeModerationResults(moderationResult, spamResult, imageResult);
    }
```

Then delete the now-duplicate line further down: `const mergedResult = mergeModerationResults(moderationResult, spamResult, imageResult);` (keep its `if (mergedResult) { ... }` flagged-record block). The response's `moderationStatus === 'pending' ? ... : ...` message ternary stays untouched.

- [ ] **Step 3: Edit `src/pages/api/listings/edit/[id].ts`**

The re-moderation block sits inside the content-changed branch, after the audit-trail write. KEEP the audit-trail write (`wasRejected`/`hadWarning` snapshot) running for admins. Replace (currently lines ~134–154):

```typescript
      const title = updateData.title || existingListing.title;
      const plainText = updateData.descriptionPlainText || existingListing.descriptionPlainText || '';
      const images = updateData.images || existingListing.images;
      const contentText = `${title}\n\n${plainText}`;

      // Run all moderation checks in parallel: text safety, spam check, and image safety
      const [moderationResult, spamResult, imageResult] = await Promise.all([
        moderatePost(contentText, images),
        checkSpamWithGPT(contentText, 'neighborhood marketplace listing'),
        checkImagesWithGPT(images)
      ]);

      const authorInfo = {
        id: userId,
        name: session.user.name || undefined,
        email: session.user.email || undefined
      };
      const contentInfo = { title, body: plainText, imageUrls: images };

      const mergedResult = mergeModerationResults(moderationResult, spamResult, imageResult);
```

with:

```typescript
      const title = updateData.title || existingListing.title;
      const plainText = updateData.descriptionPlainText || existingListing.descriptionPlainText || '';
      const images = updateData.images || existingListing.images;

      // Admins are exempt from AI moderation (their content is auto-approved —
      // they run the review queue). Skips the OpenAI calls entirely; the audit
      // snapshot above still runs (provenance, not moderation).
      const skipModeration = session.user.role === 'admin';

      let mergedResult: ReturnType<typeof mergeModerationResults> = null;
      if (!skipModeration) {
        const contentText = `${title}\n\n${plainText}`;

        // Run all moderation checks in parallel: text safety, spam check, and image safety
        const [moderationResult, spamResult, imageResult] = await Promise.all([
          moderatePost(contentText, images),
          checkSpamWithGPT(contentText, 'neighborhood marketplace listing'),
          checkImagesWithGPT(images)
        ]);

        mergedResult = mergeModerationResults(moderationResult, spamResult, imageResult);
      }
```

Then in the `if (mergedResult) { ... }` flagged branch just below, the `authorInfo`/`contentInfo` constants were hoisted out in the old code — move them INSIDE the `if (mergedResult)` block (immediately before `const flaggedRecord = createFlaggedContentRecord('marketplace', contentInfo, authorInfo, mergedResult);`), since they're only used there:

```typescript
        const authorInfo = {
          id: userId,
          name: session.user.name || undefined,
          email: session.user.email || undefined
        };
        const contentInfo = { title, body: plainText, imageUrls: images };
```

The `else` branch (approved + `hadWarning`/`wasRejected` clears) stays untouched — it now also serves the admin path, which is exactly right (an admin edit counts as clean re-moderation).

Also add the import if missing: `mergeModerationResults` is already imported in all three files (verified) — no import changes needed anywhere in this task, but confirm with `grep -n mergeModerationResults` per file before finishing.

- [ ] **Step 4: Verify type-check budget**

Run: `pnpm type-check 2>&1 | tail -5`
Expected: error count ≤27.

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/listings/create.ts 'src/pages/api/listings/draft/[id]/publish.ts' 'src/pages/api/listings/edit/[id].ts'
git commit -m "feat: admin listings skip AI moderation (create, publish, edit)"
```

---

### Task 4: News submissions

**Files:**
- Modify: `src/pages/api/news/submit.ts:66-137`

**Interfaces:**
- Consumes: gate idiom from Task 1.
- Produces: nothing new.

News is unique: EVERY user submission goes `pending` + gets a `flaggedContent` queue record (clean ones get the `user_submission` pending record), because all user news needs editorial review. For an admin, both halves are skipped: status `approved` (it appears on the newsboard immediately), no queue record at all — the admin IS the editor.

- [ ] **Step 1: Edit `src/pages/api/news/submit.ts`**

Replace (currently lines ~66–80):

```typescript
    // Run content moderation on title + description + comment.
    // Parity with all other content types (CLAUDE.md): the OpenAI safety scan
    // (moderateText) runs in parallel with the GPT spam/ad/hate/harassment check
    // (checkSpamWithGPT); merged → null when nothing flagged, else a combined result.
    const textToModerate = `${title}\n\n${description}${submitterComment ? `\n\n${submitterComment}` : ''}`;
    const [moderationResult, spamResult] = await Promise.all([
      moderateText(textToModerate),
      checkSpamWithGPT(textToModerate, 'neighborhood news submission'),
    ]);
    const mergedResult = mergeModerationResults(moderationResult, spamResult);

    // All user-submitted news goes to moderation queue regardless of AI result
    // This ensures admin reviews every submission before it appears on the newsboard
    const moderationStatus = 'pending';
```

with:

```typescript
    // Admins are exempt from AI moderation AND editorial review (the admin IS
    // the editor) — their submissions go straight to the newsboard.
    const skipModeration = session.user.role === 'admin';

    let mergedResult: ReturnType<typeof mergeModerationResults> = null;
    if (!skipModeration) {
      // Run content moderation on title + description + comment.
      // Parity with all other content types (CLAUDE.md): the OpenAI safety scan
      // (moderateText) runs in parallel with the GPT spam/ad/hate/harassment check
      // (checkSpamWithGPT); merged → null when nothing flagged, else a combined result.
      const textToModerate = `${title}\n\n${description}${submitterComment ? `\n\n${submitterComment}` : ''}`;
      const [moderationResult, spamResult] = await Promise.all([
        moderateText(textToModerate),
        checkSpamWithGPT(textToModerate, 'neighborhood news submission'),
      ]);
      mergedResult = mergeModerationResults(moderationResult, spamResult);
    }

    // All user-submitted news goes to moderation queue regardless of AI result
    // (admin reviews every submission before it appears on the newsboard);
    // admin submissions publish immediately.
    const moderationStatus = skipModeration ? 'approved' : 'pending';
```

Type note: `newNewsItem.moderationStatus` is assigned from this variable — if the `NewsItem` type narrows it, the union `'approved' | 'pending'` is fine; if tsc complains about widening to `string`, annotate: `const moderationStatus: 'approved' | 'pending' = skipModeration ? 'approved' : 'pending';`.

- [ ] **Step 2: Gate the queue-record block in the same file**

Wrap the ENTIRE flagged/pending record section (from `// Create flagged content record for admin review` + `const flaggedCollection = ...` through the closing `}` of the `else { ...user_submission pending record... }` block) in:

```typescript
    if (!skipModeration) {
      // Create flagged content record for admin review
      const flaggedCollection = db.collection<FlaggedContent>('flaggedContent');
      ...existing if (mergedResult) { ... } else { ... } unchanged...
    }
```

- [ ] **Step 3: Branch the response message in the same file**

Replace the final success response:

```typescript
    return new Response(
      JSON.stringify({
        news: { ...newNewsItem, _id: result.insertedId },
        message: 'News submitted successfully. It will appear on the newsboard after admin approval.',
        moderationStatus: 'pending'
      }),
```

with:

```typescript
    return new Response(
      JSON.stringify({
        news: { ...newNewsItem, _id: result.insertedId },
        message: skipModeration
          ? 'News published to the newsboard.'
          : 'News submitted successfully. It will appear on the newsboard after admin approval.',
        moderationStatus
      }),
```

- [ ] **Step 4: Verify type-check budget**

Run: `pnpm type-check 2>&1 | tail -5`
Expected: error count ≤27.

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/news/submit.ts
git commit -m "feat: admin news submissions publish immediately"
```

---

### Task 5: End-to-end verification + docs

**Files:**
- Create: `scripts/e2e-admin-moderation-exemption.mts` (fetch-based verification script — no browser needed)
- Modify: `CLAUDE.md` (Content Moderation section)

**Interfaces:**
- Consumes: the full pipeline from Tasks 1–4; the user's own dev server on port 3000 (do NOT spawn one — if it isn't running, ask the user to start it); seeded dev accounts `admin@mahalle-dev.test` (role admin) and `ayse@mahalle-dev.test` (regular user) from `scripts/seed-dev-db.ts`, both sharing the password in the dev password file. **NEVER print the password or the file's content to chat/transcript** — pass the file path via env var.

- [ ] **Step 1: Write the E2E script**

The blocklist short-circuits BEFORE any OpenAI call (deterministic — no API key or provider health needed for the negative control). The script picks a real blocklisted word by parsing `src/lib/moderation.ts` at runtime (never hardcode profanity into the script). Write `scripts/e2e-admin-moderation-exemption.mts`:

```typescript
// E2E check for the admin moderation exemption. Runs against the LOCAL dev
// server + dev DB (mahalle-dev) only — never prod.
// Usage: PW_FILE=/path/to/devpw.txt npx tsx scripts/e2e-admin-moderation-exemption.mts
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PW = readFileSync(process.env.PW_FILE!, 'utf8').trim();

// Pick the first entry of TURKISH_BLOCKLIST from source — a word-boundary hit
// short-circuits into the flag queue before any OpenAI call (deterministic).
const modSrc = readFileSync('src/lib/moderation.ts', 'utf8');
// [^']* skips the "// Common Turkish swear words" comment line inside the array literal
const badWord = modSrc.match(/TURKISH_BLOCKLIST[^[]*\[[^']*'([^']+)'/)?.[1];
if (!badWord) throw new Error('could not extract a blocklist word');

let cookies: Record<string, string> = {};
function storeCookies(res: Response) {
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(';');
    const eq = pair.indexOf('=');
    cookies[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
}
const cookieHeader = () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');

async function login(email: string) {
  cookies = {};
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  storeCookies(csrfRes);
  const { csrfToken } = await csrfRes.json();
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: cookieHeader() },
    body: new URLSearchParams({ csrfToken, email, password: PW }),
  });
  storeCookies(res);
  const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { cookie: cookieHeader() } })).json();
  if (!session?.user?.id) throw new Error(`login failed for ${email}`);
  return session.user;
}

async function postFlaggableTopic() {
  const res = await fetch(`${BASE}/api/topics/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookieHeader() },
    body: JSON.stringify({
      title: 'E2E admin-exemption check',
      body: `Automated moderation-exemption test. This body deliberately contains the blocklisted word "${badWord}".`,
      tags: [],
    }),
  });
  return { status: res.status, json: await res.json() };
}

async function deleteTopic(id: string) {
  const res = await fetch(`${BASE}/api/topics/delete/${id}`, {
    method: 'DELETE',
    headers: { cookie: cookieHeader() },
  });
  if (!res.ok) console.warn(`cleanup: delete ${id} returned ${res.status}`);
}

let failed = false;
function assert(cond: boolean, label: string) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failed = true;
}

// Phase 1: admin — blocklisted word must come back approved, no pending status.
await login('admin@mahalle-dev.test');
const adminRes = await postFlaggableTopic();
assert(adminRes.status === 201, 'admin create returns 201');
assert(adminRes.json.moderationStatus === undefined, 'admin response has NO moderationStatus (clean branch)');
assert(adminRes.json.message === 'Topic created successfully', 'admin gets clean success message');
assert(adminRes.json.topic?.moderationStatus === 'approved', 'admin topic stored as approved');
if (adminRes.json.topic?._id) await deleteTopic(adminRes.json.topic._id);

// Phase 2: negative control — regular user, same word, must be flagged pending.
await login('ayse@mahalle-dev.test');
const userRes = await postFlaggableTopic();
assert(userRes.status === 201, 'user create returns 201');
assert(userRes.json.moderationStatus === 'pending', 'user response carries moderationStatus pending (flag queue)');
if (userRes.json.topic?._id) await deleteTopic(userRes.json.topic._id);

process.exit(failed ? 1 : 0);
```

Adjust only if reality disagrees (e.g. `TopicCreateSchema` requires a field this body omits, or the negative-control user's flagged topic can't be author-deleted while pending — then leave it and note that one pending queue item remains in dev for the user to discard).

- [ ] **Step 2: Run it**

Run: `PW_FILE=<dev password file path> npx tsx scripts/e2e-admin-moderation-exemption.mts`
(The dev password file lives under the project memory scratchpad — ask the controller for the path; it is NOT in the repo.)
Expected: all assertions PASS, exit 0. Phase 1 proves the exemption; Phase 2 proves moderation still fires for regular users (the gate discriminates rather than disabling moderation globally). The negative control also leaves a `flaggedContent` record in the dev DB — acceptable residue, or clean via the /admin/moderation UI later.

- [ ] **Step 3: Update CLAUDE.md**

In the root `CLAUDE.md` "Content Moderation" section, extend the "**Admins are exempt**" bullet (currently about daily limits) — replace:

```
**Admins are exempt** (since 2026-08-30): all 7 create/publish gates skip on `session.user.role === 'admin'`, and the 3 `daily-count` pre-check endpoints report `canCreate/canSubmit: true` for admins.
```

with:

```
**Admins are exempt** (limits since 2026-08-30, moderation since 2026-09-01): all 7 create/publish gates skip the daily limit on `session.user.role === 'admin'` (3 `daily-count` pre-checks report `canCreate/canSubmit: true`), AND all 12 create/edit/publish endpoints skip the AI moderation pipeline entirely for admins — no OpenAI calls, no blocklist, no `flaggedContent` record, straight to `approved` (news: straight to the newsboard, no editorial queue record). The listings-edit audit-trail snapshot still runs for admins (provenance, not moderation). NOT exempt: the marketplace contact relay (`/api/listings/[id]/contact`) — its moderation guards outbound email in the app's name.
```

- [ ] **Step 4: Verify budgets one final time**

Run: `pnpm type-check 2>&1 | tail -3` and `npx -y svelte-check@4 2>&1 | tail -3`
Expected: ≤27 / ≤94.

- [ ] **Step 5: Commit**

```bash
git add scripts/e2e-admin-moderation-exemption.mts CLAUDE.md
git commit -m "test: E2E for admin moderation exemption + docs"
```
