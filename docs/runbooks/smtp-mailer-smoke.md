# SMTP mailer go-live runbook

Prereq (manual, account owner): `noreply@ercan-atak.de` registered as
"Externes Alias" at mailbox.org; an APP password created (Settings →
Security → App passwords). Transactional mail only — no bulk/newsletters
(personal mail host). Never put a `@mailbox.org` From through third-party
SMTP (DMARC p=reject) — always send from the alias.

## 1. Local real-send smoke
1. Uncomment + fill the `SMTP_*`/`SENDING_FROM_EMAIL` block in `.env`
   (app password typed by the account owner, never echoed).
2. Restart dev server, trigger a forgot-password for YOUR OWN test account
   → mail arrives from "Mahalle <noreply@ercan-atak.de>"; check spam
   folder + that the verify/reset link points at the right origin.
3. On failure: the thrown error is in the dev-server console AND in Sentry
   (tag `component:mailer`). Typical: 535 = wrong app password;
   "sender address rejected" = alias not registered / SENDING_FROM_EMAIL
   mismatch.

## 2. Vercel (Production scope ONLY — by design Preview never emails real
users: auth mails dev-log into function logs, the contact relay 503s)
    printf '%s' "smtp.mailbox.org" | vercel env add SMTP_HOST production
    printf '%s' "587"              | vercel env add SMTP_PORT production
    printf '%s' "atakee@mailbox.org" | vercel env add SMTP_USER production
    # SMTP_PASS: pipe from .env so the value never appears in a terminal:
    grep '^SMTP_PASS=' .env | cut -d= -f2- | tr -d '\n' | vercel env add SMTP_PASS production
    printf '%s' "Mahalle <noreply@ercan-atak.de>" | vercel env add SENDING_FROM_EMAIL production
Then redeploy (`git push` or `vercel redeploy`).

## 3. Prod smoke
1. Forgot-password on prod for your own account → mail arrives.
2. Marketplace contact form on a test listing → owner mail + confirmation
   arrive (delete the `listingContacts` metadata row afterwards if it was
   a pure test).
3. Sentry: no new `component:mailer` events.

## 4. Later: own domain
Register the new alias at mailbox.org (dashboard, account owner), change
`SENDING_FROM_EMAIL` in `.env` + Vercel — no code change. Moving back to
Resend one day: set `RESEND_API_KEY`, remove `SMTP_*` — also no code change.
