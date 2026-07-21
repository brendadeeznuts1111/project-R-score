#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/console#reading-from-stdin — Bun.stdin
// @see https://bun.com/docs/runtime/console#object-inspection-depth — --console-depth
// @see https://bun.com/docs/runtime/index#bun-run-smol — --smol
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Fail closed: no lib/harness function exceeds complexity-baseline.json maxComplexity.
 *
 *   bun run check:harness-complexity
 *   bun run check:harness-complexity -- --report
 *   bun run check:harness-complexity -- --json
 *   bun run check:harness-complexity -- --update-baseline --yes
 *
 * Changed-files (pre-commit / staged) — pipe paths into the probe:
 *   bun run check:harness-complexity:staged
 *   # or: git diff --cached --name-only --diff-filter=ACM -- lib/harness \
 *   #       | bun scripts/complexity-check.ts --stdin --json --baseline …
 *
 * Diagnostics / CI memory:
 *   bun --console-depth=4 run check:harness-complexity -- --report
 *   bun --smol run test:code-quality
 */
import {
  assertComplexityFloor,
  collectHarnessComplexity,
  complexityBaselinePath,
  DEFAULT_COMPLEXITY_BASELINE_REL,
  filterHarnessComplexityPaths,
  loadComplexityBaseline,
  maxComplexitySeen,
  writeComplexityBaseline,
  type ComplexityHit,
} from '../lib/harness/complexity';
import { joinPath } from '../lib/path-bun';

const ROOT = joinPath(import.meta.dir, '..');
const argv = Bun.argv.slice(2);

function flagValue(name: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const i = argv.indexOf(name);
  if (i >= 0 && argv[i + 1] && !argv[i + 1]!.startsWith('-')) return argv[i + 1];
  return undefined;
}

const report = argv.includes('--report');
const asJson = argv.includes('--json');
const updateBaseline = argv.includes('--update-baseline');
const allowLower = argv.includes('--allow-lower');
const yes = argv.includes('--yes');
const forceStdin = argv.includes('--stdin');
const baselineArg = flagValue('--baseline') ?? DEFAULT_COMPLEXITY_BASELINE_REL;
const baselineAbs = complexityBaselinePath(ROOT, baselineArg);

/**
 * Optional path list from stdin (newline-delimited).
 * - `--stdin` always reads Bun.stdin (empty → scoped skip, not full glob)
 * - else non-TTY stdin is read (empty → full glob for CI inherit)
 * - TTY → full glob (interactive `bun run check:harness-complexity`)
 */
async function resolveFileList(): Promise<string[] | undefined> {
  if (!forceStdin && process.stdin.isTTY) return undefined;
  const input = (await Bun.stdin.text()).trim();
  if (!input) return forceStdin ? [] : undefined;
  return filterHarnessComplexityPaths(input.split('\n'));
}

const fileList = await resolveFileList();
const scoped = fileList !== undefined;
const baseline = await loadComplexityBaseline(ROOT, baselineArg);

if (updateBaseline && scoped) {
  console.error('❌ --update-baseline requires a full-tree scan (do not pipe a file list)');
  process.exit(2);
}

const hits = await collectHarnessComplexity(ROOT, fileList);
hits.sort((a, b) => b.complexity - a.complexity);
const maxSeen = maxComplexitySeen(hits);
const failures = assertComplexityFloor(hits, baseline.maxComplexity);

type JsonOut = {
  ok: boolean;
  baseline: string;
  scope: string;
  mode: 'full' | 'stdin';
  files?: number;
  maxComplexity: number;
  maxSeen: number;
  functions: number;
  failures: string[];
  top?: ComplexityHit[];
  updated?: { from: number; to: number };
};

function baseJson(extra: Partial<JsonOut> = {}): JsonOut {
  return {
    ok: failures.length === 0,
    baseline: baselineArg,
    scope: baseline.scope,
    mode: scoped ? 'stdin' : 'full',
    files: scoped ? (fileList?.length ?? 0) : undefined,
    maxComplexity: baseline.maxComplexity,
    maxSeen,
    functions: hits.length,
    failures,
    ...extra,
  };
}

async function confirmRaise(from: number, to: number): Promise<boolean> {
  if (yes) return true;
  if (!process.stdin.isTTY) {
    console.error('❌ --update-baseline requires --yes when stdin is not a TTY');
    return false;
  }
  process.stdout.write(`Raise maxComplexity ${from} → ${to}? [y/N] `);
  const buf = new Uint8Array(16);
  const n = await Bun.stdin.read(buf);
  if (n === null || n === 0) return false;
  const answer = new TextDecoder().decode(buf.subarray(0, n)).trim().toLowerCase();
  return answer === 'y' || answer === 'yes';
}

if (scoped && (fileList?.length ?? 0) === 0) {
  if (asJson) {
    console.info(JSON.stringify(baseJson({ ok: true, failures: [], functions: 0, maxSeen: 0 })));
  } else {
    console.info('✅ harness complexity · no in-scope files on stdin (skip)');
  }
  process.exit(0);
}

if (updateBaseline) {
  const next = maxSeen;
  if (next < baseline.maxComplexity && !allowLower) {
    const msg = `refusing to lower maxComplexity ${baseline.maxComplexity} → ${next} (pass --allow-lower)`;
    if (asJson) {
      console.info(JSON.stringify({ ...baseJson({ ok: true, failures: [] }), note: msg }));
    } else {
      console.info(`✅ ${msg}`);
    }
    process.exit(0);
  }
  if (next === baseline.maxComplexity) {
    if (asJson) {
      console.info(JSON.stringify(baseJson({ top: report ? hits.slice(0, 20) : undefined })));
    } else {
      console.info(
        `✅ baseline unchanged · maxComplexity ${baseline.maxComplexity} · max seen ${maxSeen}`
      );
    }
    process.exit(failures.length === 0 ? 0 : 1);
  }

  const ok = await confirmRaise(baseline.maxComplexity, next);
  if (!ok) {
    console.error('❌ baseline update aborted');
    process.exit(2);
  }

  await writeComplexityBaseline(baselineAbs, {
    ...baseline,
    maxComplexity: next,
  });

  if (asJson) {
    console.info(
      JSON.stringify(
        baseJson({
          ok: true,
          failures: [],
          maxComplexity: next,
          updated: { from: baseline.maxComplexity, to: next },
        })
      )
    );
  } else {
    console.info(`✅ wrote ${baselineArg} · maxComplexity ${baseline.maxComplexity} → ${next}`);
  }
  process.exit(0);
}

if (asJson) {
  console.info(JSON.stringify(baseJson({ top: report ? hits.slice(0, 20) : undefined })));
  process.exit(failures.length === 0 ? 0 : 1);
}

if (report) {
  console.info(
    `scope ${baseline.scope} · mode ${scoped ? 'stdin' : 'full'} · maxComplexity ${baseline.maxComplexity}`
  );
  for (const h of hits.slice(0, 20)) {
    console.info(`  ${h.complexity.toString().padStart(3)}  ${h.file}:${h.line}  ${h.name}`);
  }
}

if (failures.length > 0) {
  console.error('❌ harness complexity floor exceeded:');
  for (const f of failures) console.error(`  · ${f}`);
  console.error('   intervention: bun run check:harness-complexity -- --update-baseline --yes');
  console.error('   (prefer refactor; only raise the floor when the complexity is intentional)');
  process.exit(1);
}

const modeNote = scoped ? ` · stdin ${fileList!.length} files` : '';
console.info(
  `✅ harness complexity · ${hits.length} functions${modeNote} · max seen ${maxSeen} ≤ floor ${baseline.maxComplexity}`
);
process.exit(0);
