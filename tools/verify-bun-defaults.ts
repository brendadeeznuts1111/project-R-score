#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/hashing#bun-password
// @see https://bun.com/docs/runtime/hashing#bun-hash
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher
// @see https://bun.com/docs/runtime/utils#bun-inspect
// @see https://bun.com/docs/runtime/utils#bun-which
// @see https://bun.com/docs/runtime/utils#bun-escapehtml
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-sleep
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * 12 Bun default-behavior checks (runtime-measured, not folklore).
 *
 *   bun tools/verify-bun-defaults.ts
 *   bun tools/verify-bun-defaults.ts --json
 *   bun run check:bun-defaults
 *
 * Notes (Bun 1.4):
 *   - password.hash default = argon2id (not bcrypt)
 *   - Bun.hash returns bigint
 *   - inspect default depth expands shallow nests; assert depth options
 */
import { BunDefaultsReport, buildBunDefaultsProof } from '../lib/http/bun-defaults-proof.ts';
import { runDefaultsVerification } from '../lib/http/defaults-cron.ts';
import { jsonOut, logDepth } from '../lib/console-depth.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('check:bun-defaults', Bun.argv.slice(2))
  : Bun.argv.slice(2);
/** Programmatic entry for cron / importers. */
export { runDefaultsVerification };

const AS_JSON = argv.includes('--json');
const SAVE = process.argv.find(a => a.startsWith('--save='))?.slice('--save='.length);

if (import.meta.main) {
  const result = await runDefaultsVerification({
    savePath: SAVE,
    quiet: AS_JSON,
  });
  const proof = result.proof ?? (await buildBunDefaultsProof());
  const report = new BunDefaultsReport(proof);

  if (AS_JSON) {
    jsonOut(proof);
  } else {
    logDepth(report);
    if (result.path) console.log(`\nwrote ${result.path}`);
    console.log('');
    console.log('Canonical notes:');
    console.log('  • password.hash default: argon2id (not bcrypt on 1.4)');
    console.log('  • Bun.hash: bigint Wyhash');
    console.log('  • CryptoHasher: algorithm required');
    console.log('  • serve port:0 = ephemeral; omit port → BUN_PORT|PORT|NODE_PORT|3000');
    console.log(
      '  • cron: BUN_DEFAULTS_CRON=1 · schedule 0 4 * * * UTC (lib/http/defaults-cron.ts)'
    );
  }

  process.exit(result.code);
}
