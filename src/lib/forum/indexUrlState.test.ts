// Unit tests for the forum index URL-state helper. Run directly:
//   npx tsx src/lib/forum/indexUrlState.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIndexState, serializeIndexState } from './indexUrlState';

const BASE = 'http://localhost:4655/forum';

test('empty query is the default state', () => {
  assert.deepEqual(parseIndexState(''), { kind: 'all', tag: null, pages: 1 });
  assert.deepEqual(parseIndexState('?'), { kind: 'all', tag: null, pages: 1 });
});

test('parses kind, tag and more', () => {
  assert.deepEqual(parseIndexState('?kind=discussion&tag=garten&more=3'), {
    kind: 'discussion', tag: 'garten', pages: 3,
  });
});

test('unknown kind falls back to all; saved is not a URL kind', () => {
  assert.equal(parseIndexState('?kind=bogus').kind, 'all');
  assert.equal(parseIndexState('?kind=saved').kind, 'all');
  assert.equal(parseIndexState('?kind=mine').kind, 'mine');
});

test('tag is trimmed, a leading # is stripped, empty is none', () => {
  assert.equal(parseIndexState('?tag=%23garten').tag, 'garten');
  assert.equal(parseIndexState('?tag=%20caf%C3%A9%20').tag, 'café');
  assert.equal(parseIndexState('?tag=').tag, null);
  assert.equal(parseIndexState('?tag=%23').tag, null);
});

test('more below 2 or non-numeric is one page', () => {
  assert.equal(parseIndexState('?more=1').pages, 1);
  assert.equal(parseIndexState('?more=0').pages, 1);
  assert.equal(parseIndexState('?more=-4').pages, 1);
  assert.equal(parseIndexState('?more=abc').pages, 1);
  assert.equal(parseIndexState('?more=2.9').pages, 2);
});

test('serializes non-default values only', () => {
  assert.equal(serializeIndexState({ kind: 'all', tag: null, pages: 1 }, BASE), BASE);
  assert.equal(
    serializeIndexState({ kind: 'discussion', tag: 'garten', pages: 2 }, BASE),
    `${BASE}?kind=discussion&tag=garten&more=2`,
  );
  assert.equal(serializeIndexState({ kind: 'mine', tag: null, pages: 1 }, BASE), `${BASE}?kind=mine`);
});

test('serializing removes stale params and keeps unrelated ones', () => {
  const href = `${BASE}?kind=discussion&tag=garten&more=2&just_posted=1`;
  assert.equal(
    serializeIndexState({ kind: 'all', tag: null, pages: 1 }, href),
    `${BASE}?just_posted=1`,
  );
});

test('round-trips', () => {
  const s = { kind: 'recommendation' as const, tag: 'umsonst', pages: 4 };
  const href = serializeIndexState(s, BASE);
  assert.deepEqual(parseIndexState(new URL(href).search), s);
});
