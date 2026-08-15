#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.write
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Grouped harness report — worst offenders, catalog groups, easy-fix standard catches.
 */
import {
  buildHarnessReport,
  renderMarkdownReport,
  renderTerminalReport,
  serializeReport,
} from '../config/eslint/harness/report.ts';
import { collectBunCacheMetrics } from './lib/bun-cache-metrics.ts';

const repoRoot = import.meta.dir + '/..';

function parseArgs(args: string[]): {
  json: boolean;
  jsonOut?: string;
  mdOut?: string;
  top: number;
  easyOnly: boolean;
  promoteOnly: boolean;
  quiet: boolean;
} {
  let top = 20;
  let jsonOut: string | undefined;
  let mdOut: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--json') continue;
    if (arg === '--easy-only') continue;
    if (arg === '--promote') continue;
    if (arg === '--quiet') continue;
    if (arg === '--json-out' && args[i + 1]) {
      jsonOut = args[++i];
      continue;
    }
    if (arg.startsWith('--json-out=')) {
      jsonOut = arg.slice('--json-out='.length);
      continue;
    }
    if (arg === '--md-out' && args[i + 1]) {
      mdOut = args[++i];
      continue;
    }
    if (arg.startsWith('--md-out=')) {
      mdOut = arg.slice('--md-out='.length);
      continue;
    }
    if (arg === '--top' && args[i + 1]) {
      top = Number.parseInt(args[++i]!, 10) || 20;
      continue;
    }
    if (arg.startsWith('--top=')) {
      top = Number.parseInt(arg.slice('--top='.length), 10) || 20;
    }
  }

  return {
    json: args.includes('--json'),
    jsonOut,
    mdOut,
    top,
    easyOnly: args.includes('--easy-only'),
    promoteOnly: args.includes('--promote'),
    quiet: args.includes('--quiet'),
  };
}

async function buildCombinedHarnessJson(repoRoot: string): Promise<string> {
  const report = await buildHarnessReport(repoRoot);
  const installCache = await collectBunCacheMetrics();
  return JSON.stringify(
    {
      harness: JSON.parse(serializeReport(report)),
      installCache,
    },
    null,
    2
  );
}

async function main(): Promise<void> {
  const opts = parseArgs(applyUnknownLongOptionGuardFor('harness:promote', Bun.argv.slice(2)));
  const report = await buildHarnessReport(repoRoot);

  if (opts.jsonOut) {
    await Bun.write(`${repoRoot}/${opts.jsonOut}`, await buildCombinedHarnessJson(repoRoot));
    if (!opts.quiet) console.info(`Wrote ${opts.jsonOut}`);
  }

  if (opts.mdOut) {
    await Bun.write(`${repoRoot}/${opts.mdOut}`, renderMarkdownReport(report, opts.top));
    if (!opts.quiet) console.info(`Wrote ${opts.mdOut}`);
  }

  if (opts.json) {
    console.info(await buildCombinedHarnessJson(repoRoot));
    return;
  }

  if (opts.promoteOnly) {
    console.info('Strict inventory:');
    for (const f of report.strictInventory) console.info(`  ✓ ${f}`);
    console.info(`\nPromotion candidates (${report.promotionCandidates.length}):`);
    if (report.promotionCandidates.length === 0) {
      console.info('  (none)');
    } else {
      for (const f of report.promotionCandidates) console.info(`  → ${f}`);
      console.info('\nAdd to STRICT_INVENTORY in config/eslint/harness/rollout.ts');
    }
    return;
  }

  if (opts.easyOnly) {
    console.info('Standard catches (easy)\n');
    for (const c of report.standardCatches) {
      console.info(`  ${String(c.count).padStart(4)}  ${c.catalogId}  ${c.summary}`);
      if (c.oneLiner) console.info(`         → ${c.oneLiner}`);
      console.info(`         bun run bun:remediation ${c.catalogId}`);
    }
    return;
  }

  if (!opts.quiet || (!opts.jsonOut && !opts.mdOut)) {
    console.info(renderTerminalReport(report, opts.top));
    const cache = await collectBunCacheMetrics();
    console.info('');
    console.info(
      `Install cache — ${cache.sizeHuman ?? 'unknown'} @ ${cache.cacheDir ?? 'unset'} (${cache.linksEntries} global-store links)`
    );
  }
}

if (import.meta.main) {
  await main();
}
