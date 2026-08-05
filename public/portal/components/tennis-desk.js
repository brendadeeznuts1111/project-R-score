/**
 * Tennis portal board — venues, metrics bake, charts, partner-contracts join.
 * @see /registry/tennis/board-metrics.json
 * @see /registry/tennis/partner-contracts.json
 * @see /portal/venues.css · style.css bar-chart / venue-badge
 */
import { getHealthData } from '/portal/data.js';
import { mountFreshnessBadge } from '/portal/data-freshness.js';
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

function statHtml(label, value, sub = '', cls = 'muted') {
  return `<div class="portal-stat ${cls}"><div class="k">${esc(label)}</div><div class="v">${esc(String(value))}</div>${sub ? `<div class="hint">${esc(sub)}</div>` : ''}</div>`;
}

function setGate(tone, label, meta) {
  const gate = $('tennis-gate');
  const baked = $('tennis-baked');
  if (gate) {
    gate.className = `portal-gate ${tone === 'ok' ? 'pass' : tone === 'bad' ? 'fail' : 'warn'}`;
    gate.innerHTML = `<span class="dot" aria-hidden="true"></span>${esc(label)}`;
  }
  if (baked) baked.textContent = meta;
}

function setBanner(tone, title, meta) {
  setGate(tone, title, meta);
  const banner = $('live-banner');
  if (!banner) return;
  banner.hidden = true;
}

function renderKpis(metrics, regPkgCount, agentAuth) {
  const host = $('kpi-host');
  if (!host) return;
  const source = metrics?.source ?? '—';
  const tone =
    source === 'event-store' ? 'ok' : source === 'sample' ? 'warn' : 'warn';
  const authStatus = agentAuth?.status === 'configured'
    ? 'configured'
    : agentAuth
      ? (agentAuth.status || 'unset')
      : '—';
  const authSub = agentAuth?.envKey
    ? `${agentAuth.envKey} · cloud agent`
    : 'FACTORY_WAGER_TOKEN';
  const desk = metrics?.desk;
  const coverage =
    desk && typeof desk.coveragePct === 'number'
      ? `${desk.coveragePct}%`
      : '—';
  const coverageSub = desk
    ? `${desk.withBothMids ?? 0}/${desk.scannedEvents ?? 0} full books` +
      (desk.listedMissingMids
        ? ` · ${desk.listedMissingMids} listed incomplete`
        : '')
    : 'from live-matches bake';
  // Books as of — independent of bake age (can lag days behind board-metrics bake).
  let booksLabel = '—';
  let booksSub = 'desk.latestBookAt';
  let booksTone = 'muted';
  if (desk?.latestBookAt) {
    const bookTs = Date.parse(desk.latestBookAt);
    if (Number.isFinite(bookTs)) {
      const ageMs = Math.max(0, Date.now() - bookTs);
      const ageH = Math.floor(ageMs / 3_600_000);
      const ageD = Math.floor(ageH / 24);
      booksLabel = ageD >= 2 ? `${ageD}d ago` : ageH >= 1 ? `${ageH}h ago` : 'fresh';
      booksSub = String(desk.latestBookAt).replace('T', ' ').replace(/\.\d+Z$/, 'Z');
      booksTone = ageH < 24 ? 'ok' : ageH < 72 ? 'warn' : 'bad';
    } else {
      booksLabel = String(desk.latestBookAt).slice(0, 16);
    }
  }
  host.innerHTML = [
    statHtml('Source', source, metrics?.note?.slice(0, 48) ?? '', tone === 'ok' ? 'ok' : 'warn'),
    statHtml('Markets', metrics?.markets ?? '—', 'event-store rows', 'muted'),
    statHtml('Book mids', metrics?.midsUsable ?? '—', `${metrics?.bookTicksLatest ?? 0} latest ticks`, 'muted'),
    statHtml('Desk coverage', coverage, coverageSub, desk && Number(desk.coveragePct) >= 70 ? 'ok' : desk && Number(desk.coveragePct) >= 30 ? 'warn' : desk ? 'bad' : 'muted'),
    statHtml('Books as of', booksLabel, booksSub, booksTone),
    statHtml('Packages', regPkgCount, 'tennis registry', 'muted'),
    statHtml('Registry token', authStatus, authSub, authStatus === 'configured' ? 'ok' : 'warn'),
  ].join('');
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


/** @type {{ players: any[], nameToSlug: Record<string,string> }} */
let avatarIndex = { players: [], nameToSlug: {} };
/** @type {any[]} */
let liveMatchRows = [];

function resolveSlug(name) {
  const raw = String(name || '').trim();
  if (!raw) return 'demo-player';
  if (avatarIndex.nameToSlug[raw]) return avatarIndex.nameToSlug[raw];
  const n = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'player';
  return avatarIndex.nameToSlug[n] || n;
}

function avatarImg(slug, size = 28) {
  const s = esc(slug || 'demo-player');
  return `<img src="/avatars/${s}.webp" width="${size}" height="${size}" alt="${s}" loading="lazy"
    style="border-radius:50%;object-fit:cover;background:var(--border);vertical-align:middle"
    onerror="this.onerror=null;this.src='/avatar/${s}'" />`;
}

function renderSampleTable(filterVenue = '') {
  const tbody = document.querySelector('#sample-rows tbody');
  if (!tbody) return;
  const rows = filterVenue
    ? liveMatchRows.filter((r) => r.venue === filterVenue)
    : liveMatchRows;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="9">No matches — run <code>bun run tennis:board:bake</code></td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((r) => {
    const slugA = r.sideA?.slug || resolveSlug(r.sideA?.label);
    const slugB = r.sideB?.slug || resolveSlug(r.sideB?.label);
    const edge = r.edgeCents;
    const edgeCls = edge == null ? '' : edge >= 0 ? 'st-ok' : 'st-bad';
    const edgeStr = edge == null ? '—' : (edge >= 0 ? '+' : '') + edge + '¢';
    const midA = r.sideA?.midCents != null ? r.sideA.midCents + '¢' : '—';
    const midB = r.sideB?.midCents != null ? r.sideB.midCents + '¢' : '—';
    const midStatus = r.midStatus || (r.sideA?.midCents != null && r.sideB?.midCents != null
      ? 'ok'
      : r.sideA?.midCents != null || r.sideB?.midCents != null
        ? 'partial'
        : 'missing');
    const midDot =
      midStatus === 'ok'
        ? '<span class="tone-chip tone-ok" title="Both side mids" style="font-size:10px">ok</span>'
        : midStatus === 'partial'
          ? '<span class="tone-chip tone-warn" title="One side mid only" style="font-size:10px">partial</span>'
          : '<span class="tone-chip tone-bad" title="No book mids" style="font-size:10px">missing</span>';
    return `<tr>
      <td>${avatarImg(slugA)}</td>
      <td>${esc(r.sideA?.label || '—')}</td>
      <td>${avatarImg(slugB)}</td>
      <td>${esc(r.sideB?.label || '—')}</td>
      <td>${typeof renderVenueBadge === 'function' ? renderVenueBadge(r.venue || 'kalshi', { showLabel: false }) : esc(r.venue || '—')}</td>
      <td class="mono">${esc(midA)}</td>
      <td class="mono">${esc(midB)}</td>
      <td class="mono ${edgeCls}">${esc(edgeStr)}</td>
      <td class="mono">${esc(r.seriesLabel || r.series || '—')} ${midDot}</td>
    </tr>`;
  }).join('');
}

function renderAvatarStrip() {
  const host = document.getElementById('avatar-strip');
  const img = document.getElementById('hero-avatar');
  const players = (avatarIndex.players || []).filter((p) => p.hasSource || p.hasWebp || p.slug === 'demo-player');
  const ids = players.length ? players.slice(0, 12).map((p) => p.slug) : ['demo-player'];
  if (img) {
    const id = ids[0] || 'demo-player';
    img.src = `/avatars/${id}.webp`;
    img.alt = id;
    const label = img.closest('a')?.querySelector('.tennis-avatar-name');
    if (label) label.textContent = id;
  }
  if (host) {
    host.innerHTML = ids.map((id) => {
      const p = (avatarIndex.players || []).find((x) => x.slug === id);
      const name = p?.displayName || id;
      return `<a href="/avatars/${esc(id)}.webp" class="portal-card" style="display:flex;align-items:center;gap:10px;padding:10px 12px;text-decoration:none;color:inherit">
        ${avatarImg(id, 48)}
        <div>
          <div style="font-weight:600;font-size:13px">${esc(name)}</div>
          <div class="sub" style="margin:0"><code>${esc(id)}</code> · ${p?.hasWebp ? 'webp' : 'pending'}</div>
        </div>
      </a>`;
    }).join('');
  }
}

async function loadAvatarIndex() {
  try {
    const res = await fetch('/registry/tennis/avatar-index.json', {
      credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-cache',
    });
    if (!res.ok) return;
    const doc = await res.json();
    avatarIndex = {
      players: doc.players || [],
      nameToSlug: doc.nameToSlug || {},
    };
    if (!Object.keys(avatarIndex.nameToSlug).length && avatarIndex.players.length) {
      const m = {};
      for (const p of avatarIndex.players) {
        m[p.slug] = p.slug;
      }
      avatarIndex.nameToSlug = m;
    }
  } catch { /* keep empty */ }
}

async function loadLiveMatches() {
  try {
    const res = await fetch('/registry/tennis/live-matches.json', {
      credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-cache',
    });
    if (!res.ok) return;
    const doc = await res.json();
    liveMatchRows = doc.matches || [];
    const meta = document.getElementById('matches-meta');
    if (meta) {
      const q = doc.quality;
      const qBit = q
        ? ` · mid-ok ${q.listedWithBothMids ?? 0}/${liveMatchRows.length}` +
          (typeof q.coveragePct === 'number' ? ` · store ${q.coveragePct}%` : '')
        : '';
      meta.textContent = `${doc.source || '—'} · ${liveMatchRows.length} matches${qBit} · filter by venue · slugs from avatar-index`;
    }
  } catch {
    liveMatchRows = [];
  }
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

async function loadAgentAuth() {
  try {
    const res = await fetch('/registry/tennis/agent-auth.json', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

async function loadPartnerContracts() {
  try {
    const res = await fetch('/registry/tennis/partner-contracts.json', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

/** Public runtime probe — no secrets. */
async function probeTennisRuntime() {
  const base = 'https://tennis.factory-wager.com';
  const out = {
    versionOk: false,
    shortSha: null,
    packageVersion: null,
    failClosed: null,
    failClosedStatus: null,
    error: null,
  };
  try {
    const verRes = await fetch(`${base}/api/version`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (verRes.ok) {
      const ver = await verRes.json();
      out.versionOk = ver?.ok === true;
      out.shortSha = ver?.shortSha ?? (typeof ver?.sha === 'string' ? ver.sha.slice(0, 7) : null);
      out.packageVersion = ver?.packageVersion ?? null;
    }
  } catch (err) {
    out.error = err instanceof Error ? err.message : String(err);
  }
  try {
    const unauth = await fetch(`${base}/api/v1/research/status`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    out.failClosedStatus = unauth.status;
    out.failClosed = unauth.status === 401;
  } catch (err) {
    if (!out.error) out.error = err instanceof Error ? err.message : String(err);
  }
  return out;
}

function renderRuntimeProbe(probe, agentAuth) {
  const host = $('runtime-kpi-host');
  const detail = $('runtime-probe-detail');
  if (host) {
    const verTone = probe?.versionOk ? 'ok' : 'bad';
    const verLabel = probe?.versionOk
      ? `${probe.packageVersion || 'ok'}${probe.shortSha ? ` · ${probe.shortSha}` : ''}`
      : '—';
    const fcTone =
      probe?.failClosed === true ? 'ok' : probe?.failClosedStatus === 503 ? 'warn' : 'bad';
    const fcLabel =
      probe?.failClosed === true
        ? '401 fail-closed'
        : probe?.failClosedStatus != null
          ? `HTTP ${probe.failClosedStatus}`
          : '—';
    const authStatus = agentAuth?.status === 'configured' ? 'configured' : agentAuth?.status || '—';
    host.innerHTML = [
      statHtml('Runtime version', verLabel, 'GET /api/version', verTone),
      statHtml('v1 contract gate', fcLabel, 'unauth GET /api/v1/research/status', fcTone),
      statHtml(
        'Registry token',
        authStatus,
        agentAuth?.envKey || 'FACTORY_WAGER_TOKEN',
        authStatus === 'configured' ? 'ok' : 'warn'
      ),
      statHtml('Producer token', 'PARTNER_API_TOKEN', 'operator shell only', 'muted'),
    ].join('');
  }
  if (detail) {
    if (probe?.failClosed) {
      detail.innerHTML =
        'v1 contracts require <code>PARTNER_API_TOKEN</code>. Unauth correctly returns <strong>401</strong>. ' +
        'Join: <a href="/portal/partners/">Partners</a> · <a href="/portal/telegram.md">Telegram</a> · <a href="/portal/dod/">DOD</a>.';
    } else if (probe?.failClosedStatus === 503) {
      detail.innerHTML =
        '<span class="st-warn">Worker contract_auth_unconfigured — set PARTNER_API_TOKEN on tennis-hq.</span>';
    } else if (probe?.error && !probe?.versionOk) {
      detail.innerHTML = `<span class="st-warn">Runtime probe error: ${esc(probe.error)}</span>`;
    } else {
      detail.textContent = 'Runtime probe complete.';
    }
  }
}

function renderPartnerCodeChips(codes) {
  const host = $('partner-code-chips');
  if (!host) return;
  const list =
    Array.isArray(codes) && codes.length > 0 ? codes : ['ASH', 'BIL', 'NOV', 'SPEN'];
  host.innerHTML = list
    .map(code => {
      return (
        `<span class="tone-chip tone-neutral" style="display:inline-flex;gap:6px;align-items:center;padding:4px 8px">` +
        `<strong>${esc(code)}</strong>` +
        `<a href="/portal/partners/#partner/${esc(code)}">desk</a>` +
        `<a href="/portal/partners/#partner/${esc(code)}/accounting">acct</a>` +
        `<a href="/portal/partners/#partner/${esc(code)}/telegram/accounting">tg</a>` +
        `</span>`
      );
    })
    .join(' ');
}

function renderPartnerContracts(doc) {
  const meta = $('partner-contracts-meta');
  const tbody = $('partner-contracts-table')?.querySelector('tbody');
  const rows = Array.isArray(doc?.partners) ? doc.partners : [];
  const codes = rows.map(r => String(r.partnerCode || '').toUpperCase()).filter(Boolean);
  renderPartnerCodeChips(codes);

  if (meta) {
    if (!doc) {
      meta.innerHTML =
        'No partner-contracts bake — run <code>bun run tennis:partner-contracts:bake</code>';
    } else {
      const s = doc.summary || {};
      const gen = doc.generatedAt ? String(doc.generatedAt).replace('T', ' ').slice(0, 19) : '—';
      const src = String(doc.source || '—');
      const srcTone =
        src === 'live' ? 'ok' : src === 'offline-join' ? 'warn' : src === 'empty' ? 'bad' : 'muted';
      const srcChip = `<span class="tone-chip tone-${srcTone}" title="Bake source">${esc(src)}</span>`;
      const offlineHint =
        src === 'offline-join'
          ? ' · max bet empty until live bake with <code>PARTNER_API_TOKEN</code>'
          : '';
      meta.innerHTML =
        `source ${srcChip} · ` +
        `${esc(String(s.partnerCount ?? rows.length))} partners · ` +
        `${esc(String(s.activeOuts ?? '—'))} active outs · ` +
        `ready ${esc(String(s.operatorReady ?? '—'))}` +
        (s.handshakeOk != null ? ` · handshake ok ${esc(String(s.handshakeOk))}` : '') +
        ` · baked ${esc(gen)}` +
        offlineHint;
    }
  }

  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML =
      '<tr><td colspan="9">No partner rows — bake live or offline join</td></tr>';
    return;
  }
  const src = String(doc?.source || '');
  tbody.innerHTML = rows
    .map(r => {
      const code = esc(r.partnerCode);
      const outs = `${esc(String(r.activeOuts ?? 0))}/${esc(String(r.totalOuts ?? 0))}`;
      const incomplete =
        r.incompleteOuts != null && Number(r.incompleteOuts) > 0
          ? esc(String(r.incompleteOuts))
          : '—';
      const incompleteCls =
        r.incompleteOuts != null && Number(r.incompleteOuts) > 0 ? 'st-warn' : '';
      // Offline-join never has capacity max bet — show honest dash + title.
      let maxBet = '—';
      let maxTitle = '';
      if (r.totalPerBetMaxCents != null) {
        maxBet = esc(String(r.totalPerBetMaxCents));
      } else if (src === 'offline-join') {
        maxBet = '—';
        maxTitle = 'title="offline-join: run live bake for per-bet max ¢"';
      }
      const hs =
        r.handshakeOk === true ? 'ok' : r.handshakeOk === false ? 'gap' : '—';
      const hsCls =
        r.handshakeOk === true ? 'st-ok' : r.handshakeOk === false ? 'st-warn' : '';
      const links =
        `<a href="${esc(r.partnersHref || `/portal/partners/#partner/${code}`)}">desk</a> · ` +
        `<a href="${esc(r.accountingHref || `/portal/partners/#partner/${code}/accounting`)}">acct</a> · ` +
        `<a href="${esc(r.telegramAccountingHref || `/portal/partners/#partner/${code}/telegram/accounting`)}">tg</a>`;
      return (
        `<tr>` +
        `<td class="mono"><strong>${code}</strong></td>` +
        `<td class="mono">${esc(r.callSign || '—')}</td>` +
        `<td>${esc(r.phase || r.factoryPhase || '—')}</td>` +
        `<td class="mono">${outs}</td>` +
        `<td class="mono ${incompleteCls}">${incomplete}</td>` +
        `<td class="mono" ${maxTitle}>${maxBet}</td>` +
        `<td>${esc(r.fundStatus || '—')}</td>` +
        `<td class="${hsCls}">${esc(hs)}</td>` +
        `<td>${links}</td>` +
        `</tr>`
      );
    })
    .join('');
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
  setBanner('warn', 'Loading tennis board…', 'metrics · registry · contracts · runtime');
  const [metrics, reg, agentAuth, runtimeProbe, partnerContracts] = await Promise.all([
    loadMetrics(),
    loadRegistry(),
    loadAgentAuth(),
    probeTennisRuntime(),
    loadPartnerContracts(),
    loadAvatarIndex(),
    loadLiveMatches(),
  ]);
  const pkgCount = renderRegistry(reg);
  renderAvatarStrip();
  renderSampleTable(document.getElementById('venue-filter')?.value || '');
  renderRuntimeProbe(runtimeProbe, agentAuth);
  renderPartnerContracts(partnerContracts);

  // Bake-manifest "Data as of" — worst of tennis board bakes (fail-silent).
  void mountFreshnessBadge(
    document.getElementById('tennis-freshness'),
    [
      '/registry/tennis/partner-contracts.json',
      '/registry/tennis/board-metrics.json',
      '/registry/tennis/agent-auth.json',
    ],
    {
      fallbacks: {
        '/registry/tennis/partner-contracts.json': partnerContracts?.generatedAt || null,
        '/registry/tennis/board-metrics.json': metrics?.generatedAt || null,
        '/registry/tennis/agent-auth.json': agentAuth?.generatedAt || null,
      },
    }
  );

  if (metrics) {
    renderKpis(metrics, pkgCount, agentAuth);
    renderCharts(metrics);
    renderVenuesFromMetrics(metrics);
    const tone = metrics.source === 'event-store' ? 'ok' : 'warn';
    const authBit =
      agentAuth?.status === 'configured'
        ? ' · registry token configured'
        : agentAuth
          ? ' · registry token missing'
          : '';
    const runtimeBit = runtimeProbe?.versionOk
      ? ` · runtime ${runtimeProbe.packageVersion || runtimeProbe.shortSha || 'ok'}`
      : '';
    const fcBit =
      runtimeProbe?.failClosed === true
        ? ' · v1 fail-closed'
        : runtimeProbe?.failClosedStatus != null
          ? ` · v1 HTTP ${runtimeProbe.failClosedStatus}`
          : '';
    const joinBit =
      partnerContracts?.summary?.partnerCount != null
        ? ` · contracts ${partnerContracts.summary.partnerCount}`
        : '';
    const deskBit =
      metrics.desk && typeof metrics.desk.coveragePct === 'number'
        ? `desk ${metrics.desk.coveragePct}%`
        : null;
    setBanner(
      tone,
      metrics.source === 'event-store' ? 'Tennis board live' : 'Tennis board (sample metrics)',
      [
        metrics.generatedAt ? String(metrics.generatedAt).slice(0, 19) : null,
        `mids ${metrics.midsUsable}`,
        `markets ${metrics.markets}`,
        deskBit,
        metrics.eventStorePath ? metrics.eventStorePath : null,
      ]
        .filter(Boolean)
        .join(' · ') +
        authBit +
        runtimeBit +
        fcBit +
        joinBit
    );
  } else {
    renderKpis(null, pkgCount, agentAuth);
    setBanner(
      'bad',
      'Metrics unavailable',
      'Run bun run tennis:board:bake' +
        (agentAuth?.status === 'configured' ? ' · registry token configured' : '')
    );
  }
}

function boot() {
  renderAvatarStrip();

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
