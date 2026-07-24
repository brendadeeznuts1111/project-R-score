#!/usr/bin/env bun
/**
 * ratchet.ts — CLI tool for channel-based verification ratchet.
 *
 * Checks if the current Bun version matches the last verified version.
 * If new: runs verification, updates ratchet, fails on regression.
 *
 * Usage:
 *   bun tools/ratchet.ts                          # check + verify latest
 *   bun tools/ratchet.ts --channel=canary          # check canary
 *   bun tools/ratchet.ts --force                   # re-verify same version
 *   bun tools/ratchet.ts --status                  # show ratchet status only
 */
import { getChannelDelta, getChannelRatchet, ratchetVerify } from '../lib/verification/ratchet.ts';

const args = process.argv.slice(2);
const channel = args.find(a => a.startsWith('--channel='))?.split('=')[1] || 'latest';
const force = args.includes('--force') || args.includes('-f');
const statusOnly = args.includes('--status') || args.includes('-s');

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  🔧 Ratchet — Channel Verification Lock                              ║');
  console.log(`║  ${(`Channel: ${channel}`).padEnd(58)}║`);
  console.log(`║  ${(`Bun: ${Bun.version}`).padEnd(58)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  if (statusOnly) {
    const delta = await getChannelDelta(channel);
    const previous = await getChannelRatchet(channel);
    console.log(`  Channel:     ${channel}`);
    console.log(`  Current:     ${delta.currentVersion}`);
    console.log(`  Previous:    ${delta.previousVersion || '—'}`);
    console.log(`  New version: ${delta.isNew ? '✅ yes' : '❌ no'}`);
    if (previous) {
      console.log(`  Last verified: ${previous.verifiedAt}`);
      console.log(`  Summary:       ${previous.summary.passed}/${previous.summary.total}`);
      console.log(`  Proof hash:    ${previous.proofHash.slice(0, 16)}…`);
    } else {
      console.log('  No previous verification recorded.');
    }
    return;
  }

  console.log('  Checking for new version...');
  const delta = await getChannelDelta(channel);
  console.log(`  Current: ${delta.currentVersion}`);
  console.log(`  Previous: ${delta.previousVersion || '—'}`);

  if (!force && !delta.isNew) {
    console.log(`\n  ✅ Already verified at ${delta.currentVersion}. Use --force to re-run.`);
    process.exit(0);
  }

  if (delta.isNew) {
    console.log(`  🆕 ${delta.previousVersion} → ${delta.currentVersion}`);
  }
  if (force) console.log('  ⚡ Force mode');

  console.log('\n  Running verification...\n');

  // Run verify-all pipeline — non-zero exit is OK, we still check results
  const verify = Bun.spawnSync(['bun', 'run', 'verify-all']);
  if (verify.exitCode !== 0) {
    console.log('  📋 verify-all exit code:', verify.exitCode, '(non-blocking, checking results...)');
  }

  const result = await ratchetVerify({ channel, force });

  if (result.regressed) {
    console.error(`\n  ❌ REGRESSION DETECTED for channel "${channel}"!`);
    console.error(`     Previous: ${result.previous!.summary.passed}/${result.previous!.summary.total}`);
    console.error(`     Current:  ${result.current.summary.passed}/${result.current.summary.total}`);
    if (result.diff) {
      console.error(`     Failing:  ${result.diff.failingTests.join(', ')}`);
    }
    process.exit(1);
  }

  console.log(`\n  ✅ Ratchet updated: ${result.current.version}`);
  console.log(`     ${result.current.summary.passed}/${result.current.summary.total} passed`);
  console.log(`     Hash: ${result.current.proofHash.slice(0, 16)}…`);
  console.log(`     Saved to public/registry/ratchet.json`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
