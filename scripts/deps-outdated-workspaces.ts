#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Recursive outdated report across monorepo workspaces + root.
 *
 *   bun run deps:outdated
 *   bun run deps:outdated -- --latest
 *   bun run deps:outdated -- --json
 *
 * Spawns `bun outdated` at root and each workspace package dir.
 * Color: red major / yellow minor / green patch (Bun.color via paint helpers).
 *
 * @see https://bun.com/docs/pm/cli/update#visual-indicators
 * @see https://bun.com/docs/pm/filter
 * @see https://bun.com/docs/runtime/color
 */
import { joinPath } from '../lib/path-bun.ts';

import { bunSpawnArgs } from '../lib/bun-executable.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('deps:outdated', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const root = joinPath(import.meta.dir, '..');
const json = argv.includes('--json');
const preferLatest = argv.includes('--latest');

async function pathExists(p: string): Promise<boolean> {
  return Bun.file(p).exists();
}

type OutdatedRow = {
  workspace: string;
  package: string;
  current: string;
  update: string;
  latest: string;
  change: 'major' | 'minor' | 'patch' | 'same' | 'unknown';
};

function parseSemver(v: string): [number, number, number] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(v.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function classify(current: string, target: string): OutdatedRow['change'] {
  const a = parseSemver(current);
  const b = parseSemver(target);
  if (!a || !b) return 'unknown';
  if (b[0] !== a[0]) return 'major';
  if (b[1] !== a[1]) return 'minor';
  if (b[2] !== a[2]) return 'patch';
  return 'same';
}

function parseTable(text: string, workspace: string): OutdatedRow[] {
  const rows: OutdatedRow[] = [];
  for (const line of text.split('\n')) {
    if (!line.includes('|') || line.includes('---') || /Package/i.test(line)) continue;
    const cells = line
      .split('|')
      .map(c => c.trim())
      .filter(Boolean);
    if (cells.length < 4) continue;
    const [pkg, current, update, latest] = cells;
    if (!pkg || pkg === 'Package' || !current) continue;
    const name = pkg
      .replace(/\s*\((dev|peer|optional)\)\s*$/i, '')
      .replace(/\s+(dev|peer|optional)$/i, '')
      .trim();
    const target = preferLatest ? latest : update || current;
    rows.push({
      workspace,
      package: name,
      current,
      update: update || current,
      latest: latest || update || current,
      change: classify(current, target),
    });
  }
  return rows;
}

async function outdatedIn(cwd: string, label: string): Promise<OutdatedRow[]> {
  const proc = Bun.spawn(bunSpawnArgs(['outdated']), {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env, NO_COLOR: '1' },
  });
  const [stdout, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
  void code;
  if (!stdout.includes('Package') && !stdout.includes('|')) return [];
  return parseTable(stdout, label);
}

async function listWorkspaceDirs(): Promise<Array<{ label: string; cwd: string }>> {
  const out: Array<{ label: string; cwd: string }> = [{ label: '(root)', cwd: root }];

  // packages/* via Bun.Glob (no node:fs)
  for await (const rel of new Bun.Glob('packages/*/package.json').scan({ cwd: root })) {
    const name = rel.split('/')[1]!;
    out.push({ label: `packages/${name}`, cwd: joinPath(root, 'packages', name) });
  }

  const sto = joinPath(root, 'projects/active/sports-terminal-os');
  if (await pathExists(joinPath(sto, 'package.json'))) {
    out.push({ label: 'projects/active/sports-terminal-os', cwd: sto });
  }

  // Nested product (submodule) — optional
  const kalshi = joinPath(root, 'Kalshi-bot');
  if (await pathExists(joinPath(kalshi, 'package.json'))) {
    out.push({ label: 'Kalshi-bot', cwd: kalshi });
  }

  return out;
}

function paint(change: OutdatedRow['change'], text: string): string {
  // Inline Bun.color so monorepo root does not depend on Kalshi color kernel
  const hex =
    change === 'major'
      ? '#EF4444'
      : change === 'minor'
        ? '#EAB308'
        : change === 'patch'
          ? '#22C55E'
          : '#95A5A6';
  const open = (Bun.color(hex, 'ansi') as string | null) || '';
  return open ? `${open}${text}\x1b[0m` : text;
}

async function main() {
  const workspaces = await listWorkspaceDirs();
  const all: OutdatedRow[] = [];
  for (const w of workspaces) {
    try {
      all.push(...(await outdatedIn(w.cwd, w.label)));
    } catch (e) {
      console.error(`warn: ${w.label}:`, e instanceof Error ? e.message : e);
    }
  }

  if (json) {
    console.log(JSON.stringify({ schemaVersion: 1, packages: all }, null, 2)); // console-ok — --json machine output
    return;
  }

  if (!all.length) {
    console.log(paint('patch', 'All workspaces within range (bun outdated empty).'));
    console.log('  Tip: bun update -i -r');
    return;
  }

  console.log(
    `Outdated across ${workspaces.length} roots  (target = ${preferLatest ? 'Latest' : 'Update'})\n`
  );
  console.log(
    '  ' +
      'Workspace'.padEnd(36) +
      'Package'.padEnd(28) +
      'Current'.padEnd(12) +
      'Latest'.padEnd(12) +
      'Bump'
  );
  console.log('  ' + '─'.repeat(96));

  for (const r of all) {
    console.log(
      '  ' +
        r.workspace.padEnd(36) +
        r.package.padEnd(28) +
        r.current.padEnd(12) +
        r.latest.padEnd(12) +
        paint(r.change, r.change.padEnd(8))
    );
  }

  console.log(
    '\n  Legend: ' +
      paint('major', 'major') +
      '  ' +
      paint('minor', 'minor') +
      '  ' +
      paint('patch', 'patch')
  );
  console.log('  Next:   bun update -i -r');
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
