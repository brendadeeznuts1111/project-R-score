#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * bake-partner-surface-inventory.ts → public/registry/partner-surface-inventory.json
 *
 *   bun run partner-surface-inventory:bake
 *   bun run partner-surface-inventory:check
 *
 * Partner-code and out-id rows are derived from public/registry/partners-ops.json
 * when present.
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import {
  liveOutIdsFromPartnersOps,
  livePartnerCodesFromPartnersOps,
} from '../lib/docs/partner-surface-docs.ts';
import {
  buildPartnerSurfaceInventory,
  type PartnerSurfaceLiveCode,
  type PartnerSurfaceLiveOut,
} from '../lib/docs/partner-surface-inventory.ts';
import { resolvePath } from './lib/fs-bun.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('partner-surface-inventory:bake', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const ROOT = resolvePath(import.meta.dir, '..');
const OUT_PATH = resolvePath(ROOT, 'public/registry/partner-surface-inventory.json');
const PARTNERS_OPS_PATH = resolvePath(ROOT, 'public/registry/partners-ops.json');
const CHECK = argv.includes('--check');

async function loadLiveFromPartnersOps(): Promise<{
  livePartnerCodes: readonly PartnerSurfaceLiveCode[];
  liveOutIds: readonly PartnerSurfaceLiveOut[];
}> {
  const file = Bun.file(PARTNERS_OPS_PATH);
  if (!(await file.exists())) {
    return { livePartnerCodes: [], liveOutIds: [] };
  }
  try {
    const artifact = await file.json();
    return {
      livePartnerCodes: livePartnerCodesFromPartnersOps(artifact),
      liveOutIds: liveOutIdsFromPartnersOps(artifact),
    };
  } catch {
    console.warn('⚠️  partners-ops.json unreadable — baking without partner-code/out-id rows');
    return { livePartnerCodes: [], liveOutIds: [] };
  }
}

async function main(): Promise<number> {
  const { livePartnerCodes, liveOutIds } = await loadLiveFromPartnersOps();
  const options = { livePartnerCodes, liveOutIds };

  if (CHECK) {
    if (!(await Bun.file(OUT_PATH).exists())) {
      console.error(`missing ${OUT_PATH} — run: bun run partner-surface-inventory:bake`);
      return 1;
    }
    const existing = (await Bun.file(OUT_PATH).json()) as Record<string, unknown>;
    const next = buildPartnerSurfaceInventory(
      typeof existing.bakedAt === 'string' ? existing.bakedAt : new Date().toISOString(),
      options
    );
    const a = { ...existing, bakedAt: 'x' };
    const b = { ...next, bakedAt: 'x' };
    if (!Bun.deepEquals(a, b, true)) {
      console.error(
        'partner-surface-inventory.json drift — run: bun run partner-surface-inventory:bake'
      );
      return 1;
    }
    console.info('partner-surface-inventory.json ok (deep-equal ignoring bakedAt)');
    return 0;
  }

  const map = buildPartnerSurfaceInventory(new Date().toISOString(), options);
  await Bun.write(OUT_PATH, `${JSON.stringify(map, null, 2)}\n`);
  const partnerCodes = map.rows.filter(r => r.aspect === 'partner-code').length;
  const outIds = map.rows.filter(r => r.aspect === 'out-id').length;
  console.info(
    `partner-surface-inventory.json baked: ${map.rows.length} rows · chrome nav ${listPartnerChromeCount(map)} · partner-codes ${partnerCodes} · out-ids ${outIds}`
  );
  return 0;
}

function listPartnerChromeCount(map: ReturnType<typeof buildPartnerSurfaceInventory>): number {
  return map.rows.filter(r => r.aspect === 'chrome-nav').length;
}

if (isModuleEntrypoint(import.meta)) {
  process.exit(await main());
}
