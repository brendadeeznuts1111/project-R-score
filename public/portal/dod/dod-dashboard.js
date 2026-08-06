/**
 * DOD review portal — snapshot-first on Pages, live API on serve-public.
 * Raised to shared operator primitives (hero · stats · hash filters).
 * Partner bet-amount / deposit screenshots confirm in package-forum Accounting.
 *
 * @see docs/portal-foundation.md
 * @see docs/harness/tenants/partner-package-group-handshake.md
 * @see docs/harness/tenants/seat-capital-desk.md
 */
import { bindCopyButtons } from '../copy-cli.js';
import { partnerTelegramHash } from '../partners/partner-routes.js';

const CONFIRM_TYPES = new Set(['slip', 'balance', 'receipt']);
const PARTNER_CODE_RE = /^[A-Z]{3,6}$/;
const HANDSHAKE_URL = '/registry/telegram-handshake.json';

function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Resolve partner CODE from optional fields or OCR (ASH-001 / "ASH · …"). */
export function resolvePartnerCode(entry) {
  const candidates = [
    entry?.partner_code,
    entry?.partnerCode,
    entry?.call_sign,
    entry?.callSign,
  ];
  for (const raw of candidates) {
    if (raw == null || raw === '') continue;
    const s = String(raw).trim().toUpperCase();
    if (PARTNER_CODE_RE.test(s)) return s;
    const call = s.match(/^([A-Z]{3,6})-\d+/);
    if (call && PARTNER_CODE_RE.test(call[1])) return call[1];
  }
  const ocr = String(entry?.extracted_text || '');
  const fromCall = ocr.match(/\b([A-Z]{3,6})-\d{3}\b/);
  if (fromCall && PARTNER_CODE_RE.test(fromCall[1])) return fromCall[1];
  const fromPrefix = ocr.match(/^([A-Z]{3,6})\s*(?:·|\|)/u);
  if (fromPrefix && PARTNER_CODE_RE.test(fromPrefix[1])) return fromPrefix[1];
  return null;
}

/** First dollar amount from OCR / accounting_amount column. */
export function resolveAccountingAmount(entry) {
  const direct = Number(entry?.accounting_amount ?? entry?.accountingAmount);
  if (Number.isFinite(direct)) return direct;
  const ocr = String(entry?.extracted_text || '');
  const m = ocr.match(/\$\s?([\d,]+(?:\.\d{1,2})?)/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function formatAccountingAmount(amount) {
  if (amount == null || !Number.isFinite(Number(amount))) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

/** Reconcile warning strip when stake mismatch or banner present. */
export function reconcileBannerHtml(entry) {
  const banner = entry?.reconcile_banner;
  const status = String(entry?.reconcile_status ?? '');
  if (!banner && status !== 'mismatch') return '';
  const text =
    banner ||
    (status === 'mismatch'
      ? 'Stake mismatch — confirm expected vs OCR amount in Accounting'
      : '');
  if (!text) return '';
  const cls = status === 'mismatch' ? 'mismatch' : 'unknown';
  return `<div class="dod-reconcile-banner ${cls}" role="alert">${esc(text)}</div>`;
}

/** t.me message link from bake fields (or precomputed telegram_deep_link). */
export function resolveTelegramMessageLink(entry) {
  const existing = String(entry?.telegram_deep_link || entry?.telegramDeepLink || '').trim();
  if (existing.startsWith('https://t.me/')) return existing;

  const messageId = Number(entry?.telegram_message_id ?? entry?.telegramMessageId);
  if (!Number.isFinite(messageId) || messageId <= 0) return null;

  const username = String(entry?.telegram_username || entry?.telegramUsername || '')
    .replace(/^@/, '')
    .trim();
  const threadId = Number(entry?.telegram_thread_id ?? entry?.telegramThreadId);
  const threadSeg =
    Number.isFinite(threadId) && threadId > 0 ? `${Math.trunc(threadId)}/` : '';

  if (username && /^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(username)) {
    return `https://t.me/${username}/${threadSeg}${Math.trunc(messageId)}`;
  }

  const chatRaw = entry?.telegram_chat_id ?? entry?.telegramChatId;
  if (chatRaw == null || chatRaw === '') return null;
  const chatStr = String(chatRaw).trim();
  let channelPart = '';
  if (chatStr.startsWith('-100') && chatStr.length > 4) channelPart = chatStr.slice(4);
  else {
    const n = Number(chatStr);
    if (!Number.isFinite(n)) return null;
    channelPart = String(Math.abs(Math.trunc(n)));
  }
  if (!/^\d{5,}$/.test(channelPart)) return null;
  return `https://t.me/c/${channelPart}/${threadSeg}${Math.trunc(messageId)}`;
}

function handshakeInviteFor(code, partners) {
  const rows = Array.isArray(partners) ? partners : [];
  const hit = rows.find(r => String(r.partnerCode || r.code || '').toUpperCase() === code);
  const invite = String(hit?.inviteLink || hit?.invite_link || '').trim();
  return invite.startsWith('https://t.me/') ? invite : null;
}

/** Confirm bet/deposit amounts — message deep-link, forum Accounting, invite. */
export function confirmLinksHtml(entry, handshakePartners) {
  if (!CONFIRM_TYPES.has(String(entry?.type || ''))) return '';
  const code = resolvePartnerCode(entry);
  const msgLink = resolveTelegramMessageLink(entry);
  const topic = String(entry?.telegram_topic || entry?.telegramTopic || 'accounting');
  const links = [];

  if (msgLink) {
    links.push(
      `<a class="dod-confirm-link" href="${esc(msgLink)}" target="_blank" rel="noopener noreferrer" data-glossary-concept="telegram.forum.topic.accounting">Open Telegram message</a>`
    );
  }

  if (code) {
    const tg = `/portal/partners/${partnerTelegramHash(code, 'accounting')}`;
    const acct = `/portal/partners/#partner/${code}/accounting`;
    const invite = handshakeInviteFor(code, handshakePartners);
    links.push(
      `<a class="dod-confirm-link" href="${esc(tg)}" data-glossary-concept="telegram.forum.topic.accounting">Forum · ${esc(topic)} (${esc(code)})</a>`
    );
    links.push(
      `<a class="dod-confirm-link" href="${esc(acct)}" data-glossary-concept="section.partnersAccounting">Partners desk</a>`
    );
    if (invite) {
      links.push(
        `<a class="dod-confirm-link" href="${esc(invite)}" target="_blank" rel="noopener noreferrer">Invite · ${esc(code)}</a>`
      );
    }
  } else {
    links.push(
      `<a class="dod-confirm-link" href="/portal/partners/#section:telegram" data-glossary-concept="telegram.forum.topic.accounting">Partner Accounting chat</a>`
    );
    links.push(`<a class="dod-confirm-link" href="/portal/factory/">Factory handshake</a>`);
  }

  return `<div class="dod-confirm"${code ? ` data-partner-code="${esc(code)}"` : ''}>
    <span class="dod-confirm-label">Confirm amount</span>
    ${links.join('\n    ')}
  </div>`;
}

/** Stripped Bun.Image.metadata() for agent learning (width/format/EXIF/gps). */
export function imageMetaHtml(entry) {
  const meta = entry?.image_meta || entry?.imageMeta;
  if (!meta || typeof meta !== 'object') return '';
  const dims =
    meta.width != null && meta.height != null ? `${meta.width}×${meta.height}` : null;
  const rows = [
    dims ? ['dims', dims] : null,
    meta.format ? ['format', meta.format] : null,
    meta.size != null ? ['bytes', String(meta.size)] : null,
    meta.exif?.deviceModel ? ['device', meta.exif.deviceModel] : null,
    meta.exif?.software ? ['software', meta.exif.software] : null,
    meta.exif?.dateTimeOriginal ? ['taken', meta.exif.dateTimeOriginal] : null,
    meta.gps
      ? ['gps', `${Number(meta.gps.lat).toFixed(4)}, ${Number(meta.gps.lng).toFixed(4)}`]
      : null,
    meta.missingExif != null ? ['exif', meta.missingExif ? 'missing (screenshot-like)' : 'present'] : null,
  ].filter(Boolean);

  if (!rows.length) return '';

  const dl = rows
    .map(
      ([k, v]) =>
        `<div><dt>${esc(k)}</dt><dd><code>${esc(v)}</code></dd></div>`
    )
    .join('');

  const json = esc(JSON.stringify(meta));
  return `<details class="dod-image-meta">
    <summary>Bun.Image metadata <span class="dim">(agent learning strip)</span></summary>
    <dl class="dod-meta dod-meta-compact">${dl}</dl>
    <pre class="dod-image-meta-json" data-bun-doc="runtime/image#metadata">${json}</pre>
  </details>`;
}

export function partnerConfirmStripHtml(partners) {
  const rows = Array.isArray(partners) ? partners : [];
  const chips = rows.length
    ? rows
        .map(r => {
          const code = String(r.partnerCode || r.code || '')
            .trim()
            .toUpperCase();
          if (!PARTNER_CODE_RE.test(code)) return '';
          const href = `/portal/partners/${partnerTelegramHash(code, 'accounting')}`;
          return `<a class="dod-partner-chip" href="${esc(href)}" title="Confirm bet/deposit screenshots · ${esc(code)} Accounting">${esc(code)}</a>`;
        })
        .filter(Boolean)
        .join('')
    : '<span class="dim">No handshake partners baked — run <code>bun run telegram:handshake:catalog</code></span>';

  return `<section class="dod-confirm-strip" aria-label="Partner Telegram Accounting">
    <div class="dod-confirm-strip-head">
      <h3>Confirm bet amounts in partner chats</h3>
      <p>
        Deposit / withdraw / bet-slip screenshots live in each package forum’s
        <a href="/portal/glossary/#glossary:telegram.forum.topic.accounting" data-glossary-concept="telegram.forum.topic.accounting">Accounting</a>
        topic — open a CODE to confirm amounts against the DOD card.
        Overview: <a href="/portal/factory/">Factory</a> ·
        <a href="/portal/partners/">Partners</a>.
      </p>
    </div>
    <div class="dod-partner-chips">${chips}</div>
  </section>`;
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

function parseHash(hash = location.hash) {
  const params = new URLSearchParams(String(hash).replace(/^#/, ''));
  const status = params.get('status') || '';
  const allowed = ['flagged', 'pending', 'verified', 'rejected', 'all'];
  return allowed.includes(status) ? status : '';
}

function writeHash(status) {
  const params = new URLSearchParams();
  if (status && status !== 'flagged') params.set('status', status);
  const fragment = params.toString();
  history.replaceState(
    null,
    '',
    `${location.pathname}${location.search}${fragment ? `#${fragment}` : ''}`
  );
}

function pollMs() {
  const meta = document.querySelector('meta[name="portal-poll-ms"]');
  const n = Number(meta?.getAttribute('content'));
  return Number.isFinite(n) && n > 0 ? n : 30_000;
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
      byStatus:
        data.byStatus && typeof data.byStatus === 'object'
          ? data.byStatus
          : countByStatus(data.entries),
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
        normalized.entries = normalized.entries.filter(e => e.status === status);
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

function updateHero({ readOnly, mode, generatedAt, byStatus, source }) {
  const gate = document.getElementById('dod-gate');
  const baked = document.getElementById('dod-baked');
  const flagged = Number(byStatus?.flagged || 0);
  const live = mode === 'live' && !readOnly;
  let tone = 'ok';
  let label = live ? 'live' : 'snapshot';
  if (flagged > 0) {
    tone = 'bad';
    label = `${flagged} flagged`;
  } else if (readOnly) {
    tone = 'warn';
    label = 'snapshot';
  }
  if (gate) {
    gate.className = `portal-gate ${tone === 'ok' ? 'ok' : tone}`;
    gate.innerHTML = `<span class="dot" aria-hidden="true"></span>${esc(label)}`;
  }
  if (baked) {
    const rel = fmtRel(generatedAt);
    baked.textContent = [
      live ? 'writable SQLite' : 'read-only Pages/bake',
      rel ? `baked ${rel}` : null,
      source && source !== 'none' ? source.replace(/^\//, '') : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }
}

function renderStats({ byStatus, currentFilter, onFilter }) {
  const host = document.getElementById('dod-stats');
  if (!host) return;
  const total = Object.values(byStatus || {}).reduce((n, v) => n + Number(v || 0), 0);
  const countFor = s => (s === 'all' ? total : Number(byStatus?.[s] || 0));
  /** @type {Array<{ key: string, label: string, tone: string, hint: string }>} */
  const stats = [
    {
      key: 'flagged',
      label: 'Flagged',
      tone: countFor('flagged') ? 'bad' : 'muted',
      hint: 'needs review',
    },
    {
      key: 'pending',
      label: 'Pending',
      tone: countFor('pending') ? 'warn' : 'muted',
      hint: 'awaiting triage',
    },
    {
      key: 'verified',
      label: 'Verified',
      tone: countFor('verified') ? 'ok' : 'muted',
      hint: 'approved',
    },
    {
      key: 'rejected',
      label: 'Rejected',
      tone: 'muted',
      hint: 'closed',
    },
    {
      key: 'all',
      label: 'Total',
      tone: 'muted',
      hint: 'all statuses',
    },
  ];
  host.innerHTML = stats
    .map(s => {
      const active = currentFilter === s.key;
      return `<button type="button" class="portal-stat ${esc(s.tone)}${active ? ' active' : ''}"
        data-status="${esc(s.key)}" aria-pressed="${active ? 'true' : 'false'}">
        <div class="k">${esc(s.label)}</div>
        <div class="v">${countFor(s.key)}</div>
        <div class="hint">${esc(s.hint)}</div>
      </button>`;
    })
    .join('');
  host.querySelectorAll('.portal-stat').forEach(btn => {
    btn.addEventListener('click', () => onFilter(btn.getAttribute('data-status') || 'all'));
  });
}

export function renderDodDashboard(state) {
  const { entries, currentFilter, readOnly, byStatus, mode, generatedAt, handshakePartners } =
    state;
  const statuses = ['flagged', 'pending', 'verified', 'rejected', 'all'];
  const total = Object.values(byStatus || {}).reduce((n, v) => n + Number(v || 0), 0);
  const countFor = s => (s === 'all' ? total : Number(byStatus?.[s] || 0));

  const filtersHtml = statuses
    .map(s => {
      const n = countFor(s);
      return `<button type="button" class="dod-filter ${s} ${currentFilter === s ? 'active' : ''}" data-status="${s}">
        <span class="dod-filter-label">${s}</span>
        <span class="dod-filter-count">${n}</span>
      </button>`;
    })
    .join('');

  const confirmStripHtml = partnerConfirmStripHtml(handshakePartners);

  const helpHtml =
    readOnly
      ? `<details class="dod-help"><summary>How to approve or reject</summary>
            <p>Pages serves a baked queue from <code>bun run ops:snapshot</code>. Mutations need Bun + SQLite:</p>
            <pre><code>bun run serve:public
open http://localhost:3000/portal/dod/</code></pre>
          </details>`
      : '';

  const listHtml = entries.length
    ? entries
        .map(e => {
          const canAct = !readOnly && e.status !== 'verified' && e.status !== 'rejected';
          const tamper = Number(e.tamper_score ?? 0);
          const tamperCls = tamper > 50 ? 'tamper-high' : 'tamper-low';
          const partner = resolvePartnerCode(e);
          const amountLabel = formatAccountingAmount(resolveAccountingAmount(e));
          const msgLink = resolveTelegramMessageLink(e);
          return `<article class="dod-card ${esc(e.status)}" data-id="${esc(e.id)}"${
            partner ? ` data-partner-code="${esc(partner)}"` : ''
          }${amountLabel ? ` data-accounting-amount="${esc(String(resolveAccountingAmount(e)))}"` : ''}>
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
                ${partner ? `<span class="dod-partner-pill">${esc(partner)}</span>` : ''}
                ${
                  amountLabel
                    ? `<span class="dod-amount-pill" title="Agent accounting figure from OCR / bake">${esc(amountLabel)}</span>`
                    : ''
                }
              </div>
              ${
                amountLabel
                  ? `<p class="dod-accounting-figure"><span class="k">Accounting</span> <span class="v">${esc(amountLabel)}</span>${
                      partner ? ` <span class="dim">· ${esc(partner)}</span>` : ''
                    }</p>`
                  : ''
              }
              ${reconcileBannerHtml(e)}
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
                ${
                  msgLink
                    ? `<div><dt>Telegram</dt><dd><a class="dod-tg-inline" href="${esc(msgLink)}" target="_blank" rel="noopener noreferrer">message</a>${
                        e.telegram_topic || e.telegramTopic
                          ? ` · <code>${esc(e.telegram_topic || e.telegramTopic)}</code>`
                          : ''
                      }</dd></div>`
                    : ''
                }
              </dl>
              ${e.extracted_text ? `<p class="dod-ocr">${esc(String(e.extracted_text).slice(0, 180))}${String(e.extracted_text).length > 180 ? '…' : ''}</p>` : ''}
              ${confirmLinksHtml(e, handshakePartners)}
              ${imageMetaHtml(e)}
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

  return {
    filtersHtml,
    listHtml,
    helpHtml,
    confirmStripHtml,
    total,
    mode,
    generatedAt,
    readOnly,
    byStatus,
    currentFilter,
  };
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
  const filters = document.getElementById('dod-filters');
  const list = document.getElementById('dod-list');
  const helpHost = document.getElementById('dod-help-host');
  const confirmHost = document.getElementById('dod-confirm-host');
  const rejectModal = document.getElementById('dod-reject-modal');
  const rejectReason = document.getElementById('dod-reject-reason');
  const rejectConfirm = document.getElementById('dod-reject-confirm');
  const rejectCancel = document.getElementById('dod-reject-cancel');
  const countEl = document.getElementById('dod-count');
  const clearBtn = document.getElementById('dod-clear');
  if (!loading || !dashboard || !filters || !list) return;

  bindCopyButtons(document);

  let currentFilter = parseHash() || 'flagged';
  let entries = [];
  let byStatus = {};
  let readOnly = true;
  let mode = 'snapshot';
  let generatedAt = null;
  let source = 'embed';
  let handshakePartners = [];
  let rejectTargetId = null;
  let busy = false;

  const syncChrome = () => {
    writeHash(currentFilter);
    if (countEl) {
      const total = Object.values(byStatus || {}).reduce((n, v) => n + Number(v || 0), 0);
      const shown = currentFilter === 'all' ? total : Number(byStatus?.[currentFilter] || 0);
      countEl.textContent =
        currentFilter === 'all' ? `${total} shown` : `${entries.length}/${total} · ${currentFilter}`;
      void shown;
    }
    if (clearBtn) clearBtn.disabled = currentFilter === 'flagged';
  };

  const paint = () => {
    const view = renderDodDashboard({
      entries,
      currentFilter,
      readOnly,
      byStatus,
      mode,
      generatedAt,
      handshakePartners,
    });
    loading.classList.add('hidden');
    dashboard.classList.remove('hidden');
    updateHero({ readOnly, mode, generatedAt, byStatus, source });
    renderStats({
      byStatus,
      currentFilter,
      onFilter: status => void load(status),
    });
    if (confirmHost) confirmHost.innerHTML = view.confirmStripHtml;
    if (helpHost) helpHost.innerHTML = view.helpHtml;
    filters.innerHTML = view.filtersHtml;
    list.innerHTML = view.listHtml;
    syncChrome();
    filters.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => load(btn.dataset.status || 'all'));
    });
    if (!readOnly) wireActions();
  };

  async function loadHandshakePartners() {
    try {
      const res = await fetch(HANDSHAKE_URL, { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const data = await res.json();
      handshakePartners = Array.isArray(data?.rows) ? data.rows : [];
    } catch {
      handshakePartners = [];
    }
  }

  function setBusy(on) {
    busy = on;
    list.querySelectorAll('button').forEach(btn => {
      btn.disabled = on;
    });
  }

  function wireActions() {
    list.querySelectorAll('.btn-approve').forEach(btn => {
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
    list.querySelectorAll('.btn-reject').forEach(btn => {
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

  rejectModal?.addEventListener('click', ev => {
    if (ev.target === rejectModal) {
      rejectModal.classList.add('hidden');
      rejectTargetId = null;
    }
  });

  document.getElementById('dod-refresh')?.addEventListener('click', e => {
    e.preventDefault();
    void load(currentFilter);
  });
  clearBtn?.addEventListener('click', () => void load('flagged'));
  window.addEventListener('hashchange', () => {
    const next = parseHash() || 'flagged';
    if (next !== currentFilter) void load(next);
  });

  async function load(status = 'flagged') {
    currentFilter = status;
    const embed = readEmbed();
    if (embed?.entries) {
      entries =
        status === 'all' ? embed.entries : embed.entries.filter(e => e.status === status);
      byStatus = embed.byStatus || countByStatus(embed.entries);
      readOnly = embed.readOnly !== false;
      mode = embed.mode || (readOnly ? 'snapshot' : 'live');
      generatedAt = embed.generatedAt ?? null;
      source = 'embed';
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
    source = live.source || source;
    if (live.byStatus && Object.keys(live.byStatus).length) {
      byStatus = live.byStatus;
    } else if (!Object.keys(byStatus).length) {
      byStatus = countByStatus(entries);
    }
    if (!live.readOnly && (!live.byStatus || !Object.keys(live.byStatus).length)) {
      const all = await fetchQueue('all');
      byStatus = countByStatus(all.entries);
      if (status !== 'all') {
        entries = all.entries.filter(e => e.status === status);
      } else {
        entries = all.entries;
      }
      readOnly = all.readOnly;
      mode = all.mode;
      source = all.source || source;
    }
    paint();
  }

  await loadHandshakePartners();
  await load(currentFilter);
  setInterval(() => void load(currentFilter), pollMs());
}

if (typeof document !== 'undefined') {
  initDodDashboard();
}
