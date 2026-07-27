// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/http/server#reference — Server interface
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Mock / demo HTTP surface for MA/NJ state regulatory compliance.
 *
 * Routes (Bun.serve `routes` + fetch fallback for handler-only tests):
 *   GET  /ready
 *   GET  /health
 *   POST /api/compliance/check          — isBetAllowed (+ optional logViolation)
 *   GET  /api/compliance/status         — partner regulatory panel JSON
 *   POST /api/compliance/license        — upsert partner_state_licenses (demo)
 *   POST /api/compliance/identity       — stamp identity_verified metadata
 *
 * Demo seed partners:
 *   demo-ma-licensed  — active MA license, identity verified
 *   demo-nj-licensed  — active NJ license, identity verified
 *   demo-unlicensed   — no licenses
 */
import type { Database } from 'bun:sqlite';
import { asTreeNodeId, tryStateCode } from '../types/branded.ts';
import { openOperationsDb } from './db.ts';
import { bindPartnerProfile } from './partner-profile-bridge.ts';
import {
  ComplianceRepository,
  ensureStateRegulationSchema,
  getPartnerRegulatoryStatus,
  resolveGeoForNode,
  seedStateRegulations,
  setPartnerIdentityVerified,
  upsertPartnerGeoProfile,
  type BetComplianceResult,
} from './state-regulation.ts';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
} as const;

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export type MockComplianceSeedOpts = {
  /** Include demo partner nodes + MA/NJ licenses (default true). */
  demoPartners?: boolean;
};

/** In-memory ops DB with schema, MA/NJ seeds, and optional demo partners. */
export function createMockComplianceDb(opts?: MockComplianceSeedOpts): Database {
  const db = openOperationsDb({ path: ':memory:' });
  ensureStateRegulationSchema(db);
  seedStateRegulations(db);
  if (opts?.demoPartners !== false) {
    seedDemoCompliancePartners(db);
  }
  return db;
}

/** Demo tree nodes + licenses for local mock traffic. */
export function seedDemoCompliancePartners(db: Database): void {
  const now = new Date().toISOString();
  const partners: Array<{
    id: string; // brand-ok — demo fixture node
    name: string;
    licenses: Array<'MA' | 'NJ'>;
    identity: boolean;
  }> = [
    { id: 'demo-ma-licensed', name: 'MA Licensed Partner', licenses: ['MA'], identity: true },
    { id: 'demo-nj-licensed', name: 'NJ Licensed Partner', licenses: ['NJ'], identity: true },
    { id: 'demo-dual-licensed', name: 'MA+NJ Partner', licenses: ['MA', 'NJ'], identity: true },
    { id: 'demo-unlicensed', name: 'Unlicensed Partner', licenses: [], identity: false },
  ];

  const compliance = new ComplianceRepository(db);
  const geoByPartner: Record<
    string,
    { state: string; age: number; location: string; zip: string }
  > = {
    'demo-ma-licensed': {
      state: 'MA',
      age: 28,
      location: 'Boston',
      zip: '02108',
    },
    'demo-nj-licensed': {
      state: 'NJ',
      age: 32,
      location: 'Atlantic City',
      zip: '08401',
    },
    'demo-dual-licensed': {
      state: 'MA',
      age: 40,
      location: 'Cambridge',
      zip: '02139',
    },
    'demo-unlicensed': {
      state: 'MA',
      age: 22,
      location: 'Worcester',
      zip: '01608',
    },
  };

  for (const p of partners) {
    db.run(
      `INSERT OR IGNORE INTO tree_nodes
         (id, type, parent_id, expert_id, name, active, status, created_at)
       VALUES ($id, 'partner', NULL, NULL, $name, 1, 'active', $now)`,
      { $id: p.id, $name: p.name, $now: now }
    );
    bindPartnerProfile(db, asTreeNodeId(p.id));
    for (const st of p.licenses) {
      compliance.upsertLicense(p.id, st, {
        licenseNumber: `DEMO-${st}-${p.id}`,
        status: 'active',
      });
    }
    if (p.identity) {
      setPartnerIdentityVerified(db, p.id, true);
    }
    const g = geoByPartner[p.id];
    if (g) {
      // Four discrete columns — state, age, location, zip (never concatenated).
      upsertPartnerGeoProfile(db, p.id, {
        stateCode: g.state,
        age: g.age,
        location: g.location,
        zipCode: g.zip,
      });
    }
  }
}

export type ComplianceCheckBody = {
  nodeId: string; // brand-ok — wire tree node
  stateCode: string;
  sportId: string; // brand-ok — catalog/wire sport
  marketId: string; // brand-ok — catalog/wire market
  wagerAmount: number;
  betType?: string;
  playId?: string; // brand-ok
  /** Discrete age (years) — not packed into location. */
  age?: number;
  /** Locality/city only. */
  location?: string;
  /** Discrete US ZIP / ZIP+4. */
  zipCode?: string;
  /** When true (default), write regulatory_violations on block. */
  logViolation?: boolean;
};

export type ComplianceCheckOk = {
  allowed: true;
  nodeId: string; // brand-ok
  stateCode: string;
  sportId: string; // brand-ok
  marketId: string; // brand-ok
  wagerAmount: number;
  betType: string;
  age: number | null;
  location: string | null;
  zipCode: string | null;
  /** Present when ?shadow=true (or body.shadow) — always HTTP 200. */
  shadow?: true;
};

export type ComplianceCheckDenied = {
  allowed: false;
  error: string;
  reason: string;
  nodeId: string; // brand-ok
  stateCode: string;
  age: number | null;
  location: string | null;
  zipCode: string | null;
  /** Present when shadow — decision still deny, HTTP 200 (not blocked). */
  shadow?: true;
};

export type ComplianceCheckResponse = ComplianceCheckOk | ComplianceCheckDenied;

/** True when `?shadow=true` or body.shadow is set. */
export function isShadowComplianceRequest(req: Request, body?: { shadow?: boolean }): boolean {
  if (body?.shadow === true) return true;
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('shadow');
    return q === 'true' || q === '1';
  } catch {
    return false;
  }
}

/**
 * POST /api/compliance/check — validate a wager against MA/NJ rules.
 *
 * Shadow mode (`?shadow=true` or body.shadow):
 *   - Always HTTP 200
 *   - Never writes regulatory_violations
 *   - Body still carries allowed/reason for side-by-side comparison
 */
export async function handleComplianceCheck(db: Database, req: Request): Promise<Response> {
  let body: ComplianceCheckBody & { shadow?: boolean };
  try {
    body = (await req.json()) as ComplianceCheckBody & { shadow?: boolean };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (
    !body.nodeId?.trim() ||
    !body.stateCode?.trim() ||
    !body.sportId?.trim() ||
    !body.marketId?.trim() ||
    body.wagerAmount == null ||
    !Number.isFinite(Number(body.wagerAmount))
  ) {
    return json(
      {
        error: 'nodeId, stateCode, sportId, marketId, wagerAmount (number) required',
      },
      400
    );
  }

  const state = tryStateCode(body.stateCode);
  if (!state) {
    return json(
      { error: `Invalid stateCode '${body.stateCode}' (expect 2-letter, e.g. MA, NJ)` },
      400
    );
  }

  const shadow = isShadowComplianceRequest(req, body);
  const betType = body.betType?.trim() || 'straight';
  const wagerAmount = Number(body.wagerAmount);
  const age = body.age != null ? Number(body.age) : undefined;
  const location = body.location?.trim() || undefined;
  const zipCode = body.zipCode?.trim() || undefined;
  const compliance = new ComplianceRepository(db);
  // Shadow never mutates audit log; real path logs unless logViolation: false
  const logViolation = !shadow && body.logViolation !== false;

  const checkInput = {
    nodeId: body.nodeId,
    stateCode: state,
    sportId: body.sportId,
    marketId: body.marketId,
    wagerAmount,
    betType,
    age,
    location,
    zipCode,
    playId: body.playId,
  };

  let result: BetComplianceResult;
  if (logViolation) {
    result = compliance.checkAndRecord(checkInput);
  } else {
    result = compliance.isBetAllowed(checkInput);
  }

  // Echo resolved geo from profile when request omitted fields
  const geo = resolveGeoForNode(db, body.nodeId, checkInput);

  if (!result.allowed) {
    const denied: ComplianceCheckDenied = {
      allowed: false,
      error: result.reason,
      reason: result.reason,
      nodeId: body.nodeId,
      stateCode: state,
      age: geo.age,
      location: geo.location,
      zipCode: geo.zipCode,
      ...(shadow ? { shadow: true as const } : {}),
    };
    // Shadow: surface the deny decision without blocking (HTTP 200)
    return json(denied, shadow ? 200 : 403);
  }

  const ok: ComplianceCheckOk = {
    allowed: true,
    nodeId: body.nodeId,
    stateCode: state,
    sportId: body.sportId,
    marketId: body.marketId,
    wagerAmount,
    betType,
    age: geo.age,
    location: geo.location,
    zipCode: geo.zipCode,
    ...(shadow ? { shadow: true as const } : {}),
  };
  return json(ok, 200);
}

/**
 * GET /api/compliance/status?nodeId=&state=
 */
export function handleComplianceStatus(db: Database, req: Request): Response {
  const url = new URL(req.url);
  const nodeId = url.searchParams.get('nodeId')?.trim();
  const stateRaw =
    url.searchParams.get('state')?.trim() ?? url.searchParams.get('stateCode')?.trim();
  if (!nodeId || !stateRaw) {
    return json({ error: 'query nodeId and state (or stateCode) required' }, 400);
  }
  const state = tryStateCode(stateRaw);
  if (!state) {
    return json({ error: `Invalid state '${stateRaw}'` }, 400);
  }
  const sport = url.searchParams.get('sport') ?? undefined;
  const market = url.searchParams.get('market') ?? undefined;
  const status = getPartnerRegulatoryStatus(db, nodeId, state, { sport, market });
  return json({ ok: true, regulatory: status }, 200);
}

/**
 * POST /api/compliance/license — { nodeId, stateCode, licenseNumber?, status? }
 */
export async function handleComplianceLicense(db: Database, req: Request): Promise<Response> {
  let body: {
    nodeId?: string; // brand-ok — wire body; minted via asTreeNodeId
    stateCode?: string;
    licenseNumber?: string;
    status?: 'active' | 'suspended' | 'revoked';
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!body.nodeId?.trim() || !body.stateCode?.trim()) {
    return json({ error: 'nodeId and stateCode required' }, 400);
  }
  const state = tryStateCode(body.stateCode);
  if (!state) {
    return json({ error: `Invalid stateCode '${body.stateCode}'` }, 400);
  }

  // Ensure tree node exists for FK
  const now = new Date().toISOString();
  db.run(
    `INSERT OR IGNORE INTO tree_nodes
       (id, type, parent_id, expert_id, name, active, status, created_at)
     VALUES ($id, 'partner', NULL, NULL, $name, 1, 'active', $now)`,
    { $id: body.nodeId, $name: body.nodeId, $now: now }
  );
  bindPartnerProfile(db, asTreeNodeId(body.nodeId));

  new ComplianceRepository(db).upsertLicense(body.nodeId, state, {
    licenseNumber: body.licenseNumber,
    status: body.status ?? 'active',
  });
  return json(
    {
      ok: true,
      nodeId: body.nodeId,
      stateCode: state,
      status: body.status ?? 'active',
    },
    200
  );
}

/**
 * POST /api/compliance/identity — { nodeId, verified: boolean }
 */
export async function handleComplianceIdentity(db: Database, req: Request): Promise<Response> {
  let body: { nodeId?: string; verified?: boolean }; // brand-ok — wire body nodeId
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!body.nodeId?.trim() || typeof body.verified !== 'boolean') {
    return json({ error: 'nodeId and verified (boolean) required' }, 400);
  }
  const now = new Date().toISOString();
  db.run(
    `INSERT OR IGNORE INTO tree_nodes
       (id, type, parent_id, expert_id, name, active, status, created_at)
     VALUES ($id, 'partner', NULL, NULL, $name, 1, 'active', $now)`,
    { $id: body.nodeId, $name: body.nodeId, $now: now }
  );
  bindPartnerProfile(db, asTreeNodeId(body.nodeId));
  setPartnerIdentityVerified(db, body.nodeId, body.verified);
  return json({ ok: true, nodeId: body.nodeId, verified: body.verified }, 200);
}

/** Bun.serve routes map for the mock compliance server. */
export function createStateComplianceRoutes(db: Database) {
  return {
    '/ready': new Response('ok', { headers: { 'Cache-Control': 'no-store' } }),
    '/health': {
      GET: () =>
        json({
          ok: true,
          service: 'state-compliance-mock',
          states: ['MA', 'NJ'],
        }),
      HEAD: () => new Response(null, { status: 200 }),
    },
    '/api/compliance/check': {
      POST: (req: Request) => handleComplianceCheck(db, req),
    },
    '/api/compliance/status': {
      GET: (req: Request) => handleComplianceStatus(db, req),
    },
    '/api/compliance/license': {
      POST: (req: Request) => handleComplianceLicense(db, req),
    },
    '/api/compliance/identity': {
      POST: (req: Request) => handleComplianceIdentity(db, req),
    },
  };
}

/**
 * Fetch fallback (and unit-test path without TCP).
 * Method routes only fire on Bun.serve TCP — tests use this handler.
 */
export function createStateComplianceFetchHandler(
  db: Database
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'no-store',
        },
      });
    }

    if (path === '/ready' && (req.method === 'GET' || req.method === 'HEAD')) {
      return req.method === 'HEAD'
        ? new Response(null, { status: 200 })
        : new Response('ok', { headers: { 'Cache-Control': 'no-store' } });
    }

    if (path === '/health' && (req.method === 'GET' || req.method === 'HEAD')) {
      if (req.method === 'HEAD') return new Response(null, { status: 200 });
      return json({ ok: true, service: 'state-compliance-mock', states: ['MA', 'NJ'] });
    }

    if (path === '/api/compliance/check' && req.method === 'POST') {
      return handleComplianceCheck(db, req);
    }
    if (path === '/api/compliance/status' && req.method === 'GET') {
      return handleComplianceStatus(db, req);
    }
    if (path === '/api/compliance/license' && req.method === 'POST') {
      return handleComplianceLicense(db, req);
    }
    if (path === '/api/compliance/identity' && req.method === 'POST') {
      return handleComplianceIdentity(db, req);
    }

    return json({ error: 'Not found' }, 404);
  };
}

export type StartStateComplianceMockOpts = {
  port?: number;
  hostname?: string;
  db?: Database;
  /** When true, log listen URL (default true for CLI). */
  log?: boolean;
};

/** Start Bun.serve mock — caller owns stop(). */
export function startStateComplianceMock(opts?: StartStateComplianceMockOpts) {
  const db = opts?.db ?? createMockComplianceDb();
  const fetchHandler = createStateComplianceFetchHandler(db);
  const server = Bun.serve({
    port: opts?.port ?? 0,
    hostname: opts?.hostname ?? '127.0.0.1',
    development: true,
    routes: createStateComplianceRoutes(db),
    // fetch required for server.fetch() + as fallback
    fetch: fetchHandler,
  });
  if (opts?.log !== false) {
    console.info(`[state-compliance-mock] listening ${server.url.href}`);
    console.info(
      '  POST /api/compliance/check  GET /api/compliance/status  POST /api/compliance/license'
    );
  }
  return { server, db, url: server.url.href, fetch: fetchHandler };
}

// ── HTTP client (for live mock / stdin demos) ─────────────────────

export type ComplianceClientOpts = {
  /** Base URL ending with or without slash (default COMPLIANCE_MOCK_URL or http://127.0.0.1:8787). */
  baseUrl?: string;
  /** Optional AbortSignal for timeout control. */
  signal?: AbortSignal;
};

function resolveComplianceBase(opts?: ComplianceClientOpts): string {
  const raw =
    opts?.baseUrl?.trim() || Bun.env.COMPLIANCE_MOCK_URL?.trim() || 'http://127.0.0.1:8787';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

/**
 * Thin client for the mock compliance HTTP surface.
 *
 * ```ts
 * const client = new ComplianceClient({ baseUrl: 'http://127.0.0.1:8787' });
 * const status = await client.getStatus('demo-ma-licensed', 'MA');
 * ```
 *
 * Pipe-friendly with `bun --console-depth=6 run -` for deep inspection.
 */
export class ComplianceClient {
  readonly baseUrl: string;
  private signal?: AbortSignal;

  constructor(opts?: ComplianceClientOpts) {
    this.baseUrl = resolveComplianceBase(opts);
    this.signal = opts?.signal;
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      signal: init?.signal ?? this.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  }

  async health(): Promise<{ ok: boolean; service?: string; states?: string[] }> {
    const res = await this.request('/health');
    if (!res.ok) throw new Error(`compliance health HTTP ${res.status}`);
    return (await res.json()) as { ok: boolean; service?: string; states?: string[] };
  }

  async getStatus(
    nodeId: string, // brand-ok — wire tree node id from CLI/demo clients
    state?: string
  ): Promise<unknown> {
    const q = new URLSearchParams({ nodeId });
    if (state) q.set('state', state);
    const res = await this.request(`/api/compliance/status?${q}`);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`compliance status HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }

  /**
   * Real or shadow compliance check.
   * @param shadow when true, appends `?shadow=true` (always HTTP 200, no violation log)
   */
  async check(
    body: ComplianceCheckBody,
    opts?: { shadow?: boolean }
  ): Promise<ComplianceCheckResponse> {
    const path = opts?.shadow ? '/api/compliance/check?shadow=true' : '/api/compliance/check';
    const res = await this.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    // Real deny = 403; shadow deny = 200 with allowed:false
    if (res.status !== 200 && res.status !== 403) {
      const text = await res.text();
      throw new Error(`compliance check HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    return (await res.json()) as ComplianceCheckResponse;
  }
}
