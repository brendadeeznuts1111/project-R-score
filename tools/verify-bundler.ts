#!/usr/bin/env bun
/**
 * Bundler loader verification — Asset Processing (css / jsonc).
 *
 * Usage:
 *   bun tools/verify-bundler.ts
 *   bun tools/verify-bundler.ts --save
 *
 * Proof: public/registry/bundler-loaders-proof.json
 *
 * @see https://bun.com/docs/bundler#content-types
 * @see https://bun.com/docs/bundler/loaders#css
 * @see https://bun.com/docs/bundler/loaders#jsonc
 */
import { CryptoHasher } from 'bun';
import { parseArgs } from 'util';
import { runBundlerLoaderVerification } from '../lib/verification/bundler-loader-probes.ts';
import { buildSemanticTags } from '../lib/verification/channels.ts';
import { generateJSONLD } from '../lib/verification/jsonld.ts';
import { summarizeBySubsystem, withSubsystem } from '../lib/verification/subsystem.ts';
import type { ChannelAwareVerificationReport } from '../lib/verification/types.ts';
import { BUNDLER_PROOF_REPORT_PATH } from '../lib/verification/types.ts';

const SAVE_PATH = `public${BUNDLER_PROOF_REPORT_PATH}`;

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    save: { type: 'boolean', default: false },
    channel: { type: 'string', default: 'runtime' },
  },
  strict: true,
  allowPositionals: false,
});

export async function runBundlerVerification(options?: {
  semanticTags?: Awaited<ReturnType<typeof buildSemanticTags>>;
}): Promise<ChannelAwareVerificationReport> {
  const semanticTags =
    options?.semanticTags ?? (await buildSemanticTags(values.channel ?? 'runtime'));
  const { results: raw } = await runBundlerLoaderVerification();
  const results = raw.map(r => withSubsystem(r, 'bundler'));
  const bySubsystem = summarizeBySubsystem(results);
  const passed = results.filter(r => r.passed).length;

  const hasher = new CryptoHasher('sha256');
  hasher.update(JSON.stringify(semanticTags));
  for (const r of results) {
    hasher.update(r.name + r.passed + (r.canonical ?? '') + JSON.stringify(r._links ?? {}));
  }

  return {
    type: 'ChannelAwareVerificationReport',
    version: '1.0.0',
    timestamp: semanticTags.testedAt,
    bunVersion: Bun.version,
    bunRevision: (Bun.revision || '').slice(0, 12) || 'unknown',
    semanticTags: {
      ...semanticTags,
      subsystems: ['bundler'],
    },
    results,
    summary: {
      passed,
      total: results.length,
      status: passed === results.length ? 'pass' : 'fail',
      channel: String(semanticTags.channel),
      version: semanticTags.targetVersion,
      bySubsystem,
    },
    proofHash: hasher.digest('hex'),
    jsonLd: generateJSONLD(results, { ...semanticTags, subsystems: ['bundler'] }),
  };
}

async function main(): Promise<void> {
  const proof = await runBundlerVerification();
  console.log(
    `\nBundler loaders: ${proof.summary.passed}/${proof.summary.total} (${proof.summary.status})`
  );
  for (const r of proof.results) {
    console.log(`  ${r.passed ? '✓' : '✗'} ${r.name} — ${r.actual}`);
  }
  console.log(`Proof hash: ${proof.proofHash.slice(0, 16)}…`);

  if (values.save) {
    await Bun.write(SAVE_PATH, JSON.stringify(proof, null, 2));
    console.log(`Saved: ${SAVE_PATH}`);
  }

  console.log('\n---JSON---');
  console.log(JSON.stringify(proof));

  if (proof.summary.status !== 'pass') process.exit(1);
}

if (import.meta.main) {
  main().catch(e => {
    console.error('Fatal:', e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
