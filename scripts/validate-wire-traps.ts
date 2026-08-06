#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * validate-wire-traps.ts — Layer C inventory-aware naked partnerId lint.
 *
 *   bun run partner-surface-inventory:lint-wires
 *
 * Allowlist = wire-field rows with resolvesTo=ExternalPartnerRef +
 * boundaryPathGlobs. Does not use ast-grep; inventory is SSOT.
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { buildPartnerSurfaceInventory } from '../lib/docs/partner-surface-inventory.ts';
import { scanWireTraps } from '../lib/docs/partner-surface-wire-lint.ts';
import { resolvePath } from './lib/fs-bun.ts';

const ROOT = resolvePath(import.meta.dir, '..');

async function main(): Promise<number> {
  const inv = buildPartnerSurfaceInventory();
  const result = await scanWireTraps({ root: ROOT, rows: inv.rows });
  const errors = result.issues.filter(i => i.level === 'error');
  const warns = result.issues.filter(i => i.level === 'warn');

  for (const i of warns) console.warn(`⚠️  ${i.message}`);
  for (const i of errors) console.error(`❌ ${i.message}`);

  if (errors.length === 0) {
    console.info(
      `✅ partner-surface-inventory lint-wires: scanned ${result.scannedFiles} files · ` +
        `${result.allowGlobs.length} allow globs · ${warns.length} warn · ` +
        `allow=[${result.allowGlobs.join(', ') || '∅'}]`
    );
  } else {
    console.error(
      `\nAllowed boundaryPathGlobs from inventory:\n  ${
        result.allowGlobs.join('\n  ') || '(none — add wire-field boundaryPathGlobs)'
      }`
    );
  }
  return errors.length === 0 ? 0 : 1;
}

if (isModuleEntrypoint(import.meta)) {
  process.exit(await main());
}

export { main };
