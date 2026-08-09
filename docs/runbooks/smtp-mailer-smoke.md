# SMTP mailer go-live runbook

> **HISTORICAL (2026-08-09):** prod switched to **Resend** with the own domain —
> `SENDING_FROM_EMAIL="Mahalle <noreply@mahalle.digital>"`, `RESEND_API_KEY` set,
> all `SMTP_*` removed from Vercel Production. mailbox.org SMTP (borrowed
> `noreply@ercan-atak.de`) now serves LOCAL DEV only (still in `.env`).
> The smoke *pattern* below (transport chooser, forgot-password probe, Sentry
> check) still applies — substitute the Resend config where it says SMTP.

Prereq (manual, account owner): `noreply@ercan-atak.de` registered as
"Externes Alias" at mailbox.org; an APP password created (Settings →
Security → App passwords). Transactional mail only — no bulk/newsletters
(personal mail host). Never put a `@mailbox.org` From through third-party
SMTP (DMARC p=reject) — always send from the alias.

## 1. Local real-send smoke — ✅ VERIFIED 2026-07-26 (mail arrived; one 535 round first — see gotcha below)
1. Uncomment + fill the `SMTP_*`/`SENDING_FROM_EMAIL` block in `.env`
   (app password typed by the account owner, never echoed).
2. Restart dev server, trigger a forgot-password for YOUR OWN test account
   → mail arrives from "Mahalle <noreply@ercan-atak.de>"; check spam
   folder + that the verify/reset link points at the right origin.
3. On failure: the thrown error is in the dev-server console AND in Sentry
   (tag `component:mailer`). Typical: 535 = wrong app password;
   "sender address rejected" = alias not registered / SENDING_FROM_EMAIL
   mismatch.
4. **Gotcha found live (2026-07-26)**: if the app password contains `#`,
   dotenv-style parsers (Vite AND `node --env-file`) truncate the unquoted
   value at the `#` → 535 with a password that "looks right". Fix: quote it
   (`SMTP_PASS="..."`). The Sentry capture path proved itself here — the 535
   appeared as MAHALLE-PROD-5 within seconds, tagged `component:mailer`.
   Also: mailbox.org e-mail app passwords live under Einstellungen →
   Sicherheit → **E-Mail-App-Passwörter** (protocol checkboxes; SMTP-only for
   least privilege) — NOT the "Applikationspasswörter" section (that one is
   CalDAV/WebDAV/Drive/ActiveSync only).

## 2. Vercel — ✅ DONE 2026-07-26 (5 vars in Production scope; Preview left empty by design — auth mails dev-log into function logs there, the contact relay 503s; also confirmed Preview holds no RESEND_API_KEY)
    printf '%s' "smtp.mailbox.org" | vercel env add SMTP_HOST production
    printf '%s' "587"              | vercel env add SMTP_PORT production
    printf '%s' "atakee@mailbox.org" | vercel env add SMTP_USER production
    # SMTP_PASS: pipe from .env so the value never appears in a terminal:
    # tr also strips the quotes around the (quoted-because-of-#) value:
    grep '^SMTP_PASS=' .env | cut -d= -f2- | tr -d '\n"' | vercel env add SMTP_PASS production
    printf '%s' "Mahalle <noreply@ercan-atak.de>" | vercel env add SENDING_FROM_EMAIL production
Then redeploy (`git push` or `vercel redeploy`).

## 3. Prod smoke — ✅ VERIFIED 2026-07-26 (items 1+3: mail arrived with prod link, reset page opens, zero `component:mailer` Sentry events; item 2 contact-form e2e not separately run — same transport path as the verified send)
1. Forgot-password on prod for your own account → mail arrives.
2. Marketplace contact form on a test listing → owner mail + confirmation
   arrive (delete the `listingContacts` metadata row afterwards if it was
   a pure test).
3. Sentry: no new `component:mailer` events.

## 4. Later: own domain
Register the new alias at mailbox.org (dashboard, account owner), change
`SENDING_FROM_EMAIL` in `.env` + Vercel — no code change. Moving back to
Resend one day: set `RESEND_API_KEY`, remove `SMTP_*` — also no code change.
