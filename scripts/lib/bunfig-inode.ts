// @see https://bun.com/docs/runtime/file-io — Bun.file follows symlinks; no Bun.lstat
// eslint-disable-next-line no-restricted-imports -- lstat is the documented node:fs fallback
import { lstatSync, statSync } from 'node:fs';

/** Inode at a bunfig path without following the target. */
export type BunfigInode = 'missing' | 'file' | 'symlink' | 'dangling-symlink' | 'directory';

/**
 * Classify a bunfig path. `Bun.file().exists()` treats a dangling symlink as
 * missing; this is the lstat distinction.
 */
export function inspectBunfigInode(path: string): BunfigInode {
  try {
    const st = lstatSync(path);
    if (st.isDirectory()) return 'directory';
    if (st.isSymbolicLink()) {
      try {
        statSync(path);
        return 'symlink';
      } catch {
        return 'dangling-symlink';
      }
    }
    return 'file';
  } catch {
    return 'missing';
  }
}

export function bunfigInodeIsLink(inode: BunfigInode): boolean {
  return inode === 'symlink' || inode === 'dangling-symlink';
}
