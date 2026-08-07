#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/** Verify FactoryWager's committed and optional live Tennis SSOT release parity. */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { logTable } from '../lib/console-depth.ts';
import { joinPath } from '../lib/path-bun.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('tennis:ssot:release:check', Bun.argv.slice(2))
  : Bun.argv.slice(2);
import {
  loadTennisSsotReleaseParity,
  verifyLiveTennisSsotRelease,
} from '../lib/verification/tennis-ssot-release.ts';

const root = joinPath(import.meta.dir, '..');

async function main(): Promise<number> {
  const live = argv.includes('--live');
  let parity = await loadTennisSsotReleaseParity(root);
  if (live && parity.ok) parity = await verifyLiveTennisSsotRelease(parity);

  console.log(`Tennis SSOT release parity${live ? ' · live' : ' · offline'}`);
  console.log(`  package  ${parity.packageName}@${parity.version || 'missing'}`);
  console.log(`  storage  ${parity.size} bytes · sha256=${parity.sha256.slice(0, 16)}…`);
  logTable(
    parity.checks.map(row => ({
      check: row.name,
      status: row.ok ? 'PASS' : 'FAIL',
      detail: row.detail,
    })),
    ['check', 'status', 'detail']
  );
  console.log(
    parity.ok ? '✅ Tennis SSOT release parity passed' : '❌ Tennis SSOT release parity failed'
  );
  return parity.ok ? 0 : 1;
}

if (isModuleEntrypoint(import.meta)) process.exit(await main());
