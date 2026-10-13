// End-to-end client flow without a real browser: a minimal document + fetch stub
// drives app.js's actual loadDigest() -> render -> tab-switch path on a fixture digest.
// (No Chrome DevTools MCP available in CI; this exercises the real render pipeline.)
// Run: node --test scripts/test-e2e.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

// --- fixture: a realistic digest with one booby-trapped link -----------------
const DIGEST = {
  generatedAt: '2026-10-13T11:00:00.000Z',
  location: 'St. Louis, MO',
  weather: {
    high: 72, low: 54, highC: 22, lowC: 12, precip: 10, wind: 8,
    sunrise: '7:09 AM', sunset: '6:28 PM', label: 'Partly cloudy', emoji: '⛅',
  },
  tabs: {
    local: { items: [
      { title: 'Local lead', link: 'https://ex/1', source: 'S', why: 'w' },
      { title: 'Evil', link: 'javascript:alert(document.cookie)', source: 'S', why: 'w' },
    ] },
    world: { items: [{ title: 'World lead', link: 'https://ex/2', source: 'S', why: 'w' }] },
    india: {
      items: [{ title: 'India lead', link: 'https://ex/3', source: 'S', why: 'w' }],
      immigration: [{ title: 'H-1B update', link: 'https://ex/4', source: 'S', why: 'w' }],
    },
  },
  micro: { theme: 'focus', cards: [{ title: 'Card one', insight: 'i', takeaway: 't' }] },
};

// --- minimal DOM/fetch stub (only what app.js actually touches) ---------------
function makeEl() {
  let html = '';
  return {
    set innerHTML(v) { html = v; }, get innerHTML() { return html; },
    textContent: '', scrollTop: 0,
    setAttribute() {}, removeAttribute() {}, focus() {}, addEventListener() {},
    querySelector() { return { addEventListener() {} }; },
  };
}
const els = { main: makeEl(), 'tab-title': makeEl(), updated: makeEl() };
globalThis.document = {
  getElementById: id => (els[id] ||= makeEl()),
  querySelectorAll: () => [],
  addEventListener() {},
};
globalThis.fetch = async () => ({ ok: true, json: async () => DIGEST });

const { loadDigest, show } = await import('../docs/app.js');

test('loadDigest renders the Local tab with full weather details', async () => {
  await loadDigest();
  const html = els.main.innerHTML;
  for (const s of ['⛅', '72°F', '22°C', '7:09 AM', '6:28 PM', '8 mph', 'Local lead']) {
    assert.ok(html.includes(s), `Local render missing "${s}"`);
  }
  assert.ok(els.updated.textContent.startsWith('Updated'), 'updated timestamp not set');
});

test('the javascript: link is neutralized end-to-end (never a live href)', () => {
  const html = els.main.innerHTML;
  assert.ok(!/href="javascript:/i.test(html), 'javascript: href leaked through the pipeline');
  assert.ok(html.includes('href="#"'), 'bad link should degrade to href="#"');
});

test('switching tabs re-renders the right content', () => {
  show('world');
  assert.ok(els.main.innerHTML.includes('World lead'));

  show('india');
  const india = els.main.innerHTML;
  assert.ok(india.includes('India lead'));
  assert.ok(india.includes('US–India Immigration'));
  assert.ok(india.includes('H-1B update'));

  show('micro');
  const micro = els.main.innerHTML;
  assert.ok(micro.includes('Card one'));
  assert.ok(micro.includes('Try this'));
});
