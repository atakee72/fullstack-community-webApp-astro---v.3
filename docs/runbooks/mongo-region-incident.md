# Incident: recurring MongoServerSelectionError blips

**Window:** 2026-07-19 → 2026-07-27 (region fix deployed) · watch closed 2026-07-30 · **low-rate regression 2026-08-02** → staged driver tuning (see bottom)

## Symptom
Sporadic prod errors (Sentry MAHALLE-PROD-2, 34 events; MAHALLE-PROD-4, 4 events):
- `MongoServerSelectionError: Server selection timed out after 5000 ms`
- `MongoNetworkTimeoutError: Socket 'secureConnect' timed out`

Plus slow SSR and one air-logger cron failure (2026-07-27) inside the same window.

## Root cause
Vercel functions ran in the default region `iad1` (Washington DC) while the Atlas cluster lives in Frankfurt. Every DB roundtrip crossed the Atlantic; on function freeze/thaw the driver's topology rediscovery blew the deliberately trimmed `serverSelectionTimeoutMS: 5000`.

Diagnosis key: `x-vercel-id` response header reads `edge::function-region` — it showed `fra1::iad1`.

## Fix
`"regions": ["fra1"]` in `vercel.json` (commit `87fa494e`) — co-locate functions with the cluster.

Verify after any config change:
```bash
curl -sI https://<prod-domain>/api/kiez-stats | grep x-vercel-id   # must show fra1::fra1
```

## Verification (2026-07-28 → 2026-07-30)
- Zero new events on PROD-2/PROD-4 since deploy; last events predate the fix.
- Air logger probed the DB every 30 min throughout — all clean.
- Both Sentry issues resolved 2026-07-28; regressions auto-reopen + alert.

## Regression (2026-08-02/03) → staged driver tuning

Both Sentry issues auto-reopened: 3 events over two days (vs ~5/day pre-region-fix — a different, much smaller problem). Region pin verified intact (`fra1::fra1`), so these are **within-region cold-start blips**: topology rediscovery occasionally needs >5s even next to the cluster.

**Step 1 (applied 2026-08-03, `be6db7fc`):** `serverSelectionTimeoutMS: 5000 → 10000` in `src/lib/mongodb.ts`. Trade-off accepted: +5s worst-case hang on a genuine outage, in exchange for cold-start rediscovery becoming a slow success instead of a user-facing error.

**Step 2 (held back, one variable at a time):** `maxIdleTimeMS: 60000` — apply ONLY if network-flavored timeouts persist after step 1. Note it cannot fix PROD-4-style events: those show elapsed times far beyond the configured budget (e.g. 341s vs 30s), which is a Vercel freeze/thaw timer artifact, not a stale socket.

**Known quirk (deliberate):** the Sentry `beforeSend` transient filter's pattern `/MongoNetworkError.*timed out/i` never matches the actually-thrown subclass `MongoNetworkTimeoutError`. This gap is what let PROD-4 through as a useful tripwire — leave it unfixed.

**Watch:** PROD-2/PROD-4 left unresolved as tripwires; evaluate ~2026-08-10 (air logger probes the DB every 30 min as a free canary).

## Closure (2026-08-06)

Step 1 held: 2.5+ quiet days after the last event (2026-08-03 20:53 UTC) with the air logger probing every 30 min. Both issues **resolved** in Sentry. The manual watch is retired — alert rule 725977 now includes a Regression condition (added 2026-08-05), so any recurrence emails immediately. Playbook if that email arrives: freeze-artifact events (elapsed ≫ configured budget) don't count; a real network-flavored timeout → apply step 2 (`maxIdleTimeMS: 60000`).
