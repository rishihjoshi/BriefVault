// parseStooqQuotes: Stooq light-quote CSV -> market tiles. Run: node --test scripts/test-markets.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStooqQuotes } from './build-digest.mjs';

const csv = [
  'Symbol,Date,Time,Open,High,Low,Close,Volume',
  'SPY.US,2026-10-14,22:00:00,580,585,579,582.9,1000000',   // +0.5%
  'QQQ.US,2026-10-14,22:00:00,500,501,495,495,2000000',     // -1.0%
  'XYZ.US,N/D,N/D,N/D,N/D,N/D,N/D,N/D',                     // unavailable → skipped
].join('\n');

test('parses price, computes session change, maps friendly name', () => {
  const q = parseStooqQuotes(csv);
  assert.equal(q.length, 2, 'N/D row should be skipped');
  assert.equal(q[0].symbol, 'SPY.US');
  assert.equal(q[0].price, 582.9);
  assert.equal(q[0].changePct, 0.5);
  assert.equal(q[0].name, 'S&P 500 · SPY');   // mapped case-insensitively
  assert.equal(q[1].changePct, -1);
});

test('handles empty/garbage input without throwing', () => {
  assert.deepEqual(parseStooqQuotes(''), []);
  assert.deepEqual(parseStooqQuotes('Symbol,Date,Time,Open,High,Low,Close,Volume'), []);
});
