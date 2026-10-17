// resolvePicks maps model index-picks back to trusted pool items + source links.
// Run: node --test scripts/test-picks.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePicks } from './build-digest.mjs';

const pool = Array.from({ length: 6 }, (_, i) => ({
  title: `T${i}`, link: `https://x/${i}`, source: `S${i}`, snippet: '',
}));

test('resolves valid picks in order with summary + sources', () => {
  const out = resolvePicks(pool, [{ i: 2, summary: 'because', sources: [2, 0] }, { i: 1, summary: 'also' }], 2);
  assert.deepEqual(out.map(o => o.title), ['T2', 'T1']);
  assert.equal(out[0].summary, 'because');
  assert.equal(out[0].sources.length, 2);                 // two distinct outlets
  assert.ok(out[0].sources.every(s => /^https?:\/\//.test(s.link)));
  assert.equal(out[1].sources.length, 1);                 // only its own index
});

test('orders sources free-outlet first, and primary = a free source', () => {
  const p = [
    { title: 'A', link: 'https://wsj/a', source: 'Wall Street Journal', snippet: '' },
    { title: 'A', link: 'https://ap/a', source: 'AP News', snippet: '' },
  ];
  const out = resolvePicks(p, [{ i: 0, summary: 's', sources: [0, 1] }], 1);
  assert.equal(out[0].sources[0].source, 'AP News', 'free source should lead');
  assert.equal(out[0].source, 'AP News', 'primary link should be the free source');
  assert.equal(out[0].link, 'https://ap/a');
});

test('drops out-of-range/duplicate indices and pads to n', () => {
  const out = resolvePicks(pool, [{ i: 99 }, { i: -1 }, { i: 'x' }, { i: 1 }, { i: 1 }], 3);
  assert.equal(out.length, 3);
  assert.equal(out[0].title, 'T1');
  assert.equal(new Set(out.map(o => o.title)).size, 3);   // no duplicates
  assert.ok(out.every(o => o.title && o.link && o.summary && o.sources.length >= 1));
});

test('handles missing/garbage picks array', () => {
  assert.equal(resolvePicks(pool, undefined, 2).length, 2);
  assert.equal(resolvePicks(pool, null, 2).length, 2);
});
