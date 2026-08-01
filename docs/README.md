# Docs

Decision records, implementation plans, and operational runbooks for Mahalle. Plans are kept as **historical records** — they document what was decided and why at the time of writing; the code and `CLAUDE.md` are the source of truth for current behavior.

## Layout

| Path | What lives here |
|---|---|
| `superpowers/plans/` | SDD implementation plans (June 2026 →) — one per feature era, executed task-by-task with per-task review. Filenames are `YYYY-MM-DD-<feature>.md`. |
| `plans/` | Pre-SDD legacy plans (marketplace kiosk redesign, first Sentry scoping). |
| `runbooks/` | Operational checklists + incident records: [Sentry smoke](runbooks/sentry-smoke.md), [SMTP mailer smoke](runbooks/smtp-mailer-smoke.md), [Mongo region incident](runbooks/mongo-region-incident.md). |
| `newsboard-plan.md` | Standalone newsboard feature scoping (pre-dates the plans folders). |
| `local/` | **Git-ignored.** Private strategy notes — never committed. |

## Reading order for newcomers

1. Root `README.md` + `MANIFESTO.md` — what the project is and refuses to become.
2. Root `CLAUDE.md` — current architecture, patterns, and gotchas (kept up to date).
3. The plan for whichever feature you're touching — the "why" behind its shape.
4. Runbooks — before touching email, Sentry, or the Mongo/Vercel region setup.

## Conventions

- Plans are never edited after execution (except factual corrections) — they are records, not living docs.
- Personal data is scrubbed before committing (repo is public); example emails use `@example.invalid`.
- New operational procedures get a runbook once they've been executed and verified at least once.
