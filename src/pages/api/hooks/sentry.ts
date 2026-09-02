// POST /api/hooks/sentry — bridge: Sentry alert-rule webhook → Telegram.
// Public route (middleware-allowlisted) guarded by SENTRY_WEBHOOK_SECRET in
// the query string (Sentry internal-integration webhooks can't set custom
// headers per-rule). Fail-closed: unset secret ⇒ always 401.
// ACCEPTED TRADE-OFF: a query-string secret can surface in request logs;
// it guards only alert spam (worst case: bogus Telegram pings) and is
// rotatable at zero cost. Upgrade path if ever needed: verify Sentry's
// sentry-hook-signature header instead.
import type { APIRoute } from 'astro';
import { timingSafeEqual } from 'node:crypto';
import { alertSentryIssue } from '../../../lib/adminAlerts';

function secretOk(given: string | null): boolean {
  const expected = import.meta.env.SENTRY_WEBHOOK_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const POST: APIRoute = async ({ request, url }) => {
  if (!secretOk(url.searchParams.get('secret'))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Payload shapes differ per Sentry alert type — parse defensively and
  // VERIFY against one real delivery at rollout (never guess silently:
  // unknown shapes still alert, with a generic title).
  let title = 'Sentry issue';
  let link: string | undefined;
  try {
    const body = await request.json();
    title =
      body?.data?.event?.title ??
      body?.data?.issue?.title ??
      body?.data?.triggered_rule ??
      title;
    link =
      body?.data?.event?.web_url ??
      body?.data?.issue?.web_url ??
      body?.data?.event?.issue_url ??
      undefined;
  } catch {
    // Malformed body: still forward a generic ping; 200 below stops retries.
  }

  await alertSentryIssue({ title, url: link });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
