#!/bin/bash
# One-time backfill of historical AfS demographics into MongoDB.
# Usage:
#   bash scripts/backfill-history.sh --dry-run   # test parse only
#   bash scripts/backfill-history.sh              # actual sync

# Unset MSS vars to skip social index sync during backfill
unset MSS_XLSX_URL MSS_PERIOD

declare -A URLS=(
  ["2021h2"]="https://download.statistik-berlin-brandenburg.de/1d463bd3704c3925/631339d32c47/SB_A01-16-00_2021h02_BE.xlsx"
  ["2022h2"]="https://download.statistik-berlin-brandenburg.de/8d20092b505401b6/1faf9c3fde8e/SB_A01-16-00_2022h02_BE.xlsx"
  ["2023h1"]="https://download.statistik-berlin-brandenburg.de/4b210ef949095fa5/2aca48a07f8e/SB_A01-16-00_2023h01_BE.xlsx"
  ["2023h2"]="https://download.statistik-berlin-brandenburg.de/a6ebbebacd45cd61/182f81103c23/SB_A01-16-00_2023h02_BE.xlsx"
  ["2024h1"]="https://download.statistik-berlin-brandenburg.de/d0c22c0ec7d1afcf/cc74db3da6e5/SB_A01-16-00_2024h01_BE.xlsx"
  ["2025h1"]="https://download.statistik-berlin-brandenburg.de/b3091dfd3074357b/cec6f219a005/SB_A01-16-00_2025h01_BE.xlsx"
)
# 2025h2 already synced — skip

for period in 2021h2 2022h2 2023h1 2023h2 2024h1 2025h1; do
  echo "=== Syncing $period ==="
  STATS_XLSX_URL="${URLS[$period]}" STATS_PERIOD="$period" pnpm tsx scripts/sync-stats.ts "$@"
  echo ""
done

echo "=== Backfill complete ==="
