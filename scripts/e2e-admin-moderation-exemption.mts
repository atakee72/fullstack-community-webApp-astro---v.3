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
