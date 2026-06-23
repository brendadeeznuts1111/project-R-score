import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

/** Collect every resolved version for a package name from bun.lock `packages`. */
export async function listLockfileVersions(
  repo: string,
  packageName: string,
): Promise<string[]> {
  const lockPath = join(repo, "bun.lock");
  try {
    await stat(lockPath);
  } catch {
    return [];
  }

  let doc: { packages?: Record<string, unknown> };
  try {
    doc = JSON.parse(await readFile(lockPath, "utf8")) as {
      packages?: Record<string, unknown>;
    };
  } catch {
    return [];
  }
  const versions = new Set<string>();
  const packages = doc.packages ?? {};

  for (const value of Object.values(packages)) {
    if (!Array.isArray(value) || value.length === 0) continue;
    const head = String(value[0]);
    const at = head.lastIndexOf("@");
    if (at <= 0) continue;
    const name = head.startsWith("@") ? head.slice(0, at) : head.slice(0, at);
    const version = head.slice(at + 1);
    if (name === packageName) versions.add(version);
  }

  return [...versions];
}