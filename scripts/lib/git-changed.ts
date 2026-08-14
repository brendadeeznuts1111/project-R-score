// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * Shared git change-set helpers for test:changed / lint-changed / ci:harness.
 */
const repoRoot = `${import.meta.dir}/../..`;

async function gitLines(args: string[]): Promise<string[]> {
  const proc = Bun.spawn(['git', ...args], {
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [out, err, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed with exit code ${exitCode}${err.trim() ? `: ${err.trim()}` : ''}`
    );
  }
  return out
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
}

/** Existing staged paths, including rename destinations; deletions are excluded. */
export function listStagedFiles(): Promise<string[]> {
  return gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
}

/** Prefer origin/main → main → origin/master → master → HEAD~1. */
export async function resolveMainHead(): Promise<string> {
  for (const ref of ['origin/main', 'main', 'origin/master', 'master'] as const) {
    const proc = Bun.spawn(['git', 'rev-parse', '--verify', '--quiet', ref], {
      cwd: repoRoot,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    if ((await proc.exited) === 0) return ref;
  }
  return 'HEAD~1';
}

/**
 * Files changed vs working tree (dirty) and/or since a git ref.
 * Includes staged, unstaged, and untracked (when dirty).
 */
export async function listChangedFiles(opts: {
  /** Compare committed+dirty against this ref (e.g. origin/main). */
  since?: string;
  /** Include uncommitted dirty/untracked (default true). */
  dirty?: boolean;
}): Promise<string[]> {
  const dirty = opts.dirty !== false;
  const sets: string[][] = [];

  if (opts.since) {
    sets.push(
      await gitLines(['diff', '--name-only', '--diff-filter=ACMR', `${opts.since}...HEAD`])
    );
  }

  if (dirty) {
    sets.push(await gitLines(['diff', '--name-only', '--diff-filter=ACMR']));
    sets.push(await gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMR']));
    sets.push(await gitLines(['ls-files', '--others', '--exclude-standard']));
  }

  return [...new Set(sets.flat())];
}

/** Paths covered by lint:bun-native:rollout (excludes tests / projects/). */
export function isHarnessLintPath(file: string): boolean {
  const normalized = file.replace(/^\.\//, '');
  if (normalized.startsWith('projects/')) return false;
  if (!normalized.endsWith('.ts') && !normalized.endsWith('.tsx')) return false;
  if (/\.(test|spec|bench)\.tsx?$/.test(normalized)) return false;
  const prefixes = ['lib/', 'scripts/', 'packages/', 'server/', 'config/', 'tools/'];
  return prefixes.some(prefix => normalized.startsWith(prefix));
}

/** True if any path could affect bun:test import graph. */
export function hasCodeLikeChange(files: string[]): boolean {
  return files.some(f => /\.(tsx?|jsx?|mjs|cjs|json)$/.test(f.replace(/^\.\//, '')));
}
