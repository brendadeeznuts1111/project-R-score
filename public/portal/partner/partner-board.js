/**
 * Portal partner health board — reads /registry/partner-health.json;
 * live refresh via /api/partner/health when on loopback.
 */
import { fetchJsonResult } from '../fetch-json.js';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isLoopback() {
  const h = location.hostname;
  return h === '127.0.0.1' || h === 'localhost' || h === '::1';
}

function ageLabel(iso) {
  if (!iso) return '—';
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

function kvTable(rows) {
  return `<table class="kv">${rows
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`)
    .join('')}</table>`;
}

function chip(text, tone) {
  return `<span class="chip ${tone ?? ''}">${esc(text)}</span>`;
}

export function renderPartnerHealth(bake) {
  const root = document.getElementById('root');
  const badge = document.getElementById('health-badge');
  const age = document.getElementById('bake-age');
  if (!bake?.health) {
    badge.textContent = 'NO DATA';
    badge.className = 'doc-badge red';
    age.textContent = 'bake age —';
    root.innerHTML =
      '<div class="card"><h2>No partner-health snapshot</h2><p>Run <code>bun run partner:health:bake</code>.</p></div>';
    return;
  }
  const h = bake.health;
  const o = bake.outChecks;
  badge.textContent = h.ok ? 'HEALTHY' : 'DEGRADED';
  badge.className = h.ok ? 'doc-badge green' : 'doc-badge red';
  age.textContent = `bake age · ${ageLabel(bake.generatedAt)}`;

  const healthRows = [
    ['Ops DB', h.opsDb.ok ? chip('ok', 'green') : chip(h.opsDb.error ?? 'unavailable', 'red')],
    ['Bindings', esc(h.bindings.count)],
    ['Ledger rows', `${esc(h.ledger.count)} (${esc(h.ledger.partners)} partners)`],
    ['Capacity rows', esc(h.capacity.count)],
    ['Profiles (TOML)', esc(h.profiles.count)],
  ];
  const alignment =
    h.alignment.profilesWithoutBinding.length === 0 &&
    h.alignment.bindingsWithoutProfile.length === 0
      ? chip('aligned', 'green')
      : [
          ...h.alignment.profilesWithoutBinding.map(c => chip(`unbound ${c}`, 'yellow')),
          ...h.alignment.bindingsWithoutProfile.map(c => chip(`stale ${c}`, 'yellow')),
        ].join('');
  healthRows.push(['Profile ↔ binding', alignment]);

  const degraded = o.degraded ?? [];
  const outHtml =
    degraded.length === 0
      ? `<p>${chip(`all ${o.checked ?? 0} out(s) ok`, 'green')}</p>`
      : degraded
          .map(
            d =>
              `<p>${chip(d.outNum, d.status === 'offline' ? 'red' : 'yellow')} · ${esc(d.partnerCode)} · ${esc(d.book)} — <b>${esc(d.status)}</b>: ${esc(d.reason)}</p>`
          )
          .join('');

  root.innerHTML = `
    <div class="card"><h2>Domain health</h2>${kvTable(healthRows)}</div>
    <div class="card"><h2>Out health (${esc(o.checked ?? 0)} checked)</h2>${outHtml}</div>
  `;
}

async function load(useLive) {
  const src = useLive ? '/api/partner/health' : '/registry/partner-health.json';
  const r = await fetchJsonResult(src);
  const data = r?.ok ? r.data : null;
  renderPartnerHealth(
    data &&
      (useLive ? { health: data, outChecks: data.outChecks, generatedAt: data.generatedAt } : data)
  );
}

function wire() {
  document.getElementById('refresh-btn').addEventListener('click', () => load(false));
  const liveBtn = document.getElementById('live-btn');
  if (isLoopback()) {
    liveBtn.hidden = false;
    liveBtn.addEventListener('click', () => load(true));
  }
  document.addEventListener('DOMContentLoaded', () => load(false));
}

wire();
