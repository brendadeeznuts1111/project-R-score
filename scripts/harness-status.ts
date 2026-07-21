#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/test/index#run-tests — bun test
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed / --watch
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --isolate / --parallel
// @see https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs — --shard
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi / ansiMarkdown
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
/**
 * Tool-legibility surface for the day loop + ratchets (compact).
 *
 *   bun run docs:harness              # zero-overhead: bun ./docs/harness/README.md
 *   bun run harness:status            # live ratchets + timings via ansiMarkdown
 *   bun run harness:status -- --table # also emit Bun.inspect.table
 *
 * Default output is terminal-first bullets (artefact → *Ratchet*), not tables —
 * so every invariant names the command that keeps it true.
 */
import { CRITICAL_PROOF_PATHS } from '../lib/harness/proof';
import { ansiMarkdown, logTable } from '../lib/console-depth';
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
  { cmd: 'bun run type-check', purpose: 'tsc spine (tsconfig.check.json)' },
  { cmd: 'bun run test:changed', purpose: '--changed dirty tree' },
  { cmd: 'bun run test:changed:main', purpose: '--changed=origin/main|--main-head' },
  { cmd: 'bun run test:changed:watch', purpose: '--changed --watch' },
  { cmd: 'bun run ci:harness:fast', purpose: 'local parity (quiet)' },
  { cmd: 'bun run ci:harness', purpose: 'harness envelope (quiet)' },
  { cmd: 'bun run ci:core', purpose: 'GHA parity: verify · hygiene · ci:harness' },
  { cmd: 'bun run proof:install', purpose: 'install journey (pre-push)' },
  { cmd: 'bun run check:path-bun', purpose: 'no path/node:path in lib/' },
  { cmd: 'bun run check:bun-env', purpose: 'no process.env in lib|scripts' },
  { cmd: 'bun run projects:roots:check', purpose: 'product-leaf README + package.json' },
  { cmd: 'bun run lib:domains:check', purpose: 'lib/*/ README domain indexes' },
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
      body: `${p.claim} (\`${p.kinds.join('`+`')}\` · \`${p.gateClass}\`)`,
      ratchet: p.evidence.map(e => `\`${e}\``).join(', '),
      fresh: p.freshRerun,
    }))
  ),
].join('\n');

process.stdout.write(ansiMarkdown(md));
process.stdout.write('\n');

if (hasFlag('table')) {
  console.info('Bun.inspect.table · ratchets (opt-in)');
  logTable(ratchets, ['cmd', 'purpose']);
  console.info('');
  console.info('Bun.inspect.table · proof paths');
  logTable(
    CRITICAL_PROOF_PATHS.map(p => ({
      id: p.id,
      gate: p.gateClass,
      kinds: p.kinds.join('+'),
      claim: p.claim,
      freshRerun: p.freshRerun,
    })),
    ['id', 'gate', 'kinds', 'claim', 'freshRerun']
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
  process.stdout.write(ansiMarkdown(timingMd));
  process.stdout.write('\n');
}

await showTiming('Last pre-commit', TIMING);
await showTiming('Last ci:harness', CI_TIMING);
await showTiming('Last ci:core', CORE_TIMING);

console.info(
  ansiMarkdown('_tip:_ `bun run docs:harness` · zero-overhead `bun ./docs/harness/README.md`')
);
