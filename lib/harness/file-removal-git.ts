// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @updated Bun.spawn · changed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @updated Bun.spawn · changed v0.3.0 · 2022-12-07 · https://bun.com/blog/bun-v0.3.0
// @updated Bun.spawn · fixed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.spawn · fixed v0.6.6 · 2023-05-31 · https://bun.com/blog/bun-v0.6.6
// @updated Bun.spawn · fixed v0.7.2 · 2023-08-03 · https://bun.com/blog/bun-v0.7.2
// @updated Bun.spawn · fixed v1.0.8 · 2023-11-02 · https://bun.com/blog/bun-v1.0.8
// @updated Bun.spawn · fixed v1.0.9 · 2023-11-05 · https://bun.com/blog/bun-v1.0.9
// @updated Bun.spawn · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.spawn · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.spawn · fixed v1.0.31 · 2024-03-14 · https://bun.com/blog/bun-v1.0.31
// @updated Bun.spawn · fixed v1.0.32 · 2024-03-17 · https://bun.com/blog/bun-v1.0.32
// @updated Bun.spawn · fixed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.spawn · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.spawn · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated Bun.spawn · changed v1.1.8 · 2024-05-10 · https://bun.com/blog/bun-v1.1.8
// @updated Bun.spawn · fixed v1.1.8 · 2024-05-10 · https://bun.com/blog/bun-v1.1.8
// @updated Bun.spawn · fixed v1.1.30 · 2024-10-08 · https://bun.com/blog/bun-v1.1.30
// @updated Bun.spawn · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.spawn · fixed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.spawn · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.spawn · fixed v1.2.1 · 2025-01-27 · https://bun.com/blog/bun-v1.2.1
// @updated Bun.spawn · changed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated Bun.spawn · fixed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated Bun.spawn · changed v1.2.9 · 2025-04-09 · https://bun.com/blog/bun-v1.2.9
// @updated Bun.spawn · fixed v1.2.16 · 2025-06-11 · https://bun.com/blog/bun-v1.2.16
// @updated Bun.spawn · fixed v1.2.17 · 2025-06-21 · https://bun.com/blog/bun-v1.2.17
// @updated Bun.spawn · changed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated Bun.spawn · fixed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated Bun.spawn · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.spawn · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.spawn · fixed v1.3.2 · 2025-11-08 · https://bun.com/blog/bun-v1.3.2
// @updated Bun.spawn · changed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated Bun.spawn · fixed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated Bun.spawn · changed v1.3.5 · 2025-12-17 · https://bun.com/blog/bun-v1.3.5
// @updated Bun.spawn · changed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.spawn · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.spawn · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.spawn · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/child-process
export type GitFile = { path: string; tracked: boolean; gitMode: string | null };

async function git(root: string, args: string[]): Promise<string> {
  const proc = Bun.spawn(['git', ...args], { cwd: root, stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`git ${args.join(' ')} failed: ${stderr.trim()}`);
  return stdout;
}

export async function listGitFiles(root: string): Promise<GitFile[]> {
  const tracked = await git(root, ['ls-files', '--stage', '-z']);
  const untracked = await git(root, ['ls-files', '--others', '--exclude-standard', '-z']);
  const rows = new Map<string, GitFile>();
  for (const entry of tracked.split('\0')) {
    if (!entry) continue;
    const match = /^(\d+) [0-9a-f]+ \d\t(.+)$/.exec(entry);
    if (match) rows.set(match[2]!, { path: match[2]!, tracked: true, gitMode: match[1]! });
  }
  for (const path of untracked.split('\0').filter(Boolean)) {
    rows.set(path, { path, tracked: false, gitMode: null });
  }
  return [...rows.values()]
    .filter(row => row.gitMode !== '160000' && !row.path.includes('/node_modules/'))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export async function dirtyGitPaths(root: string): Promise<Set<string>> {
  const commands = [
    ['diff', '--name-only', '-z'],
    ['diff', '--cached', '--name-only', '-z'],
    ['ls-files', '--others', '--exclude-standard', '-z'],
  ];
  const values = await Promise.all(commands.map(args => git(root, args)));
  return new Set(values.flatMap(value => value.split('\0').filter(Boolean)));
}
