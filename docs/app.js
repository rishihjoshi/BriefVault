// DailyPulse — reads the pre-built digest.json and renders 4 tabs.
// No API key, no AI, no network beyond fetching its own digest (built by the Action).

const TITLES = {
  local: 'Local · St. Louis',
  world: 'World',
  india: 'India',
  micro: 'Microlearning',
};

let digest = null;
let current = 'local';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// esc() keeps a value inside the quoted attribute but does NOT block the javascript:/data:
// scheme, so href needs its own allowlist: only http(s) links render, anything else → '#'.
const safeUrl = u => /^https?:\/\//i.test(String(u ?? '').trim()) ? String(u).trim() : '#';

function newsItem(it) {
  return `<a class="item" href="${esc(safeUrl(it.link))}" target="_blank" rel="noopener">
    <h3>${esc(it.title)}</h3>
    ${it.why ? `<div class="why">${esc(it.why)}</div>` : ''}
    <div class="src">${esc(it.source || '')}</div>
  </a>`;
}

function topStory(it) {
  return `<a class="top-story" href="${esc(safeUrl(it.link))}" target="_blank" rel="noopener">
    <div class="flag">Top Story</div>
    <h2>${esc(it.title)}</h2>
    ${it.why ? `<div class="why">${esc(it.why)}</div>` : ''}
    <div class="src">${esc(it.source || '')}</div>
  </a>`;
}

// A ranked list: first item becomes the Top Story banner, the rest are a plain list.
function rankedBlock(items) {
  if (!items || !items.length) return '<div class="empty">No stories yet — check back after the next update.</div>';
  const [top, ...rest] = items;
  return topStory(top) + rest.map(newsItem).join('');
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

function renderTab(tab) {
  const t = digest.tabs;
  if (tab === 'local') return renderWeather(digest.weather) + rankedBlock(t.local.items);
  if (tab === 'world') return rankedBlock(t.world.items);
  if (tab === 'india') {
    const imm = t.india.immigration || [];
    return rankedBlock(t.india.items)
      + `<div class="section-label">US–India Immigration</div>`
      + (imm.length ? imm.map(newsItem).join('') : '<div class="empty">No US–India immigration news today.</div>');
  }
  if (tab === 'micro') {
    const m = digest.micro;
    return `<span class="theme-pill">Today: ${esc(m.theme)}</span>`
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

async function loadDigest() {
  const main = document.getElementById('main');
  main.setAttribute('aria-busy', 'true');
  main.innerHTML = `<div class="skeleton" aria-hidden="true">${SKELETON}</div>`;
  try {
    const res = await fetch('./data/digest.json', { cache: 'no-cache' });
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

function init() {
  document.getElementById('nav').addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn');
    if (btn && digest) show(btn.dataset.tab, true);
  });
  loadDigest();
}

// Guarded so the pure render helpers can be imported in Node tests without a DOM.
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);

export { esc, safeUrl, newsItem, topStory, renderWeather, rankedBlock, renderTab, show, loadDigest, freshness };
