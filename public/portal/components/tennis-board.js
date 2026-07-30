/**
 * Tennis portal board — venues, metrics bake, charts.
 * @see /registry/tennis/board-metrics.json
 * @see /portal/venues.css · style.css bar-chart / venue-badge
 */
import { getHealthData } from '/portal/data.js';
import {
  mountVenueLegend,
  renderVenueBadge,
  parseMarketVenue,
} from '/portal/components/venue-badge.js';

const $ = id => document.getElementById(id);
const esc = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function barChartHtml(data, { title, subtitle = '' } = {}) {
  if (!data?.length) {
    return `<div class="bar-chart"><div class="bar-chart-header"><div class="bar-chart-title">${esc(title)}</div>
      <div class="bar-chart-subtitle">No data</div></div></div>`;
  }
  const maxVal = Math.max(...data.map(d => d.value), 0);
  const rows = data
    .map(d => {
      const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
      const display = d.display ?? d.value.toLocaleString();
      const color = d.color ? `;background:${d.color}` : '';
      return `<div class="bar-chart-row">
        <div class="bar-chart-label" title="${esc(d.label)}">${esc(d.label)}</div>
        <div class="bar-chart-track"><div class="bar-chart-bar" style="width:${pct.toFixed(1)}%${color}"></div></div>
        <div class="bar-chart-value">${esc(display)}</div>
      </div>`;
    })
    .join('');
  return `<div class="bar-chart">
    <div class="bar-chart-header">
      <div class="bar-chart-title">${esc(title)}</div>
      ${subtitle ? `<div class="bar-chart-subtitle">${esc(subtitle)}</div>` : ''}
    </div>
    <div class="bar-chart-bars">${rows}</div>
  </div>`;
}

function kpiHtml(label, value, sub = '') {
  return `<article class="portal-card portal-card--metric" data-kpi="${esc(label)}">
    <h3 style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--text-dim);margin:0 0 6px">${esc(label)}</h3>
    <div class="val">${esc(String(value))}</div>
    ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
  </article>`;
}

function setBanner(tone, title, meta) {
  const banner = $('live-banner');
  if (!banner) return;
  banner.className = `portal-banner ${tone}`;
  $('banner-title').textContent = title;
  $('banner-meta').textContent = meta;
}

function renderKpis(metrics, regPkgCount) {
  const host = $('kpi-host');
  if (!host) return;
  const source = metrics?.source ?? '—';
  const tone =
    source === 'event-store' ? 'ok' : source === 'sample' ? 'warn' : 'warn';
  host.innerHTML = [
    kpiHtml('Source', source, metrics?.note?.slice(0, 48) ?? ''),
    kpiHtml('Markets', metrics?.markets ?? '—', 'event-store rows'),
    kpiHtml('Book mids', metrics?.midsUsable ?? '—', `${metrics?.bookTicksLatest ?? 0} latest ticks`),
    kpiHtml('Packages', regPkgCount, 'tennis registry'),
  ].join('');
  // tint first card by source
  const first = host.querySelector('[data-kpi="Source"] .val');
  if (first) first.className = `val st-${tone === 'ok' ? 'ok' : 'warn'}`;
}

function renderCharts(metrics) {
  const host = $('charts-host');
  if (!host || !metrics) return;
  const volRows = (metrics.seriesVolume || []).map(r => ({
    label: r.label || r.series,
    value: r.volume24h || 0,
    display: r.display || String(r.volume24h ?? 0),
  }));
  const midRows = (metrics.buckets || []).map(b => ({
    label: b.range,
    value: b.count,
    display: String(b.count),
  }));
  host.innerHTML =
    barChartHtml(volRows, {
      title: 'Volume by series (24h)',
      subtitle:
        metrics.source === 'event-store'
          ? `live event-store · ${metrics.seriesVolume?.length ?? 0} series`
          : metrics.note || 'sample',
    }) +
    barChartHtml(midRows, {
      title: 'Mid distribution',
      subtitle:
        metrics.source === 'event-store'
          ? `latest book mids · n=${metrics.midsUsable}`
          : 'sample / fallback',
    });
}

function renderVenuesFromMetrics(metrics) {
  const host = $('venue-live-host');
  if (!host) return;
  const rows = metrics?.venues?.length
    ? metrics.venues
    : [
        { venue: 'kalshi', count: 0 },
        { venue: 'polymarket', count: 0 },
        { venue: 'pinnacle', count: 0 },
        { venue: 'betfair', count: 0 },
      ];
  host.innerHTML = rows
    .map(r => {
      const id = parseMarketVenue(r.venue);
      return `<article class="portal-card">
        <div style="margin-bottom:8px">${renderVenueBadge(id, { size: 'md' })}</div>
        <div class="val" style="font-size:18px">${esc(String(r.count))}</div>
        <div class="sub">markets in store</div>
      </article>`;
    })
    .join('');
}

const SAMPLE_ROWS = [
  { a: 'Sinner', b: 'Alcaraz', venue: 'kalshi', edge: '+4.2', score: '72' },
  { a: 'Gauff', b: 'Swiatek', venue: 'polymarket', edge: '+1.8', score: '61' },
  { a: 'Medvedev', b: 'Zverev', venue: 'pinnacle', edge: '-0.4', score: '48' },
  { a: 'Sabalenka', b: 'Rybakina', venue: 'betfair', edge: '+2.1', score: '55' },
];

function renderSampleTable(filterVenue = '') {
  const tbody = document.querySelector('#sample-rows tbody');
  if (!tbody) return;
  const rows = filterVenue
    ? SAMPLE_ROWS.filter(r => r.venue === filterVenue)
    : SAMPLE_ROWS;
  tbody.innerHTML = rows
    .map(
      r => `<tr>
        <td>${esc(r.a)}</td>
        <td>${esc(r.b)}</td>
        <td>${renderVenueBadge(r.venue, { showLabel: false })}</td>
        <td class="mono ${r.edge.startsWith('-') ? 'st-bad' : 'st-ok'}">${esc(r.edge)}¢</td>
        <td class="mono">${esc(r.score)}</td>
      </tr>`
    )
    .join('');
}

async function loadMetrics() {
  try {
    const res = await fetch('/registry/tennis/board-metrics.json', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      cache: 'no-cache',
    });
    if (!res.ok) throw new Error(`metrics HTTP ${res.status}`);
    return await res.json();
  } catch {
    // legacy mid-only
    try {
      const res = await fetch('/registry/tennis/mid-distribution.json', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        cache: 'no-cache',
      });
      if (!res.ok) return null;
      const mid = await res.json();
      return {
        schemaVersion: 1,
        kind: 'tennis-board-metrics',
        generatedAt: mid.generatedAt,
        source: mid.source || 'sample',
        bookTicksLatest: 0,
        midsUsable: mid.n ?? 0,
        markets: 0,
        buckets: mid.buckets || [],
        seriesVolume: [],
        venues: [],
        note: mid.note,
      };
    } catch {
      return null;
    }
  }
}

async function loadRegistry() {
  try {
    const res = await fetch('/registry/tennis/registry.json', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

function renderRegistry(reg) {
  const packages = reg?.packages && typeof reg.packages === 'object' ? reg.packages : {};
  const names = Object.keys(packages);
  const regBody = $('reg-table')?.querySelector('tbody');
  if (regBody) {
    regBody.innerHTML = names.length
      ? names
          .map(name => {
            const p = packages[name];
            const latest = p?.['dist-tags']?.latest ?? p?.versions?.[0] ?? '—';
            const nVer = Array.isArray(p?.versions) ? p.versions.length : '—';
            return `<tr><td class="mono">${esc(name)}</td><td class="mono">${esc(latest)}</td><td class="mono">${esc(String(nVer))}</td></tr>`;
          })
          .join('')
      : '<tr><td colspan="3">No packages</td></tr>';
  }
  const regSub = $('reg-sub');
  if (regSub) {
    regSub.innerHTML = reg
      ? `${names.length} package(s) · updated ${esc(reg.lastUpdated ?? '—')} · <code>/registry/tennis/registry.json</code>`
      : 'Registry unavailable';
  }
  return names.length;
}

function renderHealth(detail) {
  const healthLine = $('tenant-health-line');
  if (!healthLine) return;
  const { status, data } = detail || {};
  if (status === 'ok' || status === 'stale') {
    healthLine.innerHTML = `Portal health: <span class="st-ok">${esc(data?.status ?? 'ok')}</span> · ${esc(data?.runtime ?? '—')}`;
  } else {
    healthLine.innerHTML = '<span class="st-warn">Health unavailable</span>';
  }
}

export async function load() {
  setBanner('warn', 'Loading tennis board…', 'metrics · registry · venues');
  const [metrics, reg] = await Promise.all([loadMetrics(), loadRegistry()]);
  const pkgCount = renderRegistry(reg);

  if (metrics) {
    renderKpis(metrics, pkgCount);
    renderCharts(metrics);
    renderVenuesFromMetrics(metrics);
    const tone = metrics.source === 'event-store' ? 'ok' : 'warn';
    setBanner(
      tone,
      metrics.source === 'event-store' ? 'Tennis board live' : 'Tennis board (sample metrics)',
      [
        metrics.generatedAt ? String(metrics.generatedAt).slice(0, 19) : null,
        `mids ${metrics.midsUsable}`,
        `markets ${metrics.markets}`,
        metrics.eventStorePath ? metrics.eventStorePath : null,
      ]
        .filter(Boolean)
        .join(' · ')
    );
  } else {
    setBanner('bad', 'Metrics unavailable', 'Run bun run tennis:board:bake');
  }
}

function boot() {
  mountVenueLegend($('venue-legend-host'));
  renderSampleTable();

  const filter = $('venue-filter');
  filter?.addEventListener('change', () => renderSampleTable(filter.value));

  $('btn-refresh')?.addEventListener('click', e => {
    e.preventDefault();
    void load();
  });

  document.addEventListener('portal:data', e => renderHealth(e.detail));
  const cached = getHealthData();
  if (cached) renderHealth({ status: 'stale', data: cached });

  void load();
  setInterval(() => void load(), 30_000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
