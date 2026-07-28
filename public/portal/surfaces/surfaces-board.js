/**
 * Surfaces inventory board — reads /registry/surfaces-state.json (schema v2).
 * @see lib/surfaces/README.md
 * @see scripts/bake-surfaces.ts
 */
import { bindCopyButtons } from '../copy-cli.js';
import { fetchJsonResult } from '../fetch-json.js';

const STATE_URL = '/registry/surfaces-state.json';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ageLabel(iso) {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function fillSelect(el, values) {
  if (!el) return;
  const cur = el.value;
  const opts = ['<option value="">all</option>'].concat(
    [...values].sort().map(v => `<option value="${esc(v)}">${esc(v)}</option>`)
  );
  el.innerHTML = opts.join('');
  if ([...values].includes(cur)) el.value = cur;
}

function render(state) {
  const tone = document.getElementById('sf-tone');
  const meta = document.getElementById('sf-meta');
  const stats = document.getElementById('sf-stats');
  const chips = document.getElementById('sf-chips');
  const body = document.getElementById('sf-body');
  const lanes = document.getElementById('sf-lanes');
  if (!tone || !body) return;

  if (!state || state.kind !== 'surfaces-state') {
    tone.textContent = 'missing';
    tone.className = 'sf-badge bad';
    if (meta) meta.textContent = 'run: bun run surfaces:bake';
    body.innerHTML =
      '<tr><td colspan="7" class="dim">Missing /registry/surfaces-state.json</td></tr>';
    return;
  }

  const ok = Boolean(state.crossCheck?.ok && (state.schemaVersion ?? 0) >= 2);
  tone.textContent = ok ? 'ok' : 'drift';
  tone.className = `sf-badge ${ok ? 'ok' : 'bad'}`;
  const s = state.summary || {};
  if (meta) {
    meta.textContent = `v${state.schemaVersion ?? '?'} · generated ${ageLabel(state.generatedAt)} · total=${s.total ?? state.surfaces?.length ?? 0}`;
  }

  if (stats) {
    stats.innerHTML = [
      ['total', String(s.total ?? state.surfaces?.length ?? 0)],
      ['apexes', String(s.apexes?.length ?? 0)],
      ['access domains', String(s.accessDomains?.length ?? 0)],
      ['lanes', String(s.lanes ?? state.publishLanes?.length ?? 0)],
      ['pages projects', String(s.pagesProjects?.length ?? 0)],
      ['cross-check', ok ? 'ok' : 'DRIFT'],
    ]
      .map(
        ([k, v]) =>
          `<div class="sf-stat"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`
      )
      .join('');
  }

  if (chips) {
    const parts = [];
    for (const a of s.apexes ?? []) parts.push(`<span class="sf-chip">apex ${esc(a)}</span>`);
    for (const d of s.accessDomains ?? []) {
      parts.push(`<span class="sf-chip">access ${esc(d)}</span>`);
    }
    for (const [k, n] of Object.entries(s.byBackendCode ?? {})) {
      parts.push(`<span class="sf-chip">${esc(k)} ×${n}</span>`);
    }
    chips.innerHTML = parts.join('') || '—';
  }

  const surfaces = Array.isArray(state.surfaces) ? state.surfaces : [];
  fillSelect(
    document.getElementById('sf-status'),
    new Set(surfaces.map(x => x.status).filter(Boolean))
  );
  fillSelect(
    document.getElementById('sf-access'),
    new Set(surfaces.map(x => x.access).filter(Boolean))
  );
  fillSelect(
    document.getElementById('sf-backend'),
    new Set(surfaces.map(x => x.backendCode).filter(Boolean))
  );

  const q = (document.getElementById('sf-q')?.value || '').toLowerCase().trim();
  const st = document.getElementById('sf-status')?.value || '';
  const ac = document.getElementById('sf-access')?.value || '';
  const be = document.getElementById('sf-backend')?.value || '';

  const rows = surfaces.filter(s => {
    if (st && s.status !== st) return false;
    if (ac && s.access !== ac) return false;
    if (be && s.backendCode !== be) return false;
    if (!q) return true;
    const hay = [s.id, s.host, s.subdomain, s.apex, s.pagesProject, s.backend]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });

  body.innerHTML = rows.length
    ? rows
        .map(
          s => `<tr>
        <td><code>${esc(s.id)}</code></td>
        <td><code>${esc(s.host)}</code></td>
        <td><code>${esc(s.subdomain ?? '—')}</code></td>
        <td><span class="sf-pill ${esc(s.status)}">${esc(s.status)}</span></td>
        <td>${esc(s.access)}</td>
        <td><code>${esc(s.backendCode ?? '—')}</code></td>
        <td><code>${esc(s.pagesProject ?? '—')}</code></td>
      </tr>`
        )
        .join('')
    : '<tr><td colspan="7" class="dim">No surfaces match filters</td></tr>';

  if (lanes) {
    const list = Array.isArray(state.publishLanes) ? state.publishLanes : [];
    lanes.innerHTML = list.length
      ? `<table class="sf-table"><thead><tr><th>id</th><th>protocol</th><th>entry</th></tr></thead><tbody>${list
          .map(
            l =>
              `<tr><td><code>${esc(l.id)}</code></td><td>${esc(l.protocol)}</td><td><code>${esc(l.entry)}</code></td></tr>`
          )
          .join('')}</tbody></table>`
      : '—';
  }
}

async function load() {
  const res = await fetchJsonResult(STATE_URL, { cache: 'no-store' });
  render(res.ok ? res.data : null);
}

function wireFilters() {
  for (const id of ['sf-q', 'sf-status', 'sf-access', 'sf-backend']) {
    document.getElementById(id)?.addEventListener('input', () => {
      // re-render from last payload — stash on window
      if (window.__surfacesState) render(window.__surfacesState);
    });
    document.getElementById(id)?.addEventListener('change', () => {
      if (window.__surfacesState) render(window.__surfacesState);
    });
  }
}

async function main() {
  bindCopyButtons(document);
  wireFilters();
  const res = await fetchJsonResult(STATE_URL, { cache: 'no-store' });
  window.__surfacesState = res.ok ? res.data : null;
  render(window.__surfacesState);
  // soft poll
  const poll = Number(document.querySelector('meta[name="portal-poll-ms"]')?.content || 0);
  if (poll > 0) {
    setInterval(async () => {
      const r = await fetchJsonResult(STATE_URL, { cache: 'no-store' });
      window.__surfacesState = r.ok ? r.data : null;
      render(window.__surfacesState);
    }, poll);
  }
}

main();
