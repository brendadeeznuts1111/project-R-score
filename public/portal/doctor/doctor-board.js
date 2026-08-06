/**
 * Portal doctor board — reads /registry/doctor-state.json; loopback run via /api/doctor/run.
 */
import { bindCopyButtons } from '../copy-cli.js';
import { fetchJsonResult } from '../fetch-json.js';

/** @type {any} */
let state = null;
let query = '';
let groupFilter = '';
let levelFilter = '';
let okFilter = '';
let loading = false;

const $ = id => document.getElementById(id);

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
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function parseHash(hash = location.hash) {
  const params = new URLSearchParams(String(hash).replace(/^#/, ''));
  return {
    q: params.get('q') || '',
    group: params.get('group') || '',
    level: params.get('level') || '',
    ok: params.get('ok') || '',
  };
}

function writeHash() {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (groupFilter) params.set('group', groupFilter);
  if (levelFilter) params.set('level', levelFilter);
  if (okFilter) params.set('ok', okFilter);
  const fragment = params.toString();
  history.replaceState(
    null,
    '',
    `${location.pathname}${location.search}${fragment ? `#${fragment}` : ''}`
  );
}

function applyHash(hash = location.hash) {
  const h = parseHash(hash);
  query = h.q;
  groupFilter = h.group;
  levelFilter = h.level;
  okFilter = h.ok;
  syncControls();
}

function syncControls() {
  const qEl = $('doc-q');
  const group = $('doc-group');
  const level = $('doc-level');
  const ok = $('doc-ok');
  const clear = $('doc-clear');
  if (qEl && qEl.value !== query) qEl.value = query;
  if (group) group.value = groupFilter;
  if (level) level.value = levelFilter;
  if (ok) ok.value = okFilter;
  if (clear) {
    clear.disabled = !(query || groupFilter || levelFilter || okFilter);
  }
}

function uniqueCheckValues(key) {
  return [...new Set((state?.checks ?? []).map(c => c[key]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b))
  );
}

function filteredChecks() {
  const q = query.toLowerCase().trim();
  return (state?.checks ?? []).filter(c => {
    if (groupFilter && c.group !== groupFilter) return false;
    if (levelFilter && c.level !== levelFilter) return false;
    if (okFilter === 'pass' && !c.ok) return false;
    if (okFilter === 'fail' && c.ok) return false;
    if (!q) return true;
    const hay = `${c.id} ${c.group} ${c.level} ${c.message} ${c.fixCommand ?? ''}`.toLowerCase();
    return hay.includes(q);
  });
}

function toneClass(tone) {
  if (tone === 'green') return 'ok';
  if (tone === 'yellow') return 'warn';
  if (tone === 'red') return 'bad';
  return tone === 'pass' || tone === 'ok' ? 'ok' : 'warn';
}

function showSkeletons() {
  const stats = $('doc-stats');
  if (stats) {
    stats.innerHTML = Array.from({ length: 4 }, () => `<div class="portal-skeleton"></div>`).join('');
  }
  const gate = $('doc-gate');
  if (gate) {
    gate.className = 'portal-gate';
    gate.innerHTML = '<span class="dot" aria-hidden="true"></span>…';
  }
  const meta = $('doc-baked');
  if (meta) meta.textContent = 'loading…';
  const err = $('doc-error');
  if (err) {
    err.hidden = true;
    err.innerHTML = '';
  }
}

function showMissingBake(msg = '') {
  const gate = $('doc-gate');
  if (gate) {
    gate.className = 'portal-gate bad';
    gate.innerHTML = '<span class="dot" aria-hidden="true"></span>missing';
  }
  const meta = $('doc-baked');
  if (meta) meta.textContent = 'bake unavailable';

  const stats = $('doc-stats');
  if (stats) stats.innerHTML = '';

  const err = $('doc-error');
  if (err) {
    err.hidden = false;
    err.innerHTML = `<div class="portal-error" role="alert">
      <h3>Doctor bake unavailable</h3>
      <p>Could not load <code>/registry/doctor-state.json</code>. Run the doctor locally or retry after deploy.</p>
      ${msg ? `<p><code>${esc(msg)}</code></p>` : ''}
      <div class="portal-error-actions">
        <button type="button" class="portal-clear" id="doc-retry">Retry</button>
        <a class="portal-clear" href="/registry/doctor-state.json" style="display:inline-flex;align-items:center;text-decoration:none">Open JSON</a>
      </div>
      <p class="dim" style="margin-top:10px;margin-bottom:0">Local fix: <code data-copy>bun run bake:doctor</code> · run <code data-copy>bun run portal:doctor --verbose</code></p>
    </div>`;
    bindCopyButtons(err);
    $('doc-retry')?.addEventListener('click', () => void load());
  }

  const body = $('doc-body');
  if (body) {
    body.innerHTML =
      '<tr><td colspan="6" class="dim">Missing bake — use Retry above or run <code>bun run bake:doctor</code></td></tr>';
  }
  const groups = $('doc-groups');
  if (groups) groups.innerHTML = '—';
  const count = $('doc-count');
  if (count) count.textContent = '0 shown';
}

function renderHero() {
  const gate = $('doc-gate');
  const meta = $('doc-baked');
  if (!gate || !state) return;

  const tone = state.tone || (state.ok ? 'green' : 'red');
  const cls = toneClass(tone);
  gate.className = `portal-gate ${cls}`;
  gate.innerHTML = `<span class="dot" aria-hidden="true"></span>${esc(tone)}`;

  const s = state.summary || {};
  if (meta) {
    meta.textContent = `generated ${ageLabel(state.generatedAt)} · ${s.passed ?? 0}/${s.checkCount ?? 0} passed · fatalFail=${s.failedFatal ?? 0} · ${state.cli || 'bun run portal:doctor'}`;
  }

  const err = $('doc-error');
  if (err) {
    err.hidden = true;
    err.innerHTML = '';
  }
}

function renderStats() {
  const stats = $('doc-stats');
  if (!stats || !state) return;

  const s = state.summary || {};
  const items = [
    {
      label: 'Passed',
      value: `${s.passed ?? 0}/${s.checkCount ?? 0}`,
      hint: 'filter passing checks',
      cls: (s.failed ?? 0) === 0 ? 'ok' : 'muted',
      filter: { kind: 'ok', value: 'pass' },
    },
    {
      label: 'Failed',
      value: String(s.failed ?? 0),
      hint: 'filter failing checks',
      cls: (s.failed ?? 0) ? 'bad' : 'ok',
      filter: { kind: 'ok', value: 'fail' },
    },
    {
      label: 'Fatal fail',
      value: String(s.failedFatal ?? 0),
      hint: 'filter fatal level',
      cls: (s.failedFatal ?? 0) ? 'bad' : 'ok',
      filter: { kind: 'level', value: 'fatal' },
    },
    {
      label: 'Auto-fixable',
      value: String(s.autoFixableFailed ?? 0),
      hint: 'failed with fixCommand',
      cls: (s.autoFixableFailed ?? 0) ? 'warn' : 'muted',
      filter: null,
    },
  ];

  stats.innerHTML = items
    .map(item => {
      const active =
        item.filter?.kind === 'ok'
          ? okFilter === item.filter.value
          : item.filter?.kind === 'level'
            ? levelFilter === item.filter.value
            : false;
      const disabled = item.filter == null ? ' disabled' : '';
      const activeCls = active ? ' active' : '';
      const dataAttr =
        item.filter?.kind === 'ok'
          ? ` data-ok-filter="${esc(item.filter.value)}"`
          : item.filter?.kind === 'level'
            ? ` data-level-filter="${esc(item.filter.value)}"`
            : '';
      return (
        `<button type="button" class="portal-stat ${item.cls}${activeCls}"${disabled}${dataAttr}>` +
        `<span class="k">${esc(item.label)}</span>` +
        `<span class="v">${esc(item.value)}</span>` +
        `<span class="hint">${esc(item.hint)}</span>` +
        `</button>`
      );
    })
    .join('');

  for (const btn of stats.querySelectorAll('[data-ok-filter]')) {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-ok-filter') ?? '';
      okFilter = okFilter === next ? '' : next;
      syncControls();
      writeHash();
      renderStats();
      renderGroups();
      renderChecks();
    });
  }
  for (const btn of stats.querySelectorAll('[data-level-filter]')) {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-level-filter') ?? '';
      levelFilter = levelFilter === next ? '' : next;
      syncControls();
      writeHash();
      renderStats();
      renderGroups();
      renderChecks();
    });
  }
}

function renderGroups() {
  const groups = $('doc-groups');
  if (!groups || !state) return;

  const bg = state.byGroup || {};
  groups.innerHTML = Object.entries(bg)
    .map(([g, v]) => {
      const fail = v?.failed ?? 0;
      const active = groupFilter === g ? ' active' : '';
      const cls = fail ? 'bad' : 'ok';
      return `<button type="button" class="portal-clear doc-group-chip ${cls}${active}" data-group-filter="${esc(g)}" title="failed ${fail}/${v?.total ?? 0}">${esc(g)} · ${fail ? `${fail} fail` : 'ok'}</button>`;
    })
    .join(' ');

  for (const btn of groups.querySelectorAll('[data-group-filter]')) {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-group-filter') ?? '';
      groupFilter = groupFilter === next ? '' : next;
      syncControls();
      writeHash();
      renderGroups();
      renderStats();
      renderChecks();
    });
  }
}

function renderChecks() {
  const body = $('doc-body');
  const count = $('doc-count');
  if (!body || !state) return;

  fillSelect($('doc-group'), uniqueCheckValues('group'), 'all groups');
  fillSelect($('doc-level'), uniqueCheckValues('level'), 'all levels');

  const rows = filteredChecks();
  if (count) {
    count.textContent = `${rows.length} shown${rows.length !== (state.checks?.length ?? 0) ? ` · ${state.checks?.length ?? 0} total` : ''}`;
  }

  body.innerHTML = rows.length
    ? rows
        .map(c => {
          const rowClass = c.ok ? 'row-ok' : 'row-bad';
          const st = c.ok ? '✓' : '✗';
          const fix = c.fixCommand
            ? `<code data-copy>${esc(c.fixCommand)}</code>`
            : '<span class="dim">—</span>';
          return `<tr class="${rowClass}">
        <td class="${c.ok ? 'st-ok' : 'st-bad'}">${st}</td>
        <td><span class="tone-chip tone-neutral">${esc(c.group)}</span></td>
        <td class="mono"><code>${esc(c.id)}</code></td>
        <td>${esc(c.level)}</td>
        <td>${esc(c.message)}</td>
        <td>${fix}</td>
      </tr>`;
        })
        .join('')
    : '<tr><td colspan="6" class="dim">No checks match.</td></tr>';

  bindCopyButtons(body);
}

function fillSelect(el, values, allLabel) {
  if (!el) return;
  const cur = el.value;
  const opts = [`<option value="">${esc(allLabel)}</option>`].concat(
    values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`)
  );
  el.innerHTML = opts.join('');
  if (values.includes(cur)) el.value = cur;
}

/** @param {object|null} next */
export function renderDoctorState(next) {
  state = next;
  if (!state || state.kind !== 'portal-doctor-state') {
    showMissingBake();
    return;
  }
  renderHero();
  renderStats();
  renderGroups();
  renderChecks();
}

async function load() {
  if (loading) return;
  loading = true;
  showSkeletons();
  const r = await fetchJsonResult('/registry/doctor-state.json');
  renderDoctorState(r.ok ? r.data : null);
  loading = false;
}

async function runDoctor() {
  const btn = $('doc-run');
  const status = $('doc-run-status');
  if (!isLoopback()) {
    if (status) {
      status.textContent =
        'Run is loopback-only. Use: bun run bake:doctor  or  bun run portal:doctor';
    }
    return;
  }
  if (btn) btn.disabled = true;
  if (status) status.textContent = 'Running portal doctor…';
  try {
    const res = await fetch('/api/doctor/run', {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    const data = await res.json();
    if (!res.ok) {
      if (status) status.textContent = data?.error || `run failed (${res.status})`;
      return;
    }
    if (status) {
      status.textContent = `OK · tone=${data?.tone ?? '—'} · wrote doctor-state.json`;
    }
    if (data?.state) renderDoctorState(data.state);
    else await load();
  } catch (e) {
    if (status) status.textContent = String(e?.message || e);
  } finally {
    if (btn) btn.disabled = false;
  }
}

export async function initDoctorBoard() {
  applyHash();
  await load();

  $('doc-q')?.addEventListener('input', e => {
    query = e.target.value;
    syncControls();
    writeHash();
    renderChecks();
  });
  $('doc-group')?.addEventListener('change', e => {
    groupFilter = e.target.value;
    syncControls();
    writeHash();
    renderGroups();
    renderChecks();
  });
  $('doc-level')?.addEventListener('change', e => {
    levelFilter = e.target.value;
    syncControls();
    writeHash();
    renderStats();
    renderChecks();
  });
  $('doc-ok')?.addEventListener('change', e => {
    okFilter = e.target.value;
    syncControls();
    writeHash();
    renderStats();
    renderChecks();
  });
  $('doc-clear')?.addEventListener('click', () => {
    query = '';
    groupFilter = '';
    levelFilter = '';
    okFilter = '';
    syncControls();
    writeHash();
    renderStats();
    renderGroups();
    renderChecks();
  });
  $('doc-run')?.addEventListener('click', () => {
    void runDoctor();
  });

  window.addEventListener('hashchange', () => {
    applyHash();
    if (state?.kind === 'portal-doctor-state') {
      renderStats();
      renderGroups();
      renderChecks();
    }
  });

  bindCopyButtons();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void initDoctorBoard();
    });
  } else {
    void initDoctorBoard();
  }
}
