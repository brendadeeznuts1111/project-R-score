#!/usr/bin/env bun
/**
 * Monorepo CLI Help — prints categorized commands from package.json scripts.
 *
 * Usage:  bun run help
 *         bun run help --verbose   # show ALL scripts including internal ones
 *         bun run help <category>  # filter by category (e.g. "fix", "test", "packages")
 *
 * @see ./lib/cli-categories.ts — category SSOT (shared with cli:docs)
 * @see https://bun.com/docs/cli/run — bun run
 */

import pkg from '../package.json' assert { type: 'json' };
import { describeCliScript, isHelpQuietKey, matchCliCategory } from './lib/cli-categories';

const scripts = pkg.scripts as Record<string, string>;
const args = Bun.argv.slice(2);
const verbose = args.includes('--verbose');
const filter = args.find(a => !a.startsWith('-'));

interface Entry {
  key: string;
  cmd: string;
  desc: string;
  category: string;
  priority: number;
}

const entries: Entry[] = [];

for (const [key, cmd] of Object.entries(scripts)) {
  if (!cmd || cmd.startsWith('//')) continue;
  const matched = matchCliCategory(key);
  const label = matched?.label ?? 'Other';
  const priority = matched?.priority ?? 99;
  if (!verbose && isHelpQuietKey(key, cmd)) continue;
  if (filter && !key.includes(filter) && !label.toLowerCase().includes(filter.toLowerCase()))
    continue;
  entries.push({
    key,
    cmd: cmd.slice(0, 70),
    desc: describeCliScript(key, cmd, 60),
    category: label,
    priority,
  });
}

entries.sort((a, b) => a.priority - b.priority || a.key.localeCompare(b.key));

let currentCat = '';
for (const e of entries) {
  if (e.category !== currentCat) {
    console.info(`\n  ${e.category}`);
    console.info(`  ${'─'.repeat(e.category.length + 2)}`);
    currentCat = e.category;
  }
  const padded = `bun run ${e.key}`.padEnd(38);
  console.info(`  ${padded}  ${e.desc}`);
}

console.info(`\n  ${entries.length} commands shown${verbose ? '' : ' (use --verbose for all)'}`);
console.info('  See docs/CLI.md for full reference (`bun run cli:docs` to refresh)');
console.info('  Day loop: type-check · build:affected · test:affected');
