// DailyPulse — reads the pre-built digest.json and renders 4 tabs.
// No API key, no AI, no network beyond fetching its own digest (built by the Action).

const APP_VERSION = '15'; // keep in sync with CACHE_NAME in sw.js (dailypulse-v15)

const TITLES = {
  local: 'USA',
  world: 'World',
  india: 'India',
  finance: 'Finance',
  micro: 'Microlearning',
};

// Per-tab editorial masthead: an eyebrow tag + line-art SVG motif (no emoji, offline-safe)
// + a big serif title under a newspaper double-rule. Inspired by the GLOBAL PULSE mockup.
const HERO = {
  local: { tag: 'United States', title: 'USA Pulse',
    svg: '<line x1="4" y1="22" x2="4" y2="2.5"/><path d="M4 3.5h13l-3 4 3 4H4" stroke="#b23b2e"/>' },
  world: { tag: 'Around the world', title: 'Global Pulse',
    svg: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18" stroke="#b23b2e"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18"/>' },
  india: { tag: 'India & immigration', title: 'India Pulse',
    svg: '<circle cx="12" cy="12" r="9" stroke="#b23b2e"/><circle cx="12" cy="12" r="2"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/>' },
  finance: { tag: 'Markets & money', title: 'Market Pulse',
    svg: '<path d="M3 3v18h18"/><path d="M7 15l3-4 3 2 5-7" stroke="#b23b2e"/><path d="M15 4h4v4" stroke="#b23b2e"/>' },
  micro: { tag: 'Today’s lesson', title: 'Daily Lesson',
    svg: '<path d="M2 5h7a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H2z"/><path d="M22 5h-7a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h7z" stroke="#b23b2e"/>' },
};
function heroBanner(tab) {
  const h = HERO[tab];
  if (!h) return '';
  return `<div class="masthead">
    <div class="masthead-top">
      <span class="masthead-eyebrow">${esc(h.tag)}</span>
      <svg class="masthead-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${h.svg}</svg>
    </div>
    <h2 class="masthead-title">${esc(h.title)}</h2>
  </div>`;
}

let digest = null;
let current = 'local';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// esc() keeps a value inside the quoted attribute but does NOT block the javascript:/data:
// scheme, so href needs its own allowlist: only http(s) links render, anything else → '#'.
const safeUrl = u => /^https?:\/\//i.test(String(u ?? '').trim()) ? String(u).trim() : '#';

// "Read: AP · BBC · Reuters" — 2-3 external source links. Falls back to the single
// {source, link} for an older digest that predates the sources array.
function sourceChips(it) {
  const sources = (it.sources && it.sources.length)
    ? it.sources
    : (it.link ? [{ source: it.source, link: it.link }] : []);
  if (!sources.length) return '';
  return `<div class="sources"><span class="read">Read</span>` + sources.map(s =>
    `<a href="${esc(safeUrl(s.link))}" target="_blank" rel="noopener">${esc(s.source || 'Source')}</a>`
  ).join('') + `</div>`;
}

// `n` (optional) renders an editorial rank number (#2, #3…) for the ranked list.
function newsItem(it, n) {
  const num = n ? `<span class="num">#${n}</span> ` : '';
  const summary = it.summary || it.why || '';
  return `<article class="item">
    <h3>${num}${esc(it.title)}</h3>
    ${summary ? `<div class="summary">${esc(summary)}</div>` : ''}
    ${sourceChips(it)}
  </article>`;
}

function topStory(it, n = 1) {
  const summary = it.summary || it.why || '';
  return `<article class="top-story">
    <div class="flag">Top Story</div>
    <h2><span class="num">#${n}</span> ${esc(it.title)}</h2>
    ${summary ? `<div class="summary">${esc(summary)}</div>` : ''}
    ${sourceChips(it)}
  </article>`;
}

// A ranked list: first item is the Top Story (#1), the rest are numbered #2, #3…
function rankedBlock(items) {
  if (!items || !items.length) return '<div class="empty">No stories yet — check back after the next update.</div>';
  const [top, ...rest] = items;
  return topStory(top, 1) + rest.map((it, i) => newsItem(it, i + 2)).join('');
}

function renderWeather(w) {
  return `<div class="weather">
    <div class="emoji">${esc(w.emoji)}</div>
    <div>
      <div class="temps">${esc(w.high)}°F / ${esc(w.highC)}°C</div>
      <div class="meta">${esc(w.label)} · Low ${esc(w.low)}°F (${esc(w.lowC)}°C) · ${esc(w.precip)}% precipitation</div>
      <div class="meta">🌅 ${esc(w.sunrise)} · 🌇 ${esc(w.sunset)} · 💨 ${esc(w.wind)} mph · St. Louis, MO</div>
    </div>
  </div>`;
}

const fmtNum = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

// Compact index grid at the top of Finance. Up/down shown by sign + colour (not colour alone).
function renderMarkets(quotes) {
  if (!quotes || !quotes.length) return '';
  return `<div class="markets">` + quotes.map(q => {
    const up = Number(q.changePct) >= 0;
    const pct = `${up ? '+' : ''}${Number(q.changePct).toFixed(2)}%`;
    return `<div class="quote ${up ? 'up' : 'down'}">
      <div class="q-name">${esc(q.name)}</div>
      <div class="q-price">${esc(fmtNum(q.price))}</div>
      <div class="q-chg">${esc(pct)}</div>
    </div>`;
  }).join('') + `</div>`;
}

function subSection(label, items, emptyMsg) {
  return `<div class="section-label">${esc(label)}</div>`
    + (items && items.length ? items.map(it => newsItem(it)).join('') : `<div class="empty">${esc(emptyMsg)}</div>`);
}

function renderTab(tab) {
  const t = digest.tabs;
  if (tab === 'local') {
    return heroBanner('local') + renderWeather(digest.weather) + rankedBlock(t.local.items)
      + subSection('St. Louis Metro', t.local.stlouis, 'No St. Louis metro news today.');
  }
  if (tab === 'world') return heroBanner('world') + rankedBlock(t.world.items);
  if (tab === 'india') {
    return heroBanner('india') + rankedBlock(t.india.items)
      + subSection('US–India Immigration', t.india.immigration, 'No US–India immigration news today.');
  }
  if (tab === 'finance') {
    return heroBanner('finance')
      + renderMarkets(t.finance && t.finance.quotes)
      + rankedBlock(t.finance && t.finance.items);
  }
  if (tab === 'micro') {
    const m = digest.micro;
    return heroBanner('micro') + `<span class="theme-pill">Today: ${esc(m.theme)}</span>`
      + m.cards.map(c => `<div class="card">
          <h3>${esc(c.title)}</h3>
          <div class="insight">${esc(c.insight)}</div>
          <div class="takeaway"><b>Try this:</b> ${esc(c.takeaway)}</div>
        </div>`).join('');
  }
  return '';
}

function show(tab, focus = false) {
  current = tab;
  document.getElementById('tab-title').textContent = TITLES[tab];
  const main = document.getElementById('main');
  main.innerHTML = renderTab(tab);
  main.scrollTop = 0;
  document.querySelectorAll('.nav-btn').forEach(b => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  if (focus) main.focus();  // move SR focus to the new panel on user tab change
}

function fmtUpdated(iso) {
  try {
    return 'Updated ' + new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch { return ''; }
}

// Briefing is built ~2x/day; if it's clearly older than a day the scheduled build
// has likely been failing, so flag it rather than showing stale news as current.
function freshness(iso, now = Date.now()) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return { label: '', stale: false };
  const label = fmtUpdated(iso);
  const stale = now - t > 24 * 3.6e6;
  return { label: stale ? `⚠ ${label} · may be stale` : label, stale };
}

// Skeleton that mirrors the real layout (weather block + a few cards) so there's
// no layout shift when content arrives.
const SKELETON =
  '<div class="skel skel-weather"></div>'
  + '<div class="skel skel-top"></div>'
  + Array.from({ length: 4 }, () => '<div class="skel skel-item"></div>').join('');

// The digest lives on the repo's `data` branch (refreshed by the scheduled Action),
// so updating the briefing never touches main and never redeploys the app. Fetched
// cross-origin from GitHub raw; the service worker caches it network-first for offline.
const DIGEST_URL = 'https://raw.githubusercontent.com/rishihjoshi/DailyPulse/refs/heads/data/digest.json';

async function loadDigest() {
  const main = document.getElementById('main');
  main.setAttribute('aria-busy', 'true');
  main.innerHTML = `<div class="skeleton" aria-hidden="true">${SKELETON}</div>`;
  try {
    const res = await fetch(DIGEST_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    digest = await res.json();
    const f = freshness(digest.generatedAt);
    const u = document.getElementById('updated');
    u.textContent = f.label;
    u.classList.toggle('stale', f.stale);
    main.removeAttribute('aria-busy');
    show(current);
  } catch (err) {
    main.removeAttribute('aria-busy');
    main.innerHTML =
      `<div class="error" role="alert">
        <p>Couldn't load today's briefing.</p>
        <button class="retry" type="button">Try again</button>
      </div>`;
    main.querySelector('.retry').addEventListener('click', loadDigest);
    console.error('digest load failed:', err);
  }
}

// ── Service worker + update prompt ──
// A new deploy ships a new SW that waits (sw.js no longer skipWaiting's). When one is
// detected we reveal the update banner; tapping Reload activates it and reloads once.
let updating = false;

function showUpdate(reg) {
  const b = document.getElementById('update-banner');
  if (!b || b.dataset.shown) return;          // show once
  b.dataset.shown = '1';
  b.hidden = false;
  document.getElementById('update-btn').addEventListener('click', () => {
    updating = true;
    reg.waiting && reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  });
}

function registerSW() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  // Reload only for an update the user asked for — not the first-install claim.
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (updating) location.reload(); });
  navigator.serviceWorker.register('./sw.js').then(reg => {
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg);   // update already waiting
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdate(reg);
      });
    });
    // Catch deploys that landed while the PWA sat open in the background.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update();
    });
  }).catch(err => console.warn('SW:', err));
}

function init() {
  const v = document.getElementById('version');
  if (v) v.textContent = 'v' + APP_VERSION;
  registerSW();
  document.getElementById('nav').addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn');
    if (btn && digest) show(btn.dataset.tab, true);
  });
  loadDigest();
}

// Guarded so the pure render helpers can be imported in Node tests without a DOM.
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);

export { esc, safeUrl, newsItem, topStory, renderWeather, rankedBlock, renderTab, show, loadDigest, freshness, showUpdate, APP_VERSION };
