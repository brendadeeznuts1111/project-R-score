/**
 * Morning desk pure projection — join partners-dashboard + optional ancillary
 * bakes into one quiet operator view (no DOM).
 *
 * Primary: partners-dashboard.v2
 * Ancillary: soft-accounting-export · seat-capital-desk · partners-ops ·
 * bookmakers · telegram-handshake · limit-raises · partner-ledger · coverage
 *
 * Soft window physics: public/portal/shared/soft-windows.js
 * @see docs/harness/tenants/partner-domain-map.md
 * @see public/portal/partners/partners-board.js
 */

import {
  formatUsdMajor,
  formatUsdMinor,
  humanizeBookSlug,
  normalizePartnerCode,
  partnerScopedBalanceMinor,
  outScopedBalances,
  statusToneClass,
} from '../partners/partners-board.js';
import {
  SOFT_FIXTURE_REBASE_MIN_AGE_MS,
  SOFT_MS_HOUR,
  SOFT_WINDOW_24H_MS,
  SOFT_WINDOW_7D_MS,
  prepareSoftExportForDeskWindows,
  softExportTipMs,
  sumSoftPnlWindow,
} from '../shared/soft-windows.js';

export {
  prepareSoftExportForDeskWindows,
  prepareSoftExportForWindows,
  softExportTipMs,
  sumSoftPnlWindow,
  weekStartIsoFromPlacedAt,
  softWeekStartIsoFromPlacedAt,
  indexSoftPlaysByPartner,
  softWeekRowsFromExport,
  projectSoftAccountingExport,
} from '../shared/soft-windows.js';

/** Canonical primary artifact for the morning desk. */
export const DESK_PRIMARY_ARTIFACT_REF = '/registry/partners-dashboard.json';

export const DESK_ANCILLARY_REFS = Object.freeze({
  soft: '/registry/soft-accounting-export.json',
  seat: '/registry/seat-capital-desk.json',
  ops: '/registry/partners-ops.json',
  bookmakers: '/registry/bookmakers.json',
  handshake: '/registry/telegram-handshake.json',
  limitRaises: '/registry/limit-raises.json',
  partnerLedger: '/registry/partner-ledger.json',
  bookCoverage: '/registry/bookmakers-desk-coverage.json',
  /** TOC fixture includes per-partner messageLog (Soft MessageLog stand-in on Pages). */
  tocOps: '/registry/toc-ops.json',
});

const MS_HOUR = SOFT_MS_HOUR;
const WINDOW_24H_MS = SOFT_WINDOW_24H_MS;
const WINDOW_7D_MS = SOFT_WINDOW_7D_MS;
/** When fixture tip is older than this, desk rebases play timestamps onto wall clock. */
const FIXTURE_REBASE_MIN_AGE_MS = SOFT_FIXTURE_REBASE_MIN_AGE_MS;

/**
 * @param {unknown} value
 * @returns {string}
 */
function asString(value) {
  return value == null ? '' : String(value).trim();
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function asFiniteNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Parse max bet display ("500", "$500", "—") → major USD or null.
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseMaxBetMajor(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const s = String(raw)
    .replace(/[$,\s]/g, '')
    .trim();
  if (!s || s === '—' || s === '-') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse freeplay pct ("25%", "25", null) → number 0–100 or null.
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseFreeplayPct(raw) {
  if (raw == null || raw === '' || raw === '—') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const s = String(raw).replace(/%/g, '').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Book catalog index: sportsbookId → { label, skin, brandGroup, type }.
 * @param {object | null | undefined} catalog bookmakers.json
 * @returns {Map<string, { id: string, label: string, skin: string, brandGroup: string }>}
 */
export function indexBookmakers(catalog) {
  const map = new Map();
  const books =
    catalog?.bookmakers && typeof catalog.bookmakers === 'object'
      ? catalog.bookmakers
      : catalog && typeof catalog === 'object' && !Array.isArray(catalog)
        ? catalog
        : null;
  if (!books) return map;
  for (const [key, entry] of Object.entries(books)) {
    if (!entry || typeof entry !== 'object') continue;
    const id = asString(entry.id || entry.slug || key);
    if (!id) continue;
    const label = asString(entry.label || entry.name || entry.title) || humanizeBookSlug(id);
    const skin = asString(entry.skin) || label;
    const brandGroup = asString(entry.brandGroup) || skin;
    const row = { id, label, skin, brandGroup };
    map.set(id, row);
    if (id.startsWith('book-')) map.set(id.slice(5), row);
    else map.set(`book-${id}`, row);
  }
  return map;
}

/**
 * Index partners-ops outs by partnerCode → outId → ops out row.
 * @param {object | null | undefined} ops
 * @returns {Map<string, Map<string, object>>}
 */
export function indexOpsOuts(ops) {
  const byPartner = new Map();
  for (const partner of ops?.partners || []) {
    const code = normalizePartnerCode(partner?.code || partner?.partnerCode);
    if (!code) continue;
    const outMap = new Map();
    for (const out of partner?.outs || []) {
      const outId = asString(out?.id || out?.outId);
      if (!outId) continue;
      outMap.set(outId, out);
      // also key without out- prefix variants
      if (outId.startsWith('out-')) outMap.set(outId.slice(4), out);
    }
    byPartner.set(code, outMap);
  }
  return byPartner;
}

/**
 * Index seat-capital outs by partnerCode → outNum or book → seat out.
 * @param {object | null | undefined} seat
 * @returns {Map<string, object[]>}
 */
export function indexSeatOuts(seat) {
  const map = new Map();
  for (const row of seat?.rows || []) {
    const code = normalizePartnerCode(row?.partnerCode);
    if (!code) continue;
    map.set(code, Array.isArray(row.outs) ? row.outs : []);
  }
  return map;
}

/**
 * Index handshake rows by partner code.
 * @param {object | null | undefined} handshake
 * @returns {Map<string, object>}
 */
export function indexHandshakeRows(handshake) {
  const map = new Map();
  for (const row of handshake?.rows || []) {
    const code = normalizePartnerCode(row?.partnerCode);
    if (code) map.set(code, row);
  }
  return map;
}

/**
 * Match seat out to dashboard out by out number suffix (out-ASH-1 → "1").
 * @param {object[]} seatOuts
 * @param {string} outId
 * @param {string} bookLabel
 */
function matchSeatOut(seatOuts, outId, bookLabel) {
  if (!Array.isArray(seatOuts) || !seatOuts.length) return null;
  const numMatch = String(outId || '').match(/-(\d+)$/);
  const num = numMatch ? numMatch[1] : null;
  if (num) {
    const byNum = seatOuts.find(o => String(o.outNum || o.num || '') === num);
    if (byNum) return byNum;
  }
  const book = bookLabel.toLowerCase();
  if (book && book !== '—') {
    const byBook = seatOuts.find(o => String(o.book || '').toLowerCase() === book);
    if (byBook) return byBook;
  }
  return null;
}

/* softExportTipMs · prepareSoftExportForDeskWindows · sumSoftPnlWindow
 * — re-exported from ../shared/soft-windows.js */

/**
 * Sum dashboard settlement entries in a window (minor units → major).
 * entryType === 'settlement' only.
 *
 * @param {object | null | undefined} dashboard
 * @param {{ nowMs?: number, windowMs?: number | null }} [opts]
 */
export function sumLedgerSettlementWindow(dashboard, opts = {}) {
  const nowMs = typeof opts.nowMs === 'number' ? opts.nowMs : Date.now();
  const windowMs = opts.windowMs === undefined ? WINDOW_24H_MS : opts.windowMs;
  const byPartner = new Map();
  let netMinor = 0;
  let entryCount = 0;
  for (const partner of dashboard?.partners || []) {
    const code = normalizePartnerCode(partner?.partnerCode);
    for (const entry of partner?.accounting?.recentEntries || []) {
      if (String(entry?.entryType || '').toLowerCase() !== 'settlement') continue;
      const minor = entry?.amount?.minorUnits;
      if (typeof minor !== 'number' || !Number.isFinite(minor)) continue;
      const t = Date.parse(asString(entry?.postedAt));
      if (!Number.isFinite(t)) continue;
      if (windowMs != null && nowMs - t > windowMs) continue;
      if (windowMs != null && t > nowMs) continue;
      netMinor += minor;
      entryCount += 1;
      if (!code) continue;
      const prev = byPartner.get(code) || { netMinor: 0, entryCount: 0 };
      prev.netMinor += minor;
      prev.entryCount += 1;
      byPartner.set(code, prev);
    }
  }
  return {
    netMinor,
    netMajor: netMinor / 100,
    entryCount,
    byPartner,
  };
}

/**
 * Build flat account rows for the morning desk.
 *
 * @param {object | null | undefined} dashboard
 * @param {{
 *   bookmakers?: object | null,
 *   ops?: object | null,
 *   seat?: object | null,
 * }} [ancillary]
 * @returns {object[]}
 */
export function buildDeskAccountRows(dashboard, ancillary = {}) {
  const books = indexBookmakers(ancillary.bookmakers);
  const opsOuts = indexOpsOuts(ancillary.ops);
  const seatByPartner = indexSeatOuts(ancillary.seat);
  const active = new Set((dashboard?.activeOutIds || []).map(String));
  const rows = [];

  for (const partner of dashboard?.partners || []) {
    const code = normalizePartnerCode(partner?.partnerCode);
    const callSign = asString(partner?.callSign) || `${code}-001`;
    const phase = asString(partner?.operationalPhase) || 'unknown';
    const balByOut = outScopedBalances(partner);
    const partnerOps = opsOuts.get(code);
    const seatOuts = seatByPartner.get(code) || [];

    for (const out of partner?.outs || []) {
      const outId = asString(out?.outId || out?.id);
      const sportsbookId = asString(out?.sportsbookId);
      const bookMeta = books.get(sportsbookId) || null;
      const bookLabel = bookMeta?.label || humanizeBookSlug(sportsbookId) || '—';
      const skin = bookMeta?.skin || bookLabel;
      const brandGroup = bookMeta?.brandGroup || skin;

      const opsOut = partnerOps?.get(outId) || partnerOps?.get(outId.replace(/^out-/, '')) || null;
      const seatOut = matchSeatOut(seatOuts, outId, bookLabel);

      const bookType =
        asString(opsOut?.book?.type) ||
        asString(opsOut?.book?.typeConceptId)?.replace(/^book\.type\./, '') ||
        '—';

      let username = asString(opsOut?.credentials?.username) || asString(seatOut?.username) || '—';
      if (username === '—' || username === '-') username = '—';

      const maxFromDash = out?.observedMaxStake?.amount?.minorUnits;
      const maxBetMajor =
        typeof maxFromDash === 'number' && Number.isFinite(maxFromDash)
          ? maxFromDash / 100
          : (parseMaxBetMajor(opsOut?.maxBet) ?? parseMaxBetMajor(seatOut?.maxBet));

      const freeplayPct =
        parseFreeplayPct(opsOut?.freeRollPercent) ?? parseFreeplayPct(seatOut?.freeplayPct);

      const status = asString(out?.operationalStatus) || asString(opsOut?.status) || 'unknown';
      const fundingStatus = asString(out?.fundingStatus) || 'unknown';
      const live = active.has(outId) || (status === 'ready' && fundingStatus === 'funded');

      const bal = balByOut.get(outId);
      const balanceMinor = bal?.minorUnits ?? null;

      const freezeReasons = [];
      if (status === 'blocked') freezeReasons.push('blocked');
      if (status === 'deferred') freezeReasons.push('deferred');
      if (status === 'paused') freezeReasons.push('paused');
      if (fundingStatus === 'unknown' && status === 'deferred') {
        /* already deferred */
      }
      if (freeplayPct != null && freeplayPct > 0) {
        /* freeplay is not a freeze — tracked separately */
      }

      rows.push({
        partnerCode: code,
        callSign,
        phase,
        outId,
        sportsbookId: sportsbookId || '—',
        bookLabel,
        skin,
        brandGroup,
        bookType,
        username,
        login: username,
        status,
        fundingStatus,
        live: Boolean(live),
        activeCapacity: active.has(outId),
        maxBetMajor,
        maxBetDisplay: maxBetMajor == null ? '—' : formatUsdMajor(maxBetMajor),
        freeplayPct,
        freeplayDisplay: freeplayPct == null ? '—' : `${freeplayPct}%`,
        balanceMinor,
        balanceDisplay: balanceMinor == null ? '—' : formatUsdMinor(balanceMinor),
        limitCoverageRatio:
          typeof out?.limitCoverageRatio === 'number' ? out.limitCoverageRatio : null,
        freeze: freezeReasons.length > 0,
        freezeReasons,
        statusTone: statusToneClass(status),
        fundingTone: statusToneClass(fundingStatus),
        note: asString(opsOut?.note || seatOut?.note) || '—',
      });
    }
  }

  rows.sort((a, b) => {
    const pc = a.partnerCode.localeCompare(b.partnerCode);
    if (pc !== 0) return pc;
    return String(a.outId).localeCompare(String(b.outId));
  });
  return rows;
}

/**
 * Group account rows by a key field.
 * @param {object[]} accounts
 * @param {'partnerCode' | 'bookType' | 'skin' | 'live' | 'brandGroup'} key
 * @returns {{ key: string, count: number, liveCount: number, limitTotalMajor: number, balanceMinor: number, rows: object[] }[]}
 */
export function groupDeskAccounts(accounts, key) {
  const map = new Map();
  for (const row of accounts) {
    let k;
    if (key === 'live') k = row.live ? 'live' : 'not live';
    else k = asString(row[key]) || '—';
    const prev = map.get(k) || {
      key: k,
      count: 0,
      liveCount: 0,
      limitTotalMajor: 0,
      balanceMinor: 0,
      rows: [],
    };
    prev.count += 1;
    if (row.live) prev.liveCount += 1;
    if (typeof row.maxBetMajor === 'number') prev.limitTotalMajor += row.maxBetMajor;
    if (typeof row.balanceMinor === 'number') prev.balanceMinor += row.balanceMinor;
    prev.rows.push(row);
    map.set(k, prev);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

/**
 * Detect freeze / freeroll / attention signals for the morning board.
 *
 * @param {object | null | undefined} dashboard
 * @param {object[]} accounts from buildDeskAccountRows
 * @param {object | null | undefined} [ops] partners-ops (freeRoll used/total)
 * @returns {{
 *   freezes: object[],
 *   freerolls: object[],
 *   freerollApplied: object[],
 *   attention: object[],
 *   counts: { freezes: number, freerolls: number, freerollApplied: number, attention: number, blocked: number, deferred: number }
 * }}
 */
export function collectDeskAlerts(dashboard, accounts, ops = null) {
  const freezes = [];
  const freerolls = [];
  const freerollApplied = [];
  const attention = [];

  for (const row of accounts) {
    if (row.freeze) {
      freezes.push({
        partnerCode: row.partnerCode,
        outId: row.outId,
        bookLabel: row.bookLabel,
        reasons: row.freezeReasons,
        status: row.status,
        label: `${row.outId} · ${row.bookLabel} · ${row.freezeReasons.join(', ')}`,
      });
    }
    if (row.freeplayPct != null && row.freeplayPct > 0) {
      freerolls.push({
        partnerCode: row.partnerCode,
        outId: row.outId,
        bookLabel: row.bookLabel,
        freeplayPct: row.freeplayPct,
        label: `${row.outId} · ${row.bookLabel} · ${row.freeplayPct}% freeplay`,
      });
    }
  }

  for (const partner of ops?.partners || []) {
    const code = normalizePartnerCode(partner?.code || partner?.partnerCode);
    const fr = partner?.accounting?.freeRoll;
    const used = asFiniteNumber(fr?.used);
    const total = asFiniteNumber(fr?.total);
    if (used != null && used > 0) {
      freerollApplied.push({
        partnerCode: code,
        used,
        total: total ?? null,
        label: `${code} · freeroll used ${used}${total != null ? ` / ${total}` : ''}`,
      });
    }
  }

  for (const partner of dashboard?.partners || []) {
    const code = normalizePartnerCode(partner?.partnerCode);
    for (const item of partner?.attention || []) {
      attention.push({
        partnerCode: code,
        reasonCode: asString(item?.reasonCode),
        severity: asString(item?.severity) || 'info',
        label: asString(item?.label) || asString(item?.reasonCode) || 'attention',
        actionHref: asString(item?.actionHref) || null,
      });
    }
  }

  return {
    freezes,
    freerolls,
    freerollApplied,
    attention,
    counts: {
      freezes: freezes.length,
      freerolls: freerolls.length,
      freerollApplied: freerollApplied.length,
      attention: attention.length,
      blocked: accounts.filter(a => a.status === 'blocked').length,
      deferred: accounts.filter(a => a.status === 'deferred').length,
    },
  };
}

/**
 * Index partners-ops rows by partner CODE.
 * @param {object | null | undefined} ops
 * @returns {Map<string, object>}
 */
export function indexOpsPartners(ops) {
  const map = new Map();
  for (const partner of ops?.partners || []) {
    const code = normalizePartnerCode(partner?.code || partner?.partnerCode);
    if (code) map.set(code, partner);
  }
  return map;
}

/**
 * Project TOC/Soft MessageLog rows from toc-ops partners[].messageLog.
 * Fixture dates use export-tip 24h/7d when wall-clock windows are empty.
 *
 * @param {object | null | undefined} tocOps
 * @param {{ nowMs?: number, limit?: number }} [opts]
 */
export function projectTelegramMessageFeed(tocOps, opts = {}) {
  const nowMs = typeof opts.nowMs === 'number' ? opts.nowMs : Date.now();
  const limit = typeof opts.limit === 'number' && opts.limit > 0 ? Math.floor(opts.limit) : 40;
  const empty = {
    available: false,
    messageFeedAvailable: false,
    source: 'missing',
    windowMode: 'unavailable',
    windowEndIso: null,
    tipIso: null,
    messages: [],
    messages24h: [],
    messages7d: [],
    byPartner: new Map(),
    counts: {
      total: 0,
      in24h: 0,
      in7d: 0,
      inbound: 0,
      outbound: 0,
      partners: 0,
      slaBreaches: Number(tocOps?.summary?.messageLogSlaBreaches) || 0,
    },
    note: 'toc-ops messageLog unavailable — handshake signals only.',
  };
  if (!tocOps || typeof tocOps !== 'object') return empty;

  /** @type {object[]} */
  const raw = [];
  let tipMs = null;
  for (const partner of tocOps.partners || []) {
    const code = normalizePartnerCode(partner?.partnerCode);
    for (const msg of partner?.messageLog || []) {
      const at = asString(msg?.at);
      const t = Date.parse(at);
      if (!Number.isFinite(t)) continue;
      if (tipMs == null || t > tipMs) tipMs = t;
      const direction = asString(msg?.direction).toLowerCase() || '—';
      raw.push({
        id: asString(msg?.id) || `${code}-${at}`,
        partnerCode: code,
        callSign: asString(msg?.callSign || partner?.callSign) || (code ? `${code}-001` : '—'),
        at,
        atMs: t,
        channel: asString(msg?.channel) || 'telegram',
        direction,
        from: asString(msg?.from) || '—',
        to: asString(msg?.to) || '—',
        taskId: asString(msg?.taskId) || null,
        summary: asString(msg?.summary) || '—',
        inbound: direction === 'in' || direction === 'inbound',
        label: `${code || '—'} · ${asString(msg?.summary) || 'message'}`,
      });
    }
  }
  raw.sort((a, b) => b.atMs - a.atMs);

  if (!raw.length) {
    return {
      ...empty,
      source: asString(tocOps.source) || 'toc-ops',
      counts: {
        ...empty.counts,
        slaBreaches: Number(tocOps?.summary?.messageLogSlaBreaches) || 0,
      },
      note: 'toc-ops has no partner messageLog rows.',
    };
  }

  let windowEndMs = nowMs;
  let windowMode = 'wall-clock';
  const wall24 = raw.filter(m => nowMs - m.atMs <= WINDOW_24H_MS && m.atMs <= nowMs);
  const wall7 = raw.filter(m => nowMs - m.atMs <= WINDOW_7D_MS && m.atMs <= nowMs);
  if (wall7.length === 0 && tipMs != null && nowMs - tipMs >= FIXTURE_REBASE_MIN_AGE_MS) {
    windowEndMs = tipMs;
    windowMode = 'export-tip';
  }

  const messages7d = raw.filter(m => windowEndMs - m.atMs <= WINDOW_7D_MS && m.atMs <= windowEndMs);
  const messages24h = raw.filter(
    m => windowEndMs - m.atMs <= WINDOW_24H_MS && m.atMs <= windowEndMs
  );
  const messages = raw.slice(0, limit);

  /** @type {Map<string, object[]>} */
  const byPartner = new Map();
  for (const m of messages7d) {
    const list = byPartner.get(m.partnerCode) || [];
    list.push(m);
    byPartner.set(m.partnerCode, list);
  }

  const inbound = messages7d.filter(m => m.inbound).length;
  const outbound = messages7d.length - inbound;

  return {
    available: true,
    messageFeedAvailable: true,
    source: `toc-ops.messageLog · ${asString(tocOps.source) || 'fixture'}`,
    windowMode,
    windowEndIso: new Date(windowEndMs).toISOString(),
    tipIso: tipMs != null ? new Date(tipMs).toISOString() : null,
    messages,
    messages24h,
    messages7d,
    byPartner,
    counts: {
      total: raw.length,
      in24h: messages24h.length,
      in7d: messages7d.length,
      inbound,
      outbound,
      partners: byPartner.size,
      slaBreaches: Number(tocOps?.summary?.messageLogSlaBreaches) || 0,
    },
    note:
      windowMode === 'export-tip'
        ? `MessageLog windows anchored to latest message tip (${tipMs != null ? new Date(tipMs).toISOString() : '—'}) — wall-clock was empty. Soft live MessageLog still owns mutations in toc-ops ct.`
        : 'MessageLog rows from toc-ops partners[].messageLog (read-only Pages fixture / Soft export stand-in).',
  };
}

/**
 * Telegram signals from handshake + partners-ops chats + optional MessageLog feed.
 *
 * @param {object | null | undefined} handshake
 * @param {object | null | undefined} dashboard
 * @param {object | null | undefined} [ops]
 * @param {ReturnType<typeof projectTelegramMessageFeed> | null} [messageFeed]
 */
export function projectTelegramSignals(handshake, dashboard, ops = null, messageFeed = null) {
  const feed =
    messageFeed && messageFeed.available
      ? messageFeed
      : {
          available: false,
          messageFeedAvailable: false,
          messages7d: [],
          messages24h: [],
          byPartner: new Map(),
          counts: { in24h: 0, in7d: 0, total: 0 },
          note: '',
          windowMode: 'unavailable',
        };
  const opsByCode = indexOpsPartners(ops);
  const messageFeedAvailable = Boolean(feed.messageFeedAvailable);
  const note = messageFeedAvailable
    ? feed.note
    : 'No MessageLog rows loaded — showing chat linkage, freeroll, handshake gaps, and next steps. Fetch /registry/toc-ops.json for partner messageLog.';

  const buildRow = (code, extras = {}) => {
    const dash = (dashboard?.partners || []).find(
      p => normalizePartnerCode(p?.partnerCode) === code
    );
    const hs = extras.hs || null;
    const op = opsByCode.get(code);
    const comm = dash?.communication || {};
    const nextSteps = Array.isArray(hs?.nextSteps)
      ? hs.nextSteps.map(String).filter(Boolean)
      : (dash?.attention || []).map(a => a.label).filter(Boolean);
    const gapCount = Number(hs?.gapCount) || 0;
    const handshakeOk = hs
      ? Boolean(hs.handshakeOk)
      : Boolean(comm.chatLinked) || String(comm.handshakeStatus) === 'operator_ready';
    const chatId = asString(op?.telegram?.chatId) || null;
    const topicKeys = op?.telegram?.topicIds
      ? Object.keys(op.telegram.topicIds)
      : Array.isArray(comm.configuredTopicKeys)
        ? comm.configuredTopicKeys
        : [];
    const fr = op?.accounting?.freeRoll;
    const freeRollUsed = asFiniteNumber(fr?.used);
    const freeRollTotal = asFiniteNumber(fr?.total);
    const chatLinked = hs
      ? String(hs.dmSeatStatus) === 'linked'
      : Boolean(comm.chatLinked) || Boolean(chatId);

    const partnerMsgs = feed.byPartner?.get?.(code) || [];
    const newMessages = partnerMsgs.slice(0, 5);
    const msg24 = (feed.messages24h || []).filter(m => m.partnerCode === code).length;

    /** Operator-facing "new" signals. */
    const signals = [];
    if (newMessages.length) {
      signals.push(
        `${newMessages.length} msg/7d${msg24 ? ` · ${msg24} in 24h` : ''}: ${newMessages[0].summary}`
      );
    }
    if (gapCount > 0) signals.push(`${gapCount} handshake gap(s)`);
    if (hs?.needsPartnerInForum) signals.push('partner missing from forum');
    if (freeRollUsed != null && freeRollUsed > 0) {
      signals.push(
        `freeroll used ${freeRollUsed}${freeRollTotal != null ? `/${freeRollTotal}` : ''}`
      );
    }
    for (const step of nextSteps) {
      if (/ready for welcome/i.test(step)) continue;
      signals.push(step);
    }
    if (!handshakeOk) signals.push('handshake not ok');
    if (!chatLinked) signals.push('chat not linked');

    return {
      partnerCode: code,
      callSign: asString(hs?.callSign || dash?.callSign || op?.callSign) || `${code}-001`,
      handshakeOk,
      gapCount,
      topGap: hs?.topGap ?? null,
      nextSteps,
      phase: asString(hs?.phase || dash?.operationalPhase || op?.phase),
      chatLinked,
      chatId,
      topicKeys,
      topicCount: topicKeys.length,
      freeRollUsed,
      freeRollTotal,
      needsPartnerInForum: Boolean(hs?.needsPartnerInForum),
      verifyLabel: hs && hs.verifyTotal != null ? `${hs.verifyPassed ?? 0}/${hs.verifyTotal}` : '—',
      signals,
      hasNewSignal: signals.length > 0,
      newMessages,
      messages7dCount: newMessages.length,
      messages24hCount: msg24,
      messageFeedAvailable,
      source: hs
        ? 'telegram-handshake+ops'
        : op
          ? 'partners-ops+dashboard'
          : 'dashboard.communication',
    };
  };

  const feedCodes = feed.byPartner instanceof Map ? [...feed.byPartner.keys()] : [];

  if (!handshake || typeof handshake !== 'object') {
    const rows = [];
    const codes = new Set([
      ...(dashboard?.partners || []).map(p => normalizePartnerCode(p?.partnerCode)),
      ...opsByCode.keys(),
      ...feedCodes,
    ]);
    for (const code of [...codes].filter(Boolean).sort()) {
      rows.push(buildRow(code));
    }
    const newSignals = rows.filter(r => r.hasNewSignal);
    return {
      available: false,
      source: 'dashboard-fallback',
      inviteGaps: 0,
      rows,
      needsAttention: newSignals,
      newSignals,
      messageFeedAvailable,
      messageFeed: feed.available ? feed : null,
      note,
    };
  }

  const byHs = indexHandshakeRows(handshake);
  const rows = [];
  const codes = new Set([
    ...[...byHs.keys()],
    ...(dashboard?.partners || []).map(p => normalizePartnerCode(p?.partnerCode)),
    ...opsByCode.keys(),
    ...feedCodes,
  ]);
  for (const code of [...codes].filter(Boolean).sort()) {
    rows.push(buildRow(code, { hs: byHs.get(code) || null }));
  }

  const newSignals = rows.filter(r => r.hasNewSignal);
  return {
    available: true,
    source: asString(handshake.source) || 'telegram-handshake',
    inviteGaps: Number(handshake.inviteGaps) || 0,
    rows,
    needsAttention: newSignals,
    newSignals,
    messageFeedAvailable,
    messageFeed: feed.available ? feed : null,
    note,
  };
}

/**
 * Partner money rollup: balance + limits + soft/ledger nets.
 *
 * @param {object | null | undefined} dashboard
 * @param {object[]} accounts
 * @param {{ soft24: ReturnType<typeof sumSoftPnlWindow>, soft7d: ReturnType<typeof sumSoftPnlWindow>, softAll: ReturnType<typeof sumSoftPnlWindow>, ledger24: ReturnType<typeof sumLedgerSettlementWindow>, ledger7d: ReturnType<typeof sumLedgerSettlementWindow> }} windows
 */
export function buildPartnerMoneyRows(dashboard, accounts, windows) {
  const byCode = new Map();
  for (const partner of dashboard?.partners || []) {
    const code = normalizePartnerCode(partner?.partnerCode);
    const balMinor = partnerScopedBalanceMinor(partner);
    // also sum out balances for desk total
    let outBalMinor = 0;
    let outBalHit = false;
    for (const pos of partner?.accounting?.balancePositions || []) {
      if (pos?.accountScope?.kind !== 'out') continue;
      const m = pos?.amount?.minorUnits;
      if (typeof m === 'number' && Number.isFinite(m)) {
        outBalMinor += m;
        outBalHit = true;
      }
    }
    const partnerAccounts = accounts.filter(a => a.partnerCode === code);
    const limitTotalMajor = partnerAccounts.reduce(
      (n, a) => n + (typeof a.maxBetMajor === 'number' ? a.maxBetMajor : 0),
      0
    );
    const liveCount = partnerAccounts.filter(a => a.live).length;
    const soft24 = windows.soft24.byPartner.get(code);
    const soft7d = windows.soft7d.byPartner.get(code);
    const softAll = windows.softAll.byPartner.get(code);
    const led24 = windows.ledger24.byPartner.get(code);
    const led7d = windows.ledger7d.byPartner.get(code);

    byCode.set(code, {
      partnerCode: code,
      callSign: asString(partner?.callSign) || `${code}-001`,
      phase: asString(partner?.operationalPhase),
      accountCount: partnerAccounts.length,
      liveCount,
      partnerBalanceMinor: balMinor,
      outBalanceMinor: outBalHit ? outBalMinor : null,
      balanceDisplay:
        balMinor != null ? formatUsdMinor(balMinor) : outBalHit ? formatUsdMinor(outBalMinor) : '—',
      limitTotalMajor,
      limitTotalDisplay: formatUsdMajor(limitTotalMajor),
      limitsTracked: Number(partner?.limits?.tracked) || 0,
      limitsMissing: Number(partner?.limits?.missing) || 0,
      softNet24h: soft24?.netMajor ?? 0,
      softNet7d: soft7d?.netMajor ?? 0,
      softNetAll: softAll?.netMajor ?? 0,
      softPlays24h: soft24?.playCount ?? 0,
      softPlays7d: soft7d?.playCount ?? 0,
      ledgerNet24h: led24 ? led24.netMinor / 100 : 0,
      ledgerNet7d: led7d ? led7d.netMinor / 100 : 0,
      attentionCount: Array.isArray(partner?.attention) ? partner.attention.length : 0,
    });
  }
  return [...byCode.values()].sort((a, b) => a.partnerCode.localeCompare(b.partnerCode));
}

/**
 * Connector snapshot strip from partners-dashboard.
 * @param {object | null | undefined} dashboard
 */
export function projectConnectorHealth(dashboard) {
  const snaps = dashboard?.connectorSnapshots || {};
  const rows = [];
  let ok = 0;
  let stale = 0;
  let unavailable = 0;
  for (const key of Object.keys(snaps).sort()) {
    const status = asString(snaps[key]?.dataStatus) || 'unavailable';
    const observedAt = asString(snaps[key]?.observedAt || snaps[key]?.generatedAt) || null;
    if (status === 'ok') ok += 1;
    else if (status === 'stale') stale += 1;
    else unavailable += 1;
    rows.push({
      key,
      status,
      observedAt,
      tone: status === 'ok' ? 'ok' : status === 'stale' ? 'warn' : 'bad',
    });
  }
  return {
    available: rows.length > 0,
    rows,
    counts: { total: rows.length, ok, stale, unavailable },
    label:
      rows.length === 0
        ? 'no connectors'
        : `${ok} ok · ${stale} stale · ${unavailable} down / ${rows.length}`,
  };
}

/**
 * Normalize limit-raises callSign to a partner CODE when possible.
 * ASH, ASH-001 → ASH when that CODE is on the dashboard.
 * @param {unknown} callSign
 * @param {Set<string>} deskCodes
 */
export function matchCallSignToDeskCode(callSign, deskCodes) {
  const raw = asString(callSign).toUpperCase();
  if (!raw) return null;
  if (deskCodes.has(raw)) return raw;
  const base = raw.replace(/-\d+$/, '');
  if (base && deskCodes.has(base)) return base;
  return null;
}

/**
 * Limit-raise / account-profile pulse joined onto desk partners.
 * Also surfaces fleet-wide blocked profiles (limit-demo, etc.).
 *
 * @param {object | null | undefined} limitRaises
 * @param {object | null | undefined} dashboard
 * @param {{ nowMs?: number }} [opts]
 */
export function projectLimitRaisePulse(limitRaises, dashboard, opts = {}) {
  const nowMs = typeof opts.nowMs === 'number' ? opts.nowMs : Date.now();
  const empty = {
    available: false,
    partnerRows: [],
    fleetBlocked: [],
    raiseEvents7d: [],
    counts: {
      deskPartnersMatched: 0,
      blockedOnDesk: 0,
      incompleteOnDesk: 0,
      raises7d: 0,
      fleetBlocked: 0,
      profileAccounts: 0,
    },
    summary: null,
    note: 'limit-raises unavailable',
  };
  if (!limitRaises || typeof limitRaises !== 'object') return empty;

  const deskCodes = new Set(
    (dashboard?.partners || []).map(p => normalizePartnerCode(p?.partnerCode)).filter(Boolean)
  );
  const treeToCode = new Map();
  for (const p of dashboard?.partners || []) {
    const code = normalizePartnerCode(p?.partnerCode);
    const tid = asString(p?.identity?.treeNodeId);
    if (code && tid) treeToCode.set(tid, code);
  }

  const profiles = Array.isArray(limitRaises?.accountProfiles?.profiles)
    ? limitRaises.accountProfiles.profiles
    : [];
  const byCode = new Map(); // code → best profile

  for (const profile of profiles) {
    const tid = asString(profile?.treeNodeId);
    let code = tid && treeToCode.has(tid) ? treeToCode.get(tid) : null;
    if (!code) code = matchCallSignToDeskCode(profile?.callSign, deskCodes);
    if (!code) continue;
    // Prefer accountKind=partner, else first match
    const prev = byCode.get(code);
    if (!prev) {
      byCode.set(code, profile);
      continue;
    }
    if (profile?.accountKind === 'partner' && prev?.accountKind !== 'partner') {
      byCode.set(code, profile);
    }
  }

  /** Collect raw raise events per desk code first (for tip-relative windows). */
  const rawByCode = new Map();
  let tipMs = null;
  for (const code of deskCodes) {
    const tid = asString(
      (dashboard?.partners || []).find(p => normalizePartnerCode(p?.partnerCode) === code)?.identity
        ?.treeNodeId
    );
    const nodeRaises = tid && limitRaises?.byNode?.[tid]?.raises;
    const raises = Array.isArray(nodeRaises) ? nodeRaises : [];
    const parsed = [];
    for (const ev of raises) {
      const sec = asFiniteNumber(ev?.increased_at);
      if (sec == null) continue;
      const t = sec * 1000;
      if (tipMs == null || t > tipMs) tipMs = t;
      parsed.push({
        partnerCode: code,
        sportsbook: asString(ev?.sportsbook) || '—',
        sport: asString(ev?.sport_id) || '—',
        market: asString(ev?.market_id) || '—',
        previousMax: asFiniteNumber(ev?.previous_max),
        newLimit: asFiniteNumber(ev?.new_limit),
        increasedAtMs: t,
        increasedAt: new Date(t).toISOString(),
        score: asFiniteNumber(ev?.multi_factor_score),
        label: `${code} · ${asString(ev?.sportsbook) || '?'} ${asString(ev?.sport_id)}/${asString(ev?.market_id)} ${asFiniteNumber(ev?.previous_max) ?? '?'}→${asFiniteNumber(ev?.new_limit) ?? '?'}`,
      });
    }
    rawByCode.set(code, parsed);
  }

  // Wall-clock 7d; if empty and tip is stale, use tip as window end (fixture tip mode).
  let windowEndMs = nowMs;
  let raiseWindowMode = 'wall-clock';
  const wallRaises = [...rawByCode.values()]
    .flat()
    .filter(ev => nowMs - ev.increasedAtMs <= WINDOW_7D_MS && ev.increasedAtMs <= nowMs);
  if (wallRaises.length === 0 && tipMs != null && nowMs - tipMs >= FIXTURE_REBASE_MIN_AGE_MS) {
    windowEndMs = tipMs;
    raiseWindowMode = 'export-tip';
  }

  const partnerRows = [];
  for (const code of [...deskCodes].sort()) {
    const profile = byCode.get(code) || null;
    const tid = asString(
      (dashboard?.partners || []).find(p => normalizePartnerCode(p?.partnerCode) === code)?.identity
        ?.treeNodeId
    );
    const raises7d = (rawByCode.get(code) || []).filter(
      ev => windowEndMs - ev.increasedAtMs <= WINDOW_7D_MS && ev.increasedAtMs <= windowEndMs
    );
    const mon = asString(profile?.monitoringStatus) || '—';
    const obs = profile?.observations || {};
    partnerRows.push({
      partnerCode: code,
      matched: Boolean(profile),
      treeNodeId: tid || null,
      monitoringStatus: mon,
      lifecycleStatus: asString(profile?.lifecycleStatus) || '—',
      tone:
        asString(profile?.tone) ||
        (mon === 'blocked' ? 'bad' : mon === 'incomplete' ? 'warn' : 'ok'),
      blocked: mon === 'blocked',
      incomplete: mon === 'incomplete',
      jurisdiction: asString(profile?.jurisdiction?.stateCode) || '—',
      location: asString(profile?.jurisdiction?.location) || '—',
      raisesObserved: asFiniteNumber(obs?.raises) ?? 0,
      decreasesObserved: asFiniteNumber(obs?.decreases) ?? 0,
      lastObservedAt: asString(obs?.lastObservedAt) || null,
      sportsbooks: Array.isArray(obs?.sportsbooks) ? obs.sportsbooks.map(String) : [],
      raises7d,
      raises7dCount: raises7d.length,
    });
  }

  const fleetBlocked = profiles
    .filter(p => asString(p?.monitoringStatus) === 'blocked')
    .map(p => ({
      callSign: asString(p?.callSign) || '—',
      accountKind: asString(p?.accountKind) || '—',
      treeNodeId: asString(p?.treeNodeId) || null,
      label: `${asString(p?.callSign) || '?'} · ${asString(p?.accountKind) || 'account'} · blocked`,
    }));

  const raiseEvents7d = partnerRows.flatMap(r => r.raises7d);
  raiseEvents7d.sort((a, b) => String(b.increasedAt).localeCompare(String(a.increasedAt)));

  const summary = limitRaises?.accountProfiles?.summary || null;

  return {
    available: true,
    partnerRows,
    fleetBlocked,
    raiseEvents7d,
    raiseWindowMode,
    raiseWindowEndIso: new Date(windowEndMs).toISOString(),
    tipIso: tipMs != null ? new Date(tipMs).toISOString() : null,
    counts: {
      deskPartnersMatched: partnerRows.filter(r => r.matched).length,
      blockedOnDesk: partnerRows.filter(r => r.blocked).length,
      incompleteOnDesk: partnerRows.filter(r => r.incomplete).length,
      raises7d: raiseEvents7d.length,
      fleetBlocked: fleetBlocked.length,
      profileAccounts: profiles.length,
    },
    summary,
    note:
      raiseWindowMode === 'export-tip'
        ? `Raise 7d window anchored to latest raise tip (${tipMs != null ? new Date(tipMs).toISOString() : '—'}) — wall-clock was empty.`
        : 'Joined via treeNodeId / callSign. Fleet blocked includes limit-demo nodes not on seat roster.',
  };
}

/**
 * Partner-ledger totals vs dashboard partner-scoped balances.
 * @param {object | null | undefined} partnerLedger
 * @param {object | null | undefined} dashboard
 */
export function projectLedgerVsBalance(partnerLedger, dashboard) {
  const empty = {
    available: false,
    rows: [],
    railTotalMinor: null,
    counts: { partners: 0, mismatches: 0, missingLedger: 0 },
    note: 'partner-ledger unavailable',
  };
  const rowsIn = Array.isArray(partnerLedger?.rows) ? partnerLedger.rows : null;
  if (!rowsIn) return empty;

  /** @type {Map<string, { netMinor: number, lastBalanceMinor: number | null, lastAt: string, entryCount: number, byType: Record<string, number> }>} */
  const byCode = new Map();
  for (const row of rowsIn) {
    const code = normalizePartnerCode(row?.partner_code || row?.partnerCode);
    if (!code) continue;
    const prev = byCode.get(code) || {
      netMinor: 0,
      lastBalanceMinor: null,
      lastAt: '',
      entryCount: 0,
      byType: {},
    };
    const amount = asFiniteNumber(row?.amount_minor ?? row?.amountMinor) ?? 0;
    prev.netMinor += amount;
    prev.entryCount += 1;
    const typ = asString(row?.type) || 'other';
    prev.byType[typ] = (prev.byType[typ] || 0) + amount;
    const at = asString(row?.created_at || row?.createdAt);
    const bal = asFiniteNumber(row?.balance_after_minor ?? row?.balanceAfterMinor);
    if (at && (!prev.lastAt || at >= prev.lastAt) && bal != null) {
      prev.lastAt = at;
      prev.lastBalanceMinor = bal;
    }
    byCode.set(code, prev);
  }

  let railTotalMinor = 0;
  let railHit = false;
  const partnerRows = [];
  const codes = new Set([
    ...[...byCode.keys()],
    ...(dashboard?.partners || []).map(p => normalizePartnerCode(p?.partnerCode)),
  ]);

  for (const code of [...codes].filter(Boolean).sort()) {
    const partner = (dashboard?.partners || []).find(
      p => normalizePartnerCode(p?.partnerCode) === code
    );
    const dashBal = partner ? partnerScopedBalanceMinor(partner) : null;
    let outBal = 0;
    let outHit = false;
    let railBal = 0;
    for (const pos of partner?.accounting?.balancePositions || []) {
      const m = pos?.amount?.minorUnits;
      if (typeof m !== 'number' || !Number.isFinite(m)) continue;
      if (pos?.accountScope?.kind === 'out') {
        outBal += m;
        outHit = true;
      }
      if (pos?.accountScope?.kind === 'rail') {
        railBal += m;
        railTotalMinor += m;
        railHit = true;
      }
    }
    const led = byCode.get(code);
    const ledgerNet = led?.netMinor ?? null;
    const ledgerLast = led?.lastBalanceMinor ?? null;
    const compareTo = dashBal != null ? dashBal : outHit ? outBal : null;
    const delta = ledgerNet != null && compareTo != null ? ledgerNet - compareTo : null;
    const mismatch = delta != null && delta !== 0;
    partnerRows.push({
      partnerCode: code,
      dashboardPartnerMinor: dashBal,
      dashboardOutMinor: outHit ? outBal : null,
      dashboardRailMinor: railBal || null,
      ledgerNetMinor: ledgerNet,
      ledgerLastBalanceMinor: ledgerLast,
      ledgerEntryCount: led?.entryCount ?? 0,
      byType: led?.byType || {},
      deltaMinor: delta,
      mismatch,
      balanceDisplay:
        dashBal != null ? formatUsdMinor(dashBal) : outHit ? formatUsdMinor(outBal) : '—',
      ledgerNetDisplay: ledgerNet != null ? formatUsdMinor(ledgerNet) : '—',
      deltaDisplay: delta == null ? '—' : formatUsdMinor(delta),
    });
  }

  return {
    available: true,
    rows: partnerRows,
    railTotalMinor: railHit ? railTotalMinor : null,
    railTotalDisplay: railHit ? formatUsdMinor(railTotalMinor) : '—',
    counts: {
      partners: partnerRows.length,
      mismatches: partnerRows.filter(r => r.mismatch).length,
      missingLedger: partnerRows.filter(r => r.ledgerNetMinor == null).length,
    },
    note: 'Ledger net = sum(amount_minor). Dashboard partner balance is scope=partner only; delta flags integrity drift.',
  };
}

/**
 * Bookmakers desk-coverage rollup (unmatched / placeholder sportsbooks).
 * @param {object | null | undefined} coverage
 */
export function projectBookCoverage(coverage) {
  if (!coverage || typeof coverage !== 'object') {
    return {
      available: false,
      matched: 0,
      unmatched: 0,
      placeholder: 0,
      hits: [],
      unmatchedHits: [],
      registryUnused: [],
      note: 'bookmakers-desk-coverage unavailable',
    };
  }
  const hits = Array.isArray(coverage.hits) ? coverage.hits : [];
  const unmatchedHits = hits.filter(
    h => asString(h?.class) === 'unmatched' || asString(h?.class) === 'placeholder'
  );
  return {
    available: true,
    matched: Number(coverage.matched) || 0,
    unmatched: Number(coverage.unmatched) || 0,
    placeholder: Number(coverage.placeholder) || 0,
    deskBooks: Number(coverage.deskBooks) || hits.length,
    hits,
    unmatchedHits,
    registryUnused: Array.isArray(coverage.registryUnused)
      ? coverage.registryUnused.map(String)
      : [],
    note: 'Seat desk books vs public bookmakers catalog.',
  };
}

/**
 * Soft play partner codes not on the dashboard roster.
 * @param {object | null | undefined} softExport
 * @param {object | null | undefined} dashboard
 */
export function projectSoftOrphanPartners(softExport, dashboard) {
  const desk = new Set(
    (dashboard?.partners || []).map(p => normalizePartnerCode(p?.partnerCode)).filter(Boolean)
  );
  const orphans = new Map();
  for (const play of softExport?.plays || []) {
    const code = normalizePartnerCode(play?.partnerCode);
    if (!code || desk.has(code)) continue;
    const prev = orphans.get(code) || { partnerCode: code, playCount: 0, netMajor: 0 };
    prev.playCount += 1;
    prev.netMajor += asFiniteNumber(play?.pnl) ?? 0;
    orphans.set(code, prev);
  }
  const rows = [...orphans.values()].sort((a, b) => a.partnerCode.localeCompare(b.partnerCode));
  return {
    available: rows.length > 0,
    rows,
    note:
      rows.length > 0
        ? 'Soft export has partner codes not on partners-dashboard roster.'
        : 'No soft-only partner codes.',
  };
}

/**
 * Full morning desk model from baked registries.
 *
 * @param {{
 *   dashboard: object,
 *   soft?: object | null,
 *   seat?: object | null,
 *   ops?: object | null,
 *   bookmakers?: object | null,
 *   handshake?: object | null,
 *   limitRaises?: object | null,
 *   partnerLedger?: object | null,
 *   bookCoverage?: object | null,
 *   tocOps?: object | null,
 *   nowMs?: number,
 * }} input
 */
export function buildMorningDesk(input) {
  const dashboard = input.dashboard;
  const nowMs = typeof input.nowMs === 'number' ? input.nowMs : Date.now();

  const softPrep = prepareSoftExportForDeskWindows(input.soft, nowMs);
  const softForWindows = softPrep.soft;

  const soft24 = sumSoftPnlWindow(softForWindows, { nowMs, windowMs: WINDOW_24H_MS });
  const soft7d = sumSoftPnlWindow(softForWindows, { nowMs, windowMs: WINDOW_7D_MS });
  const softAll = sumSoftPnlWindow(softForWindows, { nowMs, windowMs: null });
  const ledger24 = sumLedgerSettlementWindow(dashboard, { nowMs, windowMs: WINDOW_24H_MS });
  const ledger7d = sumLedgerSettlementWindow(dashboard, { nowMs, windowMs: WINDOW_7D_MS });

  const accounts = buildDeskAccountRows(dashboard, {
    bookmakers: input.bookmakers,
    ops: input.ops,
    seat: input.seat,
  });

  const windows = { soft24, soft7d, softAll, ledger24, ledger7d };
  const partners = buildPartnerMoneyRows(dashboard, accounts, windows);
  const alerts = collectDeskAlerts(dashboard, accounts, input.ops);
  const messageFeed = projectTelegramMessageFeed(input.tocOps, { nowMs });
  const telegram = projectTelegramSignals(input.handshake, dashboard, input.ops, messageFeed);
  const connectors = projectConnectorHealth(dashboard);
  const limitPulse = projectLimitRaisePulse(input.limitRaises, dashboard, { nowMs });
  const moneyIntegrity = projectLedgerVsBalance(input.partnerLedger, dashboard);
  const bookCoverage = projectBookCoverage(input.bookCoverage);
  const softOrphans = projectSoftOrphanPartners(input.soft, dashboard);

  // Fold limit-pulse freezes into alerts surface
  for (const row of limitPulse.partnerRows) {
    if (row.blocked) {
      alerts.freezes.push({
        partnerCode: row.partnerCode,
        outId: '—',
        bookLabel: 'limit profile',
        reasons: ['blocked'],
        status: 'blocked',
        label: `${row.partnerCode} · limit profile blocked · ${row.jurisdiction}`,
      });
    }
  }
  const deskCodeSet = new Set(partners.map(p => p.partnerCode));
  for (const fb of limitPulse.fleetBlocked) {
    const mapped = matchCallSignToDeskCode(fb.callSign, deskCodeSet);
    if (mapped) continue; // already on a desk partner row when blocked
    alerts.freezes.push({
      partnerCode: asString(fb.callSign),
      outId: '—',
      bookLabel: fb.accountKind,
      reasons: ['blocked'],
      status: 'blocked',
      label: fb.label,
    });
  }
  alerts.counts.freezes = alerts.freezes.length;
  alerts.counts.blocked =
    accounts.filter(a => a.status === 'blocked').length + limitPulse.counts.blockedOnDesk;

  const byPartner = groupDeskAccounts(accounts, 'partnerCode');
  const byType = groupDeskAccounts(accounts, 'bookType');
  const bySkin = groupDeskAccounts(accounts, 'skin');
  const byLive = groupDeskAccounts(accounts, 'live');

  let limitTotalMajor = 0;
  let balanceOutMinor = 0;
  let balanceOutHit = false;
  let liveCount = 0;
  for (const a of accounts) {
    if (typeof a.maxBetMajor === 'number') limitTotalMajor += a.maxBetMajor;
    if (typeof a.balanceMinor === 'number') {
      balanceOutMinor += a.balanceMinor;
      balanceOutHit = true;
    }
    if (a.live) liveCount += 1;
  }

  let partnerBalanceMinor = 0;
  let partnerBalanceHit = false;
  for (const p of partners) {
    if (typeof p.partnerBalanceMinor === 'number') {
      partnerBalanceMinor += p.partnerBalanceMinor;
      partnerBalanceHit = true;
    }
  }

  // Enrich partner money rows with ledger integrity
  const moneyByCode = new Map(moneyIntegrity.rows.map(r => [r.partnerCode, r]));
  for (const p of partners) {
    const m = moneyByCode.get(p.partnerCode);
    p.ledgerNetMinor = m?.ledgerNetMinor ?? null;
    p.ledgerNetDisplay = m?.ledgerNetDisplay ?? '—';
    p.moneyDeltaMinor = m?.deltaMinor ?? null;
    p.moneyDeltaDisplay = m?.deltaDisplay ?? '—';
    p.moneyMismatch = Boolean(m?.mismatch);
  }

  return {
    generatedAt: asString(dashboard?.generatedAt) || null,
    schema: asString(dashboard?.schema) || null,
    nowMs,
    softWindow: {
      mode: softPrep.mode,
      rebased: softPrep.rebased,
      tipMs: softPrep.tipMs,
      tipIso: softPrep.tipIso,
      deltaMs: softPrep.deltaMs,
      note: softPrep.note,
    },
    summary: {
      partners: partners.length,
      accounts: accounts.length,
      live: liveCount,
      notLive: accounts.length - liveCount,
      limitTotalMajor,
      limitTotalDisplay: formatUsdMajor(limitTotalMajor),
      balanceOutMinor: balanceOutHit ? balanceOutMinor : null,
      balanceOutDisplay: balanceOutHit ? formatUsdMinor(balanceOutMinor) : '—',
      partnerBalanceMinor: partnerBalanceHit ? partnerBalanceMinor : null,
      partnerBalanceDisplay: partnerBalanceHit ? formatUsdMinor(partnerBalanceMinor) : '—',
      railBalanceDisplay: moneyIntegrity.railTotalDisplay,
      softNet24h: soft24.netMajor,
      softNet7d: soft7d.netMajor,
      softNetAll: softAll.netMajor,
      softPlays24h: soft24.playCount,
      softPlays7d: soft7d.playCount,
      softPlaysAll: softAll.playCount,
      softAvailable: soft24.available,
      softSource: soft24.source,
      softWindowMode: softPrep.mode,
      softRebased: softPrep.rebased,
      ledgerNet24h: ledger24.netMajor,
      ledgerNet7d: ledger7d.netMajor,
      freezes: alerts.counts.freezes,
      freerolls: alerts.counts.freerolls,
      freerollApplied: alerts.counts.freerollApplied,
      attention: alerts.counts.attention,
      telegramAttention: telegram.needsAttention.length,
      telegramNewSignals: telegram.newSignals?.length ?? 0,
      inviteGaps: telegram.inviteGaps,
      messageFeedAvailable: telegram.messageFeedAvailable === true,
      messages24h: messageFeed.counts.in24h,
      messages7d: messageFeed.counts.in7d,
      messagesTotal: messageFeed.counts.total,
      messageSlaBreaches: messageFeed.counts.slaBreaches,
      connectorsOk: connectors.counts.ok,
      connectorsStale: connectors.counts.stale,
      moneyMismatches: moneyIntegrity.counts.mismatches,
      limitRaises7d: limitPulse.counts.raises7d,
      fleetBlocked: limitPulse.counts.fleetBlocked,
      booksUnmatched: bookCoverage.unmatched + bookCoverage.placeholder,
      softOrphans: softOrphans.rows.length,
    },
    accounts,
    partners,
    groups: {
      byPartner,
      byType,
      bySkin,
      byLive,
    },
    alerts,
    telegram,
    messageFeed,
    connectors,
    limitPulse,
    moneyIntegrity,
    bookCoverage,
    softOrphans,
    format: {
      usdMajor: formatUsdMajor,
      usdMinor: formatUsdMinor,
    },
  };
}

export { formatUsdMajor, formatUsdMinor, humanizeBookSlug, statusToneClass, normalizePartnerCode };
