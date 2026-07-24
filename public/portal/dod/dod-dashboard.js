/**
 * DOD review portal — snapshot-first on Pages, live API on serve-public.
 */

function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtRel(iso) {
  if (!iso) return null;
  const t = Date.parse(String(iso));
  if (!Number.isFinite(t)) return null;
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (sec < 45) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function fmtTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function shortId(id) {
  const s = String(id || '');
  return s.length > 10 ? `${s.slice(0, 8)}…` : s || '—';
}

function countByStatus(entries) {
  const byStatus = {};
  for (const row of entries) {
    const st = String(row.status ?? 'unknown');
    byStatus[st] = (byStatus[st] ?? 0) + 1;
  }
  return byStatus;
}

function readEmbed() {
  const el = document.getElementById('dod-embed');
  if (!el?.textContent?.trim()) return null;
  try {
    return JSON.parse(el.textContent);
  } catch {
    return null;
  }
}

function normalizePayload(data, headers, source) {
  const readOnly =
    headers?.get?.('X-DOD-Read-Only') === '1' ||
    data?.readOnly === true ||
    source.includes('dod-queue.json');

  if (Array.isArray(data)) {
    return {
      entries: data,
      readOnly,
      mode: readOnly ? 'snapshot' : 'live',
      generatedAt: null,
      byStatus: countByStatus(data),
      source,
    };
  }

  if (data && Array.isArray(data.entries)) {
    return {
      entries: data.entries,
      readOnly: data.readOnly !== false || readOnly,
      mode: data.mode || (readOnly ? 'snapshot' : 'live'),
      generatedAt: data.generatedAt ?? null,
      byStatus: data.byStatus && typeof data.byStatus === 'object' ? data.byStatus : countByStatus(data.entries),
      source,
    };
  }

  return null;
}

async function fetchQueue(status, timeoutMs = 8000) {
  const urls = [`/api/dod?status=${encodeURIComponent(status)}`, '/registry/dod-queue.json'];
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.includes('json')) continue;
      const data = await res.json();
      const normalized = normalizePayload(data, res.headers, url);
      if (!normalized) continue;
      if (url.includes('dod-queue.json') && status !== 'all') {
        normalized.entries = normalized.entries.filter((e) => e.status === status);
      }
      return normalized;
    } catch {
      /* try next */
    }
  }
  return {
    entries: [],
    readOnly: true,
    mode: 'snapshot',
    generatedAt: null,
    byStatus: {},
    source: 'none',
  };
}

function toast(message, kind = 'info') {
  const host = document.getElementById('dod-toast');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `dod-toast-item ${kind}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 200);
  }, 3200);
}

export function renderDodDashboard(state) {
  const { entries, currentFilter, readOnly, byStatus, mode, generatedAt } = state;
  const statuses = ['flagged', 'pending', 'verified', 'rejected', 'all'];
  const total = Object.values(byStatus || {}).reduce((n, v) => n + Number(v || 0), 0);
  const countFor = (s) => (s === 'all' ? total : Number(byStatus?.[s] || 0));

  const filtersHtml = statuses
    .map((s) => {
      const n = countFor(s);
      return `<button type="button" class="dod-filter ${s} ${currentFilter === s ? 'active' : ''}" data-status="${s}">
        <span class="dod-filter-label">${s}</span>
        <span class="dod-filter-count">${n}</span>
      </button>`;
    })
    .join('');

  const statsHtml = `
    <div class="dod-stats" role="group" aria-label="Queue counts">
      <div class="dod-stat ${countFor('flagged') ? 'hot' : ''}"><span class="k">Flagged</span><span class="v">${countFor('flagged')}</span></div>
      <div class="dod-stat"><span class="k">Pending</span><span class="v">${countFor('pending')}</span></div>
      <div class="dod-stat ok"><span class="k">Verified</span><span class="v">${countFor('verified')}</span></div>
      <div class="dod-stat"><span class="k">Rejected</span><span class="v">${countFor('rejected')}</span></div>
      <div class="dod-stat"><span class="k">Total</span><span class="v">${total}</span></div>
    </div>`;

  const rel = fmtRel(generatedAt);
  const modeLabel = mode === 'live' && !readOnly ? 'Live' : 'Snapshot';
  const modeClass = mode === 'live' && !readOnly ? 'live' : 'snapshot';
  const needsAttention = readOnly && countFor('flagged') > 0;
  const metaHtml = `
    <div class="dod-head">
      <div class="dod-head-main">
        <h2 class="dod-title">DOD Review</h2>
        <p class="dod-sub">Document-of-deposit evidence queue — balance slips, IDs, receipts.</p>
      </div>
      <div class="dod-mode ${modeClass}${needsAttention ? ' warn' : ''}">
        <span class="dod-mode-pill">${modeLabel}</span>
        <span class="dod-mode-detail">
          ${
            readOnly
              ? needsAttention
                ? `Read-only on Pages · ${countFor('flagged')} flagged need local review`
                : `Read-only on Pages${rel ? ` · baked ${rel}` : ''}`
              : 'Approve and reject write to local SQLite'
          }
        </span>
        ${generatedAt ? `<span class="dod-mode-time" title="${esc(generatedAt)}">${esc(fmtTime(generatedAt))}</span>` : ''}
      </div>
    </div>
    ${
      readOnly
        ? `<details class="dod-help"><summary>How to approve or reject</summary>
            <p>Pages serves a baked queue from <code>bun run ops:snapshot</code>. Mutations need Bun + SQLite:</p>
            <pre><code>bun run serve:public
open http://localhost:3000/portal/dod/</code></pre>
          </details>`
        : ''
    }
    ${statsHtml}`;

  const listHtml = entries.length
    ? entries
        .map((e) => {
          const canAct = !readOnly && e.status !== 'verified' && e.status !== 'rejected';
          const tamper = Number(e.tamper_score ?? 0);
          const tamperCls = tamper > 50 ? 'tamper-high' : 'tamper-low';
          return `<article class="dod-card ${esc(e.status)}" data-id="${esc(e.id)}">
            <div class="dod-preview">
              ${
                e.s3_path
                  ? `<img src="/evidence/${esc(e.s3_path)}" alt="DOD evidence" loading="lazy" />`
                  : '<div class="dod-preview-empty">No image</div>'
              }
              <span class="tamper-badge ${tamperCls}">Tamper ${esc(tamper)}/100</span>
            </div>
            <div class="dod-details">
              <div class="dod-card-top">
                <span class="dod-status-pill ${esc(e.status)}">${esc(e.status)}</span>
                <span class="dod-type">${esc(e.type || 'unknown')}</span>
              </div>
              <dl class="dod-meta">
                <div><dt>ID</dt><dd><code title="${esc(e.id)}">${esc(shortId(e.id))}</code></dd></div>
                <div><dt>Agent</dt><dd><code title="${esc(e.agent_id)}">${esc(shortId(e.agent_id))}</code></dd></div>
                <div><dt>Submitted</dt><dd>${esc(fmtTime(e.submitted_at))}</dd></div>
                ${
                  e.geo_lat != null && Number.isFinite(Number(e.geo_lat))
                    ? `<div><dt>Geo</dt><dd>${Number(e.geo_lat).toFixed(4)}, ${Number(e.geo_lng).toFixed(4)}</dd></div>`
                    : ''
                }
                ${e.device_model ? `<div><dt>Device</dt><dd>${esc(e.device_model)}</dd></div>` : ''}
                ${e.signature ? `<div><dt>Sig</dt><dd><code title="${esc(e.signature)}">${esc(String(e.signature).slice(0, 16))}…</code></dd></div>` : ''}
              </dl>
              ${e.extracted_text ? `<p class="dod-ocr">${esc(String(e.extracted_text).slice(0, 180))}${String(e.extracted_text).length > 180 ? '…' : ''}</p>` : ''}
              ${e.rejection_reason ? `<div class="reject-reason">${esc(e.rejection_reason)}</div>` : ''}
            </div>
            ${
              canAct
                ? `<div class="dod-actions">
              <button type="button" class="btn-approve" data-id="${esc(e.id)}">Approve</button>
              <button type="button" class="btn-reject" data-id="${esc(e.id)}">Reject</button>
            </div>`
                : ''
            }
          </article>`;
        })
        .join('')
    : `<div class="dod-empty">
        <p class="dod-empty-title">${currentFilter === 'flagged' ? 'No flagged DODs' : 'Queue is empty'}</p>
        <p class="dod-empty-sub">${
          currentFilter === 'flagged'
            ? 'Nothing needs human review in this filter. Check Pending or All, or wait for the next agent submission.'
            : readOnly
              ? 'The published snapshot has no submissions. After local evidence lands, run <code>bun run ops:snapshot</code> and redeploy to refresh Pages.'
              : 'Submit evidence via the agent pipeline, then refresh this page.'
        }</p>
      </div>`;

  return { metaHtml, filtersHtml, listHtml };
}

async function postAction(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json().catch(() => ({})) : {};
  if (!res.ok) {
    const err = data.error || data.hint || `HTTP ${res.status}`;
    throw new Error(err);
  }
  return data;
}

export async function initDodDashboard() {
  const loading = document.getElementById('loading');
  const dashboard = document.getElementById('dashboard');
  const meta = document.getElementById('dod-meta');
  const filters = document.getElementById('dod-filters');
  const list = document.getElementById('dod-list');
  const rejectModal = document.getElementById('dod-reject-modal');
  const rejectReason = document.getElementById('dod-reject-reason');
  const rejectConfirm = document.getElementById('dod-reject-confirm');
  const rejectCancel = document.getElementById('dod-reject-cancel');
  if (!loading || !dashboard || !meta || !filters || !list) return;

  let currentFilter = 'flagged';
  let entries = [];
  let byStatus = {};
  let readOnly = true;
  let mode = 'snapshot';
  let generatedAt = null;
  let rejectTargetId = null;
  let busy = false;

  const paint = () => {
    const view = renderDodDashboard({
      entries,
      currentFilter,
      readOnly,
      byStatus,
      mode,
      generatedAt,
    });
    loading.classList.add('hidden');
    dashboard.classList.remove('hidden');
    meta.innerHTML = view.metaHtml;
    filters.innerHTML = view.filtersHtml;
    list.innerHTML = view.listHtml;
    filters.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => load(btn.dataset.status || 'all'));
    });
    if (!readOnly) wireActions();
  };

  function setBusy(on) {
    busy = on;
    list.querySelectorAll('button').forEach((btn) => {
      btn.disabled = on;
    });
  }

  function wireActions() {
    list.querySelectorAll('.btn-approve').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (busy) return;
        const id = btn.dataset.id;
        setBusy(true);
        try {
          await postAction('/api/dod/approve', { id });
          toast('Approved', 'ok');
          await load(currentFilter);
        } catch (err) {
          toast(err.message || 'Approve failed', 'err');
          setBusy(false);
        }
      });
    });
    list.querySelectorAll('.btn-reject').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (busy) return;
        rejectTargetId = btn.dataset.id;
        if (rejectReason) rejectReason.value = '';
        rejectModal?.classList.remove('hidden');
        rejectReason?.focus();
      });
    });
  }

  rejectCancel?.addEventListener('click', () => {
    rejectModal?.classList.add('hidden');
    rejectTargetId = null;
  });

  rejectConfirm?.addEventListener('click', async () => {
    const reason = rejectReason?.value?.trim();
    if (!reason || !rejectTargetId) {
      toast('Rejection reason required', 'err');
      return;
    }
    const id = rejectTargetId;
    rejectModal?.classList.add('hidden');
    rejectTargetId = null;
    setBusy(true);
    try {
      await postAction('/api/dod/reject', { id, reason });
      toast('Rejected', 'ok');
      await load(currentFilter);
    } catch (err) {
      toast(err.message || 'Reject failed', 'err');
      setBusy(false);
    }
  });

  rejectModal?.addEventListener('click', (ev) => {
    if (ev.target === rejectModal) {
      rejectModal.classList.add('hidden');
      rejectTargetId = null;
    }
  });

  async function load(status = 'flagged') {
    currentFilter = status;
    const embed = readEmbed();
    if (embed?.entries) {
      entries =
        status === 'all' ? embed.entries : embed.entries.filter((e) => e.status === status);
      byStatus = embed.byStatus || countByStatus(embed.entries);
      readOnly = embed.readOnly !== false;
      mode = embed.mode || (readOnly ? 'snapshot' : 'live');
      generatedAt = embed.generatedAt ?? null;
      paint();
    } else {
      loading.classList.remove('hidden');
      dashboard.classList.add('hidden');
    }

    const live = await fetchQueue(status);
    entries = live.entries;
    readOnly = live.readOnly;
    mode = live.mode;
    generatedAt = live.generatedAt ?? generatedAt;
    // Prefer full byStatus from envelope; otherwise keep embed counts or derive.
    if (live.byStatus && Object.keys(live.byStatus).length) {
      byStatus = live.byStatus;
    } else if (!Object.keys(byStatus).length) {
      byStatus = countByStatus(entries);
    }
    // Live array responses are filtered — refresh counts from all when needed.
    if (!live.readOnly && (!live.byStatus || !Object.keys(live.byStatus).length)) {
      const all = await fetchQueue('all');
      byStatus = countByStatus(all.entries);
      if (status !== 'all') {
        entries = all.entries.filter((e) => e.status === status);
      } else {
        entries = all.entries;
      }
      readOnly = all.readOnly;
      mode = all.mode;
    }
    paint();
  }

  await load('flagged');
}

if (typeof document !== 'undefined') {
  initDodDashboard();
}
