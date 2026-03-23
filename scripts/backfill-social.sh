#!/bin/bash
# One-time backfill of historical MSS social index data (2013–2021).
# Usage:
#   bash scripts/backfill-social.sh --dry-run   # test parse only
#   bash scripts/backfill-social.sh              # actual sync

set -e

# Unset AfS vars to skip demographics sync
unset STATS_XLSX_URL STATS_PERIOD

BASE="https://www.berlin.de/sen/sbw/_assets/stadtdaten/stadtwissen/monitoring-soziale-stadtentwicklung"

declare -A URLS=(
  ["2013"]="$BASE/bericht-2013/2-1-indexind_anteile_plr_mss2013.xlsx"
  ["2015"]="$BASE/bericht-2015/2-1-indexind_anteile_plr_mss2015.xlsx"
  ["2017"]="$BASE/bericht-2017/2-1-indexind_anteile_plr_mss2017.xlsx"
  ["2019"]="$BASE/bericht-2019/2-1-indexind_anteile_plr_mss2019.xlsx"
  ["2021"]="$BASE/bericht-2021/tabelle_2-1_index-indikatoren_anteilswerte_auf_planungsraum-ebene_mss_2021.xlsx"
)

declare -A SDI_URLS=(
  ["2013"]="$BASE/bericht-2013/1-sdi_mss2013.xlsx"
  ["2015"]="$BASE/bericht-2015/1-sdi_mss2015.xlsx"
  ["2017"]="$BASE/bericht-2017/1-sdi_mss2017.xlsx"
  ["2019"]="$BASE/bericht-2019/1-sdi_mss2019.xlsx"
  ["2021"]="$BASE/bericht-2021/tabelle_1_gesamtindex_soziale_ungleichheit_sdi_mss_2021.xlsx"
)
# 2023 already synced — skip

for period in 2013 2015 2017 2019 2021; do
  echo "=== Syncing MSS $period ==="
  MSS_XLSX_URL="${URLS[$period]}" MSS_SDI_URL="${SDI_URLS[$period]}" MSS_PERIOD="$period" \
    pnpm tsx scripts/sync-stats.ts "$@"
  echo ""
done

echo "=== Social backfill complete ==="
