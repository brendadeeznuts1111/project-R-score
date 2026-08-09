/**
 * Soft accounting window / week / book-type pure helpers (browser SSOT).
 *
 * Aligns with lib/telegram/soft-accounting-export.ts bake physics:
 * UTC Monday week starts · stake deposits · |pnl| settlements · net pnl.
 *
 * Consumers: desk-board · partners-board · account-dossier (re-export wrappers).
 *
 * @see lib/telegram/soft-accounting-export.ts
 * @see public/registry/soft-accounting-export.json
 */

export const SOFT_MS_HOUR = 3_600_000;
export const SOFT_WINDOW_24H_MS = 24 * SOFT_MS_HOUR;
export const SOFT_WINDOW_7D_MS = 7 * 24 * SOFT_MS_HOUR;
/** When fixture tip is older than this, prepareSoftExportForWindows rebases timestamps. */
export const SOFT_FIXTURE_REBASE_MIN_AGE_MS = 48 * SOFT_MS_HOUR;

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeSoftPartnerCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
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
 * @param {unknown} value
 * @returns {string}
 */
function asString(value) {
  return value == null ? '' : String(value).trim();
}

/**
 * UTC Monday (YYYY-MM-DD) for a placedAt ISO timestamp.
 * Mirrors weekStartIsoFromPlacedAt in lib/telegram/soft-accounting-export.ts.
 * @param {unknown} placedAt
 * @returns {string | null}
 */
export function weekStartIsoFromPlacedAt(placedAt) {
  const ms = Date.parse(String(placedAt || ''));
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dayNum = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dayNum}`;
}

/** Alias used by partners-board historically. */
export const softWeekStartIsoFromPlacedAt = weekStartIsoFromPlacedAt;

/**
 * Index Soft plays by partner CODE (placedAt ascending within bucket).
 * @param {object | null | undefined} softExport
 * @returns {Map<string, object[]>}
 */
export function indexSoftPlaysByPartner(softExport) {
  const map = new Map();
  for (const play of softExport?.plays || []) {
    const code = normalizeSoftPartnerCode(play?.partnerCode);
    if (!code) continue;
    const bucket = map.get(code);
    if (bucket) bucket.push(play);
    else map.set(code, [play]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => String(a?.placedAt || '').localeCompare(String(b?.placedAt || '')));
  }
  return map;
}

/**
 * Derive per-week Soft rows from plays when export.weeks is empty.
 * deposits = sum stake · settlements = sum |pnl| (non-pending) · net = sum pnl.
 * Sorted ascending by weekStart, then partnerCode (lib bake order).
 * @param {object[] | null | undefined} plays
 * @returns {object[]}
 */
export function rollupWeeksFromPlays(plays) {
  const byKey = new Map();
  for (const play of plays || []) {
    const partnerCode = normalizeSoftPartnerCode(play?.partnerCode);
    const weekStart = weekStartIsoFromPlacedAt(play?.placedAt);
    if (!partnerCode || !weekStart) continue;
    const key = `${partnerCode}|${weekStart}`;
    let row = byKey.get(key);
    if (!row) {
      row = {
        weekStart,
        partnerCode,
        deposits: 0,
        withdrawals: 0,
        settlements: 0,
        fees: 0,
        net: 0,
      };
      byKey.set(key, row);
    }
    const stake = typeof play.stake === 'number' && Number.isFinite(play.stake) ? play.stake : 0;
    const pnl = typeof play.pnl === 'number' && Number.isFinite(play.pnl) ? play.pnl : 0;
    row.deposits += stake;
    if (play.result !== 'pending') row.settlements += Math.abs(pnl);
    row.net += pnl;
  }
  return [...byKey.values()].sort(
    (a, b) => a.weekStart.localeCompare(b.weekStart) || a.partnerCode.localeCompare(b.partnerCode)
  );
}

/**
 * Derive Soft book-type rows from plays tagged with book.type.*.
 * @param {object[] | null | undefined} plays
 * @returns {object[]}
 */
export function rollupByBookTypeFromPlays(plays) {
  const byKey = new Map();
  for (const play of plays || []) {
    const partnerCode = normalizeSoftPartnerCode(play?.partnerCode);
    let bookType = asString(play?.bookType);
    if (bookType && !bookType.startsWith('book.type.')) {
      // bare token → concept id when possible
      bookType = `book.type.${bookType}`;
    }
    if (!partnerCode || !bookType.startsWith('book.type.')) continue;
    const key = `${partnerCode}|${bookType}`;
    let row = byKey.get(key);
    if (!row) {
      row = { bookType, partnerCode, deposits: 0, settlements: 0, fees: 0, net: 0 };
      byKey.set(key, row);
    }
    const stake = typeof play.stake === 'number' && Number.isFinite(play.stake) ? play.stake : 0;
    const pnl = typeof play.pnl === 'number' && Number.isFinite(play.pnl) ? play.pnl : 0;
    row.deposits += stake;
    if (play.result !== 'pending') row.settlements += Math.abs(pnl);
    row.net += pnl;
  }
  return [...byKey.values()].sort(
    (a, b) => a.partnerCode.localeCompare(b.partnerCode) || a.bookType.localeCompare(b.bookType)
  );
}

/**
 * Soft week rollups: prefer export.weeks, else derive from plays.
 * Board display order: newest week first.
 * @param {object | null | undefined} softExport
 * @returns {object[]}
 */
export function softWeekRowsFromExport(softExport) {
  const weeks = Array.isArray(softExport?.weeks) ? softExport.weeks : [];
  if (weeks.length) {
    return weeks
      .map(w => ({
        weekStart: w.weekStart || w.week || '—',
        partnerCode: normalizeSoftPartnerCode(w.partnerCode),
        deposits: Number(w.deposits) || 0,
        settlements: Number(w.settlements) || 0,
        withdrawals: Number(w.withdrawals) || 0,
        fees: Number(w.fees) || 0,
        net: Number(w.net) || 0,
      }))
      .filter(w => w.partnerCode)
      .sort(
        (a, b) =>
          String(b.weekStart).localeCompare(String(a.weekStart)) ||
          a.partnerCode.localeCompare(b.partnerCode)
      );
  }
  return rollupWeeksFromPlays(softExport?.plays)
    .slice()
    .sort(
      (a, b) =>
        String(b.weekStart).localeCompare(String(a.weekStart)) ||
        a.partnerCode.localeCompare(b.partnerCode)
    );
}

/**
 * Soft book-type rollups: prefer export.byBookType, else derive from tagged plays.
 * @param {object | null | undefined} softExport
 * @returns {object[]}
 */
export function softBookTypeRowsFromExport(softExport) {
  const rows = Array.isArray(softExport?.byBookType) ? softExport.byBookType : [];
  if (rows.length) {
    return rows
      .map(b => ({
        partnerCode: normalizeSoftPartnerCode(b.partnerCode),
        bookType: String(b.bookType || '—'),
        deposits: Number(b.deposits) || 0,
        settlements: Number(b.settlements) || 0,
        fees: Number(b.fees) || 0,
        net: Number(b.net) || 0,
      }))
      .filter(b => b.partnerCode)
      .sort(
        (a, b) => a.partnerCode.localeCompare(b.partnerCode) || a.bookType.localeCompare(b.bookType)
      );
  }
  return rollupByBookTypeFromPlays(softExport?.plays);
}

/**
 * Project soft-accounting-export into board caches (partners board shape).
 * @param {object | null | undefined} softExport
 */
export function projectSoftAccountingExport(softExport) {
  if (!softExport || softExport.available === false) {
    return {
      source: softExport?.source || 'unavailable',
      playsByPartner: new Map(),
      weekRows: [],
      bookTypeRows: [],
      playCount: 0,
    };
  }
  const playsByPartner = indexSoftPlaysByPartner(softExport);
  let playCount = 0;
  for (const plays of playsByPartner.values()) playCount += plays.length;
  return {
    source: String(softExport.source || softExport.path || 'soft-accounting-export'),
    playsByPartner,
    weekRows: softWeekRowsFromExport(softExport),
    bookTypeRows: softBookTypeRowsFromExport(softExport),
    playCount,
  };
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
 * @param {unknown} iso
 * @param {number} deltaMs
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
 */
export function prepareSoftExportForWindows(softExport, wallNowMs) {
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

  if (source === 'toc-ops-fixture' && tipMs != null) {
    const age = wallNowMs - tipMs;
    if (age >= SOFT_FIXTURE_REBASE_MIN_AGE_MS) {
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

/** Desk-facing alias. */
export const prepareSoftExportForDeskWindows = prepareSoftExportForWindows;

/**
 * Sum soft-accounting play pnl in a time window (major USD).
 * Uses settledAt, falling back to placedAt.
 *
 * @param {object | null | undefined} softExport
 * @param {{ nowMs?: number, windowMs?: number | null }} [opts]
 */
export function sumSoftPnlWindow(softExport, opts = {}) {
  const nowMs = typeof opts.nowMs === 'number' ? opts.nowMs : Date.now();
  const windowMs = opts.windowMs === undefined ? SOFT_WINDOW_24H_MS : opts.windowMs;
  const byPartner = new Map();
  let netMajor = 0;
  let playCount = 0;
  const available = Boolean(softExport && softExport.available !== false);
  const source =
    asString(softExport?.source) || (available ? 'soft-accounting-export' : 'unavailable');
  if (!available) {
    return { netMajor: 0, playCount: 0, byPartner, source, available: false };
  }
  for (const play of softExport?.plays || []) {
    const code = normalizeSoftPartnerCode(play?.partnerCode);
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
 * Soft play chrome for one partner CODE (dossier shape).
 * @param {object | null | undefined} softExport
 * @param {string | null | undefined} partnerCode
 * @param {{ limit?: number }} [opts]
 */
export function buildPartnerSoftPlays(softExport, partnerCode, opts = {}) {
  const code = normalizeSoftPartnerCode(partnerCode);
  if (!code) return null;
  const limit = typeof opts.limit === 'number' && opts.limit > 0 ? Math.floor(opts.limit) : 8;
  const source = softExport?.source || 'unavailable';
  const path = softExport?.path || '/registry/soft-accounting-export.json';
  const all = Array.isArray(softExport?.plays)
    ? softExport.plays.filter(p => normalizeSoftPartnerCode(p?.partnerCode) === code)
    : [];
  all.sort((a, b) => String(a.placedAt || '').localeCompare(String(b.placedAt || '')));
  const plays = all.slice().reverse().slice(0, limit);
  const exportWeeks = Array.isArray(softExport?.weeks)
    ? softExport.weeks.filter(w => normalizeSoftPartnerCode(w?.partnerCode) === code)
    : [];
  const weeks =
    exportWeeks.length > 0
      ? exportWeeks
          .slice()
          .sort((a, b) => String(b.weekStart || '').localeCompare(String(a.weekStart || '')))
      : rollupWeeksFromPlays(all)
          .slice()
          .sort((a, b) => String(b.weekStart).localeCompare(String(a.weekStart)));
  const exportBooks = Array.isArray(softExport?.byBookType)
    ? softExport.byBookType.filter(b => normalizeSoftPartnerCode(b?.partnerCode) === code)
    : [];
  const byBookType =
    exportBooks.length > 0
      ? exportBooks
          .slice()
          .sort((a, b) => String(a.bookType || '').localeCompare(String(b.bookType || '')))
      : rollupByBookTypeFromPlays(all);
  return {
    partnerCode: code,
    available: all.length > 0,
    source,
    path,
    playCount: all.length,
    conceptId: 'ops.view.per_play',
    weekConceptId: 'ops.view.per_week',
    bookConceptId: 'ops.view.per_book_type',
    plays,
    weeks,
    byBookType,
  };
}

/** Dossier-facing alias. */
export const buildDossierSoftPlays = buildPartnerSoftPlays;
