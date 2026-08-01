#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/api/spawn#input — Bun.spawn
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Bake / validate Soft→Factory accounting export.
 *
 *   bun run soft:accounting:bake     # regenerate toc-ops-fixture demo bake
 *   bun run soft:accounting:check    # fixture exact-match OR soft-ct schema gate
 *   bun run soft:accounting:from-ct  # ct soft-accounting-export → registry (soft-ct)
 *
 * Soft Balance mutations stay in toc-ops-repo `ct`.
 * Override Soft checkout with `TOC_OPS_REPO=/abs/path/to/toc-ops-repo`.
 *
 * @see docs/design/soft-handshake.md
 * @see lib/telegram/soft-accounting-export.ts
 */
import { joinPath } from '../lib/path-bun.ts';
import { jsonOut } from '../lib/console-depth.ts';
import type { TocOpsSnapshot } from '../lib/toc-ops/types.ts';
import {
  SOFT_ACCOUNTING_EXPORT_REL,
  SOFT_ACCOUNTING_EXPORT_SCHEMA,
  projectSoftAccountingExportFromTocOps,
  type SoftAccountingExport,
  type SoftAccountingPlayRow,
} from '../lib/telegram/soft-accounting-export.ts';

const root = joinPath(import.meta.dir, '..');
const outPath = joinPath(root, SOFT_ACCOUNTING_EXPORT_REL);
const tocPath = joinPath(root, 'public/registry/toc-ops.json');

/** Absolute bun binary — bare `bun` + missing cwd surfaces as posix_spawn ENOENT. */
export function resolveBunExecutable(): string {
  return Bun.which('bun') ?? process.execPath;
}

async function pathHasPackageJson(dir: string): Promise<boolean> {
  return Bun.file(joinPath(dir, 'package.json')).exists();
}

/**
 * Locate Soft `toc-ops-repo` for `ct soft-accounting-export`.
 * Order: TOC_OPS_REPO → factoryRoot/toc-ops-repo → git common-dir sibling →
 * `.codex-worktrees/<lane>/../../toc-ops-repo`.
 */
export async function resolveTocOpsRepo(factoryRoot = root): Promise<string> {
  const tried: string[] = [];
  const candidates: string[] = [];

  const fromEnv = Bun.env.TOC_OPS_REPO?.trim();
  if (fromEnv) candidates.push(fromEnv);
  candidates.push(joinPath(factoryRoot, 'toc-ops-repo'));

  try {
    const proc = Bun.spawn(
      ['git', '-C', factoryRoot, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
      { stdout: 'pipe', stderr: 'pipe', env: { ...Bun.env } }
    );
    const [stdout, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      proc.exited,
    ]);
    if (exitCode === 0) {
      const gitCommon = stdout.trim().replace(/\/$/, '');
      if (gitCommon) {
        // …/Projects/.git → …/Projects/toc-ops-repo
        candidates.push(joinPath(gitCommon, '..', 'toc-ops-repo'));
      }
    }
  } catch {
    // git optional for env / sibling layouts
  }

  // Codex/agent worktrees: Projects/.codex-worktrees/<lane>
  candidates.push(joinPath(factoryRoot, '..', '..', 'toc-ops-repo'));

  for (const candidate of candidates) {
    const abs = candidate;
    tried.push(abs);
    if (await pathHasPackageJson(abs)) return abs;
  }

  throw new Error(
    `toc-ops-repo not found for soft:accounting:from-ct. Set TOC_OPS_REPO to the Soft checkout. Tried: ${tried.join(' · ')}`
  );
}

function stableJson(value: SoftAccountingExport): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function assertPlayRow(row: SoftAccountingPlayRow, index: number): void {
  if (!row?.playId?.trim()) throw new Error(`plays[${index}].playId required`);
  if (!row?.partnerCode?.trim()) throw new Error(`plays[${index}].partnerCode required`);
  if (typeof row.stake !== 'number' || !Number.isFinite(row.stake)) {
    throw new Error(`plays[${index}].stake must be finite`);
  }
  if (typeof row.odds !== 'number' || !Number.isFinite(row.odds)) {
    throw new Error(`plays[${index}].odds must be finite`);
  }
  if (!row.placedAt?.trim()) throw new Error(`plays[${index}].placedAt required`);
}

function validateSoftCtExport(raw: SoftAccountingExport): void {
  if (raw.schema !== SOFT_ACCOUNTING_EXPORT_SCHEMA) {
    throw new Error(`expected schema ${SOFT_ACCOUNTING_EXPORT_SCHEMA}`);
  }
  if (raw.version !== '1') throw new Error('expected version "1"');
  if (raw.source !== 'soft-ct') throw new Error('expected source soft-ct');
  if (!Array.isArray(raw.plays)) throw new Error('plays must be an array');
  if (!Array.isArray(raw.weeks) || !Array.isArray(raw.byBookType)) {
    throw new Error('weeks/byBookType must be arrays');
  }
  raw.plays.forEach(assertPlayRow);
  if (raw.available !== raw.plays.length > 0) {
    throw new Error('available must equal plays.length > 0');
  }
}

export async function bakeSoftAccountingExport(
  options: { check?: boolean; generatedAt?: string } = {}
): Promise<{
  wrote: boolean;
  path: string;
  plays: number;
  available: boolean;
  source: SoftAccountingExport['source'];
}> {
  const check = options.check === true;
  const existingText = (await Bun.file(outPath).exists()) ? await Bun.file(outPath).text() : '';

  if (check && existingText) {
    const existing = JSON.parse(existingText) as SoftAccountingExport;
    if (existing.source === 'soft-ct') {
      validateSoftCtExport(existing);
      return {
        wrote: false,
        path: SOFT_ACCOUNTING_EXPORT_REL,
        plays: existing.plays.length,
        available: existing.available,
        source: 'soft-ct',
      };
    }
  }

  const toc = (await Bun.file(tocPath).json()) as TocOpsSnapshot;
  const next = projectSoftAccountingExportFromTocOps(toc, {
    generatedAt: options.generatedAt ?? '1970-01-01T00:00:00.000Z',
    source: 'toc-ops-fixture',
  });
  const rendered = stableJson(next);

  if (check) {
    if (existingText !== rendered) {
      throw new Error(`${SOFT_ACCOUNTING_EXPORT_REL} is stale; run bun run soft:accounting:bake`);
    }
    return {
      wrote: false,
      path: SOFT_ACCOUNTING_EXPORT_REL,
      plays: next.plays.length,
      available: next.available,
      source: 'toc-ops-fixture',
    };
  }

  if (existingText !== rendered) {
    await Bun.write(outPath, rendered);
    return {
      wrote: true,
      path: SOFT_ACCOUNTING_EXPORT_REL,
      plays: next.plays.length,
      available: next.available,
      source: 'toc-ops-fixture',
    };
  }
  return {
    wrote: false,
    path: SOFT_ACCOUNTING_EXPORT_REL,
    plays: next.plays.length,
    available: next.available,
    source: 'toc-ops-fixture',
  };
}

/** Run toc-ops `ct soft-accounting-export` into the Factory registry path. */
export async function importSoftAccountingExportFromCt(): Promise<{
  path: string;
  plays: number;
  available: boolean;
  source: 'soft-ct';
}> {
  const tocOpsRepo = await resolveTocOpsRepo(root);
  const bunBin = resolveBunExecutable();
  const proc = Bun.spawn(
    [bunBin, 'run', 'ct', 'soft-accounting-export', '--out', outPath, '--json'],
    {
      cwd: tocOpsRepo,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env },
    }
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(
      `ct soft-accounting-export failed (exit ${exitCode}) cwd=${tocOpsRepo} bun=${bunBin}: ${stderr || stdout}`.trim()
    );
  }
  const baked = (await Bun.file(outPath).json()) as SoftAccountingExport;
  validateSoftCtExport(baked);
  return {
    path: SOFT_ACCOUNTING_EXPORT_REL,
    plays: baked.plays.length,
    available: baked.available,
    source: 'soft-ct',
  };
}

if (import.meta.main) {
  const check = Bun.argv.includes('--check');
  const fromCt = Bun.argv.includes('--from-ct');
  const wantJson = Bun.argv.includes('--json');
  try {
    const result = fromCt
      ? await importSoftAccountingExportFromCt()
      : await bakeSoftAccountingExport({ check });
    if (wantJson) jsonOut(result);
    else {
      const verb = fromCt
        ? 'imported soft-ct'
        : check
          ? `current (${result.source})`
          : result.wrote
            ? 'wrote'
            : 'unchanged';
      console.log(
        `✅ soft accounting export ${verb} (${result.plays} plays · available=${result.available} · ${result.path})`
      );
    }
  } catch (error) {
    console.error(String(error instanceof Error ? error.message : error));
    process.exit(1);
  }
}
