# Web push — smoke test + rollout recipe

Companion to the notification center R2 (PWA shell + web push, shipped 2026-08-21).
Code: `public/sw.js`, `src/lib/pushClient.ts`, `src/lib/push.ts`, `src/pages/api/push/*`,
`src/schemas/push.schema.ts`. Design: `docs/superpowers/specs/2026-08-18-notification-center-design.md`.

## What can and cannot be verified headless

| Check | Headless Chromium (playwright-cli) | Real browser |
|---|---|---|
| Manifest / icons / SW served, SW registers | ✅ | ✅ |
| Foot-slot states render (ready / EN / mobile sheet / scroll-lock) | ✅ | ✅ |
| `Notification.requestPermission` | ✅ via `page.context().grantPermissions(['notifications'])` | ✅ |
| `pushManager.subscribe()` | ❌ `AbortError: Registration failed - permission denied` — headless has **no push-service (FCM) connectivity**, regardless of granted permission. Environment limit, not an app bug. | ✅ |
| Server send → push service → 404/410 prune | ✅ with a **fake subscription row** (see below) | ✅ |
| Notification appears on device, `notificationclick` navigates | ❌ | ✅ only |

## Server-chain E2E with a fake subscription (dev DB only)

1. Insert a `pushSubscriptions` row for the recipient with a **dead but well-formed** endpoint, e.g.
   `https://updates.push.services.mozilla.com/wpush/v2/gAAAAfakeE2Etoken` (returns 404 → prune) —
   the endpoint must pass the schema allowlist if you go through the API; direct DB inserts bypass it.
2. **Keys must be cryptographically valid** or web-push dies *before* any HTTP request — no
   `statusCode`, so no prune, only a Sentry capture (`The subscription auth key should be at least
   16 bytes long` / invalid P-256 point). Generate real ones:
   ```js
   const crypto = require('crypto');
   const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
   console.log({ p256dh: ecdh.getPublicKey('base64url'), auth: crypto.randomBytes(16).toString('base64url') });
   ```
3. Trigger a real emit through the UI (second account comments on the recipient's topic).
4. Expect: `notifications` doc created, the fake row **deleted** (404/410 prune), comment POST still 201.
   A bare `curl` to a fake FCM path returns 401 — but a VAPID-signed web-push request to the same
   path gets 404, so FCM fakes prune too.
5. Local dev has the server-side Sentry DSN active: crypto failures from step 2 land on the **prod**
   Sentry board as test artifacts — resolve them afterwards (happened 2026-08-20, MAHALLE-PROD-A).

Helper scripts must live **inside the repo** (delete before commit): Node/tsx resolve `mongodb`,
`dotenv`, `sharp` from the script file's directory upward, so a copy in `/tmp` fails with
`Cannot find module`.

## Prod rollout (done 2026-08-21 — repeat only for key rotation)

1. Generate a fresh pair without displaying the private key:
   `npx web-push generate-vapid-keys --json > <scratch>/vapid.json`
2. `python3 -c "...['privateKey']" | vercel env add VAPID_PRIVATE_KEY production --sensitive`
   and the same for `PUBLIC_VAPID_PUBLIC_KEY` (stdin, not the interactive prompt). Delete the file.
3. **Redeploy** — `PUBLIC_VAPID_PUBLIC_KEY` is baked into the client bundle at build time; until the
   redeploy the opt-in button stays hidden (`pushClient.supported()` is false without the key).
   `vercel redeploy mahalle.digital`.
4. Verify the bake: fetch a kiosk page's `KioskNav.*.js` chunk and grep for `pushManager` plus an
   87-char base64url literal (starts with `B`).
5. Indexes: `MONGODB_URI=<prod> pnpm tsx scripts/create-notification-indexes.ts` → `Done (db: mahalle).`
   (prod URI = local `.env` URI with `/mahalle-dev` → `/mahalle`, same cluster; never print it.)
6. Real-device smoke with your own account only: bell → „Push-Mitteilungen aktivieren" → allow →
   second account comments → push arrives with the tab backgrounded → tap opens the post.
   iOS: Safari → Teilen → „Zum Home-Bildschirm", then the same flow inside the installed app.

Rotating keys invalidates every existing subscription (browsers bind subscriptions to the public
key) — every member has to opt in again. Don't rotate casually.

## Known limits (accepted, see plan)

German-only push copy (locale toggle is client-side); no actor names in push; no
`pushsubscriptionchange` handler; logout doesn't unsubscribe the device (next account's opt-in takes
the endpoint over via upsert); broadcast fan-out is one `Promise.allSettled` over all rows.
