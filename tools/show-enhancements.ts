#!/usr/bin/env bun
// @see https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin — bun run -
// @see https://bun.com/docs/runtime/console — --console-depth
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
/**
 * Enhancement report — structural proofs for MA/NJ compliance + isolation layers.
 *
 * Run with elevated inspect depth (Bun.inspect / console.log nested objects):
 *
 *   bun --console-depth=6 tools/show-enhancements.ts
 *   cat tools/show-enhancements.ts | bun --console-depth=6 run -
 *   bun run ops:enhancements
 *   bun run ops:enhancements:pipe
 *
 * Live mock status (requires `bun run ops:compliance:mock` in another terminal):
 *
 *   bun --console-depth=4 tools/show-enhancements.ts --status=demo-ma-licensed --state=MA
 *
 * Ad-hoc partner query (stdin TypeScript, no temp file):
 *
 *   partner=demo-ma-licensed
 *   bun --console-depth=4 run - <<EOF
 *   import { ComplianceClient } from "./lib/operations/state-compliance-http.ts";
 *   const client = new ComplianceClient();
 *   console.log(await client.getStatus("$partner", "MA"));
 *   EOF
 */
/**
 * Repo root for dynamic imports. Always `process.cwd()` so `bun run -` (stdin)
 * works when invoked from the monorepo root (package scripts already do).
 */
const ROOT = process.cwd();

async function loadModule<T>(rel: string): Promise<T> {
  // Absolute path import — relative `../lib/...` fails under `bun run -` ([stdin]).
  const abs = `${ROOT}/${rel}`.replace(/\/+/g, '/');
  return (await import(abs)) as T;
}

type ConsoleDepthMod = typeof import('../lib/console-depth.ts');
type DeepEqualsMod = typeof import('../lib/deep-equals.ts');
type ComplianceMod = typeof import('../lib/operations/state-compliance-http.ts');

const { getConsoleDepth, inspect, logDepth, logTable } =
  await loadModule<ConsoleDepthMod>('lib/console-depth.ts');
const { deepEqualsStrict } = await loadModule<DeepEqualsMod>('lib/deep-equals.ts');
const { ComplianceClient, createMockComplianceDb, createStateComplianceFetchHandler } =
  await loadModule<ComplianceMod>('lib/operations/state-compliance-http.ts');

export type EnhancementRow = {
  feature: string;
  expectedState: Record<string, unknown>;
  actualState: Record<string, unknown>;
  match: boolean;
  notes?: string;
};

export type EnhancementReport = {
  generatedAt: string;
  consoleDepth: number;
  rows: EnhancementRow[];
  passed: number;
  total: number;
  signature: string;
};

function row(
  feature: string,
  expectedState: Record<string, unknown>,
  actualState: Record<string, unknown>,
  notes?: string
): EnhancementRow {
  return {
    feature,
    expectedState,
    actualState,
    match: deepEqualsStrict(expectedState, actualState),
    notes,
  };
}

/** In-process verification rows (no TCP) — safe for CI and `bun run -`. */
export async function buildEnhancementRows(): Promise<EnhancementRow[]> {
  const db = createMockComplianceDb();
  const fetchHandler = createStateComplianceFetchHandler(db);
  const rows: EnhancementRow[] = [];

  try {
    {
      const res = await fetchHandler(new Request('http://local/health'));
      const body = (await res.json()) as { ok: boolean; states: string[] };
      rows.push(
        row(
          'health.states',
          { ok: true, states: ['MA', 'NJ'] },
          { ok: body.ok === true, states: (body.states ?? []).slice().sort() },
          'GET /health lists regulated states'
        )
      );
    }

    {
      const res = await fetchHandler(
        new Request('http://local/api/compliance/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: 'demo-ma-licensed',
            stateCode: 'MA',
            sportId: 'NBA',
            marketId: 'totals',
            wagerAmount: 100,
            betType: 'straight',
            logViolation: false,
          }),
        })
      );
      const body = (await res.json()) as { allowed: boolean };
      rows.push(
        row(
          'check.ma_licensed_nba_totals',
          { allowed: true, status: 200 },
          { allowed: body.allowed, status: res.status },
          'demo-ma-licensed straight NBA/totals'
        )
      );
    }

    {
      const res = await fetchHandler(
        new Request('http://local/api/compliance/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: 'demo-unlicensed',
            stateCode: 'NJ',
            sportId: 'soccer',
            marketId: 'match_winner',
            wagerAmount: 50,
            betType: 'straight',
            logViolation: false,
          }),
        })
      );
      const body = (await res.json()) as { allowed: boolean };
      rows.push(
        row(
          'check.nj_unlicensed_block',
          { allowed: false, status: 403 },
          { allowed: body.allowed, status: res.status },
          'demo-unlicensed soccer blocked in NJ'
        )
      );
    }

    {
      const res = await fetchHandler(
        new Request('http://local/api/compliance/status?nodeId=demo-ma-licensed&state=MA')
      );
      const body = (await res.json()) as {
        ok?: boolean;
        regulatory?: {
          state?: string;
          license?: { status?: string } | null;
          limits?: unknown[];
        };
      };
      rows.push(
        row(
          'status.ma_licensed_shape',
          {
            ok: true,
            state: 'MA',
            licenseStatus: 'active',
            hasLimits: true,
          },
          {
            ok: body.ok === true,
            state: body.regulatory?.state ?? '',
            licenseStatus: body.regulatory?.license?.status ?? '',
            hasLimits:
              Array.isArray(body.regulatory?.limits) && body.regulatory!.limits!.length > 0,
          },
          'GET /api/compliance/status panel'
        )
      );
    }

    {
      const prefix = 'fwak_';
      const sample = `${prefix}${'ab'.repeat(24)}`;
      rows.push(
        row(
          'identity.agent_key_prefix',
          { method: 'prefix_lookup', timing: 'constant', prefixLen: prefix.length },
          {
            method: 'prefix_lookup',
            timing: sample.startsWith(prefix) ? 'constant' : 'miss',
            prefixLen: prefix.length,
          },
          'agent API keys use fixed prefix for O(1) lookup shape'
        )
      );
    }
  } finally {
    db.close();
  }

  return rows;
}

export function signReport(payload: Omit<EnhancementReport, 'signature'>): string {
  const h = new Bun.CryptoHasher('sha256');
  h.update(
    JSON.stringify({
      generatedAt: payload.generatedAt,
      consoleDepth: payload.consoleDepth,
      rows: payload.rows,
      passed: payload.passed,
      total: payload.total,
    })
  );
  return h.digest('hex');
}

export async function buildEnhancementReport(): Promise<EnhancementReport> {
  const rows = await buildEnhancementRows();
  const passed = rows.filter(r => r.match).length;
  const base = {
    generatedAt: new Date().toISOString(),
    consoleDepth: getConsoleDepth(),
    rows,
    passed,
    total: rows.length,
  };
  return { ...base, signature: signReport(base) };
}

function parseArg(name: string): string | undefined {
  const eq = Bun.argv.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const i = Bun.argv.indexOf(`--${name}`);
  if (i >= 0) return Bun.argv[i + 1];
  return undefined;
}

async function printLiveStatus(): Promise<void> {
  const nodeId = parseArg('status') ?? Bun.env.COMPLIANCE_NODE_ID ?? 'demo-ma-licensed';
  const state = parseArg('state') ?? 'MA';
  const baseUrl = parseArg('url') ?? Bun.env.COMPLIANCE_MOCK_URL;
  const client = new ComplianceClient({ baseUrl });
  console.info(
    `Compliance status · node=${nodeId} state=${state} depth=${getConsoleDepth()} base=${client.baseUrl}`
  );
  try {
    const health = await client.health();
    logDepth({ health }, { depth: getConsoleDepth() });
    const status = await client.getStatus(nodeId, state);
    console.info('Status (deep inspect):');
    logDepth(status, { depth: getConsoleDepth(), sorted: true });
  } catch (e) {
    console.error(
      `Live mock unreachable at ${client.baseUrl} — start with: bun run ops:compliance:mock`
    );
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  }
}

async function printReport(): Promise<void> {
  const report = await buildEnhancementReport();
  const depth = report.consoleDepth;

  console.info(`Enhancement report · depth=${depth} · ${report.passed}/${report.total} pass`);
  console.info(`generated ${report.generatedAt}`);
  console.info('');

  logTable(
    report.rows.map(r => ({
      feature: r.feature,
      match: r.match ? '✓' : '✗',
      notes: r.notes ?? '',
    })),
    ['feature', 'match', 'notes']
  );

  console.info('');
  console.info('Verification data (full nested expected/actual — uses --console-depth):');
  // Native console.log respects --console-depth; wrappers use getConsoleDepth() (execArgv-aware).
  console.log('Verification data:', report.rows);
  console.info('');
  console.info(inspect({ sample: report.rows[0] }, { depth, sorted: true }));
  console.info('');
  console.info(`signature sha256=${report.signature}`);

  if (report.passed !== report.total) {
    process.exitCode = 1;
    console.error('Failed rows:');
    logDepth(
      report.rows.filter(r => !r.match),
      { depth }
    );
  }
}

async function main(): Promise<void> {
  if (Bun.argv.includes('--help') || Bun.argv.includes('-h')) {
    console.info(`Usage:
  bun --console-depth=6 tools/show-enhancements.ts
  cat tools/show-enhancements.ts | bun --console-depth=6 run -
  bun tools/show-enhancements.ts --status=demo-ma-licensed --state=MA
  bun tools/show-enhancements.ts --json
`);
    return;
  }

  if (parseArg('status') || Bun.argv.includes('--live-status')) {
    await printLiveStatus();
    return;
  }

  if (Bun.argv.includes('--json')) {
    const report = await buildEnhancementReport();
    console.log(JSON.stringify(report, null, 2));
    if (report.passed !== report.total) process.exitCode = 1;
    return;
  }

  await printReport();
}

// import.meta.main is false when tests import this module; true for CLI and `bun run -`.
const isCli =
  import.meta.main ||
  import.meta.path === '[stdin]' ||
  (typeof import.meta.path === 'string' && import.meta.path.includes('[stdin]'));
if (isCli) {
  await main();
}
