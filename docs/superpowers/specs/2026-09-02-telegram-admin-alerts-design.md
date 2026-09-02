# Telegram Admin Alerts — Design Spec

**Date:** 2026-09-02
**Status:** approved scope (chat, 13:13–13:15) — all four event groups + email mirror + Sentry bridge
**Context:** Single-admin instance (owner = only human dev = only admin). The admin wants realtime awareness of ALL app activity on Telegram, an email mirror for the action-required subset, and Sentry incidents forwarded to Telegram.

## Goals
1. One-way Telegram alerts to the admin for every relevant app event (full firehose at today's community size).
2. Email mirror (existing Resend transport) for the **admin-action** subset only — protects the auth-mail quota/reputation.
3. Sentry issue alerts forwarded to Telegram via a webhook bridge endpoint (Sentry→email already works via the existing alert rule; unchanged).

## Non-goals
- No inbound bot commands (pure one-way; the bot ignores replies).
- No per-event toggle UI — pruning an event category = deleting its call site.
- No queue/batching/dedup (community-scale volume; Telegram limit ~30 msg/s is orders of magnitude away).
- No change to the member-facing notification center (`src/lib/notifications.ts` untouched).

## Architecture

### 1. Alert core — `src/lib/adminAlerts.ts` (new, server-only)
One module owns transport + copy. No SDK — Telegram Bot API is one HTTP POST.

```typescript
type AdminAlertKind =
  | 'member_new'          // admin-action
  | 'moderation_flagged'  // admin-action
  | 'report_new'          // admin-action
  | 'content_new'         // firehose
  | 'comment_new'         // firehose
  | 'contact_relay'       // firehose
  | 'sentry_issue';       // bridge (Telegram only — Sentry already emails)

interface AdminAlert {
  kind: AdminAlertKind;
  text: string;           // final, pre-formatted plain-text line(s)
}

export async function sendAdminAlert(alert: AdminAlert): Promise<void>
```

Behavior of `sendAdminAlert` (mirrors the `notify()` / push-sender contract):
- **Never-throw.** All failures → static `Sentry.captureMessage('admin alert delivery failed')` with kind/status in `extra` + `await Sentry.flush(2000)` (a variable message would mint one Sentry issue per error string; unflushed captures die at Vercel freeze).
- **Awaited best-effort** by callers inside the request window — never `void`-dropped (Vercel freeze eats un-awaited work).
- **Telegram leg:** `POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage` with `{ chat_id: TELEGRAM_ADMIN_CHAT_ID, text, disable_web_page_preview: true }`, plain text (no parse_mode — no escaping pain), **10s AbortController timeout** (the web-push/Resend lesson: a bare fetch without timeout holds the request open until Vercel kills the function).
- **Email leg:** only when `kind` is in the admin-action set (`member_new`, `moderation_flagged`, `report_new`): `sendMail({ to: ADMIN_ALERT_EMAIL, subject: <kind label>, ... })` via the existing mailer — wrapped in its own try/catch (sendMail THROWS by design; here it must not, and must not prevent the Telegram leg). Telegram leg runs first.
- **Config gate:** unset `TELEGRAM_BOT_TOKEN` or `TELEGRAM_ADMIN_CHAT_ID` ⇒ Telegram leg is a silent no-op; unset `ADMIN_ALERT_EMAIL` ⇒ email leg no-op. Both unset ⇒ whole call returns immediately. So dev + preview stay silent by default.
- `sentry_issue` never emails (Sentry's own alert rule already does).

### 2. Copy — terse German one-liners, built by tiny helpers in the same module
Format: `<emoji> <label>: „<title/name>" [von <actor>] [→ <link>]`. Links are absolute `https://mahalle.digital/...` (hardcoded base via a module const; NOT `getTrustedBaseUrl()` — that is auth-flow-specific and fail-closed). Examples:
- `🆕 Neues Mitglied: <name> (@<handle>)`
- `🚩 Moderation: „<titel>" von <name> (<contentType>) → https://mahalle.digital/admin/moderation`
- `⚠️ Meldung: <contentType> „<titel>" — Grund: <reason> → https://mahalle.digital/admin/moderation`
- `📝 Neuer Beitrag (<type>): „<titel>" von <name> — live | wartet auf Freigabe`
- `💬 Kommentar von <name> zu „<parent-titel>"`
- `📬 Marktplatz-Kontakt zu „<listing-titel>"` (fact only — never message content, GDPR stance of listingContacts)
- `🔴 Sentry: <issue title> → <issue url>`
Titles truncated to ~80 chars. Helper exports one builder per kind so call sites stay one-liners, e.g. `alertNewContent({ type, title, authorName, pending })`.

### 3. Event hooks (existing files, one awaited call each, AFTER the write succeeds)
| Event | File(s) | Placement |
|---|---|---|
| member_new | `src/pages/api/auth/register.ts` | after the handle-retry loop yields `result` (never inside the loop) |
| moderation_flagged | every `flaggedContent` insert on the write paths: topics/events/announcements/recommendations/comments creates + edits, listings create/publish/edit, news submit, `reports/submit.ts` uses report_new instead | immediately after the successful `flaggedCollection.insertOne` |
| report_new | `src/pages/api/reports/submit.ts` | after its insert |
| content_new | topics/events/announcements/recommendations creates, listings create + draft publish, news submit | after content insert; message carries „live"/„wartet auf Freigabe" from `moderationStatus` |
| comment_new | `src/pages/api/comments/create.ts` | after insert |
| contact_relay | `src/pages/api/listings/[id]/contact.ts` | after the owner email send succeeds |
| sentry_issue | new endpoint (below) | n/a |

**Self-suppression:** every hook where a session actor exists skips the alert when `session.user.role === 'admin'` (otherwise the admin pings himself on every own post; moderation_flagged can't be admin-authored since the 09-02 exemption, but the guard is applied uniformly anyway — cheap and future-proof).
**No double-fire:** a flagged creation sends moderation_flagged ONLY (not content_new + moderation_flagged): content_new fires when status is `approved`, moderation_flagged when a flagged record was written. News (non-admin: always pending + queue record) therefore sends moderation_flagged only.

### 4. Sentry → Telegram bridge — `src/pages/api/hooks/sentry.ts` (new, public endpoint, secret-guarded)
- Sentry side: Internal Integration (free plan) with a webhook URL `https://mahalle.digital/api/hooks/sentry?secret=<SENTRY_WEBHOOK_SECRET>`, attached as an action to the existing "New issue in production" alert rule.
- App side: `POST` handler — constant-time compare of the `secret` query param against `SENTRY_WEBHOOK_SECRET` (fail-closed 401; unset env ⇒ always 401), parse body defensively (issue title + web URL live at different paths depending on alert type — **the exact payload shape must be verified against one real webhook delivery during implementation, never guessed**), forward via `sendAdminAlert({ kind: 'sentry_issue', ... })`, always 200 on auth success (Sentry retries non-2xx; a malformed body is captured, not retried forever).
- Middleware: the route must be reachable without a session → add to `API_ALLOWLIST` in `src/middleware.ts` (precedent: `/api/news/fetch-daily`).
- Loop guard: the handler itself must never `captureException` on parse failures in a way that triggers the same alert rule → its own Sentry captures use `captureMessage` with a distinct static string, and the alert rule filter is checked at rollout (worst case: one extra alert, not an infinite loop — Sentry dedups issues).

### 5. Environment
```
TELEGRAM_BOT_TOKEN=      # BotFather token. SERVER-ONLY secret (Vercel Sensitive). Unset ⇒ TG leg no-op.
TELEGRAM_ADMIN_CHAT_ID=  # numeric chat id of the admin↔bot DM. Not secret-critical but server-only.
ADMIN_ALERT_EMAIL=       # mirror recipient for admin-action alerts. Unset ⇒ email leg no-op.
SENTRY_WEBHOOK_SECRET=   # random 32+ chars; guards /api/hooks/sentry. Unset ⇒ endpoint fail-closed 401.
```
Rollout order: user creates bot via @BotFather → sends `/start` to it → we read the chat id from `getUpdates` → env to local `.env` (user, plain terminal) + Vercel (piped, Sensitive) → redeploy → Sentry internal integration + alert-rule action → smoke (one probe event per leg).

## Error handling summary
Every leg silent-degrades with a Sentry breadcrumb, nothing ever blocks or fails a user request. The one intentional visibility inversion: moderation_flagged on `moderation_error` fail-safe records doubles as an OpenAI-outage tripwire (the 08-05 incident class becomes a Telegram ping).

## Testing
- Unit-ish: none (repo has no test framework); `pnpm type-check` budgets 27/94 hold.
- E2E on dev: set the four env vars in local `.env` temporarily → fetch-login script pattern (`scripts/e2e-admin-moderation-exemption.mts` precedent) posts as seeded non-admin user → expect real Telegram messages: content_new (clean post), moderation_flagged (blocklist word), comment_new, report_new; register a throwaway member → member_new; admin-authored post → NO alert (suppression). Sentry bridge: curl the endpoint with a captured-or-sample payload + correct/wrong secret → 200+TG message / 401.
- Prod smoke at rollout: one real registration or post from a non-admin test persona + a forced Sentry test issue.

## Files
- Create: `src/lib/adminAlerts.ts`, `src/pages/api/hooks/sentry.ts`
- Modify: `src/middleware.ts` (allowlist), `register.ts`, `reports/submit.ts`, `comments/create.ts`, `contact.ts`, the 7 content create/publish sites + news submit + the 4 edit paths (flagged inserts), root `CLAUDE.md` (env section + a short Admin-Alerts paragraph), `.env` example block in CLAUDE.md env docs
