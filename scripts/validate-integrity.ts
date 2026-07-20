#!/usr/bin/env bun
/**
 * Gated integrity checks after bun-migrate apply phases.
 *
 * Uses the same PATTERN_MAP scanner as inventory; fails when product code
 * still matches patterns for migrated sections.
 *
 * @see scripts/bun-migrate.ts
 * @see scripts/BUN_NATIVE.md
 */
import { scanUsageInventory, VALIDATE_WHITELIST, type MigrateSection } from './bun-migrate.ts';

const DEFAULT_ROOTS = ['lib', 'tools', 'scripts', 'packages'];

function flagValue(args: string[], name: string): string | undefined {
  // Prefer last occurrence so `bun run validate:integrity --section runtime` wins
  // over a script-default `--section=crypto` if both appear.
  let found: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith(`${name}=`)) found = a.slice(name.length + 1);
    else if (a === name) found = args[i + 1];
  }
  return found;
}

function parseSection(args: string[]): MigrateSection[] | 'all' {
  const raw = flagValue(args, '--section') ?? 'crypto';
  if (raw === 'all') return 'all';
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean) as MigrateSection[];
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  const sections = parseSection(args);
  const rootsRaw = flagValue(args, '--roots');
  const roots = rootsRaw
    ? rootsRaw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : DEFAULT_ROOTS;

  const report = await scanUsageInventory({ roots });
  const want =
    sections === 'all'
      ? (['crypto', 'runtime', 'fs', 'shell', 'test'] as MigrateSection[])
      : sections;

  const violations = report.hits.filter(h => {
    if (!want.includes(h.migrateSection)) return false;
    if (VALIDATE_WHITELIST.has(h.file)) return false;
    return true;
  });

  const whitelisted = report.hits.filter(
    h => want.includes(h.migrateSection) && VALIDATE_WHITELIST.has(h.file)
  ).length;

  console.info(
    `validate:integrity · sections=${want.join(',')} · roots=${roots.join(',')} · whitelist=${whitelisted}`
  );

  if (violations.length === 0) {
    console.info(`✅ No ${want.join('/')} pattern violations in product code.`);
    process.exit(0);
  }

  const bySection: Record<string, number> = {};
  for (const v of violations) {
    bySection[v.migrateSection] = (bySection[v.migrateSection] ?? 0) + 1;
  }
  console.error(`❌ ${violations.length} violation(s): ${JSON.stringify(bySection)}`);

  for (const v of violations.slice(0, 40)) {
    console.error(`  ${v.file}:${v.line}  ${v.nodePattern} → ${v.bunToken}  [${v.migrateSection}]`);
  }
  if (violations.length > 40) {
    console.error(`  … and ${violations.length - 40} more`);
  }

  process.exit(1);
}

if (import.meta.main) {
  await main();
}
