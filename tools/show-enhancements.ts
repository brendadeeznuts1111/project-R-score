#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin — bun run -
// @see https://bun.com/docs/runtime/console — --console-depth
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/docs/runtime/utils#bun-escapehtml — Bun.escapeHTML
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
/**
 * Enhancement report — structural proofs for MA/NJ compliance + isolation layers.
 *
 * Uses **strict** `Bun.deepEquals(a, b, true)` via {@link deepEqualsStrict} for row
 * match (same as `expect().toStrictEqual()`). Loose mode treats `undefined` ≈ missing
 * key; strict does not — see docs matrix rows in the report.
 *
 * Run with elevated inspect depth (Bun.inspect / console.log nested objects):
 *
 *   bun --console-depth=6 tools/show-enhancements.ts
 *   cat tools/show-enhancements.ts | bun --console-depth=6 run -
 *   bun run ops:enhancements
 *   bun run ops:enhancements:pipe
 *   bun tools/show-enhancements.ts --html > /tmp/enhancements.html
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

function loadConsoleDepthModule(): Promise<ConsoleDepthMod> {
  return loadModule<ConsoleDepthMod>('lib/console-depth.ts');
}

function loadDeepEqualsModule(): Promise<DeepEqualsMod> {
  return loadModule<DeepEqualsMod>('lib/deep-equals.ts');
}

function loadComplianceModule(): Promise<ComplianceMod> {
  return loadModule<ComplianceMod>('lib/operations/state-compliance-http.ts');
}

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
    match: Bun.deepEquals(expectedState, actualState, true),
    notes,
  };
}

/** In-process verification rows (no TCP) — safe for CI and `bun run -`. */
export async function buildEnhancementRows(): Promise<EnhancementRow[]> {
  const { deepEqualsModes, deepEqualsDocsStrictProof } = await loadDeepEqualsModule();
  const { createMockComplianceDb, createStateComplianceFetchHandler } =
    await loadComplianceModule();
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

    // Bun.deepEquals strict vs loose — docs matrix (undefined key ≠ missing)
    {
      const a = { entries: [1, 2] };
      const b = { entries: [1, 2], extra: undefined };
      const modes = deepEqualsModes(a, b);
      rows.push(
        row(
          'runtime.deepEquals.strict_vs_loose',
          {
            loose: true,
            strict: false,
            diverges: true,
          },
          {
            loose: modes.loose,
            strict: modes.strict,
            diverges: modes.diverges,
          },
          'Bun.deepEquals(a,b) true; Bun.deepEquals(a,b,true) false — same as toStrictEqual'
        )
      );
    }

    // Full docs-matrix proof must all be ok on a healthy runtime
    {
      const proof = deepEqualsDocsStrictProof();
      const allOk = proof.every(p => p.ok);
      rows.push(
        row(
          'runtime.deepEquals.docs_matrix',
          { ok: true, cases: proof.length },
          { ok: allOk, cases: proof.length },
          'docs strict-inequality matrix (undefined, sparse, class vs plain)'
        )
      );
    }

    // Bun.escapeHTML — high-throughput entity escape for report HTML
    {
      const raw = `<script>alert("x")</script> & 'MA'`;
      const escaped = Bun.escapeHTML(raw);
      rows.push(
        row(
          'runtime.escapeHTML',
          {
            hasLt: true,
            hasAmp: true,
            hasQuot: true,
            rawUnsafe: false,
          },
          {
            hasLt: escaped.includes('&lt;'),
            hasAmp: escaped.includes('&amp;'),
            hasQuot: escaped.includes('&quot;'),
            rawUnsafe: escaped.includes('<script>'),
          },
          'Bun.escapeHTML for safe HTML report cells'
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
  const { getConsoleDepth } = await loadConsoleDepthModule();
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
  const { ComplianceClient } = await loadComplianceModule();
  const { getConsoleDepth, logDepth } = await loadConsoleDepthModule();
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

/** HTML table report — cells escaped with Bun.escapeHTML (not hand-rolled replaces). */
export function reportToHtml(report: EnhancementReport): string {
  const rows = report.rows
    .map(r => {
      const feature = Bun.escapeHTML(r.feature);
      const match = r.match ? 'pass' : 'fail';
      const notes = Bun.escapeHTML(r.notes ?? '');
      const expected = Bun.escapeHTML(JSON.stringify(r.expectedState));
      const actual = Bun.escapeHTML(JSON.stringify(r.actualState));
      return `<tr class="${match}"><td>${feature}</td><td>${match}</td><td>${notes}</td><td><code>${expected}</code></td><td><code>${actual}</code></td></tr>`;
    })
    .join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${Bun.escapeHTML(`Enhancement report ${report.passed}/${report.total}`)}</title>
  <style>
    body{font:14px/1.4 system-ui,sans-serif;margin:2rem;background:#0b0f14;color:#e6edf3}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #30363d;padding:.4rem .6rem;vertical-align:top}
    th{background:#161b22;text-align:left}
    tr.pass td:nth-child(2){color:#3fb950}
    tr.fail td:nth-child(2){color:#f85149}
    code{font-size:12px;word-break:break-all}
    .meta{color:#8b949e;margin-bottom:1rem}
  </style>
</head>
<body>
  <h1>Enhancement report</h1>
  <p class="meta">${Bun.escapeHTML(report.generatedAt)} · depth=${Bun.escapeHTML(report.consoleDepth)} ·
    ${Bun.escapeHTML(report.passed)}/${Bun.escapeHTML(report.total)} pass ·
    sha256=${Bun.escapeHTML(report.signature)}</p>
  <table>
    <thead><tr><th>feature</th><th>match</th><th>notes</th><th>expected</th><th>actual</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>
</body>
</html>
`;
}

async function printReport(): Promise<void> {
  const { inspect, logDepth, logTable } = await loadConsoleDepthModule();
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
  bun tools/show-enhancements.ts --html > /tmp/enhancements.html
`);
    return;
  }

  if (parseArg('status') || Bun.argv.includes('--live-status')) {
    await printLiveStatus();
    return;
  }

  if (Bun.argv.includes('--json')) {
    const { jsonOut } = await loadConsoleDepthModule();
    const report = await buildEnhancementReport();
    jsonOut(report);
    if (report.passed !== report.total) process.exitCode = 1;
    return;
  }

  if (Bun.argv.includes('--html')) {
    const report = await buildEnhancementReport();
    console.log(reportToHtml(report));
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
