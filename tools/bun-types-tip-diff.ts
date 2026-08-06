#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * bun-types-tip-diff.ts — local authority tip-vs-pin gate for bun-types surface.
 *
 * GitHub Actions is disabled repository-wide; this is the merge-machine
 * equivalent of “auto tip-diff in CI”:
 *
 *   1. Fetch oven-sh/bun main → sparse `packages/bun-types` into `.cache/bun-types-tip`
 *      (or use `BUN_TYPES_TIP` / existing `~/bun/packages/bun-types` with `--prefer-local`)
 *   2. Inventory pin (catalog bun-types) vs tip with the same deep parser as v3
 *   3. Write report JSON + MD; optional `--strict` fails on pin-only or excess tip-only
 *   4. **Wire changelog** (Phase 5): full Added/Removed/Changed under `.cache/bun-types-changelog/`
 *
 * Usage:
 *   bun tools/bun-types-tip-diff.ts                 # fetch + report + changelog
 *   bun tools/bun-types-tip-diff.ts --prefer-local
 *   bun tools/bun-types-tip-diff.ts --no-fetch
 *   bun tools/bun-types-tip-diff.ts --strict
 *   bun tools/bun-types-tip-diff.ts --no-changelog  # skip Phase 5 narrative
 *   bun tools/bun-types-tip-diff.ts --json
 *
 * Scripts:
 *   bun run bun:types-inventory:tip-diff
 *   bun run bun:types-inventory:tip-diff:strict
 *   bun run bun:types-report                        # tip-diff + usage + changelog
 */
import { logTable } from '../lib/console-depth.ts';
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import {
  diffInventories,
  renderChangelogMd,
  type ChangelogResult,
} from './bun-types-changelog.ts';
import {
  INVENTORY_DTS_FILES,
  computeTipDiff,
  parseDtsFile,
  resolveBunTypesRoot,
  type TipDiff,
} from './bun-types-inventory.ts';
import { BUN_TYPES_TIP_CACHE, fetchUpstreamBunTypes } from './bun-types-tip-fetch.ts';

const TOOLS_DIR = resolvePath(import.meta.dir);
const REPO_ROOT = resolvePath(TOOLS_DIR, '..');
const CACHE_ROOT = BUN_TYPES_TIP_CACHE;
/** Volatile reports live under .cache (gitignored) — not committed like inventory SSOT */
const OUT_DIR = joinPath(REPO_ROOT, '.cache', 'bun-types-tip-diff');
const OUT_JSON = joinPath(OUT_DIR, 'report.json');
const OUT_MD = joinPath(OUT_DIR, 'report.md');
const CHANGELOG_DIR = joinPath(REPO_ROOT, '.cache', 'bun-types-changelog');
const CHANGELOG_JSON = joinPath(CHANGELOG_DIR, 'changelog.json');
const CHANGELOG_MD = joinPath(CHANGELOG_DIR, 'CHANGELOG.md');

type Report = {
  schema: 'factorywager/bun-types-tip-diff/v2';
  generated: string;
  runtime: { bunVersion: string; bunRevision: string };
  pin: { package: string; version: string; root: string };
  tip: { root: string; revision: string | null; source: 'fetch' | 'env' | 'local-clone' };
  fetch: { performed: boolean; cacheRoot: string };
  diff: TipDiff;
  /** Phase 5 full member changelog (null when --no-changelog) */
  changelog: ChangelogResult | null;
  policy: {
    strict: boolean;
    maxTipOnly: number;
    failOnPinOnly: boolean;
    changelog: boolean;
  };
  verdict: 'ok' | 'warn' | 'fail';
  reasons: string[];
};

async function pathExists(path: string): Promise<boolean> {
  try {
    return await Bun.file(path).exists();
  } catch {
    return false;
  }
}

async function gitText(cwd: string, args: string[]): Promise<{ ok: boolean; text: string }> {
  const proc = Bun.spawn(['git', '-C', cwd, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const text = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const code = await proc.exited;
  return { ok: code === 0, text: (text || err).trim() };
}

/** Re-export for callers that imported fetch from tip-diff. */
export { fetchUpstreamBunTypes } from './bun-types-tip-fetch.ts';

async function resolveTipSource(opts: {
  noFetch: boolean;
  preferLocal: boolean;
}): Promise<{ root: string; revision: string | null; source: Report['tip']['source']; fetched: boolean }> {
  const envTip = Bun.env.BUN_TYPES_TIP?.trim();
  if (envTip && (await pathExists(joinPath(envTip, 'bun.d.ts')))) {
    let revision: string | null = null;
    const gitRoot = resolvePath(envTip, '..', '..');
    const rev = await gitText(gitRoot, ['rev-parse', '--short', 'HEAD']);
    if (rev.ok) revision = rev.text;
    return { root: envTip, revision, source: 'env', fetched: false };
  }

  const home = Bun.env.HOME ?? '';
  const localClone = home ? joinPath(home, 'bun', 'packages', 'bun-types') : '';
  if (
    opts.preferLocal &&
    localClone &&
    (await pathExists(joinPath(localClone, 'bun.d.ts')))
  ) {
    let revision: string | null = null;
    const rev = await gitText(joinPath(home, 'bun'), ['rev-parse', '--short', 'HEAD']);
    if (rev.ok) revision = rev.text;
    return { root: localClone, revision, source: 'local-clone', fetched: false };
  }

  if (opts.noFetch) {
    if (localClone && (await pathExists(joinPath(localClone, 'bun.d.ts')))) {
      let revision: string | null = null;
      const rev = await gitText(joinPath(home, 'bun'), ['rev-parse', '--short', 'HEAD']);
      if (rev.ok) revision = rev.text;
      return { root: localClone, revision, source: 'local-clone', fetched: false };
    }
    throw new Error(
      'No tip types available. Unset --no-fetch, set BUN_TYPES_TIP, or clone oven-sh/bun to ~/bun.',
    );
  }

  const fetched = await fetchUpstreamBunTypes(CACHE_ROOT);
  return {
    root: fetched.root,
    revision: fetched.revision,
    source: 'fetch',
    fetched: true,
  };
}

function renderReportMd(report: Report): string {
  const d = report.diff;
  const lines: string[] = [
    '# bun-types tip-diff',
    '',
    'Local merge authority (GitHub Actions disabled). Pin catalog `bun-types` vs upstream tip.',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Generated | ${report.generated} |`,
    `| Verdict | **${report.verdict}** |`,
    `| Runtime | Bun ${report.runtime.bunVersion} |`,
    `| Pin | ${report.pin.package}@${report.pin.version} |`,
    `| Tip | \`${d.tipRevision ?? report.tip.revision ?? '?'}\` (${report.tip.source}) |`,
    `| Shared settings | **${d.shared}** |`,
    `| Tip-only | **${d.tipOnly.length}** |`,
    `| Pin-only | **${d.pinOnly.length}** |`,
    `| Policy | strict=${report.policy.strict} · maxTipOnly=${report.policy.maxTipOnly} · failOnPinOnly=${report.policy.failOnPinOnly} |`,
    '',
  ];
  if (report.reasons.length) {
    lines.push('## Reasons');
    lines.push('');
    for (const r of report.reasons) lines.push(`- ${r}`);
    lines.push('');
  }
  if (d.tipOnly.length) {
    lines.push(`## Tip-only (${d.tipOnly.length})`);
    lines.push('');
    lines.push('New surface on upstream not yet in pin:');
    lines.push('');
    for (const s of d.tipOnly.slice(0, 120)) lines.push(`- \`${s}\``);
    if (d.tipOnly.length > 120) lines.push(`- … +${d.tipOnly.length - 120} more`);
    lines.push('');
  }
  if (d.pinOnly.length) {
    lines.push(`## Pin-only (${d.pinOnly.length})`);
    lines.push('');
    lines.push('In pin but missing on tip (unexpected if tip is ahead):');
    lines.push('');
    for (const s of d.pinOnly.slice(0, 120)) lines.push(`- \`${s}\``);
    if (d.pinOnly.length > 120) lines.push(`- … +${d.pinOnly.length - 120} more`);
    lines.push('');
  }
  lines.push('## Commands');
  lines.push('');
  if (report.changelog) {
    const c = report.changelog.summary;
    lines.push('## Changelog (wired Phase 5)');
    lines.push('');
    lines.push(
      `+${c.added} −${c.removed} ~${c.changed} · full narrative: \`.cache/bun-types-changelog/CHANGELOG.md\``,
    );
    lines.push('');
  }
  lines.push('## Commands');
  lines.push('');
  lines.push('```bash');
  lines.push('bun run bun:types-inventory:tip-diff');
  lines.push('bun run bun:types-inventory:tip-diff:strict');
  lines.push('bun run bun:types-report');
  lines.push('BUN_TYPES_TIP=/path/to/bun-types bun tools/bun-types-tip-diff.ts --no-fetch');
  lines.push('```');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function parseCli(argv: string[]) {
  let maxTipOnly = 200;
  for (const a of argv) {
    if (a.startsWith('--max-tip-only=')) {
      const n = Number(a.slice('--max-tip-only='.length));
      if (Number.isFinite(n) && n >= 0) maxTipOnly = Math.floor(n);
    }
  }
  return {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write'),
    strict: argv.includes('--strict'),
    noFetch: argv.includes('--no-fetch'),
    preferLocal: argv.includes('--prefer-local'),
    noChangelog: argv.includes('--no-changelog'),
    maxTipOnly,
    failOnPinOnly: !argv.includes('--allow-pin-only'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

async function loadMembersFromTypesRoot(
  typesRoot: string,
  opts: { deprecatedFile?: (f: string) => boolean } = {},
) {
  const raw = [];
  for (const f of INVENTORY_DTS_FILES) {
    const p = joinPath(typesRoot, f);
    if (!(await Bun.file(p).exists())) continue;
    raw.push(
      ...parseDtsFile(await Bun.file(p).text(), f, {
        shallow: false,
        interfaces: true,
        properties: true,
        typeAliases: true,
        deprecatedFile: opts.deprecatedFile?.(f) ?? f === 'deprecated.d.ts',
      }),
    );
  }
  const byKey = new Map<string, (typeof raw)[0]>();
  for (const m of raw) {
    const k = `${m.module}|${m.setting}|${m.kind}`;
    if (!byKey.has(k)) byKey.set(k, m);
  }
  return [...byKey.values()];
}

async function main(): Promise<void> {
  const args = parseCli(Bun.argv.slice(2));
  if (args.help) {
    console.log(`bun-types-tip-diff — pin vs upstream bun-types (local CI)

  --prefer-local     Use ~/bun/packages/bun-types if present (no network)
  --no-fetch         Never clone; require BUN_TYPES_TIP or local clone
  --strict           Exit 1 on pin-only (default) or tip-only > --max-tip-only
  --max-tip-only=N   Strict threshold for tip-only count (default 200)
  --allow-pin-only   Do not fail on pin-only in --strict
  --no-changelog     Skip Phase 5 full Added/Removed/Changed write
  --json             Print report JSON
  --no-write         Do not write .cache reports
  -h, --help
`);
    return;
  }

  const pin = await resolveBunTypesRoot(REPO_ROOT);
  const tip = await resolveTipSource({
    noFetch: args.noFetch,
    preferLocal: args.preferLocal,
  });

  const pinMembers = await loadMembersFromTypesRoot(pin.root);
  const tipMembers = await loadMembersFromTypesRoot(tip.root, {
    deprecatedFile: f => f === 'deprecated.d.ts',
  });

  const diff = await computeTipDiff(pinMembers, tip.root, tip.revision, {
    shallow: false,
    interfaces: true,
    properties: true,
    typeAliases: true,
  });

  let changelog: ChangelogResult | null = null;
  if (!args.noChangelog) {
    changelog = diffInventories(pinMembers, tipMembers, {
      from: `pin@${pin.version}`,
      to: `tip@${tip.revision ?? 'unknown'}`,
    });
  }

  const reasons: string[] = [];
  let verdict: Report['verdict'] = 'ok';
  if (diff.pinOnly.length > 0) {
    reasons.push(`pin-only ${diff.pinOnly.length} (in pin, missing on tip)`);
    if (args.strict && args.failOnPinOnly) verdict = 'fail';
    else if (verdict === 'ok') verdict = 'warn';
  }
  if (diff.tipOnly.length > args.maxTipOnly) {
    reasons.push(`tip-only ${diff.tipOnly.length} exceeds max ${args.maxTipOnly}`);
    if (args.strict) verdict = 'fail';
    else if (verdict === 'ok') verdict = 'warn';
  } else if (diff.tipOnly.length > 0) {
    reasons.push(`tip-only ${diff.tipOnly.length} (new upstream surface; under max ${args.maxTipOnly})`);
    if (verdict === 'ok') verdict = 'warn';
  }
  if (changelog && (changelog.summary.added || changelog.summary.removed || changelog.summary.changed)) {
    reasons.push(
      `changelog +${changelog.summary.added} −${changelog.summary.removed} ~${changelog.summary.changed}`,
    );
  }

  const report: Report = {
    schema: 'factorywager/bun-types-tip-diff/v2',
    generated: new Date().toISOString(),
    runtime: { bunVersion: Bun.version, bunRevision: Bun.revision },
    pin: { package: pin.packageName, version: pin.version, root: pin.root },
    tip: {
      root: tip.root,
      revision: tip.revision,
      source: tip.source,
    },
    fetch: { performed: tip.fetched, cacheRoot: CACHE_ROOT },
    diff,
    changelog,
    policy: {
      strict: args.strict,
      maxTipOnly: args.maxTipOnly,
      failOnPinOnly: args.failOnPinOnly,
      changelog: !args.noChangelog,
    },
    verdict,
    reasons,
  };

  if (!args.noWrite) {
    await Bun.spawn(['mkdir', '-p', OUT_DIR]).exited;
    await Bun.write(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
    await Bun.write(OUT_MD, renderReportMd(report));
    if (changelog) {
      await Bun.spawn(['mkdir', '-p', CHANGELOG_DIR]).exited;
      await Bun.write(CHANGELOG_JSON, `${JSON.stringify(changelog, null, 2)}\n`);
      await Bun.write(CHANGELOG_MD, renderChangelogMd(changelog));
    }
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    console.log(
      `tip-diff · pin ${report.pin.package}@${report.pin.version} vs tip ${report.tip.revision ?? '?'} (${report.tip.source})`,
    );
    console.log(
      `shared ${diff.shared} · tip-only ${diff.tipOnly.length} · pin-only ${diff.pinOnly.length} · verdict ${report.verdict}`,
    );
    if (changelog) {
      console.log(
        `changelog +${changelog.summary.added} −${changelog.summary.removed} ~${changelog.summary.changed}`,
      );
    }
    if (diff.tipOnly.length) {
      logTable(
        diff.tipOnly.slice(0, 30).map(setting => ({ setting })),
        ['setting'],
        { colors: true },
      );
      if (diff.tipOnly.length > 30) console.log(`… +${diff.tipOnly.length - 30} tip-only`);
    }
    if (diff.pinOnly.length) {
      console.log('pin-only:');
      for (const s of diff.pinOnly.slice(0, 20)) console.log(`  - ${s}`);
    }
    if (!args.noWrite) {
      console.log(`wrote ${OUT_JSON}`);
      console.log(`wrote ${OUT_MD}`);
      if (changelog) {
        console.log(`wrote ${CHANGELOG_MD}`);
        console.log(`wrote ${CHANGELOG_JSON}`);
      }
    }
  }

  if (args.strict && verdict === 'fail') process.exit(1);
}

if (import.meta.main) {
  await main();
}
