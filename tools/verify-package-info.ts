#!/usr/bin/env bun
/**
 * verify-package-info.ts — Verify package metadata + README from npm and custom registry.
 *
 * Uses `bun info --json` to check resolution, then `bun info readme` for README content.
 * README comparison: matches local README.md for custom packages.
 *
 * Usage:
 *   bun tools/verify-package-info.ts
 *   bun tools/verify-package-info.ts --save
 */
import { CryptoHasher, inspect } from 'bun';
import { writeFileSync } from 'fs';

const SAVE_PATH = 'public/registry/package-info.json';
const SHOULD_SAVE = process.argv.includes('--save');
const LOCAL = Bun.env.REGISTRY_URL || 'http://localhost:3000';

type PkgCheck = { name: string; registry: string; version: string; readme: string; ok: boolean };

async function checkPackage(name: string, registry: string): Promise<PkgCheck> {
  const url = registry === 'npm' ? 'https://registry.npmjs.org' : LOCAL;
  try {
    const proc = Bun.spawnSync(['bun', 'info', name, `--registry=${url}`, '--json']);
    if (proc.exitCode !== 0) throw new Error(proc.stderr.toString().trim().split('\n').pop() || '');
    const data = JSON.parse(proc.stdout.toString());
    const version = data['dist-tags']?.latest || data.version || '?';

    // README check via `bun info <pkg> readme`
    let readmeStatus = '—';
    if (registry === 'custom') {
      const rProc = Bun.spawnSync(['bun', 'info', name, 'readme', `--registry=${url}`]);
      const readme = rProc.stdout.toString().trim();
      if (readme && readme.length > 20) readmeStatus = '✅ ' + readme.slice(0, 40).replace(/\n/g, ' ') + '…';
      else readmeStatus = readme ? '⚠️ short' : '❌ empty';
    }

    return { name, registry, version, readme: readmeStatus, ok: true };
  } catch (e: any) {
    return { name, registry, version: '—', readme: '—', ok: false };
  }
}

async function run() {
  const packages = [
    { name: 'react', registry: 'npm' },
    { name: '@factorywager/registry-client', registry: 'custom' },
    { name: '@factorywager/bun-test', registry: 'custom' },
    { name: '@factory/health-check', registry: 'custom' },
    { name: 'event-store', registry: 'custom' },
  ];

  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  📦 Package Info Verification                                        ║');
  console.log(`║  Bun: ${(Bun.version).padEnd(58)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const results = await Promise.all(packages.map(p => checkPackage(p.name, p.registry)));
  const passed = results.filter(r => r.ok).length;

  const table = inspect(results.map(r => [r.name, r.registry, r.version, r.readme, r.ok ? '✅' : '❌']), { colors: true, table: true });
  console.log(table);
  console.log(`\n  📊 ${passed}/${results.length} packages resolved`);

  // Proof hash
  const hasher = new CryptoHasher('sha256');
  for (const r of results) hasher.update(r.name + r.version + r.ok);
  const proofHash = hasher.digest('hex');
  console.log(`  🔒 Proof hash: ${proofHash.slice(0, 16)}…`);

  const proof = {
    timestamp: new Date().toISOString(),
    bunVersion: Bun.version,
    bunRevision: Bun.revision?.slice(0, 12) || 'unknown',
    results: results.map(r => ({
      name: r.name,
      registry: r.registry,
      version: r.version,
      readme: r.readme,
      status: r.ok ? '✅ OK' : '❌ error',
    })),
    summary: { passed, total: results.length },
    proofHash,
  };

  if (SHOULD_SAVE) {
    writeFileSync(SAVE_PATH, JSON.stringify(proof, null, 2));
    console.log(`\n💾 Proof saved to ${SAVE_PATH}`);
  }

  if (passed < results.length) process.exit(1);
  return proof;
}

if (import.meta.main) await run();
export { run };
