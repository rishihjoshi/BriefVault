// BriefVault — reads the pre-built digest.json and renders 4 tabs.
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

function newsItem(it) {
  return `<a class="item" href="${esc(it.link)}" target="_blank" rel="noopener">
    <h3>${esc(it.title)}</h3>
    ${it.why ? `<div class="why">${esc(it.why)}</div>` : ''}
    <div class="src">${esc(it.source || '')}</div>
  </a>`;
}

function topStory(it) {
  return `<a class="top-story" href="${esc(it.link)}" target="_blank" rel="noopener">
    <div class="flag">★ Top Story</div>
    <h2>${esc(it.title)}</h2>
    ${it.why ? `<div class="why">${esc(it.why)}</div>` : ''}
    <div class="src">${esc(it.source || '')}</div>
  </a>`;
}

// A ranked list: first item becomes the Top Story banner, the rest are a plain list.
function rankedBlock(items) {
  if (!items || !items.length) return '<div class="error">No stories available.</div>';
  const [top, ...rest] = items;
  return topStory(top) + rest.map(newsItem).join('');
}

function renderWeather(w) {
  return `<div class="weather">
    <div class="emoji">${esc(w.emoji)}</div>
    <div>
      <div class="temps">${esc(w.high)}° / ${esc(w.low)}°F</div>
      <div class="meta">${esc(w.label)} · ${esc(w.precip)}% precip · St. Louis, MO</div>
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
      + (imm.length ? imm.map(newsItem).join('') : '<div class="item"><h3>No immigration updates today.</h3></div>');
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

function show(tab) {
  current = tab;
  document.getElementById('tab-title').textContent = TITLES[tab];
  document.getElementById('main').innerHTML = renderTab(tab);
  document.getElementById('main').scrollTop = 0;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
}

function fmtUpdated(iso) {
  try {
    return 'Updated ' + new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch { return ''; }
}

async function init() {
  document.getElementById('nav').addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn');
    if (btn) show(btn.dataset.tab);
  });

  try {
    const res = await fetch('./data/digest.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    digest = await res.json();
    document.getElementById('updated').textContent = fmtUpdated(digest.generatedAt);
    show('local');
  } catch (err) {
    document.getElementById('main').innerHTML =
      `<div class="error">Couldn't load today's briefing.<br>Check your connection and reopen.</div>`;
    console.error('digest load failed:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);
