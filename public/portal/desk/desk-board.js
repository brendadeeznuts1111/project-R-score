/**
 * Morning desk pure projection — join partners-dashboard + optional ancillary
 * bakes into one quiet operator view (no DOM).
 *
 * Primary: partners-dashboard.v2
 * Ancillary: soft-accounting-export · seat-capital-desk · partners-ops ·
 * bookmakers · telegram-handshake
 *
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

/** Canonical primary artifact for the morning desk. */
export const DESK_PRIMARY_ARTIFACT_REF = '/registry/partners-dashboard.json';

export const DESK_ANCILLARY_REFS = Object.freeze({
  soft: '/registry/soft-accounting-export.json',
  seat: '/registry/seat-capital-desk.json',
  ops: '/registry/partners-ops.json',
  bookmakers: '/registry/bookmakers.json',
  handshake: '/registry/telegram-handshake.json',
});

const MS_HOUR = 3_600_000;
const WINDOW_24H_MS = 24 * MS_HOUR;
const WINDOW_7D_MS = 7 * 24 * MS_HOUR;
/** When fixture tip is older than this, desk rebases play timestamps onto wall clock. */
const FIXTURE_REBASE_MIN_AGE_MS = 48 * MS_HOUR;

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

/**
 * Latest settledAt/placedAt tip among soft plays (ms), or null.
 * @param {object | null | undefined} softExport
 * @returns {number | null}
 */
export function softExportTipMs(softExport) {
  let tip = null;
  for (const play of softExport?.plays || []) {
    const ts = asString(play?.settledAt || play?.placedAt);
    const t = Date.parse(ts);
    if (!Number.isFinite(t)) continue;
    if (tip == null || t > tip) tip = t;
  }
  return tip;
}

/**
 * Shift ISO timestamp by deltaMs; empty/invalid stays as-is.
 * @param {unknown} iso
 * @param {number} deltaMs
 * @returns {string}
 */
function shiftIso(iso, deltaMs) {
  const raw = asString(iso);
  if (!raw) return raw;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return raw;
  return new Date(t + deltaMs).toISOString();
}

/**
 * For stale toc-ops-fixture demos only: rebase play timestamps so wall-clock
 * 24h/7d windows show activity. Live soft-ct is never rewritten.
 *
 * @param {object | null | undefined} softExport
 * @param {number} wallNowMs
 * @returns {{
 *   soft: object | null | undefined,
 *   rebased: boolean,
 *   mode: 'wall-clock' | 'fixture-rebase' | 'unavailable',
 *   tipMs: number | null,
 *   tipIso: string | null,
 *   deltaMs: number,
 *   note: string,
 * }}
 */
export function prepareSoftExportForDeskWindows(softExport, wallNowMs) {
  const available = Boolean(softExport && softExport.available !== false);
  const source = asString(softExport?.source);
  const tipMs = softExportTipMs(softExport);
  const tipIso = tipMs != null ? new Date(tipMs).toISOString() : null;

  if (!available) {
    return {
      soft: softExport,
      rebased: false,
      mode: 'unavailable',
      tipMs,
      tipIso,
      deltaMs: 0,
      note: 'Soft accounting unavailable.',
    };
  }

  // Live Soft Balance path — always wall-clock windows.
  if (source === 'soft-ct') {
    return {
      soft: softExport,
      rebased: false,
      mode: 'wall-clock',
      tipMs,
      tipIso,
      deltaMs: 0,
      note: 'Soft windows use wall clock (soft-ct).',
    };
  }

  // Fixture demos: if tip is stale, slide the whole series forward onto now.
  if (source === 'toc-ops-fixture' && tipMs != null) {
    const age = wallNowMs - tipMs;
    if (age >= FIXTURE_REBASE_MIN_AGE_MS) {
      const deltaMs = age;
      const plays = (softExport.plays || []).map(play => ({
        ...play,
        placedAt: shiftIso(play?.placedAt, deltaMs),
        settledAt: play?.settledAt ? shiftIso(play.settledAt, deltaMs) : play?.settledAt,
      }));
      return {
        soft: { ...softExport, plays },
        rebased: true,
        mode: 'fixture-rebase',
        tipMs,
        tipIso,
        deltaMs,
        note: `Fixture plays rebased to wall clock for desk windows (export tip ${tipIso}). soft-ct is never rewritten.`,
      };
    }
  }

  return {
    soft: softExport,
    rebased: false,
    mode: 'wall-clock',
    tipMs,
    tipIso,
    deltaMs: 0,
    note: 'Soft windows use wall clock.',
  };
}

/**
 * Sum soft-accounting play pnl in a time window (major USD).
 * Uses settledAt, falling back to placedAt.
 *
 * @param {object | null | undefined} softExport
 * @param {{ nowMs?: number, windowMs?: number | null }} [opts]
 *   windowMs null = all plays
 * @returns {{
 *   netMajor: number,
 *   playCount: number,
 *   byPartner: Map<string, { netMajor: number, playCount: number }>,
 *   source: string,
 *   available: boolean,
 * }}
 */
export function sumSoftPnlWindow(softExport, opts = {}) {
  const nowMs = typeof opts.nowMs === 'number' ? opts.nowMs : Date.now();
  const windowMs = opts.windowMs === undefined ? WINDOW_24H_MS : opts.windowMs;
  const byPartner = new Map();
  let netMajor = 0;
  let playCount = 0;
  const available = Boolean(softExport && softExport.available !== false);
  const source =
    asString(softExport?.source) || (available ? 'soft-accounting-export' : 'unavailable');
  if (!available) {
    return { netMajor: 0, playCount: 0, byPartner, source, available: false };
  }
  const plays = Array.isArray(softExport.plays) ? softExport.plays : [];
  for (const play of plays) {
    const code = normalizePartnerCode(play?.partnerCode);
    const pnl = asFiniteNumber(play?.pnl);
    if (pnl == null) continue;
    const ts = asString(play?.settledAt || play?.placedAt);
    const t = Date.parse(ts);
    if (!Number.isFinite(t)) continue;
    if (windowMs != null && nowMs - t > windowMs) continue;
    if (windowMs != null && t > nowMs) continue;
    netMajor += pnl;
    playCount += 1;
    if (!code) continue;
    const prev = byPartner.get(code) || { netMajor: 0, playCount: 0 };
    prev.netMajor += pnl;
    prev.playCount += 1;
    byPartner.set(code, prev);
  }
  return { netMajor, playCount, byPartner, source, available: true };
}

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
 * Telegram signals from handshake + partners-ops chats.
 * No live MessageLog feed — surfaces chat linkage, freeroll, gaps, next steps.
 *
 * @param {object | null | undefined} handshake
 * @param {object | null | undefined} dashboard
 * @param {object | null | undefined} [ops]
 * @returns {{
 *   available: boolean,
 *   source: string,
 *   inviteGaps: number,
 *   rows: object[],
 *   needsAttention: object[],
 *   newSignals: object[],
 *   messageFeedAvailable: boolean,
 *   note: string,
 * }}
 */
export function projectTelegramSignals(handshake, dashboard, ops = null) {
  const note =
    'No live Telegram message bodies in the registry yet — showing chat linkage, freeroll, handshake gaps, and next steps. MessageLog / package history is the follow-on bake.';
  const opsByCode = indexOpsPartners(ops);
  const messageFeedAvailable = false;

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

    /** Operator-facing "new" signals (not message bodies). */
    const signals = [];
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
      newMessages: null, // brand-ok intentional null — message feed not baked
      messageFeedAvailable: false,
      source: hs
        ? 'telegram-handshake+ops'
        : op
          ? 'partners-ops+dashboard'
          : 'dashboard.communication',
    };
  };

  if (!handshake || typeof handshake !== 'object') {
    const rows = [];
    const codes = new Set([
      ...(dashboard?.partners || []).map(p => normalizePartnerCode(p?.partnerCode)),
      ...opsByCode.keys(),
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
      note,
    };
  }

  const byHs = indexHandshakeRows(handshake);
  const rows = [];
  const codes = new Set([
    ...[...byHs.keys()],
    ...(dashboard?.partners || []).map(p => normalizePartnerCode(p?.partnerCode)),
    ...opsByCode.keys(),
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
 * Full morning desk model from baked registries.
 *
 * @param {{
 *   dashboard: object,
 *   soft?: object | null,
 *   seat?: object | null,
 *   ops?: object | null,
 *   bookmakers?: object | null,
 *   handshake?: object | null,
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
  const telegram = projectTelegramSignals(input.handshake, dashboard, input.ops);

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
    format: {
      usdMajor: formatUsdMajor,
      usdMinor: formatUsdMinor,
    },
  };
}

export { formatUsdMajor, formatUsdMinor, humanizeBookSlug, statusToneClass, normalizePartnerCode };
