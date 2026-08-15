#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * validate-partner-domain-isolation.ts — Layer D brand domain homes.
 *
 *   bun run partner-surface-inventory:lint-domains
 *   bun scripts/validate-partner-domain-isolation.ts --scan
 *   bun scripts/validate-partner-domain-isolation.ts --scan --staged
 *   bun scripts/validate-partner-domain-isolation.ts --scan --strict
 *   bun scripts/validate-partner-domain-isolation.ts --rules
 */
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { inspectTable } from '../lib/console-depth.ts';
import { buildPartnerSurfaceInventory } from '../lib/docs/partner-surface-inventory.ts';
import {
  buildBrandHomeRules,
  scanDomainIsolation,
} from '../lib/docs/partner-surface-domain-lint.ts';
import { resolvePath } from './lib/fs-bun.ts';
import { listStagedFiles } from './lib/git-changed.ts';

const ROOT = resolvePath(import.meta.dir, '..');

const HELP = `partner-surface-inventory lint-domains — Layer D brand domain isolation

Usage:
  bun run partner-surface-inventory:lint-domains [-- flags]
  bun scripts/validate-partner-domain-isolation.ts [flags]

Flags:
  -h, --help, --hlp   Show this help
  --rules             Dump brand → domain → home globs
  --scan              Scan TypeScript for out-of-home brand type uses
  --staged            With --scan: inspect existing staged TS/TSX files only
  --strict            With --scan: out-of-home hits are errors (default warn)

Homes come from brand.module + category defaults (operations → lib/operations,
lib/telegram, packages/partners, …). cross-domain brands are allowed everywhere.
`;

function argsOf(argv: readonly string[]): readonly string[] {
  return argv.slice(2).filter(a => a !== '--');
}

function hasFlag(args: readonly string[], ...flags: string[]): boolean {
  return flags.some(f => args.includes(f));
}

async function main(argv: readonly string[] = Bun.argv): Promise<number> {
  const args = applyUnknownLongOptionGuardFor(
    'partner-surface-inventory:lint-domains',
    argsOf(argv)
  );
  if (args.length === 0 || hasFlag(args, '-h', '--help', '--hlp')) {
    console.log(HELP);
    return 0;
  }

  const inv = buildPartnerSurfaceInventory();

  if (hasFlag(args, '--rules')) {
    const rules = buildBrandHomeRules(inv.rows);
    const rows = rules.map(r => ({
      brand: r.brandType,
      domain: r.domain,
      category: r.category,
      homes: r.homeGlobs.length,
      sample: r.homeGlobs.slice(0, 3).join(' · '),
    }));
    console.log(inspectTable(rows, ['brand', 'domain', 'category', 'homes', 'sample']));
    console.info(`\n${rules.length} brand home rules · --scan to enforce`);
    return 0;
  }

  const known = new Set(['--scan', '--staged', '--strict', '--rules']);
  const unknown = args.filter(a => a.startsWith('-') && !known.has(a));
  if (unknown.length > 0) {
    console.error(`Unknown option(s): ${unknown.join(', ')}\n`);
    console.log(HELP);
    return 2;
  }

  if (!hasFlag(args, '--scan')) {
    console.log(HELP);
    return 0;
  }

  const result = await scanDomainIsolation({
    root: ROOT,
    rows: inv.rows,
    strict: hasFlag(args, '--strict'),
    files: hasFlag(args, '--staged') ? await listStagedFiles() : undefined,
  });

  const errors = result.issues.filter(i => i.level === 'error');
  const warns = result.issues.filter(i => i.level === 'warn');

  for (const i of warns.slice(0, 40)) {
    console.warn(`⚠️  ${i.message}`);
  }
  if (warns.length > 40) console.warn(`⚠️  … +${warns.length - 40} more warnings`);
  for (const i of errors.slice(0, 40)) {
    console.error(`❌ ${i.message}`);
  }
  if (errors.length > 40) console.error(`❌ … +${errors.length - 40} more errors`);

  if (errors.length === 0) {
    console.info(
      `✅ partner-surface-inventory lint-domains: scanned ${result.scannedFiles} files · ` +
        `${result.rules.length} brands · ${warns.length} warn · ${errors.length} error`
    );
    return 0;
  }

  console.error(
    `\n❌ ${errors.length} error(s), ${warns.length} warning(s)\n` +
      `Rules: bun scripts/validate-partner-domain-isolation.ts --rules\n` +
      `Help:  bun scripts/validate-partner-domain-isolation.ts --hlp`
  );
  return 1;
}

if (isModuleEntrypoint(import.meta)) {
  process.exit(await main());
}

export { main, HELP };
