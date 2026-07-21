#!/usr/bin/env bun
// @see https://bun.com/docs/pm/filter#package-name-filter-pattern — --filter
// @see https://bun.com/docs/runtime/file-io — Bun.write
/**
 * Auto-generate docs/CLI.md from package.json scripts.
 *
 * Usage: bun run scripts/generate-cli-docs.ts
 */

import pkg from '../package.json' assert { type: 'json' };

const scripts = pkg.scripts as Record<string, string>;

interface Cmd {
  key: string;
  cmd: string;
  desc: string;
}

const CATEGORIES: Array<{ prefix: string; label: string; desc: string }> = [
  { prefix: 'help', label: 'Help', desc: 'Available commands' },
  { prefix: 'packages:', label: 'Package Management', desc: 'List, check, install deps' },
  { prefix: 'fix:', label: 'Antipattern Fixing', desc: 'Automated code quality fixes' },
  { prefix: 'format:', label: 'Format', desc: 'Prettier formatting' },
  { prefix: 'lint:', label: 'Lint', desc: 'ESLint checks' },
  { prefix: 'build:', label: 'Build', desc: 'Build affected packages' },
  { prefix: 'test:', label: 'Test', desc: 'Run tests' },
  { prefix: 'install:', label: 'Install', desc: 'Scoped installs' },
  { prefix: 'workspaces:', label: 'Workspace', desc: 'Workspace orchestration' },
  { prefix: 'cheatsheet:', label: 'Cheatsheet', desc: 'Generate cheat sheets' },
  { prefix: 'demo:', label: 'Demo', desc: 'Demo contracts' },
  { prefix: 'rss:', label: 'RSS', desc: 'RSS feeds' },
  { prefix: 'search:', label: 'Search', desc: 'Search governance and benchmarks' },
  { prefix: 'wiki:', label: 'Wiki', desc: 'Wiki generation and live preview' },
  { prefix: 'markdown', label: 'Markdown', desc: 'Markdown render and option demos' },
  { prefix: 'profile:barbershop', label: 'Barbershop Profile', desc: 'Sampling profiler CLI' },
  { prefix: 'dataview', label: 'DataView', desc: 'DataView pool CLI (pass subcommand)' },
  { prefix: 'docs:', label: 'Documentation', desc: 'Doc generation' },
  { prefix: 'registry:', label: 'Registry', desc: 'Project / package registry snapshots' },
];

const SPECIAL: Record<string, string> = {
  dev: 'Start platform watch server (server-enhanced.ts)',
  lint: 'ESLint on lib/',
  format: 'Prettier on lib/',
  sync: 'Sync integration data',
  updates: 'Check updates',
  docs: 'Generate cheatsheet docs',
  news: 'RSS news feed',
  commits: 'Check commits',
  'pool-telemetry': 'Connection pool telemetry CLI (pass subcommand: stats, query, sync, serve)',
  'security-tests': 'Run lib/security security test suite',
  markdown: 'Render markdown (pass file + format: ansi, html, links, headings, plain)',
  'markdown:options': 'Bun markdown parser option demos (pass demo|compare|gfm|extended)',
  'profile:barbershop': 'Barbershop sampling profiler (pass subcommand: run, quick, status, …)',
  'wiki:mcp': 'Wiki generator MCP CLI (pass subcommand: generate, templates, …)',
};

const CORE_CMDS = new Set([
  'dev',
  'lint',
  'format',
  'help',
  'packages:list',
  'packages:outdated',
  'fix:console-log',
  'fix:scan-any-types',
  'fix:scan-default-exports',
  'fix:scan-non-null-assertions',
  'fix:as-any',
  'fix:empty-catches',
  'fix:pin-versions',
  'lint:core',
  'format:core',
  'format:check:core',
  'validate:workspaces',
  'build:affected',
  'test:affected',
]);

function getCategory(key: string): string | null {
  for (const cat of CATEGORIES) {
    if (key.startsWith(cat.prefix)) return cat.label;
  }
  if (key === 'dev' || key === 'start:') return 'Development';
  if (CORE_CMDS.has(key)) return 'Core';
  return null;
}

function describe(key: string, cmd: string): string {
  if (SPECIAL[key]) return SPECIAL[key];
  return cmd
    .replace(/^bun run\s+/, '')
    .replace(/^bun\s+/, '')
    .trim();
}

// Collect commands by category
const byCategory = new Map<string, Cmd[]>();

for (const [key, cmd] of Object.entries(scripts)) {
  if (!cmd || cmd.startsWith('//')) continue;
  const cat = getCategory(key);
  if (!cat) continue;
  if (!byCategory.has(cat)) byCategory.set(cat, []);
  byCategory.get(cat)!.push({ key, cmd, desc: describe(key, cmd) });
}

// Build markdown
const lines: string[] = [
  '# CLI Quick Reference',
  '',
  '_Auto-generated from package.json. Run `bun run scripts/generate-cli-docs.ts` to regenerate._',
  '',
  '---',
  '',
  '## Root Workspace',
  '',
  'All commands run via `bun run <name>` from the project root:',
  '',
];

for (const [cat, cmds] of byCategory) {
  cmds.sort((a, b) => a.key.localeCompare(b.key));
  lines.push(`### ${cat}`);
  lines.push('| Command | Description |');
  lines.push('|---------|-------------|');
  for (const c of cmds) {
    const pad = `\`bun run ${c.key}\``;
    lines.push(`| ${pad} | ${c.desc} |`);
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
lines.push('| Stage all | `git add -A` |');
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

await Bun.write('docs/CLI.md', lines.join('\n'));
console.info('Wrote docs/CLI.md');
