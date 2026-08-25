#!/usr/bin/env bun
// @see https://bun.com/docs/pm/filter#package-name-filter-pattern — --filter
// @see https://bun.com/docs/runtime/file-io — Bun.write
// @see https://bun.com/docs/runtime — bun run / package.json scripts
/**
 * Auto-generate docs/CLI.md from package.json scripts.
 *
 * Usage: bun run scripts/generate-cli-docs.ts
 *
 * @see ./lib/cli-categories.ts — category SSOT (shared with help)
 */

import pkg from '../package.json' assert { type: 'json' };
import {
  CLI_CATEGORIES,
  CLI_CORE_CMDS,
  describeCliScript,
  matchCliCategory,
} from './lib/cli-categories';

const scripts = pkg.scripts as Record<string, string>;

interface Cmd {
  key: string;
  cmd: string;
  desc: string;
}

function getCategory(key: string): string | null {
  const matched = matchCliCategory(key);
  if (matched) return matched.label;
  if (CLI_CORE_CMDS.has(key)) return 'Core';
  return null;
}

const byCategory = new Map<string, Cmd[]>();
const labelOrder = new Map<string, number>();
labelOrder.set('Core', -2);
for (const cat of CLI_CATEGORIES) {
  if (!labelOrder.has(cat.label)) labelOrder.set(cat.label, cat.priority);
}

for (const [key, cmd] of Object.entries(scripts)) {
  if (!cmd || cmd.startsWith('//')) continue;
  const cat = getCategory(key);
  if (!cat) continue;
  if (!byCategory.has(cat)) byCategory.set(cat, []);
  byCategory.get(cat)!.push({ key, cmd, desc: describeCliScript(key, cmd) });
}

const orderedCats = [...byCategory.keys()].sort(
  (a, b) => (labelOrder.get(a) ?? 99) - (labelOrder.get(b) ?? 99) || a.localeCompare(b)
);

const lines: string[] = [
  '# CLI Quick Reference',
  '',
  '_Auto-generated from package.json. Run `bun run cli:docs` (or `bun run scripts/generate-cli-docs.ts`) to regenerate._',
  '',
  'Category labels come from [`scripts/lib/cli-categories.ts`](../scripts/lib/cli-categories.ts) (shared with `bun run help`).',
  '',
  '---',
  '',
  '## Day loop (prefer these)',
  '',
  '| Command | Why |',
  '|---------|-----|',
  '| `bun run help` | Interactive categorized commands |',
  '| `bun run type-check` | Scoped check via `tsconfig.check.json` (not full) |',
  "| `bun run build:affected` | `bun run --filter '...' build` — changed packages only |",
  "| `bun run test:affected` | `bun run --filter '...' test` |",
  '| `bun run cli:docs` | Refresh this file |',
  '',
  'CI uses `bun run type-check:ci` (`tsconfig.ci.json`). Full solution: `type-check:full` (rare).',
  '',
  '---',
  '',
  '## Root Workspace',
  '',
  'All commands run via `bun run <name>` from the project root:',
  '',
];

for (const cat of orderedCats) {
  const cmds = byCategory.get(cat)!;
  cmds.sort((a, b) => a.key.localeCompare(b.key));
  lines.push(`### ${cat}`);
  lines.push('| Command | Description |');
  lines.push('|---------|-------------|');
  for (const c of cmds) {
    lines.push(`| \`bun run ${c.key}\` | ${c.desc} |`);
  }
  lines.push('');
}

lines.push('---', '');
lines.push('## Project-Level (cd to project)');
lines.push('');
lines.push('Each project in `projects/` is independent:');
lines.push('');
lines.push('| Action | Command |');
lines.push('|--------|---------|');
lines.push('| Install deps | `cd projects/active/<name> && bun install` |');
lines.push('| Run tests | `cd projects/active/<name> && bun test` |');
lines.push('| Check outdated | `cd projects/active/<name> && bun outdated` |');
lines.push('| Add dep pinned | `cd projects/active/<name> && bun add <pkg> -E` |');
lines.push('');
lines.push('---', '');
lines.push('## Git Workflow', '');
lines.push('| Action | Command |');
lines.push('|--------|---------|');
lines.push('| Quick status | `git status --short` |');
lines.push('| Check changes | `git diff --stat` |');
lines.push('| Stage claimed paths | `git add -- <owned-paths...>` |');
lines.push('| Commit | `git commit -m "type: message"` |');
lines.push('');
lines.push('---', '');
lines.push('## Project Triage', '');
lines.push('```bash');
lines.push('# Promote experimental → active');
lines.push('git mv projects/experimental/<name> projects/active/<name>');
lines.push('');
lines.push('# Archive active → archive');
lines.push('git mv projects/active/<name> projects/archive/<name>');
lines.push('');
lines.push('# Check triage status');
lines.push('bun run packages:list --filter=active');
lines.push('bun run registry:projects');
lines.push('```');
lines.push('');
lines.push('## Registry Info', '');
lines.push('- **Primary registry**: `registry.factory-wager.com`');
lines.push('- **Default (npm)**: public packages');
lines.push('- **Full manifest**: `docs/packages/REGISTRY.md` (`bun run packages:list --write`)');
lines.push(
  '- **Projects browser**: `public/registry/projects-registry.json` (`bun run registry:projects`)'
);
lines.push('- **Package scope**: `@factorywager/*` (core), `@fire22/*` (fantasy42)');
lines.push('');

await Bun.write('docs/CLI.md', `${lines.join('\n')}\n`);
console.info('Wrote docs/CLI.md');
