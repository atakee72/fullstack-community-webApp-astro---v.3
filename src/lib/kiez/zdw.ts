// "Zahl der Woche" (figure of the week) derivation — PURE, client-safe.
// No Date.now() inside; the caller passes `now`. No db/fetch imports.
import { getISOWeek } from 'date-fns';
import type { KiezVM, KzAreaVM } from './kiezViewModel';
import type { AirHistoryResponse } from '../../types/kiezStats';

export type ZdwFigureKey = 'ageShare' | 'populationDelta' | 'diversity' | 'singleHouseholds' | 'airWeekMean';

export interface ZdwResult {
  kw: number; // ISO week
  figureKey: ZdwFigureKey;
  value: string; // pre-formatted, de-style decimals ("37,9 %") — EN callers replace ',' with '.'
  varsForText: Record<string, string>; // interpolation vars for the i18n reading line
}

// Fixed menu order — the ISO week seeds a rotating pick from this list.
const MENU: ZdwFigureKey[] = ['ageShare', 'populationDelta', 'diversity', 'singleHouseholds', 'airWeekMean'];

function deStr(n: number, decimals = 1): string {
  return n.toFixed(decimals).replace('.', ',');
}

function deriveFigure(
  key: ZdwFigureKey,
  area: KzAreaVM,
  history: AirHistoryResponse | null
): { value: string; varsForText: Record<string, string> } | null {
  switch (key) {
    case 'ageShare': {
      const pct = area.agePct[3]; // '27–44'
      if (pct === undefined || !(pct > 0)) return null;
      return { value: `${deStr(pct)} %`, varsForText: {} };
    }
    case 'populationDelta': {
      if (area.delta === null) return null;
      return { value: area.delta, varsForText: { vs: area.deltaVsLabel ?? '' } };
    }
    case 'diversity': {
      if (!area.mig) return null;
      const sum = Math.round((area.mig.a + area.mig.mh) * 10) / 10;
      return { value: `${deStr(sum)} %`, varsForText: {} };
    }
    case 'singleHouseholds': {
      // Honest-data rule: singlePerson is 0 in the DB today (AfS's E_E column is
      // an absolute count, not a share — see KiezDemographicsDoc.households) —
      // never fake a percentage. Self-enables once AfS ships the column; the
      // value format here will likely need revisiting once a real total-
      // households denominator is available to turn this into a share.
      if (!(area.singlePerson > 0)) return null;
      return { value: deStr(area.singlePerson, 0), varsForText: {} };
    }
    case 'airWeekMean': {
      if (!history) return null;
      const means = history.days.map((d) => d.lqiMean).filter((v): v is number => v !== null);
      if (means.length < 4) return null;
      const mean = means.reduce((a, b) => a + b, 0) / means.length;
      return { value: `LQI Ø ${deStr(mean)}`, varsForText: {} };
    }
    default:
      return null;
  }
}

export function deriveZdw(vm: KiezVM, history: AirHistoryResponse | null, now: Date): ZdwResult | null {
  const kw = getISOWeek(now);
  const area = vm.areas[0]; // Gesamt
  const startIndex = (kw - 1) % MENU.length;

  for (let i = 0; i < MENU.length; i++) {
    const idx = (startIndex + i) % MENU.length;
    const key = MENU[idx];
    const derived = deriveFigure(key, area, history);
    if (derived) {
      return { kw, figureKey: key, value: derived.value, varsForText: derived.varsForText };
    }
  }
  return null; // all underivable — card hidden, never fake
}
