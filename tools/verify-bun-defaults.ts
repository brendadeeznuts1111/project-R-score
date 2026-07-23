#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/hashing#bun-password
// @see https://bun.com/docs/runtime/hashing#bun-hash
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher
// @see https://bun.com/docs/runtime/utils#bun-inspect
// @see https://bun.com/docs/runtime/utils#bun-which
// @see https://bun.com/docs/runtime/utils#bun-escapehtml
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-sleep
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write
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
import {
  BunDefaultsReport,
  buildBunDefaultsProof,
} from '../lib/http/bun-defaults-proof.ts';

const AS_JSON = process.argv.includes('--json');
const SAVE = process.argv.find(a => a.startsWith('--save='))?.slice('--save='.length);

const proof = await buildBunDefaultsProof();
const report = new BunDefaultsReport(proof);

if (SAVE) {
  await Bun.write(SAVE, JSON.stringify(proof, null, 2) + '\n');
  console.error(`wrote ${SAVE}`);
}

if (AS_JSON) {
  console.log(JSON.stringify(proof, null, 2));
} else {
  console.log(report);
  console.log('');
  console.log('Canonical notes:');
  console.log('  • password.hash default: argon2id (not bcrypt on 1.4)');
  console.log('  • Bun.hash: bigint Wyhash');
  console.log('  • CryptoHasher: algorithm required');
  console.log('  • serve port:0 = ephemeral; omit port → BUN_PORT|PORT|NODE_PORT|3000');
}

if (proof.summary.failed > 0) process.exit(1);
