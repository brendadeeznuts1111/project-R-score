#!/usr/bin/env bun
/**
 * Monorepo CLI Help — prints categorized commands from package.json scripts.
 *
 * Usage:  bun run help
 *         bun run help --verbose   # show ALL scripts including internal ones
 *         bun run help <category>  # filter by category (e.g. "fix", "test", "packages")
 */

import pkg from '../package.json' assert { type: 'json' };

const scripts = pkg.scripts as Record<string, string>;
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const filter = args.find(a => !a.startsWith('-'));

interface Category {
  prefix: string;
  label: string;
  priority: number;
}
const categories: Category[] = [
  { prefix: 'packages:', label: 'Package Management', priority: 0 },
  { prefix: 'format:', label: 'Format', priority: 1 },
  { prefix: 'fix:', label: 'Antipattern Fixing', priority: 2 },
  { prefix: 'lint:', label: 'Lint', priority: 3 },
  { prefix: 'build:', label: 'Build', priority: 4 },
  { prefix: 'test:', label: 'Test', priority: 5 },
  { prefix: 'install:', label: 'Install', priority: 6 },
  { prefix: 'dev', label: 'Development', priority: 7 },
  { prefix: 'start:', label: 'Servers', priority: 8 },
  { prefix: 'workspaces:', label: 'Workspace', priority: 9 },
  { prefix: 'cheatsheet:', label: 'Cheatsheet', priority: 10 },
  { prefix: 'demo:', label: 'Demo', priority: 11 },
  { prefix: 'deploy', label: 'Deploy', priority: 12 },
  { prefix: 'rss:', label: 'RSS', priority: 13 },
  { prefix: 'docs:', label: 'Documentation', priority: 14 },
];

const SPECIAL: Record<string, string> = {
  dev: 'Start platform watch server',
  lint: 'ESLint on lib/',
  format: 'Prettier on lib/',
};

function describe(script: string, cmd: string): string {
  if (SPECIAL[script]) return SPECIAL[script];
  const desc = cmd
    .replace(/^bun run\s+/, '')
    .replace(/^bun\s+/, '')
    .replace(/&\s*$/, '')
    .trim();
  if (desc.length > 60) return desc.slice(0, 57) + '...';
  return desc;
}

function categorize(key: string): { label: string; priority: number } {
  for (const cat of categories) {
    if (key.startsWith(cat.prefix)) return { label: cat.label, priority: cat.priority };
  }
  if (key === 'dev' || key === 'start:') return { label: 'Development', priority: 7 };
  return { label: 'Other', priority: 99 };
}

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
  const { label, priority } = categorize(key);
  // Skip noisy/internal scripts unless verbose
  if (
    !verbose &&
    (key.startsWith('cheatsheet:') ||
      key.startsWith('rss:') ||
      key.startsWith('demo:') ||
      key.startsWith('deploy') ||
      cmd.startsWith('echo') ||
      cmd.startsWith('//'))
  )
    continue;
  if (filter && !key.includes(filter)) continue;
  entries.push({
    key,
    cmd: cmd.slice(0, 70),
    desc: describe(key, cmd),
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
console.info('  See docs/CLI.md for full reference');
