#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which (PATH / cwd options)
// @see https://bun.com/docs/runtime/utils#bun-main — Bun.main vs import
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#input-stream — Bun.spawn input
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/guides/util/entrypoint — import.meta.main
// @see https://bun.com/docs/guides/util/which-path-to-executable-bin — Bun.which
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Soft bake CLI — Factory registry export from Soft / toc-ops fixture.
 *
 *   bun run soft:accounting:bake     # regenerate toc-ops-fixture demo bake
 *   bun run soft:accounting:check    # fixture exact-match OR soft-ct schema gate
 *   bun run soft:accounting:from-ct  # ct soft-accounting-export → registry (soft-ct)
 *
 * Bun native utils (see `lib/bun-executable.ts` + docs/BUN_NATIVE_CAPABILITIES.md Utilities):
 * - Bun.which(+ PATH) → locate bun for nested spawn (never bare `"bun"`)
 * - Bun.env → PATH source + child `env: { ...Bun.env }` (shallow copy, no mutate)
 * - import.meta.main → CLI guard (entrypoint guide; equiv. path === Bun.main)
 * - Bun.version / Bun.revision → TTY + `--json` provenance
 *
 * Soft Balance mutations stay in toc-ops-repo `ct`.
 * Override Soft checkout with `TOC_OPS_REPO=/abs/path/to/toc-ops-repo`.
 *
 * @see docs/design/soft-handshake.md
 * @see lib/telegram/soft-accounting-export.ts
 * @see lib/bun-executable.ts
 */
import {
  bunRuntimeProvenance,
  isModuleEntrypoint,
  resolveBunExecutable,
} from '../lib/bun-executable.ts';
import { joinPath } from '../lib/path-bun.ts';
import { jsonOut } from '../lib/console-depth.ts';
import type { TocOpsSnapshot } from '../lib/toc-ops/types.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('soft:accounting:bake', Bun.argv.slice(2))
  : Bun.argv.slice(2);
import {
  SOFT_ACCOUNTING_EXPORT_REL,
  SOFT_ACCOUNTING_EXPORT_SCHEMA,
  finalizeSoftAccountingExport,
  projectSoftAccountingExportFromTocOps,
  softBookTypeConceptId,
  type SoftAccountingExport,
  type SoftAccountingPlayRow,
} from '../lib/telegram/soft-accounting-export.ts';

export { clearBunExecutableCache, resolveBunExecutable } from '../lib/bun-executable.ts';

const root = joinPath(import.meta.dir, '..');
const outPath = joinPath(root, SOFT_ACCOUNTING_EXPORT_REL);
const tocPath = joinPath(root, 'public/registry/toc-ops.json');
const partnersOpsPath = joinPath(root, 'public/registry/partners-ops.json');

/** Primary out book.type.* per partner CODE (demo enrichment for fixture bake). */
async function partnerBookTypeMapFromPartnersOps(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!(await Bun.file(partnersOpsPath).exists())) return map;
  const ops = (await Bun.file(partnersOpsPath).json()) as {
    partners?: {
      code?: string; // brand-ok — partner CODE wire from partners-ops bake
      outs?: {
        book?: {
          typeConceptId?: string; // brand-ok — book.type.* glossary key from bake
          type?: string; // brand-ok — BookType token from bake
        };
      }[];
    }[];
  };
  for (const partner of ops.partners ?? []) {
    const code = String(partner.code || '')
      .trim()
      .toUpperCase();
    if (!code) continue;
    const primary = partner.outs?.[0]?.book;
    const concept =
      softBookTypeConceptId(primary?.typeConceptId) || softBookTypeConceptId(primary?.type);
    if (concept) map.set(code, concept);
  }
  return map;
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
    const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
    if (exitCode === 0) {
      // Strip trailing / or \ (Git for Windows) before joinPath.
      const gitCommon = stdout.trim().replace(/[/\\]+$/, '');
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

/** Schema gate for soft-ct exports (allows empty plays — use {@link assertSoftCtNonEmpty} for governance). */
export function validateSoftCtExport(raw: SoftAccountingExport): void {
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

/**
 * Governance: empty soft-ct must not pass check / overwrite the fixture bake.
 * Opt in with `--force` on from-ct only when an intentional empty snapshot is required.
 */
export function assertSoftCtNonEmpty(raw: SoftAccountingExport): void {
  validateSoftCtExport(raw);
  if (raw.plays.length === 0) {
    throw new Error(
      'soft-ct export has 0 plays (Soft DB empty or no Soft rows). Keep toc-ops-fixture: bun run soft:accounting:bake. from-ct: pass --force only for intentional empty snapshot.'
    );
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
      assertSoftCtNonEmpty(existing);
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
  const projected = projectSoftAccountingExportFromTocOps(toc, {
    generatedAt: options.generatedAt ?? '1970-01-01T00:00:00.000Z',
    source: 'toc-ops-fixture',
  });
  const next = finalizeSoftAccountingExport(projected, {
    partnerBookTypeByCode: await partnerBookTypeMapFromPartnersOps(),
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
export async function importSoftAccountingExportFromCt(options: { force?: boolean } = {}): Promise<{
  path: string;
  plays: number;
  available: boolean;
  source: 'soft-ct';
}> {
  const force = options.force === true;
  const tocOpsRepo = await resolveTocOpsRepo(root);
  const bunBin = resolveBunExecutable();
  const tmpOut = joinPath(root, 'public/registry/.soft-accounting-export.from-ct.tmp.json');
  const proc = Bun.spawn(
    [bunBin, 'run', 'ct', 'soft-accounting-export', '--out', tmpOut, '--json'],
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
  let baked: SoftAccountingExport;
  try {
    const raw = (await Bun.file(tmpOut).json()) as SoftAccountingExport;
    // Live soft-ct: Soft-authored odds/bookType → Factory rollups; no partners-ops enrich.
    baked = finalizeSoftAccountingExport({ ...raw, source: 'soft-ct' });
    if (force) validateSoftCtExport(baked);
    else assertSoftCtNonEmpty(baked);
    await Bun.write(outPath, `${JSON.stringify(baked, null, 2)}\n`);
  } finally {
    // @see https://bun.com/docs/guides/write-file/unlink — Bun.file().unlink()
    try {
      await Bun.file(tmpOut).unlink();
    } catch {
      /* tmp may be absent */
    }
  }
  return {
    path: SOFT_ACCOUNTING_EXPORT_REL,
    plays: baked.plays.length,
    available: baked.available,
    source: 'soft-ct',
  };
}

// Direct CLI entry (entrypoint guide) — not when this module is imported by tests.
if (isModuleEntrypoint(import.meta)) {
  const check = argv.includes('--check');
  const fromCt = argv.includes('--from-ct');
  const force = argv.includes('--force');
  const wantJson = argv.includes('--json');
  try {
    const result = fromCt
      ? await importSoftAccountingExportFromCt({ force })
      : await bakeSoftAccountingExport({ check });
    if (wantJson) {
      jsonOut({
        ...result,
        ...bunRuntimeProvenance(),
      });
    } else {
      const verb = fromCt
        ? 'imported soft-ct'
        : check
          ? `current (${result.source})`
          : result.wrote
            ? 'wrote'
            : 'unchanged';
      console.log(
        `✅ soft accounting export ${verb} (${result.plays} plays · available=${result.available} · ${result.path}) · bun ${Bun.version}`
      );
    }
  } catch (error) {
    console.error(String(error instanceof Error ? error.message : error));
    process.exit(1);
  }
}
