#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
/**
 * Bundler loader verification — Asset Processing (css / jsonc / ts / text / file).
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
 * @see https://bun.com/docs/bundler/loaders#ts
 * @see https://bun.com/docs/bundler/loaders#text
 * @see https://bun.com/docs/bundler/loaders#file
 */
import { CryptoHasher } from 'bun';
import { parseArgs } from 'util';
import { runBundlerLoaderVerification } from '../lib/verification/bundler-loader-probes.ts';
import { buildSemanticTags } from '../lib/verification/channels.ts';
import { generateJSONLD } from '../lib/verification/jsonld.ts';
import { summarizeBySubsystem, withSubsystem } from '../lib/verification/subsystem.ts';
import type { ChannelAwareVerificationReport, SemanticTags } from '../lib/verification/types.ts';
import { BUNDLER_PROOF_REPORT_PATH } from '../lib/verification/types.ts';

const SAVE_PATH = `public${BUNDLER_PROOF_REPORT_PATH}`;

export async function runBundlerVerification(options?: {
  semanticTags?: SemanticTags;
  channel?: string;
}): Promise<ChannelAwareVerificationReport> {
  const semanticTags =
    options?.semanticTags ?? (await buildSemanticTags(options?.channel ?? 'runtime'));
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
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      save: { type: 'boolean', default: false },
      channel: { type: 'string', default: 'runtime' },
    },
    strict: true,
    allowPositionals: false,
  });

  const proof = await runBundlerVerification({ channel: values.channel });
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
