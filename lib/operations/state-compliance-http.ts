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
  seedStateRegulations,
  setPartnerIdentityVerified,
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
};

export type ComplianceCheckDenied = {
  allowed: false;
  error: string;
  reason: string;
  nodeId: string; // brand-ok
  stateCode: string;
};

/**
 * POST /api/compliance/check — validate a wager against MA/NJ rules.
 */
export async function handleComplianceCheck(db: Database, req: Request): Promise<Response> {
  let body: ComplianceCheckBody;
  try {
    body = (await req.json()) as ComplianceCheckBody;
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

  const betType = body.betType?.trim() || 'straight';
  const wagerAmount = Number(body.wagerAmount);
  const compliance = new ComplianceRepository(db);
  const logViolation = body.logViolation !== false;

  let result: BetComplianceResult;
  if (logViolation) {
    result = compliance.checkAndRecord({
      nodeId: body.nodeId,
      stateCode: state,
      sportId: body.sportId,
      marketId: body.marketId,
      wagerAmount,
      betType,
      playId: body.playId,
    });
  } else {
    result = compliance.isBetAllowed({
      nodeId: body.nodeId,
      stateCode: state,
      sportId: body.sportId,
      marketId: body.marketId,
      wagerAmount,
      betType,
    });
  }

  if (!result.allowed) {
    const denied: ComplianceCheckDenied = {
      allowed: false,
      error: result.reason,
      reason: result.reason,
      nodeId: body.nodeId,
      stateCode: state,
    };
    return json(denied, 403);
  }

  const ok: ComplianceCheckOk = {
    allowed: true,
    nodeId: body.nodeId,
    stateCode: state,
    sportId: body.sportId,
    marketId: body.marketId,
    wagerAmount,
    betType,
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
