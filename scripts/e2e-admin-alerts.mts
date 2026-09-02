// E2E check for the admin-alerts no-op contract (Telegram admin alerts,
// Task 5). Runs against the LOCAL dev server + dev DB (mahalle-dev) only —
// never prod.
//
// Phase A proves that with no TELEGRAM_* env set on the dev server, every
// flow below behaves EXACTLY as it did before adminAlerts.ts existed — the
// alert calls are silent, awaited, never-throw no-ops that never change a
// response shape or status code. Phase B is printed as manual instructions
// only (not executed) for verifying live Telegram delivery.
//
// Usage: PW_FILE=/path/to/devpw.txt npx tsx scripts/e2e-admin-alerts.mts
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  throw new Error(`refusing non-local BASE_URL "${BASE}" — this script posts blocklisted test content and must never run against prod`);
}
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

async function postTopic(bodyText: string) {
  const res = await fetch(`${BASE}/api/topics/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookieHeader() },
    body: JSON.stringify({
      title: 'E2E admin-alerts check',
      body: bodyText,
      tags: [],
    }),
  });
  return { status: res.status, json: await res.json() };
}

async function submitReport(contentId: string) {
  const res = await fetch(`${BASE}/api/reports/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookieHeader() },
    body: JSON.stringify({
      contentId,
      contentType: 'topic',
      reason: 'spam',
      // ReportContentSchema requires >=10 chars — not in the brief's literal
      // payload sketch, but the endpoint 400s without it.
      details: 'E2E automated test report - please ignore.',
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

const CLEAN_TEXT_1 = 'Guten Morgen zusammen! Wer hat am Samstag Lust, gemeinsam den Hermannplatz-Flohmarkt zu besuchen? Ich freue mich auf nette Gespräche mit den Nachbarn.';
const CLEAN_TEXT_2 = 'Kurze Erinnerung: die Hausversammlung im Hinterhof findet diesen Donnerstag um 19 Uhr statt. Alle Nachbarn sind herzlich willkommen.';
const FLAGGED_TEXT = `Automated admin-alerts test. This body deliberately contains the blocklisted word "${badWord}".`;

console.log('=== Phase A: env-less no-op contract (no TELEGRAM_* in dev server env) ===\n');

// 1. ayse, clean text -> approved, no top-level moderationStatus.
await login('ayse@mahalle-dev.test');
const ayseCleanRes = await postTopic(CLEAN_TEXT_1);
assert(ayseCleanRes.status === 201, 'ayse clean create returns 201');
assert(ayseCleanRes.json.moderationStatus === undefined, 'ayse clean response has NO moderationStatus (approved branch)');
assert(ayseCleanRes.json.topic?.moderationStatus === 'approved', 'ayse clean topic stored as approved');
const ayseCleanId: string | undefined = ayseCleanRes.json.topic?._id;

// 2. ayse, blocklisted word -> pending (negative control, unchanged from pre-alerts behavior).
const ayseFlaggedRes = await postTopic(FLAGGED_TEXT);
assert(ayseFlaggedRes.status === 201, 'ayse flagged create returns 201');
assert(ayseFlaggedRes.json.moderationStatus === 'pending', 'ayse flagged response carries moderationStatus pending');
const ayseFlaggedId: string | undefined = ayseFlaggedRes.json.topic?._id;

// 3. admin, clean text -> approved, no top-level moderationStatus (admin skips moderation entirely).
await login('admin@mahalle-dev.test');
const adminRes = await postTopic(CLEAN_TEXT_2);
assert(adminRes.status === 201, 'admin create returns 201');
assert(adminRes.json.moderationStatus === undefined, 'admin response has NO moderationStatus (skip-moderation branch)');
assert(adminRes.json.topic?.moderationStatus === 'approved', 'admin topic stored as approved');
const adminTopicId: string | undefined = adminRes.json.topic?._id;

// 4. ayse reports the admin topic -> success (drives alertReport()).
await login('ayse@mahalle-dev.test');
if (adminTopicId) {
  const reportRes = await submitReport(adminTopicId);
  assert(reportRes.status === 201, 'ayse report-submit on admin topic returns 201');
  assert(reportRes.json.success === true, 'ayse report-submit response success:true');
} else {
  assert(false, 'ayse report-submit on admin topic returns 201 (skipped — no admin topic id)');
  assert(false, 'ayse report-submit response success:true (skipped — no admin topic id)');
}

// 5. Cleanup. The brief calls for deleting "both" created topics (the
// blocklisted one and the reported admin one); we also delete ayse's clean
// topic here for full hygiene, since only the flaggedContent row from the
// report is meant to be left as acceptable dev residue.
if (ayseFlaggedId) await deleteTopic(ayseFlaggedId);
if (ayseCleanId) await deleteTopic(ayseCleanId);
if (adminTopicId) {
  await login('admin@mahalle-dev.test');
  await deleteTopic(adminTopicId);
}
console.log('\ncleanup: deleted the topics created above. NOTE: the flaggedContent row created by step 4\'s report submission is intentionally left in place (acceptable dev residue, same as the moderation-exemption E2E\'s convention).');

console.log('\n=== Phase B: manual live-delivery verification (NOT executed by this script) ===');
console.log(`
To verify real Telegram delivery:
  1. Add TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID to .env.
  2. Restart the dev server so it picks up the new env.
  3. Re-run this script: PW_FILE=<path> npx tsx scripts/e2e-admin-alerts.mts
  4. Expect exactly 3 Telegram messages to arrive at the admin chat:
       - content_new       (ayse's clean topic in step 1)
       - moderation_flagged (ayse's blocklisted topic in step 2)
       - report_new         (ayse's report on the admin topic in step 4)
  5. Expect NO Telegram message for step 3 (admin's own clean post) — the
     admin's own actions ride the skipModeration gate and never self-alert.
`);

process.exit(failed ? 1 : 0);
