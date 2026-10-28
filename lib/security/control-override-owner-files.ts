// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { resolvePath } from '../path-bun.ts';

/** Keep filesystem evidence separate from the pure ownership comparison kernel. */
export async function missingControlOverrideOwners(
  ownerPaths: readonly string[]
): Promise<readonly string[]> {
  const missing: string[] = [];
  for (const ownerPath of new Set(ownerPaths)) {
    if (!(await Bun.file(resolvePath(import.meta.dir, '../..', ownerPath)).exists())) {
      missing.push(ownerPath);
    }
  }
  return missing.sort();
}
