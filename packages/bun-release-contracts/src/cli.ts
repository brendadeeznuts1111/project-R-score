#!/usr/bin/env bun

// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
import { parseArgs } from 'node:util';
import { generateReleaseInventory, normalizeVersion } from './generator';

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    check: { type: 'boolean', default: false },
    'output-dir': { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: true,
  strict: true,
});

if (values.help) {
  console.log(`Usage: bun src/cli.ts [vMAJOR.MINOR.PATCH] [options]

Options:
  --output-dir <path>  Inventory output directory
  --check              Fail when the inventory is missing or stale
  -h, --help           Show this help`);
} else {
  if (positionals.length > 1) throw new Error('Expected at most one version argument');
  const version = normalizeVersion(positionals[0] ?? Bun.version);
  const result = await generateReleaseInventory({
    version,
    outputDir: values['output-dir'],
    check: values.check,
  });
  const verb = values.check ? 'Verified' : result.changed ? 'Generated' : 'Unchanged';
  console.log(`${verb}: ${result.outputPath}`);
  console.log(`${result.itemCount} planned announcements; 0 executable tests generated`);
}
