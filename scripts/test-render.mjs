// Unit tests for the pure render helpers in app.js. Run: node --test scripts/test-render.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderWeather, rankedBlock, freshness } from '../docs/app.js';

test('renderWeather shows °F, °C, sunrise, sunset, and wind', () => {
  const html = renderWeather({
    high: 72, low: 54, highC: 22, lowC: 12, precip: 10, wind: 8,
    sunrise: '7:09 AM', sunset: '6:28 PM', label: 'Partly cloudy', emoji: '⛅',
  });
  for (const s of ['72°F', '22°C', '54°F', '12°C', '10%', '7:09 AM', '6:28 PM', '8 mph', 'Partly cloudy', '⛅']) {
    assert.ok(html.includes(s), `missing "${s}" in weather render`);
  }
});

test('renderWeather degrades missing fields to empty, never prints "undefined"', () => {
  const html = renderWeather({ high: 60, emoji: '☀️' }); // sparse object
  assert.ok(!html.includes('undefined'), 'leaked undefined into weather render');
});

test('rankedBlock shows an empty state for no items', () => {
  assert.ok(rankedBlock([]).includes('No stories yet'));
  assert.ok(rankedBlock(undefined).includes('No stories yet'));
});

test('rankedBlock makes the first item the Top Story and lists the rest', () => {
  const html = rankedBlock([
    { title: 'Lead', link: 'https://a', source: 'A', why: 'x' },
    { title: 'Second', link: 'https://b', source: 'B', why: 'y' },
  ]);
  assert.ok(html.includes('Top Story'), 'first item should be the Top Story banner');
  assert.ok(html.includes('Lead') && html.includes('Second'));
});

test('freshness flags a day-old briefing as stale', () => {
  const now = Date.parse('2026-10-13T12:00:00Z');
  const fresh = freshness('2026-10-13T06:00:00Z', now);   // 6h old
  assert.equal(fresh.stale, false);
  assert.ok(!fresh.label.includes('⚠'));

  const old = freshness('2026-10-11T06:00:00Z', now);     // >2 days old
  assert.equal(old.stale, true);
  assert.ok(old.label.includes('⚠') && old.label.includes('may be stale'));

  assert.deepEqual(freshness('garbage', now), { label: '', stale: false });
});
