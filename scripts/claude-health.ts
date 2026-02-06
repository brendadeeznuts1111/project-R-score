#!/usr/bin/env bun

/**
 * .claude/ directory health check
 *
 * Validates structure, frontmatter, and gitignore rules for
 * .claude/commands/ and .claude/agents/ directories.
 *
 * Usage: bun scripts/claude-health.ts
 *        bun run health
 */

import { Glob } from 'bun';
import { join, relative } from 'path';

const ROOT = import.meta.dir + '/..';
const CLAUDE_DIR = join(ROOT, '.claude');
const COLUMNS = ['check', 'type', 'path', 'expected', 'detail', 'status'] as const;

type Status = '✅' | '❌' | '⚠️' | '⏳';
type CheckType = 'directory' | 'frontmatter' | 'gitignore' | 'placement' | 'json';
type Result = {
  check: string;
  type: CheckType;
  path: string;
  expected: string;
  detail: string;
  status: Status;
};

const results: Result[] = [];
let lastLineCount = 0;

function redraw() {
  if (lastLineCount > 0) {
    process.stdout.write(`\x1b[${lastLineCount}A\x1b[J`);
  }
  const table = Bun.inspect.table(results, COLUMNS as unknown as string[], { colors: true });
  process.stdout.write(table + '\n');
  lastLineCount = table.split('\n').length + 1;
}

function add(r: Omit<Result, 'status'> & { status?: Status }): number {
  const idx = results.length;
  results.push({ status: '⏳', ...r } as Result);
  redraw();
  return idx;
}

function resolve(idx: number, status: Status, detail: string) {
  results[idx].status = status;
  results[idx].detail = detail;
  redraw();
}

/** Extract YAML frontmatter from markdown content */
function parseFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const result: Record<string, unknown> = {};
  for (const line of match[1].split('\n')) {
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let val: unknown = line.slice(sep + 1).trim();
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    result[key] = val;
  }
  return result;
}

/** Collect .md files from a directory (non-recursive) */
async function mdFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const glob = new Glob('*.md');
  for await (const f of glob.scan({ cwd: dir, absolute: true })) {
    files.push(f);
  }
  return files;
}

function rel(absPath: string): string {
  return relative(ROOT, absPath);
}

async function main() {
  console.log('\n🔍 .claude/ health check\n');

  // 1. commands/ directory exists
  const commandsDir = join(CLAUDE_DIR, 'commands');
  const cmdPath = rel(commandsDir);
  const i1 = add({ check: 'commands/', type: 'directory', path: cmdPath, expected: 'exists', detail: 'checking...' });
  const commandsDirStat = await Array.fromAsync(new Glob('*').scan({ cwd: commandsDir })).catch(() => null);
  resolve(i1, commandsDirStat !== null ? '✅' : '❌', commandsDirStat !== null ? 'exists' : 'missing');

  // 2. command frontmatter validation
  if (commandsDirStat !== null) {
    const cmds = await mdFiles(commandsDir);
    if (cmds.length === 0) {
      add({ check: 'command files', type: 'frontmatter', path: cmdPath, expected: '>= 1 .md', detail: 'none found', status: '⚠️' });
    }
    for (const filepath of cmds) {
      const name = filepath.split('/').pop()!;
      const rp = rel(filepath);
      const idx = add({ check: name, type: 'frontmatter', path: rp, expected: 'user_invocable: true', detail: 'checking...' });
      const content = await Bun.file(filepath).text();
      const fm = parseFrontmatter(content);
      if (!fm) {
        resolve(idx, '❌', 'no YAML frontmatter');
      } else if (fm.user_invocable !== true) {
        resolve(idx, '❌', 'user_invocable missing');
      } else {
        resolve(idx, '✅', 'valid');
      }
    }
  }

  // 3. .gitignore whitelists
  const gitignorePath = rel(join(ROOT, '.gitignore'));
  const gitignore = await Bun.file(join(ROOT, '.gitignore')).text().catch(() => '');
  const wlCommands = gitignore.includes('!.claude/commands/');
  const wlAgents = gitignore.includes('!.claude/agents/');
  if (wlCommands && wlAgents) {
    add({ check: '.gitignore', type: 'gitignore', path: gitignorePath, expected: '!.claude/{commands,agents}/', detail: 'both whitelisted', status: '✅' });
  } else {
    if (!wlCommands) add({ check: '.gitignore', type: 'gitignore', path: gitignorePath, expected: '!.claude/commands/', detail: 'missing', status: '❌' });
    if (!wlAgents) add({ check: '.gitignore', type: 'gitignore', path: gitignorePath, expected: '!.claude/agents/', detail: 'missing', status: '❌' });
  }

  // 4. No slash commands misplaced in agents/
  const agentsDir = join(CLAUDE_DIR, 'agents');
  const agentFiles = await mdFiles(agentsDir).catch(() => [] as string[]);
  let misplaced = 0;
  for (const filepath of agentFiles) {
    const name = filepath.split('/').pop()!;
    const content = await Bun.file(filepath).text();
    const fm = parseFrontmatter(content);
    if (fm?.user_invocable === true) {
      add({ check: `agents/${name}`, type: 'placement', path: rel(filepath), expected: 'in commands/', detail: 'has user_invocable — move it', status: '❌' });
      misplaced++;
    }
  }
  if (misplaced === 0) {
    add({ check: 'agent placement', type: 'placement', path: rel(agentsDir), expected: 'no slash commands', detail: agentFiles.length === 0 ? 'empty' : 'clean', status: '✅' });
  }

  // 5. settings.local.json
  const settingsPath = join(CLAUDE_DIR, 'settings.local.json');
  const settingsFile = Bun.file(settingsPath);
  if (await settingsFile.exists()) {
    const idx = add({ check: 'settings.local.json', type: 'json', path: rel(settingsPath), expected: 'valid JSON', detail: 'checking...' });
    try {
      JSON.parse(await settingsFile.text());
      resolve(idx, '✅', 'valid');
    } catch (e) {
      resolve(idx, '❌', (e as Error).message);
    }
  } else {
    add({ check: 'settings.local.json', type: 'json', path: rel(settingsPath), expected: 'valid JSON', detail: 'not found (optional)', status: '⚠️' });
  }

  // Summary
  const passed_n = results.filter(r => r.status === '✅').length;
  const failed_n = results.filter(r => r.status === '❌').length;
  const total = passed_n + failed_n;

  if (failed_n === 0) {
    console.log(`✅ ${passed_n}/${total} checks passed\n`);
  } else {
    console.log(`❌ ${failed_n}/${total} checks failed\n`);
  }
  process.exit(failed_n > 0 ? 1 : 0);
}

main();
