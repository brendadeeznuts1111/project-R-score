#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * bake-partner-surface-inventory.ts → public/registry/partner-surface-inventory.json
 *
 *   bun run partner-surface-inventory:bake
 *   bun run partner-surface-inventory:check
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { buildPartnerSurfaceInventory } from '../lib/docs/partner-surface-inventory.ts';
import { resolvePath } from './lib/fs-bun.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const OUT_PATH = resolvePath(ROOT, 'public/registry/partner-surface-inventory.json');
const CHECK = Bun.argv.includes('--check');

async function main(): Promise<number> {
  if (CHECK) {
    if (!(await Bun.file(OUT_PATH).exists())) {
      console.error(`missing ${OUT_PATH} — run: bun run partner-surface-inventory:bake`);
      return 1;
    }
    const existing = (await Bun.file(OUT_PATH).json()) as Record<string, unknown>;
    const next = buildPartnerSurfaceInventory(
      typeof existing.bakedAt === 'string' ? existing.bakedAt : new Date().toISOString()
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

  const map = buildPartnerSurfaceInventory();
  await Bun.write(OUT_PATH, `${JSON.stringify(map, null, 2)}\n`);
  console.info(
    `partner-surface-inventory.json baked: ${map.rows.length} rows · chrome nav ${listPartnerChromeCount(map)}`
  );
  return 0;
}

function listPartnerChromeCount(map: ReturnType<typeof buildPartnerSurfaceInventory>): number {
  return map.rows.filter(r => r.aspect === 'chrome-nav').length;
}

if (isModuleEntrypoint(import.meta)) {
  process.exit(await main());
}
