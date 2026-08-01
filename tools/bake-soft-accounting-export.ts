#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Bake Soft→Factory accounting export from the Pages toc-ops fixture (demo).
 *
 *   bun run soft:accounting:bake
 *   bun run soft:accounting:check
 *
 * Soft Balance mutations stay in toc-ops-repo `ct`. This bake is
 * `source: "toc-ops-fixture"` until Soft writes `source: "soft-ct"`.
 *
 * @see docs/design/soft-handshake.md
 * @see lib/telegram/soft-accounting-export.ts
 */
import { joinPath } from '../lib/path-bun.ts';
import { jsonOut } from '../lib/console-depth.ts';
import type { TocOpsSnapshot } from '../lib/toc-ops/types.ts';
import {
  SOFT_ACCOUNTING_EXPORT_REL,
  projectSoftAccountingExportFromTocOps,
  type SoftAccountingExport,
} from '../lib/telegram/soft-accounting-export.ts';

const root = joinPath(import.meta.dir, '..');
const outPath = joinPath(root, SOFT_ACCOUNTING_EXPORT_REL);
const tocPath = joinPath(root, 'public/registry/toc-ops.json');

function stableJson(value: SoftAccountingExport): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function bakeSoftAccountingExport(
  options: { check?: boolean; generatedAt?: string } = {}
): Promise<{ wrote: boolean; path: string; plays: number; available: boolean }> {
  const toc = (await Bun.file(tocPath).json()) as TocOpsSnapshot;
  const next = projectSoftAccountingExportFromTocOps(toc, {
    generatedAt: options.generatedAt ?? '1970-01-01T00:00:00.000Z',
    source: 'toc-ops-fixture',
  });
  const rendered = stableJson(next);
  const check = options.check === true;
  const existing = (await Bun.file(outPath).exists()) ? await Bun.file(outPath).text() : '';

  if (check) {
    if (existing !== rendered) {
      throw new Error(`${SOFT_ACCOUNTING_EXPORT_REL} is stale; run bun run soft:accounting:bake`);
    }
    return {
      wrote: false,
      path: SOFT_ACCOUNTING_EXPORT_REL,
      plays: next.plays.length,
      available: next.available,
    };
  }

  if (existing !== rendered) {
    await Bun.write(outPath, rendered);
    return {
      wrote: true,
      path: SOFT_ACCOUNTING_EXPORT_REL,
      plays: next.plays.length,
      available: next.available,
    };
  }
  return {
    wrote: false,
    path: SOFT_ACCOUNTING_EXPORT_REL,
    plays: next.plays.length,
    available: next.available,
  };
}

if (import.meta.main) {
  const check = Bun.argv.includes('--check');
  const wantJson = Bun.argv.includes('--json');
  try {
    const result = await bakeSoftAccountingExport({ check });
    if (wantJson) jsonOut(result);
    else {
      const verb = check ? 'current' : result.wrote ? 'wrote' : 'unchanged';
      console.log(
        `✅ soft accounting export ${verb} (${result.plays} plays · available=${result.available} · ${result.path})`
      );
    }
  } catch (error) {
    console.error(String(error instanceof Error ? error.message : error));
    process.exit(1);
  }
}
