#!/usr/bin/env bun
// @see https://bun.com/docs/test/parallel#parallel — --parallel
// @released --parallel · released v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated --parallel · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated --parallel · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated --parallel · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * CI / agent harness envelope — quiet success; noise only on failure.
 *
 * Cheap ratchets run in parallel (path-bun · bun-env · invisible-chars · brands ·
 * projects-roots · lib-domains · audit-verify). ESLint defaults to changed files (`lint`);
 * full tree only with --full-lint / HARNESS_FULL_LINT=1 (main push).
 *
 *   bun run ci:harness
 *   bun run ci:harness:fast
 *   bun scripts/ci-harness.ts --full-lint
 *   bun scripts/ci-harness.ts --verbose
 *   bun scripts/ci-harness.ts --fail-json
 */
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { logCompact } from '../lib/console-depth';
import { githubTokenPresence, resolveGitHubRepositoryRef } from '../lib/github-repository-ref';
import { hasFlag } from './lib/cli-args';
import { ensureDir, writeJson } from './lib/fs-bun';
const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('ci:harness', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const repoRoot = `${import.meta.dir}/..`;
const TIMING_PATH = `${repoRoot}/reports/ci-harness-timing.json`;

{
  const ref = resolveGitHubRepositoryRef({ remote: 'origin' });
  const tok = githubTokenPresence();
  logCompact({
    remote: ref.remote,
    owner: ref.owner,
    name: ref.name,
    host: ref.host,
    source: ref.source,
    tokenSource: tok.tokenSource,
    apiDomain: tok.apiDomain,
  });
}

type Step = { name: string; cmd: string[]; owner: string; repair: string };
type GateTiming = { name: string; ms: number; ok: boolean };

const CHEAP: Step[] = [
  {
    name: 'path-bun',
    cmd: ['bun', 'run', 'check:path-bun'],
    owner: 'lib/path-bun.ts · scripts/check-path-bun.ts',
    repair: 'bun run check:path-bun',
  },
  {
    name: 'bun-env',
    cmd: ['bun', 'run', 'check:bun-env'],
    owner: 'scripts/check-bun-env.ts',
    repair: 'bun run check:bun-env',
  },
  {
    name: 'invisible-chars',
    cmd: ['bun', 'run', 'check:invisible-chars'],
    owner: 'scripts/check-invisible-chars.ts',
    repair: 'bun run check:invisible-chars',
  },
  {
    name: 'brands-smart',
    cmd: ['bun', 'tools/branded-id-check.ts', '--smart', '--strict', '--quiet'],
    owner: 'lib/types/branded.ts · branded-ids skill',
    repair: 'bun tools/branded-id-check.ts --smart --strict',
  },
  {
    name: 'projects-roots',
    cmd: ['bun', 'run', 'projects:roots:check'],
    owner: 'tools/projects-root-check.ts · projects/README.md',
    repair: 'bun run projects:roots:check',
  },
  {
    name: 'lib-domains',
    cmd: ['bun', 'run', 'lib:domains:check'],
    owner: 'tools/lib-domains-check.ts · lib/README.md',
    repair: 'bun run lib:domains:check',
  },
  {
    name: 'lib-area-maps',
    cmd: ['bun', 'run', 'lib:area-maps:check'],
    owner: 'tools/lib-area-map-check.ts · lib/*/README.md ## Area map',
    repair: 'bun run lib:area-maps:check · fix Area map paths/globs',
  },
  {
    name: 'audit-verify',
    cmd: ['bun', 'run', 'audit:verify'],
    owner: 'tools/audit-catalog.ts · lib/audit/',
    repair: 'bun run audit:verify · bun run audit:catalog:build',
  },
  {
    name: 'public-discover',
    cmd: ['bun', 'run', 'public:discover:check'],
    owner: 'lib/public-discovery.ts · docs/harness/tenants/public-plane.md',
    repair: 'bun run public:discover:check · bun run public:audit:verify',
  },
  {
    name: 'portal-foundation',
    cmd: ['bun', 'run', 'verify:portal:static'],
    owner: 'docs/portal-foundation.md · tools/verify-portal.ts',
    repair: 'bun run verify:portal:static · docs/portal-foundation.md',
  },
  {
    name: 'script-flag-order',
    cmd: ['bun', 'run', 'verify:flag-order'],
    owner: 'tools/verify-script-flags.ts · docs/portal-foundation.md',
    repair: 'bun run verify:flag-order · use bun --watch not bun run --watch',
  },
  {
    name: 'bun-deps-tier-a',
    cmd: ['bun', 'scripts/check-bun-deps-tier-a.ts'],
    owner: 'scripts/check-bun-deps-tier-a.ts · tools/bun-prefer-matrix.ts',
    repair: 'bun scripts/check-bun-deps-tier-a.ts · remove Tier-A wrappers from package.json',
  },
];

function eslintStep(fullLint: boolean): Step {
  return {
    name: fullLint ? 'eslint-full' : 'eslint-changed',
    cmd: ['bun', 'run', fullLint ? 'lint:all' : 'lint'],
    owner: 'eslint.harness.config.ts · scripts/lint-harness.ts',
    repair: `bun run ${fullLint ? 'lint:all' : 'lint'}`,
  };
}

function testStep(mainHead: boolean): Step {
  return {
    name: 'test-changed',
    // Main-head can select hundreds of files that contend on shared repository
    // resources. Keep dirty-tree development parallel and merge proof serial.
    cmd: mainHead
      ? ['bun', 'run', 'test:changed', '--', '--main-head', '--serial']
      : ['bun', 'run', 'test:changed'],
    owner: 'scripts/bun-test-changed.ts · --changed · --parallel/--serial · --main-head',
    repair: mainHead
      ? 'bun run test:changed:main -- --serial'
      : 'bun run test:changed  # or --serial / BUN_TEST_SERIAL=1',
  };
}

async function run(
  step: Step,
  verbose: boolean
): Promise<{ code: number; ms: number; out: string }> {
  const t0 = performance.now();
  if (verbose) {
    console.info(`→ ${step.name}`);
    const proc = Bun.spawn(step.cmd, {
      cwd: repoRoot,
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    });
    const code = (await proc.exited) ?? 1;
    return { code, ms: Math.round(performance.now() - t0), out: '' };
  }

  const proc = Bun.spawn(step.cmd, {
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = (await proc.exited) ?? 1;
  const ms = Math.round(performance.now() - t0);
  console.info(`${code === 0 ? '✓' : '✗'} ${step.name} (${ms}ms)`);
  return { code, ms, out: `${stdout}${stderr}` };
}

async function writeTimings(timings: GateTiming[], mode: string): Promise<void> {
  await ensureDir(`${repoRoot}/reports`);
  await writeJson(TIMING_PATH, {
    generatedAt: new Date().toISOString(),
    full: mode === 'full',
    mode,
    totalMs: timings.reduce((s, t) => s + t.ms, 0),
    gates: timings,
  });
}

function failJson(step: Step, code: number): void {
  console.error(
    JSON.stringify({
      ok: false,
      step: step.name,
      code,
      owner: step.owner,
      repair: step.repair,
      invariant: 'harness gate must exit 0',
    })
  );
}

async function runSerial(
  steps: Step[],
  verbose: boolean,
  timings: GateTiming[],
  wantFailJson: boolean,
  mode: string
): Promise<void> {
  for (const step of steps) {
    const { code, ms, out } = await run(step, verbose);
    timings.push({ name: step.name, ms, ok: code === 0 });
    if (code !== 0) {
      if (!verbose && out.trim()) console.error(out.trimEnd());
      console.error(`❌ ${step.name} failed · repair: ${step.repair}`);
      if (wantFailJson) failJson(step, code);
      await writeTimings(timings, mode);
      process.exit(code);
    }
  }
}

const fast = hasFlag('fast');
const verbose = hasFlag('verbose');
const wantFailJson = hasFlag('fail-json');
const fullLint =
  hasFlag('full-lint') || Bun.env.HARNESS_FULL_LINT === '1' || Bun.env.HARNESS_FULL_LINT === 'true';
const mode = fast ? 'fast' : fullLint ? 'full-lint' : 'full';
const timings: GateTiming[] = [];

if (verbose) console.info(`ci:harness (${mode})`);

// Parallel cheap ratchets (path-bun ‖ bun-env ‖ invisible-chars ‖ brands ‖ projects-roots ‖ lib-domains ‖ audit-verify)
{
  const t0 = performance.now();
  const results = await Promise.all(CHEAP.map(s => run(s, verbose)));
  const parallelMs = Math.round(performance.now() - t0);
  for (let i = 0; i < CHEAP.length; i++) {
    const step = CHEAP[i]!;
    const r = results[i]!;
    timings.push({ name: step.name, ms: r.ms, ok: r.code === 0 });
    if (r.code !== 0) {
      if (!verbose && r.out.trim()) console.error(r.out.trimEnd());
      console.error(`❌ ${step.name} failed · repair: ${step.repair}`);
      if (wantFailJson) failJson(step, r.code);
      await writeTimings(timings, mode);
      process.exit(r.code);
    }
  }
  if (!verbose) console.info(`∥ cheap×${CHEAP.length} (${parallelMs}ms wall)`);
}

if (!fast) {
  await runSerial([eslintStep(fullLint)], verbose, timings, wantFailJson, mode);
}

await runSerial([testStep(!fast)], verbose, timings, wantFailJson, mode);

/** Bun-native boundary claims — always-on outside --fast (was human-only / test:changed luck). */
const BOUNDARY_FIXTURES: Step = {
  name: 'boundary-fixtures',
  cmd: [
    'bun',
    'test',
    'tests/fixtures/runtime-cli/',
    'tests/fixtures/bun-shell/',
    'tests/fixtures/security-hash/',
    'tests/fixtures/social-metadata/',
    'tests/fixtures/blog-extraction/',
    'tests/fixtures/fetch-page/',
    'tests/fetch-proxy-keepalive.test.ts',
    'tests/bun-urlpattern.test.ts',
    'tests/bun-site-url.test.ts',
    'tests/factory-production.test.ts',
    'tests/portal-url-planes.test.ts',
    'tests/bun-docs-catalog.test.ts',
    'tests/fs-bun.test.ts',
    'tests/bun-glob-scan.test.ts',
  ],
  owner:
    'runtime-cli · bun-shell · security-hash · social-metadata · blog-extraction · fetch-page · https-proxy-connect-reuse · url-pattern · bun-http-server-docs · fs-native ProofPaths',
  repair:
    'bun test tests/fixtures/runtime-cli/ tests/fixtures/bun-shell/ tests/fixtures/security-hash/ tests/fixtures/social-metadata/ tests/fixtures/blog-extraction/ tests/fixtures/fetch-page/ tests/fetch-proxy-keepalive.test.ts tests/bun-urlpattern.test.ts tests/bun-site-url.test.ts tests/factory-production.test.ts tests/portal-url-planes.test.ts tests/bun-docs-catalog.test.ts tests/fs-bun.test.ts tests/bun-glob-scan.test.ts',
};

/** Channel meta-verification — bake/release drift + suite isolation (claim channel-meta-verification-v1). */
const CHANNEL_META_FIXTURES: Step = {
  name: 'channel-meta-verification',
  cmd: [
    'bun',
    'test',
    'tests/channel-suite.test.ts',
    'tests/verification-subsystem.test.ts',
    'tests/bundler-loader-probes.test.ts',
    'tests/networking-channel.test.ts',
    'tests/verification-proof-taxonomy.test.ts',
    'tests/channel-meta-refresh.test.ts',
    'tests/verification-proof-consistency.test.ts',
  ],
  owner: 'channel-meta-verification-v1 ProofPath',
  repair:
    'bun test tests/channel-suite.test.ts tests/verification-subsystem.test.ts tests/bundler-loader-probes.test.ts tests/networking-channel.test.ts tests/verification-proof-taxonomy.test.ts tests/channel-meta-refresh.test.ts tests/verification-proof-consistency.test.ts · bun run verify:channel:meta',
};

if (!fast) {
  await runSerial(
    [
      {
        name: 'cloudflare-pages-preflight',
        cmd: ['bun', 'run', 'cloudflare:preflight'],
        owner: 'tools/cloudflare-pages-preflight.ts · docs/harness/tenants/cloudflare-pages.md',
        repair:
          'bun run cloudflare:preflight · bun test tests/functions-edge-safety.test.ts tests/functions-import-graph.test.ts',
      },
      BOUNDARY_FIXTURES,
      CHANNEL_META_FIXTURES,
    ],
    verbose,
    timings,
    wantFailJson,
    mode
  );
}

/** Dual-catalog parents + catalog meta — was human-only / test:changed luck. */
const DUAL_CATALOG: Step[] = [
  {
    name: 'ci-deploy-runbooks',
    cmd: ['bun', 'run', 'test:ci-deploy'],
    owner: 'ci-deploy-runbooks ProofPath',
    repair: 'bun run test:ci-deploy',
  },
  {
    name: 'code-quality-tenants',
    cmd: ['bun', 'run', 'test:code-quality'],
    owner: 'code-quality-tenants · coverage · orphans · complexity ProofPaths',
    repair: 'bun run test:code-quality',
  },
  {
    name: 'fresh-rerun-contract',
    cmd: ['bun', 'test', 'tests/harness-fresh-rerun-contract.test.ts'],
    owner: 'ProofPath catalog meta · gateClass · freshRerunKind · gateRef',
    repair: 'bun test tests/harness-fresh-rerun-contract.test.ts',
  },
];

if (!fast) {
  await runSerial(DUAL_CATALOG, verbose, timings, wantFailJson, mode);
}

const stepSum = timings.reduce((s, t) => s + t.ms, 0);
await writeTimings(timings, mode);
console.info(`✅ ci:harness (${mode}) ${stepSum}ms step-sum`);
