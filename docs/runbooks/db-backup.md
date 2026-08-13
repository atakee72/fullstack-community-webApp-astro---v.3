# Runbook: Nightly DB Backup & Restore

## What / where

- `.github/workflows/db-backup.yml` runs nightly at 03:17 UTC (plus `workflow_dispatch`).
- It dumps the prod database `mahalle` (`mongodump --gzip --archive`), encrypts it with
  **AES-256-CBC / PBKDF2, 200,000 iterations** (`openssl enc`), and uploads
  `backup.archive.enc` as a **GitHub Release asset in the PRIVATE repo
  `atakee72/mahalle-backups`** (this app repo is public — Actions artifacts here would be
  publicly downloadable, hence the private repo). One release per UTC day, tag
  `backup-YYYY-MM-DD`.
- **Retention: rolling 90 days** — the workflow itself prunes releases older than 90 days
  (no Actions artifact retention involved). Prune failures only warn; a red run always
  means the backup itself failed.
- Alerting: GitHub emails the repo owner when a scheduled run fails. A red run = no backup
  that night. 401/404 on the upload/prune steps usually means the `BACKUP_REPO_TOKEN` PAT
  expired/was revoked or the private repo was deleted.

## How to restore

1. Download the asset from the private repo's Releases page, or:

   ```bash
   gh release download backup-YYYY-MM-DD --repo atakee72/mahalle-backups
   ```

2. Decrypt (passphrase from the password manager, entered on stdin — never on the command line):

   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
     -in backup.archive.enc -out backup.archive -pass stdin
   ```

3. Restore into the prod cluster:

   ```bash
   mongorestore --uri="<cluster-uri>/" --archive=backup.archive --gzip \
     --drop --nsInclude='mahalle.*'
   ```

   **WARNING: `--drop` drops each live collection before restoring it — the current
   `mahalle` database is replaced by the backup's contents.** Any writes since the
   backup are lost. Sanity-check first with `--dryRun` if unsure.

   To restore into a **different** database name instead (e.g. for inspection
   without touching prod):

   ```bash
   mongorestore --uri="<cluster-uri>/" --archive=backup.archive --gzip \
     --nsFrom='mahalle.*' --nsTo='<other>.*'
   ```

Local tools: `mongodump`/`mongorestore` v100.13.0 are installed on this machine at
`~/.local/bin` (`export PATH="$HOME/.local/bin:$PATH"`).

## Secrets (names only)

- `MONGODB_URI` — already exists as a repo secret, points at prod database `mahalle`.
- `BACKUP_PASSPHRASE` — repo secret; the only other copy lives in the user's password
  manager. **Losing both makes every uploaded backup unreadable.**
- `BACKUP_REPO_TOKEN` — fine-grained PAT, **contents: read+write, scoped to
  `atakee72/mahalle-backups` ONLY**. Fine-grained PATs expire — GitHub emails before
  expiry; **rotating it on time is an operational duty** (an expired token = nightly
  backup failures until rotated).

All three are referenced by the workflow via `secrets.*` only.

## One-time setup

1. Create the private repo `atakee72/mahalle-backups` (empty is fine).
2. Create a fine-grained PAT: resource owner `atakee72`, repository access
   `mahalle-backups` only, permission Contents: read and write. Note the expiry date.
3. Add the secrets to the **app** repo:

   ```bash
   gh secret set BACKUP_REPO_TOKEN   # paste the PAT
   gh secret set BACKUP_PASSPHRASE   # paste the passphrase from the password manager
   ```

4. Smoke it: manual run (below), then confirm a `backup-YYYY-MM-DD` release with an
   `backup.archive.enc` asset appears in the private repo.

## Manual run

```bash
gh workflow run db-backup.yml
gh run watch
```

## Known limits

- **Nightly granularity** — up to 24 h of writes lost versus Atlas point-in-time recovery.
- **90-day rolling window** — older releases are pruned by the workflow.
- **Restore is manual** — download, decrypt, `mongorestore` by hand; no automated restore path.
