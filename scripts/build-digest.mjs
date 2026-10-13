#!/usr/bin/env node
// Builds docs/data/digest.json for BriefVault.
// Fetches free RSS feeds + Open-Meteo weather, then ONE Claude call ranks the
// news to the top 5 per tab (+ "why it matters"), picks a Top Story, and writes
// the microlearning cards. The browser never does any of this and never sees a key.
//
// Run:  ANTHROPIC_API_KEY=... node scripts/build-digest.mjs
// Check: node scripts/build-digest.mjs --selfcheck   (validates existing digest.json)

import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';
import Parser from 'rss-parser';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'docs', 'data', 'digest.json');

const MODEL = 'claude-haiku-4-5-20251001'; // cheap; this is a daily ranking/summary job
const POOL_CAP = 15;                        // items per feed handed to Claude

// St. Louis, MO
const LAT = 38.627, LON = -90.199, TZ = 'America/Chicago';

const FEEDS = {
  local: ['https://news.google.com/rss/search?q=%22St.+Louis%22+Missouri&hl=en-US&gl=US&ceid=US:en'],
  world: [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en',
  ],
  india: ['https://news.google.com/rss/search?q=India&hl=en-IN&gl=IN&ceid=IN:en'],
  immigration: ['https://news.google.com/rss/search?q=H-1B+OR+%22green+card%22+OR+USCIS+OR+%22India+immigration%22&hl=en-US&gl=US&ceid=US:en'],
};

// Microlearning theme rotates by day-of-year so it's deterministic and varied.
const THEMES = [
  'productivity & focus', 'stoic philosophy', 'personal finance', 'physical & mental health',
  'decision-making', 'communication & persuasion', 'habits & behavior change', 'creativity',
];

// WMO weather codes -> {label, emoji}. Covers the common buckets.
const WMO = {
  0: ['Clear', '☀️'], 1: ['Mainly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
  45: ['Fog', '🌫️'], 48: ['Rime fog', '🌫️'],
  51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Heavy drizzle', '🌧️'],
  61: ['Light rain', '🌧️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
  66: ['Freezing rain', '🌧️'], 67: ['Freezing rain', '🌧️'],
  71: ['Light snow', '🌨️'], 73: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'], 77: ['Snow grains', '🌨️'],
  80: ['Showers', '🌦️'], 81: ['Showers', '🌧️'], 82: ['Violent showers', '⛈️'],
  85: ['Snow showers', '🌨️'], 86: ['Snow showers', '❄️'],
  95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm + hail', '⛈️'], 99: ['Thunderstorm + hail', '⛈️'],
};

const parser = new Parser({ timeout: 15000 });

async function fetchPool(urls) {
  const items = [];
  for (const url of urls) {
    try {
      const feed = await parser.parseURL(url);
      for (const it of (feed.items || [])) {
        items.push({
          title: (it.title || '').trim(),
          link: (it.link || '').trim(),
          source: feed.title || new URL(url).hostname,
          isoDate: it.isoDate || it.pubDate || '',
          snippet: (it.contentSnippet || it.content || '').replace(/\s+/g, ' ').trim().slice(0, 300),
        });
      }
    } catch (err) {
      console.warn(`feed failed: ${url} -> ${err.message}`);
    }
  }
  // newest first, drop empties, cap
  return items
    .filter(i => i.title && i.link)
    .sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate))
    .slice(0, POOL_CAP);
}

async function fetchWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}`
    + `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code`
    + `&temperature_unit=fahrenheit&timezone=${encodeURIComponent(TZ)}&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const d = (await res.json()).daily;
  const code = d.weather_code[0];
  const [label, emoji] = WMO[code] || ['—', '🌡️'];
  return {
    high: Math.round(d.temperature_2m_max[0]),
    low: Math.round(d.temperature_2m_min[0]),
    precip: d.precipitation_probability_max[0] ?? 0,
    label, emoji,
  };
}

function buildPrompt(pools, theme) {
  const show = arr => arr.map((it, i) =>
    `  [${i}] ${it.title} — ${it.source}${it.snippet ? ` :: ${it.snippet}` : ''}  <${it.link}>`
  ).join('\n');
  return `You are the editor of a personal daily briefing. From each pool of raw headlines,
pick the 5 MOST IMPORTANT, distinct stories (dedupe near-identical coverage; prefer
substantive, recent, high-impact news over fluff). Keep each item's exact link.

Return ONLY valid JSON, no prose, no code fences, matching this shape exactly:
{
  "local":       { "items": [ {"title","link","source","why"} x5 ] },
  "world":       { "items": [ {"title","link","source","why"} x5 ] },
  "india":       { "items": [ {"title","link","source","why"} x5 ] },
  "immigration": { "items": [ {"title","link","source","why"} x3 ] },
  "micro":       { "theme": "${theme}", "cards": [ {"title","insight","takeaway"} x4 ] }
}
Rules:
- "why" = ONE short sentence on why it matters. "title"/"link"/"source" copied from the pool.
- The first item in each list is the Top Story (most important) — order by importance.
- "immigration" = the 3 most important US–India immigration items (H-1B, green card, USCIS, visas).
- "micro" cards are ORIGINAL insights you write on the theme "${theme}" (do NOT quote or
  summarize any specific copyrighted book). "insight" = 2–3 sentences; "takeaway" = one action.

POOL local (St. Louis, MO):
${show(pools.local)}

POOL world:
${show(pools.world)}

POOL india:
${show(pools.india)}

POOL immigration (US–India):
${show(pools.immigration)}`;
}

function extractJson(text) {
  const t = text.trim();
  const s = t.indexOf('{'), e = t.lastIndexOf('}');  // first..last brace ignores any ``` fences
  if (s === -1 || e === -1) throw new Error('no JSON object in model output');
  return JSON.parse(t.slice(s, e + 1));
}

function validateDigest(d) {
  assert.ok(d.generatedAt, 'missing generatedAt');
  const w = d.weather;
  for (const k of ['high', 'low', 'precip']) assert.equal(typeof w[k], 'number', `weather.${k} not a number`);
  const check = (items, n, name) => {
    assert.equal(items.length, n, `${name} expected ${n} items, got ${items.length}`);
    for (const it of items) {
      assert.ok(it.title, `${name} item missing title`);
      assert.ok(/^https?:\/\//.test(it.link || ''), `${name} item missing valid link`);
      assert.ok(it.why, `${name} item missing why`);
    }
  };
  check(d.tabs.local.items, 5, 'local');
  check(d.tabs.world.items, 5, 'world');
  check(d.tabs.india.items, 5, 'india');
  check(d.tabs.india.immigration, 3, 'immigration');
  assert.ok(d.micro.theme, 'micro.theme missing');
  assert.ok(d.micro.cards.length >= 3, 'micro needs >=3 cards');
  for (const c of d.micro.cards) assert.ok(c.title && c.insight && c.takeaway, 'micro card incomplete');
}

async function main() {
  if (process.argv.includes('--selfcheck')) {
    validateDigest(JSON.parse(readFileSync(OUT, 'utf8')));
    console.log('selfcheck OK:', OUT);
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  assert.ok(apiKey, 'ANTHROPIC_API_KEY not set');

  const dayOfYear = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 864e5);
  const theme = THEMES[dayOfYear % THEMES.length];

  const [local, world, india, immigration, weather] = await Promise.all([
    fetchPool(FEEDS.local), fetchPool(FEEDS.world), fetchPool(FEEDS.india),
    fetchPool(FEEDS.immigration), fetchWeather(),
  ]);
  const pools = { local, world, india, immigration };
  for (const [k, v] of Object.entries(pools)) {
    assert.ok(v.length, `empty pool: ${k} (all feeds failed?)`);
  }

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    messages: [{ role: 'user', content: buildPrompt(pools, theme) }],
  });
  const r = extractJson(msg.content[0].text);

  const digest = {
    generatedAt: new Date().toISOString(),
    location: 'St. Louis, MO',
    weather,
    tabs: {
      local: { items: r.local.items },
      world: { items: r.world.items },
      india: { items: r.india.items, immigration: r.immigration.items },
    },
    micro: r.micro,
  };

  validateDigest(digest);
  writeFileSync(OUT, JSON.stringify(digest, null, 2));
  console.log(`wrote ${OUT} @ ${digest.generatedAt} (theme: ${theme})`);
}

main().catch(err => { console.error(err); process.exit(1); });
