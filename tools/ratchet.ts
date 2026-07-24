#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/bundler/executables — --force
// @see ../lib/verification/ratchet.ts — ratchet mechanism
/**
 * Ratchet CLI — version-locked verification per channel.
 *
 *   bun tools/ratchet.ts [--channel=stable|canary] [--force]
 *
 * Exit 1 when a regression is detected (fewer passes than the last record).
 */

import { getChannelDelta, ratchetVerify } from '../lib/verification/ratchet.ts';

const args = Bun.argv.slice(2);
const channel = args.find(a => a.startsWith('--channel='))?.slice(10) ?? 'stable';
const force = args.includes('--force');

console.log(`🔍 Ratchet verification — channel: ${channel}${force ? ' (forced)' : ''}`);

const delta = await getChannelDelta(channel);
if (delta.isNew) {
  console.log(
    `🆕 Channel moved: ${delta.previousVersion ?? 'never verified'} → ${delta.currentVersion}`
  );
} else {
  console.log(`✅ Already verified at ${delta.currentVersion}`);
}

const result = await ratchetVerify(channel, { force });

if (result.skipped) {
  console.log('Use --force to re-run verification.');
  process.exit(0);
}

const { current, previous, regressed, diff } = result;
console.log(
  Bun.inspect.table([
    {
      Record: 'previous',
      Version: previous?.version ?? '—',
      Passed: previous ? `${previous.summary.passed}/${previous.summary.total}` : '—',
      Hash: previous?.proofHash.slice(0, 12) ?? '—',
    },
    {
      Record: 'current',
      Version: current.version,
      Passed: `${current.summary.passed}/${current.summary.total}`,
      Hash: current.proofHash.slice(0, 12),
    },
  ])
);

if (regressed) {
  if (force) {
    console.warn(
      `\n⚠️  REGRESSION on ${channel} accepted via --force: ${diff!.previousPassed} → ${diff!.currentPassed} passed`
    );
    for (const t of diff!.failingTests) console.warn(`   ✗ ${t}`);
    console.warn('Ratchet updated anyway (explicit accept).');
  } else {
    console.error(
      `\n❌ REGRESSION on ${channel}: ${diff!.previousPassed} → ${diff!.currentPassed} passed`
    );
    for (const t of diff!.failingTests) console.error(`   ✗ ${t}`);
    console.error('\nRatchet NOT updated. Fix the failures or run with --force to accept.');
    process.exit(1);
  }
}

console.log(
  `\n✅ Ratchet updated: ${current.version} (${current.summary.passed}/${current.summary.total})`
);
