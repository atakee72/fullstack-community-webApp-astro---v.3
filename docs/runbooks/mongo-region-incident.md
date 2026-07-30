# Incident: recurring MongoServerSelectionError blips — CLOSED

**Window:** 2026-07-19 → 2026-07-27 (fix deployed) · watch closed 2026-07-30

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

## If it regresses
Next step (deliberately deferred, one variable at a time): driver tuning in `src/lib/mongodb.ts` — `serverSelectionTimeoutMS: 10000` + `maxIdleTimeMS: 60000`. Rare freeze-artifact one-offs (PROD-4 style) don't count as regression.
