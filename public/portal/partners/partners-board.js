/**
 * Partners board pure helpers — canonical dashboard projection + legacy ops helpers (no DOM).
 * @see docs/harness/tenants/partner-domain-map.md
 * @see public/registry/partners-dashboard.json
 * @see public/registry/partners-ops.json
 */

/** Canonical single-artifact ref (must match package consumer contract). */
export const PARTNERS_DASHBOARD_ARTIFACT_REF = '/registry/partners-dashboard.json';

/** Active artifact schema for primary board load. */
export const PARTNERS_DASHBOARD_SCHEMA_V1 = 'factorywager.partners-dashboard.v1';

/** Query-only legacy multi-fetch inventory (diagnostic; never render fallback). */
export const PARTNERS_LEGACY_COMPARISON_REQUIRED_REFS = Object.freeze([
  '/registry/telegram-handshake.json',
  '/registry/seat-capital-desk.json',
  '/registry/telegram-handshake-catalog.json',
  '/registry/scrape-wire-taxonomy.json',
  '/registry/partners-ops.json',
  '/registry/partner-profiles.json',
  '/registry/limit-raises.json',
]);

export const PARTNERS_LEGACY_COMPARISON_OPTIONAL_REFS = Object.freeze([
  '/registry/soft-accounting-export.json',
]);

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
 * Query-only opt-in for legacy multi-fetch diagnostic.
 * Partner hash routes never activate comparison.
 * @param {string | URL} input
 * @returns {boolean}
 */
export function isLegacyPartnerComparisonRequested(input) {
  try {
    const url = input instanceof URL ? input : new URL(String(input), 'https://partners.invalid');
    const values = url.searchParams.getAll('compare');
    return values.length === 1 && values[0] === 'legacy';
  } catch {
    return false;
  }
}

/**
 * @param {unknown} schema
 * @returns {boolean}
 */
export function isPartnersDashboardSchema(schema) {
  return schema === PARTNERS_DASHBOARD_SCHEMA_V1;
}

/**
 * Project partners-dashboard.v1 → ops-shaped view for existing board renderers.
 * Thin compatibility projection — not a second source of truth.
 * @param {object | null | undefined} dashboard
 */
export function projectDashboardToOpsShape(dashboard) {
  const partners = Array.isArray(dashboard?.partners) ? dashboard.partners : [];
  const summary = dashboard?.summary || {};
  let incompleteOuts = 0;
  const projected = partners.map(partner => {
    const code = normalizePartnerCode(partner?.partnerCode);
    const outs = Array.isArray(partner?.outs)
      ? partner.outs.map(out => {
          const status = String(out?.operationalStatus || 'unknown');
          const incomplete = status === 'unknown' || status === 'blocked';
          if (incomplete) incompleteOuts += 1;
          const sportsbookId = String(out?.sportsbookId || '');
          const maxBet =
            out?.observedMaxStake?.amount?.minorUnits != null
              ? String(Number(out.observedMaxStake.amount.minorUnits) / 100)
              : '—';
          return {
            id: out?.outId || '',
            status,
            incomplete,
            maxBet,
            book: {
              name: sportsbookId || '—',
              slug: sportsbookId || '—',
              type: '—',
            },
            funding: { method: String(out?.fundingStatus || 'unknown') },
            credentials: { username: '—' },
          };
        })
      : [];
    return {
      code,
      callSign: partner?.callSign || `${code}-001`,
      phase: partner?.operationalPhase || 'incomplete',
      phaseConceptId: `partner.phase.${partner?.operationalPhase || 'incomplete'}`,
      outs,
      tracking: {},
      accounting: {
        balance: null,
        initialCapital: null,
        ledgerRows: Array.isArray(partner?.accounting?.recentEntries)
          ? partner.accounting.recentEntries
          : [],
        outs: [],
      },
      attention: Array.isArray(partner?.attention) ? partner.attention : [],
      limits: partner?.limits || { tracked: 0, missing: 0, coverageRatio: 0 },
      communication: partner?.communication || {},
    };
  });
  return {
    schema: dashboard?.schema || PARTNERS_DASHBOARD_SCHEMA_V1,
    generatedAt: dashboard?.generatedAt || null,
    summary: {
      partners: Number(summary.partnerCount) || projected.length,
      accounts: Number(summary.registeredOutCount) || 0,
      readyAccounts: Number(summary.operatorReadyPartnerCount) || 0,
      incompleteOuts,
      trackedLimits: 0,
      communicationReady: projected.filter(p => p.communication?.chatLinked).length,
    },
    partners: projected,
    validation: { ok: true },
    colors: {},
    glossary: { conceptIds: [] },
    source: 'partners-dashboard',
  };
}

/**
 * Project partners-dashboard.v1 → handshake-shaped rows for board stats/tables.
 * @param {object | null | undefined} dashboard
 */
export function projectDashboardToHandshakeShape(dashboard) {
  const partners = Array.isArray(dashboard?.partners) ? dashboard.partners : [];
  const rows = partners.map(partner => {
    const code = normalizePartnerCode(partner?.partnerCode);
    const comm = partner?.communication || {};
    const phase = String(comm.handshakeStatus || partner?.operationalPhase || 'unknown');
    return {
      partnerCode: code,
      callSign: partner?.callSign || `${code}-001`,
      phase,
      handshakeOk: Boolean(comm.chatLinked) || phase === 'operator_ready',
      dmSeatStatus: comm.chatLinked ? 'linked' : 'none',
      gapCount: 0,
      topGap: null,
      nextSteps: [],
      membership: '—',
      invite: '—',
      bot: '—',
    };
  });
  return {
    schema: 'factorywager.telegram-handshake.projected.v1',
    generatedAt: dashboard?.generatedAt || null,
    operatorReady: Number(dashboard?.summary?.operatorReadyPartnerCount) || 0,
    inviteGaps: 0,
    partners: rows.length,
    rows,
    source: 'partners-dashboard',
  };
}

/**
 * Summarize connector snapshot health for the board meta strip.
 * @param {object | null | undefined} dashboard
 */
export function summarizeConnectorSnapshots(dashboard) {
  const snaps = dashboard?.connectorSnapshots || {};
  const keys = Object.keys(snaps);
  let ok = 0;
  let stale = 0;
  let unavailable = 0;
  for (const key of keys) {
    const status = String(snaps[key]?.dataStatus || 'unavailable');
    if (status === 'ok') ok += 1;
    else if (status === 'stale') stale += 1;
    else unavailable += 1;
  }
  return { total: keys.length, ok, stale, unavailable };
}

/**
 * Human bake label for meta chips (extracted from board controller).
 * @param {string | null | undefined} iso
 * @param {string} [source]
 * @returns {{ text: string, tone: string }}
 */
export function bakeLabel(iso, source = '') {
  if (!iso) return { text: '—', tone: '' };
  const t = Date.parse(iso);
  if (!Number.isFinite(t) || t <= 0) {
    return {
      text: source ? `fixture · ${source}` : 'fixture / unset',
      tone: 'warn',
    };
  }
  if (t < Date.parse('1980-01-01T00:00:00.000Z')) {
    return {
      text: source ? `fixture · ${source}` : 'fixture (epoch bake)',
      tone: 'warn',
    };
  }
  const ageMs = Date.now() - t;
  const ageHours = ageMs / 3_600_000;
  const text = new Date(t)
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, 'Z');
  if (ageHours > 72) return { text: `${text} · stale`, tone: 'warn' };
  if (ageHours > 24) return { text, tone: 'warn' };
  return { text, tone: 'ok' };
}

/**
 * Index partners-ops partners by code.
 * @param {{ partners: { code: string }[] } | null | undefined} ops
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
 * @param {{ partners: object[] } | null | undefined} ops
 * @returns {object[]}
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
 * @param {object[]} outs
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
 * @param {object | null | undefined} ops
 * @param {object | null | undefined} handshake
 */
export function summarizePartnerDesk(ops, handshake) {
  const summary = ops?.summary || {};
  const partners =
    summary.partners ??
    handshake?.partners ??
    (Array.isArray(handshake?.rows) ? handshake.rows.length : 0);
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
 * Measure canonical profile coverage by exact partner CODE, never by aggregate
 * profile count. Unrelated or stale profiles must not satisfy readiness.
 * @param {object | null | undefined} ops
 * @param {object | null | undefined} handshake
 * @param {object | null | undefined} partnerProfiles
 */
export function canonicalProfileCoverage(ops, handshake, partnerProfiles) {
  const rows =
    Array.isArray(ops?.partners) && ops.partners.length
      ? ops.partners
      : Array.isArray(handshake?.rows)
        ? handshake.rows
        : [];
  const partnerCodes = [
    ...new Set(
      rows
        .map(row =>
          normalizePartnerCode(
            row?.code || row?.partnerCode || String(row?.callSign || '').split('-', 1)[0]
          )
        )
        .filter(code => /^[A-Z]{3,6}$/.test(code))
    ),
  ].sort();
  const profileCodes = new Set(
    Object.keys(partnerProfiles?.profiles || {})
      .map(normalizePartnerCode)
      .filter(code => /^[A-Z]{3,6}$/.test(code))
  );
  const coveredCodes = partnerCodes.filter(code => profileCodes.has(code));
  const missingCodes = partnerCodes.filter(code => !profileCodes.has(code));
  return { partnerCodes, coveredCodes, missingCodes };
}

/**
 * Separate legacy board availability from canonical profile readiness.
 * A populated partners-ops bake must never claim the canonical MVP is ready
 * while required profiles are missing.
 * @param {{ partnerCount?: number, canonicalProfileCount?: number, incompleteOuts?: number, inviteGaps?: number }} input
 */
export function partnerReadinessGate(input = {}) {
  const partnerCount = Math.max(0, Number(input.partnerCount) || 0);
  const canonicalProfileCount = Math.max(0, Number(input.canonicalProfileCount) || 0);
  const gaps =
    Math.max(0, Number(input.incompleteOuts) || 0) + Math.max(0, Number(input.inviteGaps) || 0);
  const hasPartners = partnerCount > 0;
  const profilesReady = hasPartners && canonicalProfileCount >= partnerCount;
  const ok = hasPartners && profilesReady && gaps === 0;

  if (!hasPartners) {
    return { tone: 'fail', label: 'unavailable', ok, profilesReady, gaps };
  }
  if (!profilesReady) {
    return {
      tone: 'warn',
      label: `legacy ${gaps > 0 ? 'gaps' : 'ready'} · profiles ${canonicalProfileCount}/${partnerCount}`,
      ok,
      profilesReady,
      gaps,
    };
  }
  if (gaps > 0) return { tone: 'warn', label: 'gaps', ok, profilesReady, gaps };
  return { tone: 'pass', label: 'ready', ok, profilesReady, gaps };
}

/**
 * Unique phase labels from partners-ops (for filter chips).
 * @param {{ partners: object[] } | null | undefined} ops
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
