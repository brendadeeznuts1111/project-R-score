#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/test/index#run-tests — bun test
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed / --watch
// @see https://bun.com/docs/test/parallel#isolate — --isolate
// @see https://bun.com/docs/test/parallel#parallel — --parallel
// @see https://bun.com/docs/test/parallel#one-timings-file-per-shard — --shard
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/reference/bun/BunInspectOptions — BunInspectOptions
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
/**
 * Tool-legibility surface for the day loop + ratchets (compact).
 *
 *   bun run docs:harness              # zero-overhead: bun ./docs/harness/README.md
 *   bun run harness:status            # live ratchets + timings via Bun.markdown.ansi
 *   bun run harness:status -- --table # also emit Bun.inspect.table
 *   bun run harness:status -- --actions              # non-noise GHA checks table
 *   bun run harness:status -- --show-actions-noise   # full GHA class table
 *
 * Default output is terminal-first bullets (artefact → *Ratchet*), not tables —
 * so every invariant names the command that keeps it true.
 * Known GHA billing/offline failures are muted; local `ci:core` is SSOT.
 */
import {
  actionableActionsChecks,
  actionsNoiseSummaryLine,
  classifyActionsChecks,
  fetchActionsCheckSignals,
  nonNoiseActionsChecks,
  summarizeActionsChecks,
  type ClassifiedActionsCheck,
} from '../lib/harness/actions-check-noise';
import { CRITICAL_PROOF_PATHS } from '../lib/harness/proof';
import { inspect, logTable } from '../lib/console-depth';
import { hasFlag } from './lib/cli-args';

const ROOT = `${import.meta.dir}/..`;
const TIMING = `${ROOT}/reports/harness-gate-timing.json`;
const CI_TIMING = `${ROOT}/reports/ci-harness-timing.json`;
const CORE_TIMING = `${ROOT}/reports/ci-core-timing.json`;

type Timing = {
  generatedAt?: string;
  totalMs?: number;
  mode?: string;
  gates?: Array<{ name: string; ms: number; ok: boolean }>;
};

/** Day-loop commands — the cmd *is* the ratchet. */
const ratchets: Array<{ cmd: string; purpose: string }> = [
  { cmd: 'bun run docs:harness', purpose: 'bun ./docs/harness/README.md (native ANSI)' },
  { cmd: 'bun run docs:fresh-rerun', purpose: 'fresh-rerun contract + catalog' },
  {
    cmd: 'bun run validate:colors',
    purpose: 'color kernel Claim/Evidence (theme-dark aliases + floors)',
  },
  { cmd: 'bun run test:colors', purpose: 'color-kernel unit + validate:colors smoke' },
  { cmd: 'bun run type-check', purpose: 'tsc spine (tsconfig.check.json)' },
  { cmd: 'bun run test:changed', purpose: '--changed dirty tree' },
  { cmd: 'bun run test:changed:main', purpose: '--changed=origin/main|--main-head' },
  { cmd: 'bun run test:changed:watch', purpose: '--changed --watch' },
  { cmd: 'bun run ci:harness:fast', purpose: 'local parity (quiet)' },
  { cmd: 'bun run ci:harness', purpose: 'harness envelope (quiet)' },
  {
    cmd: 'bun run check:import-graph',
    purpose: 'cycle + deep-relative ratchet (pre-commit · ci:core · monorepo-health SSOT)',
  },
  {
    cmd: 'bun run check:monorepo-health',
    purpose: 'health score schema + metric floors (ci:core; tests-only on pre-commit when staged)',
  },
  {
    cmd: 'bun run monorepo:health',
    purpose: 'operator TTY score + SQLite trend (not a commit gate)',
  },
  { cmd: 'bun run public:discover:check', purpose: 'public/ portal · registry refs' },
  { cmd: 'bun run public:audit:verify', purpose: 'public plane discovery + portal + audit' },
  { cmd: 'bun run discover:compose:check', purpose: 'harness + public discovery' },
  { cmd: 'bun run proof:install', purpose: 'install journey (pre-push)' },
  { cmd: 'bun run check:path-bun', purpose: 'no path/node:path in lib/' },
  { cmd: 'bun run check:bun-env', purpose: 'no process.env in lib|scripts' },
  {
    cmd: 'bun run projects:roots:check',
    purpose: 'product structure + tier-aware Bun compatibility',
  },
  { cmd: 'bun run lib:domains:check', purpose: 'lib/*/ README domain indexes' },
  { cmd: 'bun run lib:area-maps:check', purpose: 'lib/*/ Area map path/glob validation' },
  { cmd: 'bun run build:defines', purpose: 'AST define BUILD_* + DEBUG DCE (prod)' },
  { cmd: 'bun run build:defines:dev', purpose: 'DEBUG=true / --feature=DEBUG' },
  { cmd: 'bun run build:defines:compile', purpose: 'standalone → dist/fw-build-info' },
];

function ratchetBullets(
  items: Array<{ title: string; body: string; ratchet: string; fresh?: string }>
): string {
  return items
    .map(i => {
      const lines = [`- **\`${i.title}\`** — ${i.body}`, `  *Ratchet* → ${i.ratchet}`];
      if (i.fresh) lines.push(`  *Fresh-rerun* → \`${i.fresh}\``);
      return lines.join('\n');
    })
    .join('\n');
}

function tableRows(rows: ClassifiedActionsCheck[]): Array<{
  name: string;
  conclusion: string;
  class: string;
  ms: number | string;
}> {
  return rows.map(r => ({
    name: r.name,
    conclusion: r.conclusion,
    class: r.class,
    ms: r.ms ?? '—',
  }));
}

async function showActionsChecks(): Promise<void> {
  const showNoise = hasFlag('show-actions-noise');
  const showActions = hasFlag('actions') || showNoise;

  let signals;
  try {
    signals = await fetchActionsCheckSignals(ROOT);
  } catch {
    return;
  }
  if (!signals) return;

  const classified = classifyActionsChecks(signals);
  const summary = summarizeActionsChecks(classified);

  if (summary.knownOffline > 0) {
    console.info(Bun.markdown.ansi(`_${actionsNoiseSummaryLine(summary.knownOffline)}_`));
  }

  if (showNoise) {
    console.info('Bun.inspect.table · GHA checks (all classes)');
    logTable(tableRows(classified), ['name', 'conclusion', 'class', 'ms']);
    console.info('');
    return;
  }

  const actionable = actionableActionsChecks(classified);
  const nonNoise = nonNoiseActionsChecks(classified);

  if (showActions && nonNoise.length > 0) {
    console.info('Bun.inspect.table · GHA checks (non-noise)');
    logTable(tableRows(nonNoise), ['name', 'conclusion', 'class', 'ms']);
    console.info('');
    return;
  }

  // Default: surface real/pending only when useful (hide pass + known-offline lists)
  if (actionable.length > 0) {
    console.info('Bun.inspect.table · GHA checks (actionable)');
    logTable(tableRows(actionable), ['name', 'conclusion', 'class', 'ms']);
    console.info('');
  }
}

const md = [
  '# FactoryWager harness',
  '',
  'Docs: [harness README](docs/harness/README.md) · `bun run docs:harness`',
  '',
  'Hard gates: lint (**error**) · `tsc --project tsconfig.check.json` · proof journeys.',
  'Markdown is a pointer; each artefact names its ratchet.',
  '',
  '## Day-loop',
  '',
  ...ratchets.map(r => `- **\`${r.cmd}\`** — ${r.purpose}`),
  '',
  `## Proof paths (${CRITICAL_PROOF_PATHS.length})`,
  '',
  ratchetBullets(
    CRITICAL_PROOF_PATHS.map(p => ({
      title: p.id,
      body: `${p.claim} (\`${p.kinds.join('`+`')}\` · \`${p.gateClass}\` · \`${p.freshRerunKind}\` · owner \`${p.owner}\`)`,
      ratchet: p.evidence.map(e => `\`${e}\``).join(', '),
      fresh: p.freshRerun,
    }))
  ),
].join('\n');

process.stdout.write(Bun.markdown.ansi(md));
process.stdout.write('\n');

if (hasFlag('table')) {
  console.info('Bun.inspect · family map');
  console.info(
    inspect({
      'Bun.inspect()': 'runtime/utils#bun-inspect',
      'Bun.inspect.custom': 'runtime/utils#bun-inspect-custom',
      'Bun.inspect.table': 'runtime/utils#bun-inspect-table-tabulardata-properties-options',
      BunInspectOptions: 'reference/bun/BunInspectOptions',
      helpers: 'lib/console-depth.ts · inspect / inspectCustom / logTable',
    })
  );
  console.info('');
  console.info('Bun.inspect.table · ratchets (opt-in)');
  logTable(ratchets, ['cmd', 'purpose']);
  console.info('');
  console.info('Bun.inspect.table · proof paths');
  logTable(
    CRITICAL_PROOF_PATHS.map(p => ({
      id: p.id,
      gateClass: p.gateClass,
      gateRef: p.gateRef,
      kinds: p.kinds.join('+'),
      freshRerunKind: p.freshRerunKind,
      owner: p.owner,
      claim: p.claim,
      freshRerun: p.freshRerun,
    })),
    ['id', 'gateClass', 'gateRef', 'kinds', 'freshRerunKind', 'owner', 'claim', 'freshRerun']
  );
  console.info('');
}

async function showTiming(label: string, path: string): Promise<void> {
  const file = Bun.file(path);
  if (!(await file.exists())) return;
  const t = (await file.json()) as Timing;
  const gates = t.gates ?? [];
  const timingMd = [
    `## ${label}`,
    '',
    `${t.totalMs ?? '?'}ms` +
      (t.mode ? ` (${t.mode})` : '') +
      (t.generatedAt ? ` · ${t.generatedAt}` : ''),
    '',
    ...(gates.length
      ? gates.map(g => `- ${g.ok ? '✓' : '✗'} **${g.name}** — ${g.ms}ms`)
      : ['_no gate timings_']),
  ].join('\n');
  process.stdout.write(Bun.markdown.ansi(timingMd));
  process.stdout.write('\n');
}

await showTiming('Last pre-commit', TIMING);
await showTiming('Last ci:harness', CI_TIMING);
await showTiming('Last ci:core', CORE_TIMING);
await showActionsChecks();

console.info(
  Bun.markdown.ansi('_tip:_ `bun run docs:harness` · zero-overhead `bun ./docs/harness/README.md`')
);
