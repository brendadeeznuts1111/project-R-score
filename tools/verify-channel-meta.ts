#!/usr/bin/env bun
/**
 * Prefer-artifact channel meta refresh (suite=all merge without full release re-run).
 *
 *   bun tools/verify-channel-meta.ts --prefer-artifacts --save
 *   bun run verify:channel:meta
 *
 * @see lib/verification/channel-meta-refresh.ts
 * @see docs/harness/tenants/channel-meta-verification.md
 */
import { parseArgs } from 'util';
import {
  refreshChannelMetaProof,
  saveChannelMetaProof,
} from '../lib/verification/channel-meta-refresh.ts';

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    save: { type: 'boolean', default: false },
    'prefer-artifacts': { type: 'boolean', default: true },
    'no-prefer-artifacts': { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
  },
  strict: true,
  allowPositionals: false,
});

async function main(): Promise<void> {
  const preferArtifacts = values['no-prefer-artifacts']
    ? false
    : (values['prefer-artifacts'] ?? true);

  const { report, sources } = await refreshChannelMetaProof({ preferArtifacts });

  console.log(
    `channel-meta: ${report.summary.passed}/${report.summary.total} (${report.summary.status})`
  );
  console.log(
    `sources: release=${sources.release} nits=${sources.nits} bundler=${sources.bundler} networking=${sources.networking}`
  );
  if (report.summary.bySubsystem) {
    const parts = Object.entries(report.summary.bySubsystem)
      .filter(([, v]) => v && v.total > 0)
      .map(([k, v]) => `${k} ${v!.passed}/${v!.total}`);
    if (parts.length) console.log(`By subsystem: ${parts.join(' · ')}`);
  }
  console.log(`Proof hash: ${report.proofHash.slice(0, 16)}…`);

  if (values.save) {
    const { savePath, snapshotPath, bakePath } = await saveChannelMetaProof(report, sources);
    console.log(`Saved: ${savePath}`);
    if (snapshotPath !== savePath) console.log(`Saved: ${snapshotPath}`);
    console.log(`Saved: ${bakePath}`);
  }

  if (values.json) {
    console.log('\n---JSON---');
    console.log(JSON.stringify({ sources, report }, null, 2));
  }

  if (report.summary.status !== 'pass') process.exit(1);
}

if (import.meta.main) {
  main().catch(e => {
    console.error('Fatal:', e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
