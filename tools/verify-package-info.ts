#!/usr/bin/env bun
/**
 * verify-package-info.ts — Verify package metadata from npm and custom registry.
 *
 * Uses `bun info --json` to check package resolution and version availability.
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

type PkgCheck = { name: string; registry: string; version: string; statusCode: number; ok: boolean };

async function checkPackage(name: string, registry: string): Promise<PkgCheck> {
  const url = registry === 'npm' ? 'https://registry.npmjs.org' : LOCAL;
  try {
    const proc = Bun.spawnSync(['bun', 'info', name, `--registry=${url}`, '--json']);
    if (proc.exitCode !== 0) throw new Error(proc.stderr.toString().trim().split('\n').pop() || 'unknown');
    const data = JSON.parse(proc.stdout.toString());
    const version = data['dist-tags']?.latest || data.version || '?';
    return { name, registry, version, statusCode: 200, ok: true };
  } catch (e: any) {
    return { name, registry, version: '—', statusCode: 0, ok: false };
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

  const table = inspect(results.map(r => [r.name, r.registry, r.version, r.ok ? '✅' : '❌']), { colors: true, table: true });
  console.log(table);
  console.log(`\n  📊 ${passed}/${results.length} packages resolved`);

  // Proof hash
  const hasher = new CryptoHasher('sha256');
  for (const r of results) hasher.update(r.name + r.version + r.ok);
  const proofHash = hasher.digest('hex');
  console.log(`  🔒 Proof hash: ${proofHash.slice(0, 16)}…`);

  const proof = {
    schemaVersion: 1,
    bunVersion: Bun.version,
    timestamp: new Date().toISOString(),
    total: results.length,
    passed,
    proofHash,
    results,
  };

  if (SHOULD_SAVE) {
    writeFileSync(SAVE_PATH, JSON.stringify(proof, null, 2));
    console.log(`\n💾 Proof saved to ${SAVE_PATH}`);
  }

  if (!proof.allOk && passed < results.length) process.exit(1);
  return proof;
}

if (import.meta.main) await run();
export { run };
