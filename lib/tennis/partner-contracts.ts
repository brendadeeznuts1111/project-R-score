// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Public-safe Tennis HQ partner contracts join.
 *
 * Live: GET /api/v1/partners/capacity + /api/v1/accounting/finance (bearer).
 * Offline: partners-ops + telegram-handshake bake join (no secrets).
 *
 * Never stores tokens or book passwords — outs/capacity counts only.
 */
import { TENNIS_HQ_RUNTIME_URL } from './agent-auth.ts';

export const TENNIS_PARTNER_CONTRACTS_KIND = 'tennis-partner-contracts' as const;
export const TENNIS_PARTNER_CONTRACTS_PATH = '/registry/tennis/partner-contracts.json' as const;
export const TENNIS_PARTNER_CONTRACTS_SCHEMA_VERSION = 1 as const;

export type TennisPartnerContractSource = 'live' | 'offline-join' | 'empty';

export type TennisPartnerOutSummary = {
  outId: string; // brand-ok — producer out id wire
  partnerCode: string; // brand-ok — partner CODE
  callSign: string;
  status: string;
  bookId: string | null; // brand-ok — book id wire
  verticalKey: string | null;
  secretsConfigured: boolean | null;
  /** Cents when known from live capacity. */
  perBetMaxCents: number | null;
};

export type TennisPartnerContractRow = {
  partnerCode: string; // brand-ok
  callSign: string;
  phase: string | null;
  activeOuts: number;
  totalOuts: number;
  totalPerBetMaxCents: number | null;
  ledgerRowCount: number | null;
  balanceDeltaCents: number | null;
  colorHex: string | null;
  /** Factory handshake bake when joined offline or cross-checked. */
  handshakeOk: boolean | null;
  factoryPhase: string | null;
  fundStatus: string | null;
  incompleteOuts: number | null;
  partnersHref: string;
  accountingHref: string;
  telegramAccountingHref: string;
  outs: TennisPartnerOutSummary[];
};

export type TennisPartnerContractsArtifact = {
  schemaVersion: typeof TENNIS_PARTNER_CONTRACTS_SCHEMA_VERSION;
  kind: typeof TENNIS_PARTNER_CONTRACTS_KIND;
  path: typeof TENNIS_PARTNER_CONTRACTS_PATH;
  generatedAt: string;
  source: TennisPartnerContractSource;
  runtimeUrl: typeof TENNIS_HQ_RUNTIME_URL;
  contractPaths: {
    partnersCapacity: string;
    accountingFinance: string;
  };
  summary: {
    partnerCount: number;
    activeOuts: number;
    totalOuts: number;
    operatorReady: number;
    handshakeOk: number | null;
  };
  partners: TennisPartnerContractRow[];
  notes: string[];
};

/** Wire parse — partner CODE from Tennis / partners-ops payloads. */
function parsePartnerCodeWire(raw: unknown): string | null {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase();
  return /^[A-Z]{3,6}$/.test(s) ? s : null;
}

/** Wire parse — finite integer cents / counts. */
function parseFiniteIntWire(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function portalHrefs(
  code: string
): Pick<TennisPartnerContractRow, 'partnersHref' | 'accountingHref' | 'telegramAccountingHref'> {
  return {
    partnersHref: `/portal/partners/#partner/${code}`,
    accountingHref: `/portal/partners/#partner/${code}/accounting`,
    telegramAccountingHref: `/portal/partners/#partner/${code}/telegram/accounting`,
  };
}

function emptyArtifact(
  generatedAt: string,
  source: TennisPartnerContractSource,
  notes: string[]
): TennisPartnerContractsArtifact {
  return {
    schemaVersion: TENNIS_PARTNER_CONTRACTS_SCHEMA_VERSION,
    kind: TENNIS_PARTNER_CONTRACTS_KIND,
    path: TENNIS_PARTNER_CONTRACTS_PATH,
    generatedAt,
    source,
    runtimeUrl: TENNIS_HQ_RUNTIME_URL,
    contractPaths: {
      partnersCapacity: `${TENNIS_HQ_RUNTIME_URL}/api/v1/partners/capacity`,
      accountingFinance: `${TENNIS_HQ_RUNTIME_URL}/api/v1/accounting/finance`,
    },
    summary: {
      partnerCount: 0,
      activeOuts: 0,
      totalOuts: 0,
      operatorReady: 0,
      handshakeOk: source === 'offline-join' ? 0 : null,
    },
    partners: [],
    notes,
  };
}

function summarize(
  partners: TennisPartnerContractRow[]
): TennisPartnerContractsArtifact['summary'] {
  let activeOuts = 0;
  let totalOuts = 0;
  let operatorReady = 0;
  let handshakeOk = 0;
  let handshakeKnown = 0;
  for (const p of partners) {
    activeOuts += p.activeOuts;
    totalOuts += p.totalOuts;
    const phase = `${p.phase ?? p.factoryPhase ?? ''}`.toLowerCase();
    if (phase.includes('operator_ready') || phase === 'operator_ready') operatorReady += 1;
    if (p.handshakeOk != null) {
      handshakeKnown += 1;
      if (p.handshakeOk) handshakeOk += 1;
    }
  }
  return {
    partnerCount: partners.length,
    activeOuts,
    totalOuts,
    operatorReady,
    handshakeOk: handshakeKnown > 0 ? handshakeOk : null,
  };
}

/**
 * Build artifact from live Tennis HQ v1 wire payloads (already authorized).
 * Wire is `unknown` at the boundary — fields are parsed, not trusted as domain types.
 */
export function buildPartnerContractsFromLive(input: {
  capacity: unknown;
  finance: unknown;
  generatedAt?: string;
}): TennisPartnerContractsArtifact {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const notes: string[] = ['Live Tennis HQ v1 partners/capacity + accounting/finance'];

  const byCode = new Map<string, TennisPartnerContractRow>();

  const capacity = input.capacity as {
    ok?: boolean;
    report?: { verticals?: unknown[] };
  } | null;
  const verticals = Array.isArray(capacity?.report?.verticals) ? capacity!.report!.verticals! : [];

  for (const vert of verticals) {
    if (!vert || typeof vert !== 'object') continue;
    const v = vert as Record<string, unknown>;
    const verticalKey = typeof v.executionVerticalKey === 'string' ? v.executionVerticalKey : null;
    const outs = Array.isArray(v.outs) ? v.outs : [];
    for (const raw of outs) {
      if (!raw || typeof raw !== 'object') continue;
      const o = raw as Record<string, unknown>;
      const code = parsePartnerCodeWire(o.partnerCode);
      if (!code) continue;
      const callSign =
        typeof o.callSign === 'string' && o.callSign.trim() ? o.callSign.trim() : `${code}-001`;
      const out: TennisPartnerOutSummary = {
        outId: typeof o.outId === 'string' ? o.outId : `out-${code}`,
        partnerCode: code,
        callSign,
        status: typeof o.status === 'string' ? o.status : 'unknown',
        bookId: typeof o.bookId === 'string' ? o.bookId : null,
        verticalKey,
        secretsConfigured: typeof o.secretsConfigured === 'boolean' ? o.secretsConfigured : null,
        perBetMaxCents: parseFiniteIntWire(o.perBetMaxCents ?? o.per_bet_max_cents),
      };
      let row = byCode.get(code);
      if (!row) {
        row = {
          partnerCode: code,
          callSign,
          phase: null,
          activeOuts: 0,
          totalOuts: 0,
          totalPerBetMaxCents: 0,
          ledgerRowCount: null,
          balanceDeltaCents: null,
          colorHex: null,
          handshakeOk: null,
          factoryPhase: null,
          fundStatus: null,
          incompleteOuts: null,
          ...portalHrefs(code),
          outs: [],
        };
        byCode.set(code, row);
      }
      row.outs.push(out);
      row.totalOuts += 1;
      if (out.status === 'active') row.activeOuts += 1;
      if (out.perBetMaxCents != null) {
        row.totalPerBetMaxCents = (row.totalPerBetMaxCents ?? 0) + out.perBetMaxCents;
      }
    }
  }

  const finance = input.finance as { ok?: boolean; reports?: unknown[] } | null;
  const reports = Array.isArray(finance?.reports) ? finance!.reports! : [];
  for (const raw of reports) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const code = parsePartnerCodeWire(r.partnerCode);
    if (!code) continue;
    const callSign =
      typeof r.callSign === 'string' && r.callSign.trim() ? r.callSign.trim() : `${code}-001`;
    let row = byCode.get(code);
    if (!row) {
      row = {
        partnerCode: code,
        callSign,
        phase: null,
        activeOuts: 0,
        totalOuts: 0,
        totalPerBetMaxCents: null,
        ledgerRowCount: null,
        balanceDeltaCents: null,
        colorHex: null,
        handshakeOk: null,
        factoryPhase: null,
        fundStatus: null,
        incompleteOuts: null,
        ...portalHrefs(code),
        outs: [],
      };
      byCode.set(code, row);
    }
    row.callSign = callSign;
    if (typeof r.phase === 'string') row.phase = r.phase;
    if (typeof r.colorHex === 'string') row.colorHex = r.colorHex;
    const ledger =
      r.ledger && typeof r.ledger === 'object' ? (r.ledger as Record<string, unknown>) : null;
    if (ledger) {
      row.ledgerRowCount = parseFiniteIntWire(ledger.rowCount);
      row.balanceDeltaCents = parseFiniteIntWire(ledger.balanceDeltaCents);
    }
    const cap =
      r.capacity && typeof r.capacity === 'object' ? (r.capacity as Record<string, unknown>) : null;
    if (cap) {
      const active = parseFiniteIntWire(cap.activeOuts);
      if (active != null && active > row.activeOuts) row.activeOuts = active;
      const perBet = parseFiniteIntWire(cap.totalPerBetMaxCents);
      if (perBet != null) row.totalPerBetMaxCents = perBet;
    }
  }

  const partners = [...byCode.values()].sort((a, b) => a.partnerCode.localeCompare(b.partnerCode));
  if (partners.length === 0) {
    return emptyArtifact(generatedAt, 'empty', [...notes, 'Live payloads had no partner rows']);
  }

  return {
    schemaVersion: TENNIS_PARTNER_CONTRACTS_SCHEMA_VERSION,
    kind: TENNIS_PARTNER_CONTRACTS_KIND,
    path: TENNIS_PARTNER_CONTRACTS_PATH,
    generatedAt,
    source: 'live',
    runtimeUrl: TENNIS_HQ_RUNTIME_URL,
    contractPaths: {
      partnersCapacity: `${TENNIS_HQ_RUNTIME_URL}/api/v1/partners/capacity`,
      accountingFinance: `${TENNIS_HQ_RUNTIME_URL}/api/v1/accounting/finance`,
    },
    summary: summarize(partners),
    partners,
    notes,
  };
}

/**
 * Offline join: Factory partners-ops + telegram-handshake (no Tennis token).
 */
export function buildPartnerContractsFromOfflineJoin(input: {
  partnersOps: unknown;
  handshake: unknown;
  generatedAt?: string;
}): TennisPartnerContractsArtifact {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const notes: string[] = [
    'Offline join from partners-ops.json + telegram-handshake.json (no PARTNER_API_TOKEN)',
  ];

  const ops = input.partnersOps as { partners?: unknown[] } | null;
  const opsPartners = Array.isArray(ops?.partners) ? ops!.partners! : [];

  const hs = input.handshake as { partners?: unknown[]; rows?: unknown[] } | null;
  const hsList = Array.isArray(hs?.partners)
    ? hs!.partners!
    : Array.isArray(hs?.rows)
      ? hs!.rows!
      : [];
  const hsByCode = new Map<string, Record<string, unknown>>();
  for (const raw of hsList) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const code = parsePartnerCodeWire(r.partnerCode ?? r.code);
    if (code) hsByCode.set(code, r);
  }

  const partners: TennisPartnerContractRow[] = [];
  for (const raw of opsPartners) {
    if (!raw || typeof raw !== 'object') continue;
    const p = raw as Record<string, unknown>;
    const code = parsePartnerCodeWire(p.code ?? p.partnerCode);
    if (!code) continue;
    const callSign =
      typeof p.callSign === 'string' && p.callSign.trim() ? p.callSign.trim() : `${code}-001`;
    const outsRaw = Array.isArray(p.outs) ? p.outs : [];
    const outs: TennisPartnerOutSummary[] = [];
    let activeOuts = 0;
    for (let i = 0; i < outsRaw.length; i++) {
      const o = outsRaw[i];
      if (!o || typeof o !== 'object') continue;
      const row = o as Record<string, unknown>;
      const status = typeof row.status === 'string' ? row.status : 'unknown';
      if (status === 'ready' || status === 'active' || status === 'funded') activeOuts += 1;
      outs.push({
        outId: typeof row.id === 'string' ? row.id : `out-${code}-${i + 1}`,
        partnerCode: code,
        callSign,
        status,
        bookId:
          typeof row.bookId === 'string'
            ? row.bookId
            : typeof row.book === 'string'
              ? row.book
              : null,
        verticalKey: null,
        secretsConfigured: null,
        perBetMaxCents: parseFiniteIntWire(row.maxBetCents ?? row.perBetMaxCents),
      });
    }
    const accounting =
      p.accounting && typeof p.accounting === 'object'
        ? (p.accounting as Record<string, unknown>)
        : null;
    const hsRow = hsByCode.get(code);
    const handshakeOk = hsRow && typeof hsRow.handshakeOk === 'boolean' ? hsRow.handshakeOk : null;
    partners.push({
      partnerCode: code,
      callSign,
      phase: typeof p.phase === 'string' ? p.phase : null,
      activeOuts,
      totalOuts: outs.length,
      totalPerBetMaxCents: outs.reduce((s, o) => s + (o.perBetMaxCents ?? 0), 0) || null,
      ledgerRowCount: Array.isArray(accounting?.ledger) ? accounting!.ledger!.length : null,
      balanceDeltaCents: null,
      colorHex: typeof p.phaseColor === 'string' ? p.phaseColor : null,
      handshakeOk,
      factoryPhase: typeof p.phase === 'string' ? p.phase : null,
      fundStatus: typeof accounting?.fundStatus === 'string' ? accounting.fundStatus : null,
      incompleteOuts: parseFiniteIntWire(accounting?.incompleteOuts),
      ...portalHrefs(code),
      outs,
    });
  }

  partners.sort((a, b) => a.partnerCode.localeCompare(b.partnerCode));
  if (partners.length === 0) {
    return emptyArtifact(generatedAt, 'empty', [...notes, 'No partners in partners-ops bake']);
  }

  return {
    schemaVersion: TENNIS_PARTNER_CONTRACTS_SCHEMA_VERSION,
    kind: TENNIS_PARTNER_CONTRACTS_KIND,
    path: TENNIS_PARTNER_CONTRACTS_PATH,
    generatedAt,
    source: 'offline-join',
    runtimeUrl: TENNIS_HQ_RUNTIME_URL,
    contractPaths: {
      partnersCapacity: `${TENNIS_HQ_RUNTIME_URL}/api/v1/partners/capacity`,
      accountingFinance: `${TENNIS_HQ_RUNTIME_URL}/api/v1/accounting/finance`,
    },
    summary: summarize(partners),
    partners,
    notes,
  };
}

/**
 * Enrich live rows with Factory handshake / fund status when offline bakes available.
 */
export function mergeFactoryDeskHints(
  live: TennisPartnerContractsArtifact,
  offline: TennisPartnerContractsArtifact
): TennisPartnerContractsArtifact {
  const byCode = new Map(offline.partners.map(p => [p.partnerCode, p]));
  const partners = live.partners.map(row => {
    const hint = byCode.get(row.partnerCode);
    if (!hint) return row;
    return {
      ...row,
      handshakeOk: hint.handshakeOk ?? row.handshakeOk,
      factoryPhase: hint.factoryPhase ?? hint.phase ?? row.factoryPhase,
      fundStatus: hint.fundStatus ?? row.fundStatus,
      incompleteOuts: hint.incompleteOuts ?? row.incompleteOuts,
    };
  });
  return {
    ...live,
    partners,
    summary: summarize(partners),
    notes: [...live.notes, 'Enriched with Factory handshake + fundStatus from partners-ops join'],
  };
}
