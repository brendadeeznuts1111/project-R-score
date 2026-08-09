/**
 * Partners board pure helpers — dashboard-native tables + thin legacy ops helpers (no DOM).
 * Primary render path uses partners-dashboard.v1 fields directly.
 * @see docs/harness/tenants/partner-domain-map.md
 * @see public/registry/partners-dashboard.json
 * @see public/registry/partners-ops.json
 */

/** Canonical single-artifact ref (must match package consumer contract). */
export const PARTNERS_DASHBOARD_ARTIFACT_REF = '/registry/partners-dashboard.json';

/** Active artifact schema for primary board load. */
export const PARTNERS_DASHBOARD_SCHEMA_V1 = 'factorywager.partners-dashboard.v1';
/** Active schema after legacy-ops connector retirement. */
export const PARTNERS_DASHBOARD_SCHEMA_V2 = 'factorywager.partners-dashboard.v2';

/**
 * Optional ancillary registry refs loaded *after* the canonical dashboard via
 * fetchJsonResult (never loadJson primary — keeps single-artifact contract).
 */
export const PARTNERS_ANCILLARY_SOFT_ACCOUNTING_REF = '/registry/soft-accounting-export.json';
export const PARTNERS_ANCILLARY_SEAT_CAPITAL_REF = '/registry/seat-capital-desk.json';

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
 * Legacy multi-fetch comparison is retired — always false.
 * @param {string | URL} _input
 * @returns {boolean}
 */
export function isLegacyPartnerComparisonRequested(_input) {
  return false;
}

/**
 * @param {unknown} schema
 * @returns {boolean}
 */
export function isPartnersDashboardSchema(schema) {
  return schema === PARTNERS_DASHBOARD_SCHEMA_V2 || schema === PARTNERS_DASHBOARD_SCHEMA_V1;
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

// ── Dashboard-native helpers (primary board path) ──────────────────────────

/**
 * Format MoneyAmount { currency, minorUnits } as major units for display.
 * @param {{ currency?: string, minorUnits?: number } | null | undefined} amount
 * @returns {string | null} null when absent
 */
export function formatMoneyAmount(amount) {
  if (!amount || typeof amount !== 'object') return null;
  const minor = amount.minorUnits;
  if (typeof minor !== 'number' || !Number.isFinite(minor)) return null;
  return minor / 100;
}

/**
 * Sum partner-scoped balance positions (kind=partner) in minor units.
 * @param {object | null | undefined} partner
 * @returns {number | null}
 */
export function partnerScopedBalanceMinor(partner) {
  const positions = partner?.accounting?.balancePositions;
  if (!Array.isArray(positions) || !positions.length) return null;
  let total = 0;
  let hit = false;
  for (const pos of positions) {
    if (pos?.accountScope?.kind !== 'partner') continue;
    const m = pos?.amount?.minorUnits;
    if (typeof m !== 'number' || !Number.isFinite(m)) continue;
    total += m;
    hit = true;
  }
  return hit ? total : null;
}

/**
 * Out-scoped balance map: outId → minorUnits (latest position).
 * @param {object | null | undefined} partner
 * @returns {Map<string, { minorUnits: number, currency: string, effectiveAt?: string }>}
 */
export function outScopedBalances(partner) {
  const map = new Map();
  for (const pos of partner?.accounting?.balancePositions || []) {
    if (pos?.accountScope?.kind !== 'out') continue;
    const outId = String(pos.accountScope.outId || '');
    if (!outId) continue;
    const m = pos?.amount?.minorUnits;
    if (typeof m !== 'number' || !Number.isFinite(m)) continue;
    map.set(outId, {
      minorUnits: m,
      currency: String(pos.amount?.currency || 'USD'),
      effectiveAt: pos.effectiveAt,
    });
  }
  return map;
}

/**
 * Index partners-dashboard partners by CODE.
 * @param {object | null | undefined} dashboard
 * @returns {Map<string, object>}
 */
export function indexDashboardByPartner(dashboard) {
  const map = new Map();
  for (const partner of dashboard?.partners || []) {
    const code = normalizePartnerCode(partner?.partnerCode);
    if (code) map.set(code, partner);
  }
  return map;
}

/**
 * Flatten outs from partners-dashboard for inventory tables.
 * Row shape matches filterPartnerOuts (status, incomplete, partnerCode, …).
 * @param {object | null | undefined} dashboard
 * @returns {object[]}
 */
export function flattenDashboardOuts(dashboard) {
  const active = new Set((dashboard?.activeOutIds || []).map(String));
  const rows = [];
  for (const partner of dashboard?.partners || []) {
    const code = normalizePartnerCode(partner?.partnerCode);
    const phase = String(partner?.operationalPhase || '—');
    for (const out of partner?.outs || []) {
      const status = String(out?.operationalStatus || 'unknown');
      const incomplete = status === 'unknown' || status === 'blocked' || status === 'deferred';
      const sportsbookId = String(out?.sportsbookId || '');
      const maxMinor = out?.observedMaxStake?.amount?.minorUnits;
      const maxBet =
        typeof maxMinor === 'number' && Number.isFinite(maxMinor) ? String(maxMinor / 100) : '—';
      rows.push({
        partnerCode: code,
        callSign: partner?.callSign || `${code}-001`,
        phase,
        phaseConceptId: `partner.phase.${phase}`,
        out: {
          id: out?.outId || '',
          outId: out?.outId || '',
          status,
          operationalStatus: status,
          fundingStatus: out?.fundingStatus || 'unknown',
          sportsbookId,
          providerConnectionStatus: out?.providerConnectionStatus,
          book: { name: sportsbookId || '—', slug: sportsbookId || '—', type: '—' },
          funding: { method: String(out?.fundingStatus || 'unknown') },
          credentials: { username: '—' },
          maxBet,
          note: active.has(String(out?.outId || '')) ? 'active capacity' : '',
          active: active.has(String(out?.outId || '')),
        },
        status,
        incomplete,
        bookName: sportsbookId || '—',
        bookType: '—',
        maxBet,
        method: String(out?.fundingStatus || 'unknown'),
        username: '—',
        fundingStatus: out?.fundingStatus || 'unknown',
        active: active.has(String(out?.outId || '')),
      });
    }
  }
  return rows;
}

/**
 * Aggregate stats from partners-dashboard.v1 only.
 * @param {object | null | undefined} dashboard
 */
export function summarizeDashboardDesk(dashboard) {
  const summary = dashboard?.summary || {};
  const partners = Array.isArray(dashboard?.partners) ? dashboard.partners : [];
  const outs = flattenDashboardOuts(dashboard);
  const readyOuts = outs.filter(o => String(o.status).toLowerCase() === 'ready').length;
  const deferredOuts = outs.filter(o => String(o.status).toLowerCase() === 'deferred').length;
  const incompleteOuts = outs.filter(o => o.incomplete).length;
  const communicationReady = partners.filter(p => p?.communication?.chatLinked).length;
  const phases = {};
  for (const p of partners) {
    const phase = String(p.operationalPhase || 'unknown');
    phases[phase] = (phases[phase] || 0) + 1;
  }
  const limitTracked = partners.reduce((n, p) => n + (Number(p?.limits?.tracked) || 0), 0);
  const limitMissing = partners.reduce((n, p) => n + (Number(p?.limits?.missing) || 0), 0);
  const limitDenom = limitTracked + limitMissing;
  const limitCoveragePct = limitDenom
    ? Math.round((limitTracked / limitDenom) * 100)
    : Math.round(
        (partners.reduce((n, p) => n + (Number(p?.limits?.coverageRatio) || 0), 0) /
          Math.max(partners.length, 1)) *
          100
      );
  return {
    partners: Number(summary.partnerCount) || partners.length,
    operatorReady: Number(summary.operatorReadyPartnerCount) || 0,
    accounts: Number(summary.registeredOutCount) || outs.length,
    outs: outs.length,
    readyOuts,
    deferredOuts,
    activeOuts: Number(summary.activeOutCount) || (dashboard?.activeOutIds || []).length,
    trackedLimits: limitTracked,
    communicationReady,
    incompleteOuts,
    inviteGaps: 0,
    attentionPartners: Number(summary.attentionPartnerCount) || 0,
    canonicalProfiles: Number(summary.canonicalProfileCount) || 0,
    balancePositionCount: Array.isArray(summary.balancePositions)
      ? summary.balancePositions.length
      : 0,
    phases,
    limitCoveragePct,
  };
}

/**
 * Unique operational phases from dashboard partners.
 * @param {object | null | undefined} dashboard
 */
export function listDashboardPhases(dashboard) {
  const seen = new Map();
  for (const p of dashboard?.partners || []) {
    const phase = String(p.operationalPhase || '').trim();
    if (!phase || seen.has(phase)) continue;
    seen.set(phase, {
      phase,
      conceptId: `partner.phase.${phase}`,
      color: undefined,
      count: 0,
    });
  }
  for (const p of dashboard?.partners || []) {
    const phase = String(p.operationalPhase || '').trim();
    if (seen.has(phase)) seen.get(phase).count += 1;
  }
  return [...seen.values()];
}

/**
 * Roster rows for the partners table from dashboard (no handshake projection required).
 * @param {object | null | undefined} dashboard
 * @returns {object[]}
 */
export function dashboardRosterRows(dashboard) {
  return (dashboard?.partners || []).map(partner => {
    const code = normalizePartnerCode(partner?.partnerCode);
    const comm = partner?.communication || {};
    const phase = String(partner?.operationalPhase || 'unknown');
    const balMinor = partnerScopedBalanceMinor(partner);
    return {
      partnerCode: code,
      callSign: partner?.callSign || `${code}-001`,
      phase,
      phaseConceptId: `partner.phase.${phase}`,
      lifecycleState: partner?.lifecycle?.state || '—',
      handshakeOk: Boolean(comm.chatLinked) || String(comm.handshakeStatus) === 'operator_ready',
      handshakeStatus: String(comm.handshakeStatus || 'unknown'),
      dmSeatStatus: comm.chatLinked ? 'linked' : 'none',
      membershipCell: comm.chatLinked ? 'linked' : '—',
      inviteLink: null,
      verifyPassed: null,
      verifyTotal: null,
      nextSteps: (partner?.attention || []).map(a => a.label).filter(Boolean),
      balanceMinor: balMinor,
      balanceMajor: balMinor == null ? null : balMinor / 100,
      outsCount: Array.isArray(partner?.outs) ? partner.outs.length : 0,
      limits: partner?.limits || { tracked: 0, missing: 0, coverageRatio: 0 },
      attention: Array.isArray(partner?.attention) ? partner.attention : [],
      partner,
    };
  });
}

/**
 * Recent ledger entries flattened across partners (newest first).
 * @param {object | null | undefined} dashboard
 * @param {number} [limit]
 * @returns {object[]}
 */
export function dashboardLedgerEventRows(dashboard, limit = 40) {
  const events = [];
  for (const partner of dashboard?.partners || []) {
    const code = normalizePartnerCode(partner?.partnerCode);
    for (const entry of partner?.accounting?.recentEntries || []) {
      const scope = entry?.accountScope || {};
      const scopeLabel =
        scope.kind === 'out'
          ? String(scope.outId || 'out')
          : scope.kind === 'rail'
            ? String(scope.railId || 'rail')
            : scope.kind === 'partner'
              ? 'partner'
              : '—';
      events.push({
        partnerCode: code,
        at: entry?.postedAt || '',
        code: entry?.entryType || '—',
        conceptId: `accounting.${entry?.entryType || 'entry'}`,
        amountMajor: formatMoneyAmount(entry?.amount),
        amount: entry?.amount,
        balanceAfter: entry?.balanceAfter,
        rail: scopeLabel,
        outId: scope.kind === 'out' ? scope.outId : undefined,
        note: entry?.proofRef || '',
        id: entry?.id,
      });
    }
  }
  events.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  return events.slice(0, limit);
}

/**
 * Accounting deals rollup per partner from dashboard.
 * @param {object | null | undefined} dashboard
 * @returns {object[]}
 */
export function dashboardAccountingDealsRows(dashboard) {
  return (dashboard?.partners || []).map(partner => {
    const code = normalizePartnerCode(partner?.partnerCode);
    const outs = Array.isArray(partner?.outs) ? partner.outs : [];
    const incompleteOuts = outs.filter(o => {
      const s = String(o?.operationalStatus || 'unknown');
      return s === 'unknown' || s === 'blocked' || s === 'deferred';
    }).length;
    const funded = outs.filter(o => String(o?.fundingStatus) === 'funded').length;
    const balMinor = partnerScopedBalanceMinor(partner);
    return {
      partnerCode: code,
      callSign: partner?.callSign || `${code}-001`,
      fundStatus: funded > 0 ? 'funded' : outs.length ? 'unfunded' : 'unknown',
      incompleteOuts,
      outsCount: outs.length,
      fundedOuts: funded,
      balanceMinor: balMinor,
      balanceMajor: balMinor == null ? null : balMinor / 100,
      entryCount: Array.isArray(partner?.accounting?.recentEntries)
        ? partner.accounting.recentEntries.length
        : 0,
      chatLinked: Boolean(partner?.communication?.chatLinked),
      attention: Array.isArray(partner?.attention) ? partner.attention : [],
    };
  });
}

/**
 * Unique sportsbook ids from dashboard outs (book registry cards).
 * @param {object | null | undefined} dashboard
 * @returns {{ id: string, name: string }[]}
 */
export function dashboardBookCards(dashboard) {
  const seen = new Map();
  for (const partner of dashboard?.partners || []) {
    for (const out of partner?.outs || []) {
      const id = String(out?.sportsbookId || '').trim();
      if (!id || seen.has(id)) continue;
      seen.set(id, { id, name: id, typeConceptId: 'scrape.book' });
    }
  }
  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Canonical CODE coverage from dashboard summary + partner list.
 * @param {object | null | undefined} dashboard
 */
export function dashboardProfileCoverage(dashboard) {
  const partnerCodes = [
    ...new Set(
      (dashboard?.partners || [])
        .map(p => normalizePartnerCode(p?.partnerCode))
        .filter(code => /^[A-Z]{3,6}$/.test(code))
    ),
  ].sort();
  const canonical = Number(dashboard?.summary?.canonicalProfileCount) || 0;
  // When identity.profileSourceSystemId is canonical, treat CODE as covered
  const coveredCodes = partnerCodes.filter(code => {
    const p = (dashboard?.partners || []).find(
      row => normalizePartnerCode(row?.partnerCode) === code
    );
    return String(p?.identity?.profileSourceSystemId || '') === 'factorywager-partner-profile';
  });
  // Prefer identity-based coverage; fall back to summary count if identity missing
  const covered =
    coveredCodes.length > 0
      ? coveredCodes
      : partnerCodes.slice(0, Math.min(canonical, partnerCodes.length));
  const coveredSet = new Set(covered);
  const missingCodes = partnerCodes.filter(code => !coveredSet.has(code));
  return { partnerCodes, coveredCodes: [...coveredSet].sort(), missingCodes };
}

// ── Optional Soft / seat ancillary projections (secondary fetch only) ─────

/**
 * ISO week start (UTC Monday) from a placedAt timestamp.
 * @param {unknown} placedAt
 * @returns {string | null}
 */
export function softWeekStartIsoFromPlacedAt(placedAt) {
  const ms = Date.parse(String(placedAt || ''));
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  const day = d.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dayNum = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dayNum}`;
}

/**
 * Index Soft plays by partner CODE.
 * @param {object | null | undefined} softExport
 * @returns {Map<string, object[]>}
 */
export function indexSoftPlaysByPartner(softExport) {
  const map = new Map();
  for (const play of softExport?.plays || []) {
    const code = normalizePartnerCode(play?.partnerCode);
    if (!code) continue;
    const bucket = map.get(code);
    if (bucket) bucket.push(play);
    else map.set(code, [play]);
  }
  return map;
}

/**
 * Soft week rollups: prefer export.weeks, else derive from plays.
 * @param {object | null | undefined} softExport
 * @returns {object[]}
 */
export function softWeekRowsFromExport(softExport) {
  const weeks = Array.isArray(softExport?.weeks) ? softExport.weeks : [];
  if (weeks.length) {
    return weeks
      .map(w => ({
        weekStart: w.weekStart || w.week || '—',
        partnerCode: normalizePartnerCode(w.partnerCode),
        deposits: Number(w.deposits) || 0,
        settlements: Number(w.settlements) || 0,
        net: Number(w.net) || 0,
      }))
      .filter(w => w.partnerCode)
      .sort(
        (a, b) =>
          String(b.weekStart).localeCompare(String(a.weekStart)) ||
          a.partnerCode.localeCompare(b.partnerCode)
      );
  }
  const byKey = new Map();
  for (const play of softExport?.plays || []) {
    const partnerCode = normalizePartnerCode(play?.partnerCode);
    const weekStart = softWeekStartIsoFromPlacedAt(play?.placedAt);
    if (!partnerCode || !weekStart) continue;
    const key = `${partnerCode}|${weekStart}`;
    let row = byKey.get(key);
    if (!row) {
      row = { weekStart, partnerCode, deposits: 0, settlements: 0, net: 0 };
      byKey.set(key, row);
    }
    const stake = typeof play.stake === 'number' && Number.isFinite(play.stake) ? play.stake : 0;
    const pnl = typeof play.pnl === 'number' && Number.isFinite(play.pnl) ? play.pnl : 0;
    row.deposits += stake;
    if (play.result !== 'pending') row.settlements += Math.abs(pnl);
    row.net += pnl;
  }
  return [...byKey.values()].sort(
    (a, b) =>
      String(b.weekStart).localeCompare(String(a.weekStart)) ||
      a.partnerCode.localeCompare(b.partnerCode)
  );
}

/**
 * Soft book-type rollups from export.byBookType.
 * @param {object | null | undefined} softExport
 * @returns {object[]}
 */
export function softBookTypeRowsFromExport(softExport) {
  const rows = Array.isArray(softExport?.byBookType) ? softExport.byBookType : [];
  return rows
    .map(b => ({
      partnerCode: normalizePartnerCode(b.partnerCode),
      bookType: String(b.bookType || '—'),
      deposits: Number(b.deposits) || 0,
      settlements: Number(b.settlements) || 0,
      net: Number(b.net) || 0,
    }))
    .filter(b => b.partnerCode)
    .sort(
      (a, b) =>
        a.partnerCode.localeCompare(b.partnerCode) || a.bookType.localeCompare(b.bookType)
    );
}

/**
 * Normalize seat-capital-desk artifact for deposits / partner messages.
 * @param {object | null | undefined} seat
 */
export function normalizeSeatCapitalDesk(seat) {
  if (!seat || typeof seat !== 'object') {
    return {
      schema: null,
      generatedAt: null,
      rows: [],
      partnerViews: [],
      partnerMessageTemplates: [],
      desks: 0,
      source: 'missing',
    };
  }
  const rows = Array.isArray(seat.rows) ? seat.rows : [];
  return {
    schema: seat.schema || null,
    generatedAt: seat.generatedAt || null,
    rows,
    partnerViews: Array.isArray(seat.partnerViews) ? seat.partnerViews : [],
    partnerMessageTemplates: Array.isArray(seat.partnerMessageTemplates)
      ? seat.partnerMessageTemplates
      : [],
    desks: Number(seat.desks) || rows.length,
    source: 'seat-capital-desk',
  };
}

/**
 * Known attention reason codes → operator-facing family + short title.
 * Unknown codes fall back to family "other" with the raw reason as title.
 * @type {Readonly<Record<string, { family: string, title: string, actionLabel?: string }>>}
 */
export const ATTENTION_REASON_CATALOG = Object.freeze({
  'partner.limits.raise_observed': {
    family: 'limits',
    title: 'Limit raise observed',
    actionLabel: 'Open limits board',
  },
  'partner.limits.coverage_gap': {
    family: 'limits',
    title: 'Limit evidence gap',
    actionLabel: 'Open limits board',
  },
  'partner.bookmakers.unregistered_sportsbook': {
    family: 'bookmakers',
    title: 'Unregistered sportsbook',
    actionLabel: 'Open bookmakers board',
  },
  'partner.telegram.handshake_gap': {
    family: 'telegram',
    title: 'Telegram handshake gap',
    actionLabel: 'Telegram section',
  },
  'partner.profile.migration_required': {
    family: 'profile',
    title: 'Profile migration required',
    actionLabel: 'Run coverage bake',
  },
});

/**
 * @param {unknown} reasonCode
 * @returns {{ family: string, title: string, actionLabel: string | null }}
 */
export function attentionReasonMeta(reasonCode) {
  const code = String(reasonCode || '').trim();
  const hit = ATTENTION_REASON_CATALOG[code];
  if (hit) {
    return {
      family: hit.family,
      title: hit.title,
      actionLabel: hit.actionLabel || null,
    };
  }
  const family = code.startsWith('partner.limits.')
    ? 'limits'
    : code.startsWith('partner.bookmakers.')
      ? 'bookmakers'
      : code.startsWith('partner.telegram.')
        ? 'telegram'
        : code.startsWith('partner.profile.')
          ? 'profile'
          : 'other';
  return { family, title: code || '—', actionLabel: null };
}

/**
 * Friendly action control for attention rows.
 * @param {{ actionHref?: string | null, actionCommand?: string | null, reasonCode?: string }} row
 * @returns {{ kind: 'href' | 'command' | 'none', href?: string, command?: string, label: string }}
 */
export function attentionActionPresentation(row) {
  const meta = attentionReasonMeta(row?.reasonCode);
  if (row?.actionHref) {
    return {
      kind: 'href',
      href: String(row.actionHref),
      label: meta.actionLabel || String(row.actionHref),
    };
  }
  if (row?.actionCommand) {
    return {
      kind: 'command',
      command: String(row.actionCommand),
      label: meta.actionLabel || String(row.actionCommand),
    };
  }
  return { kind: 'none', label: '—' };
}

/**
 * Flatten partners[].attention into table rows (severity order: block > warn > info).
 * @param {object | null | undefined} dashboard
 * @returns {object[]}
 */
export function dashboardAttentionRows(dashboard) {
  const rank = { block: 0, warn: 1, info: 2 };
  const rows = [];
  for (const partner of dashboard?.partners || []) {
    const code = normalizePartnerCode(partner?.partnerCode);
    for (const item of partner?.attention || []) {
      const reasonCode = String(item?.reasonCode || '—');
      const meta = attentionReasonMeta(reasonCode);
      rows.push({
        partnerCode: code,
        callSign: partner?.callSign || `${code}-001`,
        severity: String(item?.severity || 'info'),
        reasonCode,
        family: meta.family,
        title: meta.title,
        label: String(item?.label || '—'),
        actionCommand: item?.actionCommand || null,
        actionHref: item?.actionHref || null,
      });
    }
  }
  return rows.sort((a, b) => {
    const bySev = (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
    if (bySev !== 0) return bySev;
    return (
      a.partnerCode.localeCompare(b.partnerCode) ||
      a.family.localeCompare(b.family) ||
      a.reasonCode.localeCompare(b.reasonCode) ||
      a.label.localeCompare(b.label)
    );
  });
}

/**
 * Count attention rows by family for filter chips.
 * @param {object[]} rows
 * @returns {{ family: string, count: number }[]}
 */
export function attentionFamilyCounts(rows) {
  const counts = new Map();
  for (const row of rows || []) {
    const family = String(row?.family || 'other');
    counts.set(family, (counts.get(family) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([family, count]) => ({ family, count }))
    .sort((a, b) => a.family.localeCompare(b.family));
}

/**
 * @param {object[]} rows
 * @param {string | null | undefined} family — null/all means no filter
 * @returns {object[]}
 */
export function filterAttentionRowsByFamily(rows, family) {
  const f = family == null || family === '' || family === 'all' ? null : String(family);
  if (!f) return Array.isArray(rows) ? [...rows] : [];
  return (rows || []).filter(row => row.family === f);
}

/**
 * Flatten artifact conflicts[] for the attention region.
 * @param {object | null | undefined} dashboard
 * @returns {object[]}
 */
export function dashboardConflictRows(dashboard) {
  const rows = Array.isArray(dashboard?.conflicts) ? dashboard.conflicts : [];
  return rows
    .map(c => ({
      partnerCode: normalizePartnerCode(c?.partnerCode),
      fieldPath: String(c?.fieldPath || '—'),
      adapterIds: Array.isArray(c?.adapterIds) ? c.adapterIds.map(String) : [],
      values: Array.isArray(c?.values) ? c.values : [],
    }))
    .filter(r => r.partnerCode)
    .sort(
      (a, b) =>
        a.partnerCode.localeCompare(b.partnerCode) || a.fieldPath.localeCompare(b.fieldPath)
    );
}

/**
 * Connector snapshot rows for integrations region.
 * @param {object | null | undefined} dashboard
 * @returns {object[]}
 */
export function dashboardConnectorRows(dashboard) {
  const snaps = dashboard?.connectorSnapshots || {};
  return Object.keys(snaps)
    .sort()
    .map(key => {
      const snap = snaps[key] || {};
      return {
        connector: key,
        dataStatus: String(snap.dataStatus || 'unavailable'),
        sourceMode: String(snap.sourceMode || '—'),
        observedAt: snap.observedAt || null,
        inputRef: String(snap.inputRef || '—'),
        reasonCode: snap.reasonCode || null,
      };
    });
}

/**
 * Per-partner integration freshness (tennis first).
 * @param {object | null | undefined} dashboard
 * @returns {object[]}
 */
export function dashboardPartnerIntegrationRows(dashboard) {
  return (dashboard?.partners || [])
    .map(partner => {
      const code = normalizePartnerCode(partner?.partnerCode);
      const tennis = partner?.integrations?.tennis;
      const st = partner?.integrations?.sportsTerminal;
      return {
        partnerCode: code,
        callSign: partner?.callSign || `${code}-001`,
        tennisStatus: tennis ? String(tennis.dataStatus || 'unavailable') : 'n/a',
        tennisObservedAt: tennis?.observedAt || null,
        sportsTerminalStatus: st ? String(st.dataStatus || 'unavailable') : 'n/a',
        sportsTerminalObservedAt: st?.observedAt || null,
      };
    })
    .sort((a, b) => a.partnerCode.localeCompare(b.partnerCode));
}

/**
 * Project soft-accounting-export into board caches.
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
