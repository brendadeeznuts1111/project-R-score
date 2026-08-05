/**
 * Factory Telegram handshake board — /registry/telegram-handshake.json
 * @see bun run telegram:verify
 * @see bun run telegram:handshake:catalog
 * @see docs/harness/tenants/telegram-factory.md
 */
import { bindCopyButtons } from '../copy-cli.js';
import { fetchJsonResult } from '../fetch-json.js';
import { partnerHash } from '../partners/partner-routes.js';

const HANDSHAKE_URL = '/registry/telegram-handshake.json';
const CATALOG_URL = '/registry/telegram-handshake-catalog.json';
const TENANT_REG_URL = '/registry/factory/registry.json';

/** @type {any} */
let handshake = null;
/** @type {any} */
let catalog = null;
/** @type {any} */
let tenantReg = null;

let query = '';
/** @type {''|'operator_ready'|'forum_ready'|'designated'|'blocked'|'invite_gap'|'other'} */
let phaseFilter = '';
/** @type {''|'gaps'|'verify'|'lanes'|'invite'} */
let attentionFilter = '';
let loading = false;

const $ = id => document.getElementById(id);

function esc(value) {
  const el = document.createElement('div');
  el.textContent = value == null ? '' : String(value);
  return el.innerHTML;
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
    phase: params.get('phase') || '',
    attention: params.get('attention') || '',
  };
}

function writeHash() {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (phaseFilter) params.set('phase', phaseFilter);
  if (attentionFilter) params.set('attention', attentionFilter);
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
  phaseFilter = h.phase;
  attentionFilter = h.attention;
  syncControls();
}

function syncControls() {
  const qEl = $('fx-q');
  const phase = $('fx-phase');
  const attention = $('fx-attention');
  const clear = $('fx-clear');
  if (qEl && qEl.value !== query) qEl.value = query;
  if (phase) phase.value = phaseFilter;
  if (attention) attention.value = attentionFilter;
  if (clear) {
    clear.disabled = !(query || phaseFilter || attentionFilter);
  }
}

function rows() {
  return Array.isArray(handshake?.rows) ? handshake.rows : [];
}

function rowHasGaps(row) {
  return (
    !row.handshakeOk ||
    (row.gapCount ?? 0) > 0 ||
    row.needsPartnerInForum ||
    (row.verifyFails?.length ?? 0) > 0 ||
    (row.laneFails?.length ?? 0) > 0 ||
    !row.inviteLink
  );
}

function rowMatchesPhase(row, phase) {
  if (!phase) return true;
  if (phase === 'invite_gap') return !row.inviteLink || row.needsPartnerInForum;
  if (phase === 'blocked') return !row.handshakeOk;
  if (phase === 'other') {
    return !['operator_ready', 'forum_ready', 'designated'].includes(row.phase);
  }
  return row.phase === phase;
}

function rowMatchesAttention(row, attention) {
  if (!attention) return true;
  if (attention === 'gaps') return rowHasGaps(row);
  if (attention === 'verify') return (row.verifyFails?.length ?? 0) > 0;
  if (attention === 'lanes') return (row.laneFails?.length ?? 0) > 0;
  if (attention === 'invite') return !row.inviteLink || row.needsPartnerInForum;
  return true;
}

function filteredRows() {
  const q = query.toLowerCase().trim();
  return rows().filter(row => {
    if (!rowMatchesPhase(row, phaseFilter)) return false;
    if (!rowMatchesAttention(row, attentionFilter)) return false;
    if (!q) return true;
    const hay = [
      row.partnerCode,
      row.phase,
      row.callSign,
      row.dmSeatStatus,
      row.membershipCell,
      ...(row.nextSteps || []),
      ...(row.verifyFails || []),
      ...(row.laneFails || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

function gateTone() {
  if (!handshake) return { tone: 'bad', label: 'missing' };
  const blocked = handshake.blocked ?? 0;
  const inviteGaps = handshake.inviteGaps ?? 0;
  const verifyFail = handshake.verifyFailPartners ?? 0;
  const laneFail = handshake.laneFailPartners ?? 0;
  const partners = handshake.partners ?? rows().length;
  if (partners === 0) return { tone: 'warn', label: 'empty' };
  if (blocked > 0 || verifyFail > 0 || laneFail > 0) return { tone: 'bad', label: 'blocked' };
  if (inviteGaps > 0) return { tone: 'warn', label: 'gaps' };
  const ready = handshake.operatorReady ?? 0;
  if (ready === partners) return { tone: 'ok', label: 'ready' };
  return { tone: 'warn', label: 'partial' };
}

function showSkeletons() {
  const stats = $('fx-stats');
  if (stats) {
    stats.innerHTML = Array.from({ length: 6 }, () => `<div class="portal-skeleton"></div>`).join(
      ''
    );
  }
  const gate = $('fx-gate');
  if (gate) {
    gate.className = 'portal-gate';
    gate.innerHTML = '<span class="dot" aria-hidden="true"></span>…';
  }
  const meta = $('fx-baked');
  if (meta) meta.textContent = 'loading…';
  const err = $('fx-error');
  if (err) {
    err.hidden = true;
    err.innerHTML = '';
  }
  $('fx-dashboard')?.classList.add('hidden');
}

function showMissingBake(msg = '') {
  const gate = $('fx-gate');
  if (gate) {
    gate.className = 'portal-gate bad';
    gate.innerHTML = '<span class="dot" aria-hidden="true"></span>missing';
  }
  const meta = $('fx-baked');
  if (meta) meta.textContent = 'handshake unavailable';

  const stats = $('fx-stats');
  if (stats) stats.innerHTML = '';

  $('fx-dashboard')?.classList.add('hidden');

  const err = $('fx-error');
  if (err) {
    err.hidden = false;
    err.innerHTML = `<div class="portal-error" role="alert">
      <h3>Handshake bake unavailable</h3>
      <p>Could not load <code>${esc(HANDSHAKE_URL)}</code>. Refresh the handshake bake, then retry.</p>
      ${msg ? `<p><code>${esc(msg)}</code></p>` : ''}
      <div class="portal-error-actions">
        <button type="button" class="portal-clear" id="fx-retry">Retry</button>
        <a class="portal-clear" href="${esc(HANDSHAKE_URL)}" style="display:inline-flex;align-items:center;text-decoration:none">Open JSON</a>
      </div>
      <p class="dim" style="margin-top:10px;margin-bottom:0">Local:
        <code data-copy>bun run telegram:handshake:catalog</code> ·
        <code data-copy>bun run telegram:verify</code>
      </p>
    </div>`;
    bindCopyButtons(err);
    $('fx-retry')?.addEventListener('click', () => void load());
  }

  const body = $('fx-body');
  if (body) {
    body.innerHTML =
      '<tr><td colspan="10" class="dim">Missing bake — use Retry above or run <code>bun run telegram:handshake:catalog</code></td></tr>';
  }
}

function renderHero() {
  const gate = $('fx-gate');
  const meta = $('fx-baked');
  if (!gate) return;

  const { tone, label } = gateTone();
  gate.className = `portal-gate ${tone}`;
  gate.innerHTML = `<span class="dot" aria-hidden="true"></span>${esc(label)}`;

  if (meta && handshake) {
    const parts = [
      `bake ${ageLabel(handshake.generatedAt)}`,
      `source ${handshake.source || '—'}`,
      `${handshake.partners ?? rows().length} partners`,
      `${handshake.operatorReady ?? 0} operator-ready`,
    ];
    if (catalog?.schema) parts.push('catalog ok');
    meta.textContent = parts.join(' · ');
  }

  const err = $('fx-error');
  if (err) {
    err.hidden = true;
    err.innerHTML = '';
  }
}

function renderStats() {
  const stats = $('fx-stats');
  if (!stats || !handshake) return;

  const partners = handshake.partners ?? rows().length;
  const ready = handshake.operatorReady ?? 0;
  const forum = handshake.forumReady ?? 0;
  const inviteGaps = handshake.inviteGaps ?? 0;
  const blocked = handshake.blocked ?? 0;
  const verifyFail = handshake.verifyFailPartners ?? 0;
  const laneFail = handshake.laneFailPartners ?? 0;

  const items = [
    {
      label: 'Partners',
      value: String(partners),
      hint: 'clear filters',
      cls: 'muted',
      filter: { kind: 'clear' },
    },
    {
      label: 'Operator ready',
      value: String(ready),
      hint: 'phase operator_ready',
      cls: ready === partners && partners > 0 ? 'ok' : 'warn',
      filter: { kind: 'phase', value: 'operator_ready' },
    },
    {
      label: 'Forum ready',
      value: String(forum),
      hint: 'phase forum_ready',
      cls: forum > 0 ? 'ok' : 'muted',
      filter: { kind: 'phase', value: 'forum_ready' },
    },
    {
      label: 'Invite gaps',
      value: String(inviteGaps),
      hint: 'missing invites',
      cls: inviteGaps > 0 ? 'warn' : 'ok',
      filter: { kind: 'attention', value: 'invite' },
    },
    {
      label: 'Blocked',
      value: String(blocked),
      hint: 'handshake fail',
      cls: blocked > 0 ? 'bad' : 'ok',
      filter: { kind: 'phase', value: 'blocked' },
    },
    {
      label: 'Verify fails',
      value: String(verifyFail),
      hint: 'partners with verify fails',
      cls: verifyFail > 0 ? 'bad' : 'ok',
      filter: { kind: 'attention', value: 'verify' },
    },
    {
      label: 'Lane fails',
      value: String(laneFail),
      hint: 'partners with lane fails',
      cls: laneFail > 0 ? 'bad' : 'ok',
      filter: { kind: 'attention', value: 'lanes' },
    },
  ];

  stats.innerHTML = items
    .map(item => {
      const active =
        item.filter?.kind === 'phase'
          ? phaseFilter === item.filter.value && !attentionFilter
          : item.filter?.kind === 'attention'
            ? attentionFilter === item.filter.value
            : item.filter?.kind === 'clear'
              ? !(query || phaseFilter || attentionFilter)
              : false;
      const dataAttr =
        item.filter?.kind === 'phase'
          ? ` data-phase-filter="${esc(item.filter.value)}"`
          : item.filter?.kind === 'attention'
            ? ` data-attention-filter="${esc(item.filter.value)}"`
            : item.filter?.kind === 'clear'
              ? ' data-stat-clear="1"'
              : '';
      return (
        `<button type="button" class="portal-stat ${item.cls}${active ? ' active' : ''}"${dataAttr}>` +
        `<span class="k">${esc(item.label)}</span>` +
        `<span class="v">${esc(item.value)}</span>` +
        `<span class="hint">${esc(item.hint)}</span>` +
        `</button>`
      );
    })
    .join('');

  for (const btn of stats.querySelectorAll('[data-phase-filter]')) {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-phase-filter') ?? '';
      phaseFilter = phaseFilter === next ? '' : next;
      attentionFilter = '';
      syncControls();
      writeHash();
      renderStats();
      renderTable();
    });
  }
  for (const btn of stats.querySelectorAll('[data-attention-filter]')) {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-attention-filter') ?? '';
      attentionFilter = attentionFilter === next ? '' : next;
      syncControls();
      writeHash();
      renderStats();
      renderTable();
    });
  }
  for (const btn of stats.querySelectorAll('[data-stat-clear]')) {
    btn.addEventListener('click', () => {
      query = '';
      phaseFilter = '';
      attentionFilter = '';
      syncControls();
      writeHash();
      renderStats();
      renderTable();
    });
  }
}

function renderCommands() {
  const host = $('fx-commands');
  if (!host) return;
  const cmds = handshake?.commands || {};
  const entries = [
    ['verify', 'bun run telegram:verify'],
    ['catalog', 'bun run telegram:handshake:catalog'],
    ['readiness', cmds.readiness || 'bun run telegram:handshake:readiness --invite-gap'],
    ['invite-gap', cmds.inviteGap || 'bun run telegram:handshake:invite-gap'],
    ['desk', cmds.desk || 'bun run telegram:handshake:desk'],
    ['send-invite', cmds.sendInviteAll || 'bun run telegram:ops -- send-forum-invite --all'],
  ];
  host.innerHTML = entries
    .map(
      ([label, cmd]) =>
        `<button type="button" class="copy-cli portal-clear" data-cli="${esc(cmd)}" title="${esc(cmd)}">${esc(label)}</button>`
    )
    .join('');
  bindCopyButtons(host);
}

function toneClass(ok) {
  return ok ? 'st-ok' : 'st-bad';
}

function renderTable() {
  const body = $('fx-body');
  const count = $('fx-count');
  if (!body) return;

  const list = filteredRows();
  if (count) {
    const total = rows().length;
    count.textContent =
      list.length === total ? `${list.length} partners` : `${list.length} shown · ${total} total`;
  }

  body.innerHTML = list.length
    ? list
        .map(row => {
          const code = row.partnerCode || '—';
          const invite = row.inviteLink
            ? `<a href="${esc(row.inviteLink)}" target="_blank" rel="noopener">invite</a>`
            : '<span class="tone-warn">none</span>';
          const verify = `${row.verifyPassed ?? '—'}/${row.verifyTotal ?? '—'}`;
          const lanes = `${row.lanesOk ?? '—'}/${row.lanesTotal ?? '—'}`;
          const next = (row.nextSteps && row.nextSteps[0]) || '—';
          const partnerHref = `/portal/partners/${partnerHash(code)}`;
          return `<tr data-partner-code="${esc(code)}">
            <td><a href="${esc(partnerHref)}"><code>${esc(code)}</code></a></td>
            <td><span class="tone-chip tone-neutral">${esc(row.phase || '—')}</span></td>
            <td><code>${esc(row.membershipCell || '—')}</code></td>
            <td><code>${esc(row.callSign || '—')}</code></td>
            <td>${esc(row.dmSeatStatus || '—')}</td>
            <td class="${toneClass(row.handshakeOk)}">${row.handshakeOk ? 'ok' : 'fail'} · ${esc(verify)}</td>
            <td class="${(row.laneFails?.length ?? 0) > 0 ? 'st-bad' : 'st-ok'}">${esc(lanes)}</td>
            <td>${invite}</td>
            <td>${esc(row.gapCount ?? 0)}</td>
            <td>${esc(next)}</td>
          </tr>`;
        })
        .join('')
    : '<tr><td colspan="10" class="dim">No partners match filters.</td></tr>';
}

function renderTenantRegistry() {
  const meta = $('fx-tenant-meta');
  const body = $('fx-tenant-body');
  if (!meta || !body) return;

  if (!tenantReg?.packages) {
    meta.textContent = 'tenant registry optional / unavailable';
    body.innerHTML =
      '<tr><td colspan="3" class="dim">No /registry/factory/registry.json packages</td></tr>';
    return;
  }

  const pkgs = Object.entries(tenantReg.packages);
  meta.textContent = `${pkgs.length} packages · updated ${ageLabel(tenantReg.lastUpdated)}`;
  body.innerHTML = pkgs.length
    ? pkgs
        .map(([name, pkg]) => {
          const latest = pkg?.['dist-tags']?.latest || pkg?.versions?.[0] || '—';
          const versions = Array.isArray(pkg?.versions) ? pkg.versions.length : '—';
          return `<tr>
            <td><code>${esc(name)}</code></td>
            <td>${esc(latest)}</td>
            <td>${esc(versions)}</td>
          </tr>`;
        })
        .join('')
    : '<tr><td colspan="3" class="dim">No packages</td></tr>';
}

function renderAll() {
  if (!handshake || handshake.schema !== 'factorywager.telegram-handshake.v1') {
    showMissingBake(handshake ? `unexpected schema ${handshake.schema || '?'}` : '');
    return;
  }
  $('fx-dashboard')?.classList.remove('hidden');
  renderHero();
  renderStats();
  renderCommands();
  renderTable();
  renderTenantRegistry();
}

async function load() {
  if (loading) return;
  loading = true;
  showSkeletons();

  const [hs, cat, reg] = await Promise.all([
    fetchJsonResult(HANDSHAKE_URL),
    fetchJsonResult(CATALOG_URL),
    fetchJsonResult(TENANT_REG_URL),
  ]);

  handshake = hs.ok ? hs.data : null;
  catalog = cat.ok ? cat.data : null;
  tenantReg = reg.ok ? reg.data : null;

  if (!handshake) {
    showMissingBake(hs.ok === false ? hs.error || `HTTP ${hs.status ?? '?'}` : '');
  } else {
    renderAll();
  }
  loading = false;
}

function bindControls() {
  $('fx-q')?.addEventListener('input', e => {
    query = e.target.value || '';
    syncControls();
    writeHash();
    renderStats();
    renderTable();
  });
  $('fx-phase')?.addEventListener('change', e => {
    phaseFilter = e.target.value || '';
    syncControls();
    writeHash();
    renderStats();
    renderTable();
  });
  $('fx-attention')?.addEventListener('change', e => {
    attentionFilter = e.target.value || '';
    syncControls();
    writeHash();
    renderStats();
    renderTable();
  });
  $('fx-clear')?.addEventListener('click', () => {
    query = '';
    phaseFilter = '';
    attentionFilter = '';
    syncControls();
    writeHash();
    renderStats();
    renderTable();
  });
  $('fx-refresh')?.addEventListener('click', () => void load());
  window.addEventListener('hashchange', () => {
    applyHash();
    renderStats();
    renderTable();
  });
}

applyHash();
bindControls();
bindCopyButtons(document);
void load();
