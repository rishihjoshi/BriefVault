// resolvePicks maps model index-picks back to trusted pool items. Run: node --test scripts/test-picks.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePicks } from './build-digest.mjs';

const pool = Array.from({ length: 6 }, (_, i) => ({
  title: `T${i}`, link: `https://x/${i}`, source: `S${i}`, snippet: '',
}));

test('resolves valid picks in order with their why', () => {
  const out = resolvePicks(pool, [{ i: 2, why: 'because' }, { i: 0, why: 'also' }], 2);
  assert.deepEqual(out.map(o => o.title), ['T2', 'T0']);
  assert.deepEqual(out.map(o => o.link), ['https://x/2', 'https://x/0']);
  assert.equal(out[0].why, 'because');
});

test('drops out-of-range, non-integer, and duplicate indices', () => {
  const out = resolvePicks(pool, [{ i: 99 }, { i: -1 }, { i: 'x' }, { i: 1 }, { i: 1 }], 2);
  // 1 is valid (used once); the rest invalid/dupes -> second slot padded from pool top (0)
  assert.equal(out.length, 2);
  assert.equal(out[0].title, 'T1');
  assert.ok(out.every(o => o.title && o.link));
});

test('pads to exactly n when the model under-picks', () => {
  const out = resolvePicks(pool, [{ i: 3, why: 'x' }], 3);
  assert.equal(out.length, 3);
  assert.equal(new Set(out.map(o => o.title)).size, 3); // no duplicates
  assert.ok(out.every(o => o.why), 'every item has a why (validateDigest requires it)');
});

test('handles missing/garbage picks array', () => {
  assert.equal(resolvePicks(pool, undefined, 2).length, 2);
  assert.equal(resolvePicks(pool, null, 2).length, 2);
});
