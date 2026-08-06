#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * bake-partner-surface-docs.ts → docs/design/partner-surface-inventory.generated.md
 *
 *   bun run partner-surface-inventory:docs
 *   bun run partner-surface-inventory:docs:check
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { buildPartnerSurfaceInventory } from '../lib/docs/partner-surface-inventory.ts';
import {
  PARTNER_SURFACE_GENERATED_DOC_REL,
  formatPartnerSurfaceGeneratedMarkdown,
  loadLiveOutIds,
  loadLivePartnerCodes,
} from '../lib/docs/partner-surface-docs.ts';
import { resolvePath } from './lib/fs-bun.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const OUT_PATH = resolvePath(ROOT, PARTNER_SURFACE_GENERATED_DOC_REL);
const PARTNERS_OPS_PATH = resolvePath(ROOT, 'public/registry/partners-ops.json');
const CHECK = Bun.argv.includes('--check');

async function render(): Promise<{ markdown: string; warned: boolean }> {
  const { codes, warned: codesWarned } = await loadLivePartnerCodes(PARTNERS_OPS_PATH);
  const { outs, warned: outsWarned } = await loadLiveOutIds(PARTNERS_OPS_PATH);
  const warned = codesWarned || outsWarned;
  const inv = buildPartnerSurfaceInventory('—', {
    livePartnerCodes: codes ?? [],
    liveOutIds: outs ?? [],
  });
  return {
    markdown: formatPartnerSurfaceGeneratedMarkdown(inv, codes),
    warned,
  };
}

async function main(): Promise<number> {
  const { markdown, warned } = await render();

  if (CHECK) {
    if (!(await Bun.file(OUT_PATH).exists())) {
      console.error(
        `missing ${PARTNER_SURFACE_GENERATED_DOC_REL} — run: bun run partner-surface-inventory:docs`
      );
      return 1;
    }
    const existing = await Bun.file(OUT_PATH).text();
    if (existing !== markdown) {
      console.error(
        `${PARTNER_SURFACE_GENERATED_DOC_REL} drift — run: bun run partner-surface-inventory:docs`
      );
      return 1;
    }
    if (warned) {
      console.warn(
        '⚠️  partners-ops bake absent or unreadable — live PartnerCodes section is placeholder'
      );
    }
    console.info(`✅ ${PARTNER_SURFACE_GENERATED_DOC_REL} current`);
    return 0;
  }

  await Bun.write(OUT_PATH, markdown);
  if (warned) {
    console.warn(
      '⚠️  partners-ops bake absent or unreadable — live PartnerCodes section is placeholder'
    );
  }
  console.info(`✅ wrote ${PARTNER_SURFACE_GENERATED_DOC_REL}`);
  return 0;
}

if (isModuleEntrypoint(import.meta)) {
  process.exit(await main());
}

export { main, OUT_PATH, PARTNER_SURFACE_GENERATED_DOC_REL };
