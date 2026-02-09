#!/usr/bin/env bun

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

export const BLOCKED_PACKAGES = ['aws-sdk', 'event-stream'] as const;
export const CORE_SCAN_DIRS = ['scripts', 'server', 'lib', 'packages', 'src', 'dashboard', 'tests'] as const;

export function listBlockedDeps(pkg: PackageJson): Array<{ section: string; name: string; version: string }> {
  const out: Array<{ section: string; name: string; version: string }> = [];
  const sections: Array<['dependencies' | 'devDependencies' | 'optionalDependencies', Record<string, string> | undefined]> = [
    ['dependencies', pkg.dependencies],
    ['devDependencies', pkg.devDependencies],
    ['optionalDependencies', pkg.optionalDependencies],
  ];

  for (const [section, deps] of sections) {
    if (!deps) continue;
    for (const name of BLOCKED_PACKAGES) {
      if (Object.hasOwn(deps, name)) {
        out.push({ section, name, version: String(deps[name]) });
      }
    }
  }
  return out;
}

export function rgAvailable(): boolean {
  try {
    return Boolean(Bun.which('rg'));
  } catch {
    return false;
  }
}

export function scanBlockedImportsWithRipgrep(): string {
  const pattern = "(from ['\\\"](aws-sdk|event-stream)['\\\"]|require\\(['\\\"](aws-sdk|event-stream)['\\\"]\\))";
  const proc = Bun.spawnSync(
    ['rg', '-n', '-S', pattern, ...CORE_SCAN_DIRS],
    { cwd: process.cwd(), stderr: 'pipe', stdout: 'pipe' }
  );
  return proc.exitCode === 0 ? proc.stdout.toString().trim() : '';
}

export function scanBlockedImportsWithGrep(): string {
  const pattern = "from ['\\\"]aws-sdk['\\\"]|from ['\\\"]event-stream['\\\"]|require\\(['\\\"]aws-sdk['\\\"]\\)|require\\(['\\\"]event-stream['\\\"]\\)";
  const proc = Bun.spawnSync(
    ['grep', '-RInE', pattern, ...CORE_SCAN_DIRS],
    { cwd: process.cwd(), stderr: 'pipe', stdout: 'pipe' }
  );
  return proc.exitCode === 0 ? proc.stdout.toString().trim() : '';
}

export async function main(): Promise<void> {
  const pkgPath = resolve('package.json');
  const raw = JSON.parse(await readFile(pkgPath, 'utf8')) as PackageJson;
  const blockedDeps = listBlockedDeps(raw);
  const importHits = rgAvailable() ? scanBlockedImportsWithRipgrep() : scanBlockedImportsWithGrep();

  if (blockedDeps.length === 0 && !importHits) {
    console.log('[security:guard:deps] ok');
    return;
  }

  console.error('[security:guard:deps] failed');
  if (blockedDeps.length > 0) {
    console.error('- blocked packages present in package.json:');
    for (const dep of blockedDeps) {
      console.error(`  - ${dep.section}.${dep.name}=${dep.version}`);
    }
  }
  if (importHits) {
    console.error('- blocked imports/usages found in core runtime paths:');
    console.error(importHits);
  }
  process.exit(1);
}

if (import.meta.main) {
  await main();
}
