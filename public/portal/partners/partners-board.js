/**
 * Partners board pure helpers — partners-ops.v2 domain logic (no DOM).
 * @see docs/harness/tenants/partner-domain-map.md
 * @see public/registry/partners-ops.json
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizePartnerCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

/**
 * Index partners-ops partners by code.
 * @param {{ partners?: Array<{ code?: string }> } | null | undefined} ops
 * @returns {Map<string, object>}
 */
export function indexOpsByPartner(ops) {
  const map = new Map();
  for (const partner of ops?.partners || []) {
    const code = normalizePartnerCode(partner?.code);
    if (code) map.set(code, partner);
  }
  return map;
}

/**
 * Flatten outs across partners for inventory tables.
 * @param {{ partners?: Array<object> } | null | undefined} ops
 * @returns {Array<object>}
 */
export function flattenPartnerOuts(ops) {
  const rows = [];
  for (const partner of ops?.partners || []) {
    const code = normalizePartnerCode(partner?.code);
    for (const out of partner?.outs || []) {
      rows.push({
        partnerCode: code,
        callSign: partner?.callSign || `${code}-001`,
        phase: partner?.phase || '—',
        phaseConceptId: partner?.phaseConceptId,
        phaseColor: partner?.phaseColor,
        out,
        status: out?.status || '—',
        incomplete: Boolean(out?.incomplete),
        bookName: out?.book?.name || out?.book?.slug || out?.id || '—',
        bookType: out?.book?.type || '—',
        maxBet: out?.maxBet ?? '—',
        method: out?.funding?.method || '—',
        username: out?.credentials?.username || '—',
      });
    }
  }
  return rows;
}

/**
 * @param {Array<object>} outs
 * @param {{ partnerCode?: string | null, status?: string | null, incompleteOnly?: boolean }} [filter]
 */
export function filterPartnerOuts(outs, filter = {}) {
  const code = filter.partnerCode ? normalizePartnerCode(filter.partnerCode) : null;
  const status = filter.status ? String(filter.status).toLowerCase() : null;
  return outs.filter(row => {
    if (code && row.partnerCode !== code) return false;
    if (status && String(row.status || '').toLowerCase() !== status) return false;
    if (filter.incompleteOnly && !row.incomplete) return false;
    return true;
  });
}

/**
 * Aggregate domain stats from partners-ops + handshake-shaped sources.
 * @param {{ summary?: object } | null | undefined} ops
 * @param {{ operatorReady?: number, inviteGaps?: number, partners?: number, rows?: unknown[] } | null | undefined} handshake
 */
export function summarizePartnerDesk(ops, handshake) {
  const summary = ops?.summary || {};
  const partners =
    summary.partners ?? handshake?.partners ?? (Array.isArray(handshake?.rows) ? handshake.rows.length : 0);
  const outs = flattenPartnerOuts(ops);
  const readyOuts = outs.filter(o => String(o.status).toLowerCase() === 'ready').length;
  const deferredOuts = outs.filter(o => String(o.status).toLowerCase() === 'deferred').length;
  const incompleteOuts = summary.incompleteOuts ?? outs.filter(o => o.incomplete).length;
  const phases = {};
  for (const p of ops?.partners || []) {
    const phase = String(p.phase || 'unknown');
    phases[phase] = (phases[phase] || 0) + 1;
  }
  return {
    partners: Number(partners) || 0,
    operatorReady: Number(handshake?.operatorReady ?? summary.readyAccounts ?? 0) || 0,
    accounts: Number(summary.accounts ?? outs.length) || 0,
    outs: outs.length,
    readyOuts,
    deferredOuts,
    trackedLimits: Number(summary.trackedLimits ?? 0) || 0,
    communicationReady: Number(summary.communicationReady ?? 0) || 0,
    incompleteOuts: Number(incompleteOuts) || 0,
    inviteGaps: Number(handshake?.inviteGaps ?? 0) || 0,
    phases,
    limitCoveragePct: (() => {
      const accounts = Number(summary.accounts) || 0;
      const tracked = Number(summary.trackedLimits) || 0;
      if (!accounts) return 0;
      return Math.round((tracked / accounts) * 100);
    })(),
  };
}

/**
 * Unique phase labels from partners-ops (for filter chips).
 * @param {{ partners?: Array<{ phase?: string, phaseConceptId?: string, phaseColor?: object }> } | null | undefined} ops
 */
export function listPartnerPhases(ops) {
  const seen = new Map();
  for (const p of ops?.partners || []) {
    const phase = String(p.phase || '').trim();
    if (!phase || seen.has(phase)) continue;
    seen.set(phase, {
      phase,
      conceptId: p.phaseConceptId || `partner.phase.${phase}`,
      color: p.phaseColor,
      count: 0,
    });
  }
  for (const p of ops?.partners || []) {
    const phase = String(p.phase || '').trim();
    if (seen.has(phase)) seen.get(phase).count += 1;
  }
  return [...seen.values()];
}

/**
 * CSS width for a 0–100 coverage bar.
 * @param {number | null | undefined} pct
 */
export function coverageBarStyle(pct) {
  const n = Math.max(0, Math.min(100, Number(pct) || 0));
  const tone = n >= 80 ? 'ok' : n >= 40 ? 'warn' : 'bad';
  return { width: `${n}%`, tone, pct: n };
}
