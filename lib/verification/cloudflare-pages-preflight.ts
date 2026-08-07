// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Cloudflare Pages preflight steps — shared by CLI, ops snapshot, and CI.
 *
 * @see docs/harness/tenants/cloudflare-pages.md
 * @see tools/cloudflare-pages-preflight.ts
 */
import { joinPath, resolvePath } from '../path-bun.ts';
import {
  auditMcpCatalogParity,
  buildCloudflareTokenScopeProof,
  CLOUDFLARE_MCP_HTTP_SERVERS,
} from './cloudflare-token-scope.ts';
import { runProofTaxonomyAudit } from './proof-taxonomy.ts';

export const CLOUDFLARE_PAGES_PREFLIGHT_PATH = '/registry/cloudflare-pages-preflight.json';

export type CloudflarePagesPreflightStep = {
  id: string; // brand-ok — preflight step key
  ok: boolean;
  detail?: string;
};

export type CloudflarePagesPreflightReport = {
  type: 'CloudflarePagesPreflightReport';
  version: '1.0.0';
  timestamp: string;
  ok: boolean;
  steps: CloudflarePagesPreflightStep[];
  pagesUrl: string;
  commands: {
    preflight: 'bun run cloudflare:preflight';
    deployVerify: 'bun run cloudflare:deploy:verify';
    deployVerifyTaxonomy: 'bun run cloudflare:deploy:verify:taxonomy';
    edgeCore: 'bun run verify:pages-edge';
    edgeTaxonomy: 'bun run verify:pages-edge:taxonomy';
  };
};

export type RunCloudflarePagesPreflightOpts = {
  rootDir?: string;
  /** Include proof-taxonomy audit (contracts + consistency). Default true. */
  taxonomy?: boolean;
  /** Run functions-edge-safety via bun test subprocess. Default true. */
  edgeSafetyTest?: boolean;
};

async function stepWellKnown(rootDir: string): Promise<CloudflarePagesPreflightStep> {
  try {
    const { ok, rows } = await auditMcpCatalogParity(rootDir);
    const bad = rows.filter(r => !r.ok).map(r => r.name);
    return {
      id: 'well-known-mcp-parity',
      ok,
      detail: ok ? `${rows.length} servers` : `mismatch: ${bad.join(', ')}`,
    };
  } catch (e) {
    return {
      id: 'well-known-mcp-parity',
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

async function stepTokenStatic(rootDir: string): Promise<CloudflarePagesPreflightStep> {
  try {
    const proof = await buildCloudflareTokenScopeProof({ rootDir, live: false });
    const ok = proof.summary.staticOk && proof.mcpCatalog.ok;
    return {
      id: 'cloudflare-token-static',
      ok,
      detail: ok
        ? `catalog ${proof.mcpCatalog.serverCount}/${CLOUDFLARE_MCP_HTTP_SERVERS.length} · tier ${proof.summary.tier}`
        : `staticOk=${proof.summary.staticOk} catalog=${proof.mcpCatalog.ok}`,
    };
  } catch (e) {
    return {
      id: 'cloudflare-token-static',
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

async function stepFunctionsImportGraph(rootDir: string): Promise<CloudflarePagesPreflightStep> {
  try {
    const proc = Bun.spawn({
      cmd: ['bun', 'test', 'tests/functions-import-graph.test.ts'],
      cwd: rootDir,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    return {
      id: 'functions-import-graph',
      ok: code === 0,
      detail: code === 0 ? 'allowlist ok' : `exit ${code}`,
    };
  } catch (e) {
    return {
      id: 'functions-import-graph',
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

async function stepEdgeSafety(rootDir: string): Promise<CloudflarePagesPreflightStep> {
  try {
    const proc = Bun.spawn({
      cmd: ['bun', 'test', 'tests/functions-edge-safety.test.ts'],
      cwd: rootDir,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    return {
      id: 'functions-edge-safety',
      ok: code === 0,
      detail: code === 0 ? 'regex + r2-env boundary' : `exit ${code}`,
    };
  } catch (e) {
    return {
      id: 'functions-edge-safety',
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

async function stepProofTaxonomy(rootDir: string): Promise<CloudflarePagesPreflightStep> {
  try {
    const report = await runProofTaxonomyAudit(rootDir);
    // Ignore self-contract on cloudflare-pages-preflight.json — this save rewrites it
    // (otherwise ok:false from a prior run chicken-eggs the taxonomy gate forever).
    const failed = report.audits.filter(
      a => !a.ok && !String(a.path || '').endsWith('cloudflare-pages-preflight.json')
    );
    const consistencyFailed = report.consistency.filter(c => !c.ok);
    const ok = failed.length === 0 && consistencyFailed.length === 0;
    const selfFail = report.audits.some(
      a => !a.ok && String(a.path || '').endsWith('cloudflare-pages-preflight.json')
    );
    return {
      id: 'proof-taxonomy-audit',
      ok,
      detail: ok
        ? `${report.audits.length} contracts · ${report.consistency.length} consistency` +
          (selfFail ? ' · preflight self-contract deferred' : '')
        : `contracts fail ${failed.length} · consistency fail ${consistencyFailed.length}`,
    };
  } catch (e) {
    return {
      id: 'proof-taxonomy-audit',
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Run all preflight steps (no subprocess for well-known / token static). */
export async function runCloudflarePagesPreflight(
  opts?: RunCloudflarePagesPreflightOpts
): Promise<CloudflarePagesPreflightReport> {
  const rootDir = opts?.rootDir ?? process.cwd();
  const taxonomy = opts?.taxonomy ?? true;
  const edgeSafetyTest = opts?.edgeSafetyTest ?? true;

  const steps: CloudflarePagesPreflightStep[] = [
    await stepWellKnown(rootDir),
    await stepTokenStatic(rootDir),
    await stepFunctionsImportGraph(rootDir),
  ];
  if (edgeSafetyTest) steps.push(await stepEdgeSafety(rootDir));
  if (taxonomy) steps.push(await stepProofTaxonomy(rootDir));

  const { CLOUDFLARE_DEFAULTS } = await import('../../config/r2-env.ts');

  return {
    type: 'CloudflarePagesPreflightReport',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ok: steps.every(s => s.ok),
    steps,
    pagesUrl: `https://${CLOUDFLARE_DEFAULTS.pages.subdomain}`,
    commands: {
      preflight: 'bun run cloudflare:preflight',
      deployVerify: 'bun run cloudflare:deploy:verify',
      deployVerifyTaxonomy: 'bun run cloudflare:deploy:verify:taxonomy',
      edgeCore: 'bun run verify:pages-edge',
      edgeTaxonomy: 'bun run verify:pages-edge:taxonomy',
    },
  };
}

export async function saveCloudflarePagesPreflight(
  report: CloudflarePagesPreflightReport,
  rootDir = process.cwd()
): Promise<string> {
  const out = joinPath(rootDir, 'public/registry/cloudflare-pages-preflight.json');
  await Bun.write(out, `${JSON.stringify(report, null, 2)}\n`);
  return out;
}

/** Resolve static import paths from a TypeScript file (repo-relative POSIX). */
export async function collectStaticImports(filePath: string, rootDir: string): Promise<string[]> {
  const abs = resolvePath(rootDir, filePath);
  const dir = abs.slice(0, abs.lastIndexOf('/'));
  const text = await Bun.file(abs).text();
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const imports: string[] = [];
  const re = /from\s+['"](\.[^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped))) {
    let rel = m[1]!;
    if (!rel.endsWith('.ts') && !rel.endsWith('.tsx')) rel += '.ts';
    const resolved = resolvePath(dir, rel);
    const repoRel = resolved.startsWith(rootDir) ? resolved.slice(rootDir.length + 1) : resolved;
    imports.push(repoRel);
  }
  return imports;
}

/** Transitive lib/config paths reachable from functions/ (BFS, static imports only). */
export async function functionsLibImportClosure(rootDir: string): Promise<string[]> {
  const queue = [...new Bun.Glob('functions/**/*.ts').scanSync({ cwd: rootDir })].map(f =>
    f.replace(/\\/g, '/')
  );
  const seen = new Set<string>();
  const libPaths = new Set<string>();

  while (queue.length) {
    const file = queue.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const imp of await collectStaticImports(file, rootDir)) {
      if (imp.startsWith('functions/')) {
        if (!seen.has(imp)) queue.push(imp);
      } else if (imp.startsWith('lib/') || imp.startsWith('config/')) {
        libPaths.add(imp);
        if (!seen.has(imp)) queue.push(imp);
      }
    }
  }
  return [...libPaths].sort();
}

export const FUNCTIONS_LIB_IMPORT_ALLOWLIST = [
  'config/r2-env.ts',
  'lib/bun-executable.ts',
  'lib/channels/channels.ts',
  'lib/core/core-errors.ts',
  'lib/core/core-types.ts',
  'lib/docs/bun-site-url.ts',
  'lib/docs/repo-docs.ts',
  'lib/factory/http-keys.ts',
  'lib/harness/monorepo-health.ts',
  'lib/http/cloudflare-security-headers.ts',
  'lib/http/portal-cors.ts',
  'lib/http/portal-env-edge.ts',
  'lib/http/portal-health-edge.ts',
  'lib/http/sha256.ts',
  'lib/http/verification-scripts.ts',
  'lib/monitoring/compliance-slice.ts',
  'lib/monitoring/limit-slice.ts',
  'lib/monitoring/monorepo-health-slice.ts',
  'lib/operations/limit-betlog-export.ts',
  'lib/pages/pages-function.ts',
  'lib/pages/r2-types.ts',
  'lib/path-bun.ts',
  'lib/telegram/telegram-update.ts',
  'lib/telegram/webhook-pages.ts',
  'lib/types/branded.ts',
  'lib/types/branded/_core.ts',
  'lib/types/branded/audit.ts',
  'lib/types/branded/deployment.ts',
  'lib/types/branded/documents.ts',
  'lib/types/branded/governance.ts',
  'lib/types/branded/identity.ts',
  'lib/types/branded/index.ts',
  'lib/types/branded/operations.ts',
  'lib/types/branded/portal.ts',
  'lib/types/branded/security.ts',
  'lib/types/branded/session.ts',
  'lib/types/branded/surfaces.ts',
] as const;
