/**
 * Sync Schillerkiez demographic & social data from XLSX sources into MongoDB.
 *
 * Usage:
 *   pnpm tsx scripts/sync-stats.ts           # full sync
 *   pnpm tsx scripts/sync-stats.ts --dry-run  # parse only, no DB writes
 *
 * Environment variables:
 *   MONGODB_URI      — MongoDB connection string (required)
 *   STATS_XLSX_URL   — AfS demographics XLSX URL (required)
 *   STATS_PERIOD     — e.g. "2025h2" (required)
 *   MSS_XLSX_URL     — MSS social index XLSX URL (optional)
 *   MSS_PERIOD       — e.g. "2023" (optional, required if MSS_XLSX_URL set)
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import ExcelJS from 'exceljs';

// Schillerkiez Planungsraum codes (2021 LOR system)
const PLR_CODES = ['08100102', '08100103', '08100104', '08100105'];

const isDryRun = process.argv.includes('--dry-run');

// ─── Helpers ────────────────────────────────────────────────────────

function cellValue(row: ExcelJS.Row, col: number): string | number | undefined {
  const cell = row.getCell(col);
  const v = cell.value;
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'object' && 'result' in v) return (v as any).result;
  return v as string | number;
}

function toNumber(v: string | number | undefined): number {
  if (v === undefined || v === null || v === '') return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function findHeaderRow(sheet: ExcelJS.Worksheet, keywords: string[]): { rowNum: number; colMap: Map<string, number> } | null {
  for (let r = 1; r <= Math.min(sheet.rowCount, 20); r++) {
    const row = sheet.getRow(r);
    const colMap = new Map<string, number>();
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = String(cell.value ?? '').trim().toUpperCase();
      if (text) colMap.set(text, colNumber);
    });
    const matched = keywords.filter(k => colMap.has(k.toUpperCase()));
    if (matched.length >= 2) {
      return { rowNum: r, colMap };
    }
  }
  return null;
}

function findSheet(workbook: ExcelJS.Workbook, keywords: string[], contentKeywords?: string[]): ExcelJS.Worksheet | null {
  // First try matching by sheet name
  for (const sheet of workbook.worksheets) {
    const name = sheet.name.toLowerCase();
    if (keywords.some(k => name.includes(k.toLowerCase()))) {
      return sheet;
    }
  }
  // Fall back to scanning sheet contents for header keywords (e.g. PLR column)
  if (contentKeywords) {
    for (const sheet of workbook.worksheets) {
      const header = findHeaderRow(sheet, contentKeywords);
      if (header) return sheet;
    }
  }
  return null;
}

async function downloadXlsx(url: string): Promise<ExcelJS.Workbook> {
  console.log(`  Downloading: ${url}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

// ─── AfS Demographics Sync ─────────────────────────────────────────

interface DemographicsRow {
  plr_code: string;
  plr_name: string;
  total: number;
  male: number;
  female: number;
  u6: number;
  u18: number;
  u27: number;
  u45: number;
  u55: number;
  u65: number;
  a65: number;
  foreign_nationals: number;
  migration_background: number;
  single_person: number;
}

/**
 * Build full 8-digit PLR code from 4 LOR columns.
 * AfS XLSX uses columns: Bezirk(2), Prognoseraum(2), Bezirksregion(2), Planungsraum(2)
 */
function buildPlrCode(row: ExcelJS.Row): string {
  const bez = String(cellValue(row, 1) ?? '').trim().padStart(2, '0');
  const prog = String(cellValue(row, 2) ?? '').trim().padStart(2, '0');
  const bzr = String(cellValue(row, 3) ?? '').trim().padStart(2, '0');
  const plr = String(cellValue(row, 4) ?? '').trim().padStart(2, '0');
  return `${bez}${prog}${bzr}${plr}`;
}

/**
 * Find the first data row in an AfS sheet (skip header rows).
 * Data rows start when column 1 has a 2-digit Bezirk number.
 */
function findFirstDataRow(sheet: ExcelJS.Worksheet): number {
  for (let r = 1; r <= Math.min(sheet.rowCount, 20); r++) {
    const v = String(cellValue(sheet.getRow(r), 1) ?? '').trim();
    if (/^\d{1,2}$/.test(v)) return r;
  }
  return -1;
}

async function syncAfS(db: any) {
  const url = process.env.STATS_XLSX_URL;
  const period = process.env.STATS_PERIOD;
  if (!url || !period) {
    console.log('⚠ AfS sync skipped: STATS_XLSX_URL or STATS_PERIOD not set');
    return;
  }

  console.log('\n═══ AfS Demographics Sync ═══');
  const workbook = await downloadXlsx(url);
  console.log(`  Sheets: ${workbook.worksheets.map(s => s.name).join(', ')}`);

  // T2 has population by age + gender + Ausländer
  // T1 has population + migration background breakdown
  const t2 = workbook.getWorksheet('T2');
  const t1 = workbook.getWorksheet('T1');
  if (!t2) {
    console.error('  ✗ Sheet "T2" not found');
    return;
  }
  if (!t1) {
    console.log('  ⚠ Sheet "T1" not found — migration background data will be 0');
  }

  // T2 column layout (positional — verified from actual XLSX):
  // 1: Bezirk, 2: Prognoseraum, 3: Bezirksregion, 4: Planungsraum
  // 5: Insgesamt (total), 6: unter 6, 7: 6-15, 8: 15-18, 9: 18-27,
  // 10: 27-45, 11: 45-55, 12: 55-65, 13: 65+, 14: weiblich, 15: Ausländer
  const T2_COLS = { total: 5, u6: 6, u15: 7, u18: 8, u27: 9, u45: 10, u55: 11, u65: 12, a65: 13, female: 14, foreign: 15 };

  // T1 column layout:
  // 1-4: LOR codes, 5: Insgesamt (Anzahl), 6: % , 7: MH (Anzahl), 8: MH %
  // 9: Deutsche zusammen, 10: %, 11: ohne MH, 12: %, 13: mit MH, 14: %, 15: Ausländer, 16: %
  const T1_COLS = { total: 5, mh_count: 7, foreign: 15 };

  // Build PLR name lookup from Schlüssel sheet
  const nameMap = new Map<string, string>();
  const schluessel = workbook.getWorksheet('Schlüssel');
  if (schluessel) {
    for (let r = 1; r <= schluessel.rowCount; r++) {
      const row = schluessel.getRow(r);
      const plr = buildPlrCode(row);
      const name = String(cellValue(row, 5) ?? '').trim();
      if (name && PLR_CODES.includes(plr)) nameMap.set(plr, name);
    }
  }

  const firstRow = findFirstDataRow(t2);
  if (firstRow < 0) {
    console.error('  ✗ Could not find first data row in T2');
    return;
  }
  console.log(`  T2 data starts at row ${firstRow}`);

  // Build T1 migration lookup (plr_code → { mh, foreign })
  const migrationMap = new Map<string, { mh: number; foreign: number }>();
  if (t1) {
    const t1Start = findFirstDataRow(t1);
    if (t1Start > 0) {
      for (let r = t1Start; r <= t1.rowCount; r++) {
        const row = t1.getRow(r);
        const plr = buildPlrCode(row);
        if (!PLR_CODES.includes(plr)) continue;
        migrationMap.set(plr, {
          mh: toNumber(cellValue(row, T1_COLS.mh_count)),
          foreign: toNumber(cellValue(row, T1_COLS.foreign)),
        });
      }
    }
  }

  // Extract T2 rows for our PLR codes
  const rows: DemographicsRow[] = [];
  for (let r = firstRow; r <= t2.rowCount; r++) {
    const row = t2.getRow(r);
    const plr = buildPlrCode(row);
    if (!PLR_CODES.includes(plr)) continue;

    const total = toNumber(cellValue(row, T2_COLS.total));
    const female = toNumber(cellValue(row, T2_COLS.female));
    const foreign_t2 = toNumber(cellValue(row, T2_COLS.foreign));

    // Age groups — note: AfS T2 uses 6-15 and 15-18, but our schema uses u18 (under 18)
    // We combine: u18 = (6-15) + (15-18) to get 6-17 equivalent
    const u6 = toNumber(cellValue(row, T2_COLS.u6));
    const age6_15 = toNumber(cellValue(row, T2_COLS.u15));
    const age15_18 = toNumber(cellValue(row, T2_COLS.u18));

    // Migration data from T1
    const mig = migrationMap.get(plr);

    rows.push({
      plr_code: plr,
      plr_name: nameMap.get(plr) ?? plr,
      total,
      male: total - female,
      female,
      u6,
      u18: age6_15 + age15_18, // 6–17
      u27: toNumber(cellValue(row, T2_COLS.u27)),
      u45: toNumber(cellValue(row, T2_COLS.u45)),
      u55: toNumber(cellValue(row, T2_COLS.u55)),
      u65: toNumber(cellValue(row, T2_COLS.u65)),
      a65: toNumber(cellValue(row, T2_COLS.a65)),
      foreign_nationals: mig?.foreign ?? foreign_t2,
      migration_background: mig?.mh ?? 0,
      single_person: 0, // Not available in this publication
    });
  }

  console.log(`  Matched ${rows.length} of ${PLR_CODES.length} PLR areas`);
  for (const row of rows) {
    console.log(`    ${row.plr_code} — ${row.plr_name}: ${row.total} residents`);
  }

  if (isDryRun) {
    console.log('  [DRY RUN] No database writes');
    return;
  }

  // Compute period date
  const periodDate = period.includes('h1') ? `${period.slice(0, 4)}-06-30` : `${period.slice(0, 4)}-12-31`;

  const collection = db.collection('schillerkiez_demographics');
  await collection.createIndex({ plr_code: 1, period: 1 }, { unique: true });

  let upserted = 0;
  for (const row of rows) {
    const doc = {
      plr_code: row.plr_code,
      plr_name: row.plr_name,
      period,
      date: periodDate,
      population: { total: row.total, male: row.male, female: row.female },
      age_groups: {
        u6: row.u6, u18: row.u18, u27: row.u27, u45: row.u45,
        u55: row.u55, u65: row.u65, a65: row.a65,
      },
      migration: {
        foreign_nationals: row.foreign_nationals,
        migration_background: row.migration_background,
      },
      households: { single_person: row.single_person },
    };
    await collection.updateOne(
      { plr_code: row.plr_code, period },
      { $set: doc },
      { upsert: true }
    );
    upserted++;
  }
  console.log(`  ✓ Upserted ${upserted} documents into schillerkiez_demographics`);
}

// ─── MSS Social Index Sync ──────────────────────────────────────────

// MSS uses two XLSX files:
// 1. Indicators file (MSS_XLSX_URL): rates at PLR level
//    Col layout: [1] PLR code, [2] name, [3] population,
//    [4] S1 (unemployment %), [5] S2 (child poverty %), [6] S3 (youth unemployment %), [7] S4 (transfer benefits %),
//    [8] D1–D4 (dynamic indicators — changes over time)
// 2. SDI file (MSS_SDI_URL): Status-Index and Dynamik-Index classes
//    Col layout: [1] PLR code, [2] name, [3] pop, [4] Status class (1-4), [5] Status label, [6] Dynamik class, [7] Dynamik label

const MSS_SDI_URL = 'https://www.berlin.de/sen/sbw/_assets/stadtdaten/stadtwissen/monitoring-soziale-stadtentwicklung/bericht-2023/1sdi_mss2023.xlsx';

async function syncMSS(db: any) {
  const url = process.env.MSS_XLSX_URL;
  const period = process.env.MSS_PERIOD;
  if (!url) {
    console.log('\n⚠ MSS sync skipped: MSS_XLSX_URL not set');
    return;
  }
  if (!period) {
    console.log('\n⚠ MSS sync skipped: MSS_PERIOD not set');
    return;
  }

  console.log('\n═══ MSS Social Index Sync ═══');

  // Download indicators file
  const workbook = await downloadXlsx(url);
  const ws = workbook.worksheets[0];
  console.log(`  Indicators sheet: "${ws.name}" (${ws.rowCount} rows)`);

  // Find first data row — PLR codes are 8-digit strings in column 1
  let dataStart = -1;
  for (let r = 1; r <= Math.min(ws.rowCount, 20); r++) {
    const v = String(cellValue(ws.getRow(r), 1) ?? '').trim();
    if (/^\d{8}$/.test(v)) { dataStart = r; break; }
  }
  if (dataStart < 0) {
    console.error('  ✗ Could not find first data row in indicators file');
    return;
  }
  console.log(`  Data starts at row ${dataStart}`);

  // Download SDI file for Status/Dynamik index
  const sdiMap = new Map<string, { status: number; dynamik: number }>();
  try {
    const sdiWb = await downloadXlsx(MSS_SDI_URL);
    const sdiWs = sdiWb.worksheets[0];
    console.log(`  SDI sheet: "${sdiWs.name}" (${sdiWs.rowCount} rows)`);
    for (let r = 1; r <= sdiWs.rowCount; r++) {
      const row = sdiWs.getRow(r);
      const plr = String(cellValue(row, 1) ?? '').trim();
      if (!PLR_CODES.includes(plr)) continue;
      sdiMap.set(plr, {
        status: toNumber(cellValue(row, 4)),
        dynamik: toNumber(cellValue(row, 6)),
      });
    }
  } catch (e) {
    console.log(`  ⚠ Could not fetch SDI file: ${e instanceof Error ? e.message : e}`);
  }

  // Extract indicator rows for our PLR codes
  interface SocialRow {
    plr_code: string;
    plr_name: string;
    unemployment_rate: number;
    child_poverty_rate: number;
    youth_unemployment_rate: number;
    transfer_benefit_rate: number;
    status_index: number;
    dynamik_index: number;
  }

  const rows: SocialRow[] = [];
  for (let r = dataStart; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const plr = String(cellValue(row, 1) ?? '').trim();
    if (!PLR_CODES.includes(plr)) continue;

    const sdi = sdiMap.get(plr);
    rows.push({
      plr_code: plr,
      plr_name: String(cellValue(row, 2) ?? plr),
      unemployment_rate: Math.round(toNumber(cellValue(row, 4)) * 100) / 100,
      child_poverty_rate: Math.round(toNumber(cellValue(row, 5)) * 100) / 100,
      youth_unemployment_rate: Math.round(toNumber(cellValue(row, 6)) * 100) / 100,
      transfer_benefit_rate: Math.round(toNumber(cellValue(row, 7)) * 100) / 100,
      status_index: sdi?.status ?? 0,
      dynamik_index: sdi?.dynamik ?? 0,
    });
  }

  console.log(`  Matched ${rows.length} of ${PLR_CODES.length} PLR areas`);
  for (const row of rows) {
    console.log(`    ${row.plr_code} — ${row.plr_name}: unemployment ${row.unemployment_rate}%, child poverty ${row.child_poverty_rate}%, transfers ${row.transfer_benefit_rate}%`);
  }

  if (isDryRun) {
    console.log('  [DRY RUN] No database writes');
    return;
  }

  const collection = db.collection('schillerkiez_social');
  await collection.createIndex({ plr_code: 1, period: 1 }, { unique: true });

  let upserted = 0;
  for (const row of rows) {
    await collection.updateOne(
      { plr_code: row.plr_code, period },
      { $set: { ...row, period } },
      { upsert: true }
    );
    upserted++;
  }
  console.log(`  ✓ Upserted ${upserted} documents into schillerkiez_social`);
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log(`Schillerkiez Stats Sync${isDryRun ? ' [DRY RUN]' : ''}`);
  console.log('PLR codes:', PLR_CODES.join(', '));

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('✗ MONGODB_URI not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    if (!isDryRun) {
      await client.connect();
      console.log('Connected to MongoDB');
    }

    const db = isDryRun ? null : client.db();
    await syncAfS(db);
    await syncMSS(db);

    console.log('\n✓ Sync complete');
  } catch (err) {
    console.error('✗ Sync failed:', err);
    process.exit(1);
  } finally {
    if (!isDryRun) await client.close();
  }
}

main();
