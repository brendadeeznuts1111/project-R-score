// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
/**
 * Materialize the git index tree (HEAD ∪ staged) for a set of subdirectories
 * into a temp directory, via `git ls-files` → `git checkout-index`.
 *
 * Ratchet gates (console-format and import-graph) scan this tree instead
 * of the worktree so another lane's uncommitted dirty files can never fail
 * your commit — the count reflects exactly what the tree looks like after the
 * commit (staged changes included, unstaged foreign dirt excluded).
 *
 * node:fs is banned in harness paths — temp-dir lifecycle uses Bun.write
 * (creates intermediate segments) and `rm -rf` via Bun.spawnSync (no Bun-
 * native recursive rm exists; same pattern as tools/snapshot-core.ts).
 */

export interface IndexTree {
  /** Temp directory root containing the materialized subdirs. */
  dir: string;
  /** Remove the temp directory. Always call (try/finally). */
  cleanup: () => Promise<void>;
}

function tempRoot(): string {
  return Bun.env.TMPDIR || Bun.env.TMP || '/tmp';
}

/** Sync recursive rm for process.on('exit') paths (temp lifecycle only). */
export function removeIndexTreeSync(dir: string): void {
  Bun.spawnSync({ cmd: ['rm', '-rf', dir], stdout: 'pipe', stderr: 'pipe' });
}

export async function materializeIndexTree(
  subdirs: string[],
  cwd = process.cwd()
): Promise<IndexTree> {
  const ls = Bun.spawnSync({
    cmd: ['git', 'ls-files', '-z', '--', ...subdirs],
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (ls.exitCode !== 0) {
    throw new Error(`git ls-files failed: ${ls.stderr.toString().trim()}`);
  }
  const dir = `${tempRoot()}/index-tree-${Bun.randomUUIDv7()}`;
  // Creates the root even when the file list is empty (checkout-index only
  // creates directories for files it writes).
  await Bun.write(`${dir}/.bun-keep`, '');
  const co = Bun.spawnSync({
    cmd: ['git', 'checkout-index', '-f', '-z', '--stdin', `--prefix=${dir}/`],
    cwd,
    stdin: ls.stdout,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (co.exitCode !== 0) {
    removeIndexTreeSync(dir);
    throw new Error(`git checkout-index failed: ${co.stderr.toString().trim()}`);
  }
  return { dir, cleanup: async () => removeIndexTreeSync(dir) };
}

/** materializeIndexTree + scoped cleanup. */
export async function withIndexTree<T>(
  subdirs: string[],
  fn: (dir: string) => Promise<T>,
  cwd = process.cwd()
): Promise<T> {
  const tree = await materializeIndexTree(subdirs, cwd);
  try {
    return await fn(tree.dir);
  } finally {
    await tree.cleanup();
  }
}
