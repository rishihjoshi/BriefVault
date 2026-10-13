// fmtClock: Open-Meteo local-time ISO -> 12h clock. Run: node --test scripts/test-weather.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmtClock } from './build-digest.mjs';

test('fmtClock formats morning and evening times', () => {
  assert.equal(fmtClock('2026-10-13T07:09'), '7:09 AM');
  assert.equal(fmtClock('2026-10-13T18:28'), '6:28 PM');
});

test('fmtClock handles midnight and noon edges', () => {
  assert.equal(fmtClock('2026-10-13T00:05'), '12:05 AM');
  assert.equal(fmtClock('2026-10-13T12:00'), '12:00 PM');
});

test('fmtClock returns empty string on missing/garbage input', () => {
  assert.equal(fmtClock(''), '');
  assert.equal(fmtClock(undefined), '');
  assert.equal(fmtClock('not-a-date'), '');
});
