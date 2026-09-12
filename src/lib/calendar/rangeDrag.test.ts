// Unit tests for the touch-drag end resolver. Run directly:
//   npx tsx src/lib/calendar/rangeDrag.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDragEnd } from './rangeDrag';

const d = (s: string) => new Date(`${s}T00:00:00`); // local midnight, like the grid's cells
const today = d('2026-09-11');
const ms = (x: Date | null) => x?.getTime() ?? null;

test('extends to a later in-month day', () => {
  assert.equal(ms(resolveDragEnd(d('2026-09-15'), d('2026-09-18'), today, null)), ms(d('2026-09-18')));
});

test('keeps the previous end when the finger is off the grid', () => {
  assert.equal(ms(resolveDragEnd(d('2026-09-15'), null, today, d('2026-09-18'))), ms(d('2026-09-18')));
});

test('extends into a greyed out-of-month cell (parity with the desktop drag)', () => {
  assert.equal(ms(resolveDragEnd(d('2026-09-15'), d('2026-10-01'), today, d('2026-09-18'))), ms(d('2026-10-01')));
});

test('clamps a backwards drag at today', () => {
  assert.equal(ms(resolveDragEnd(d('2026-09-15'), d('2026-09-03'), today, null)), ms(today));
});

test('back on the anchor day means a single-day selection', () => {
  assert.equal(resolveDragEnd(d('2026-09-15'), d('2026-09-15'), today, d('2026-09-18')), null);
});

test('anchor is today and the finger goes into the past: single-day', () => {
  assert.equal(resolveDragEnd(today, d('2026-09-03'), today, null), null);
});

test('a candidate with a time part is normalised to midnight', () => {
  const noon = new Date('2026-09-18T12:30:00');
  assert.equal(ms(resolveDragEnd(d('2026-09-15'), noon, today, null)), ms(d('2026-09-18')));
});
