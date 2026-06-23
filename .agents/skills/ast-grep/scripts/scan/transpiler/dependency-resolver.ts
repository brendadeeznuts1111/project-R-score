import { readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export type ResolvedDependency = {
  name: string;
  version: string;
  spec: string;
  source: "lock" | "spec";
};

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

/** Parse `packages` entries like `"axios": ["axios@1.16.1", ...]` into name → version. */
function parseBunLockPackages(doc: Record<string, unknown>): Map<string, string> {
  const out = new Map<string, string>();
  const packages = doc.packages as Record<string, unknown> | undefined;
  if (!packages) return out;

  for (const [key, value] of Object.entries(packages)) {
    if (!Array.isArray(value) || value.length === 0) continue;
    const head = String(value[0]);
    const at = head.lastIndexOf("@");
    if (at <= 0) continue;
    const name = head.startsWith("@") ? head.slice(0, at) : head.slice(0, at);
    const version = head.slice(at + 1);
    if (!out.has(name)) out.set(name, version);
    if (!out.has(key)) out.set(key, version);
  }
  return out;
}

function exactVersionFromSpec(spec: string): string | null {
  const trimmed = spec.trim();
  if (/^\d+\.\d+\.\d+([\-+].*)?$/.test(trimmed)) return trimmed;
  return null;
}

async function findPackageJson(start: string, stop: string): Promise<string | null> {
  let dir = resolve(start);
  const root = resolve(stop);
  while (dir.startsWith(root)) {
    const candidate = join(dir, "package.json");
    try {
      await stat(candidate);
      return candidate;
    } catch {
      // continue upward
    }
    if (dir === root) break;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

async function findLockfile(repo: string): Promise<string | null> {
  for (const name of ["bun.lock", "bun.lockb"]) {
    const path = join(repo, name);
    try {
      await stat(path);
      if (name.endsWith(".lockb")) continue;
      return path;
    } catch {
      // try next
    }
  }
  return null;
}

export async function resolveTargetDependencies(options: {
  repo: string;
  targetPath: string;
  includeDev?: boolean;
}): Promise<{ packageJson: string | null; dependencies: ResolvedDependency[] }> {
  const { repo, targetPath, includeDev = false } = options;
  const absTarget = resolve(repo, targetPath);
  const pkgPath = await findPackageJson(absTarget, repo);
  if (!pkgPath) return { packageJson: null, dependencies: [] };

  const pkg = JSON.parse(await readFile(pkgPath, "utf8")) as PackageJson;
  const specs: Record<string, string> = { ...(pkg.dependencies ?? {}) };
  if (includeDev) Object.assign(specs, pkg.devDependencies ?? {});

  const lockPath = await findLockfile(repo);
  let lockMap = new Map<string, string>();
  if (lockPath) {
    try {
      const lockDoc = JSON.parse(await readFile(lockPath, "utf8")) as Record<string, unknown>;
      lockMap = parseBunLockPackages(lockDoc);
    } catch {
      // unreadable lockfile
    }
  }

  const dependencies: ResolvedDependency[] = [];
  for (const [name, spec] of Object.entries(specs)) {
    if (spec.startsWith("workspace:") || spec === "catalog:" || spec.startsWith("catalog:")) {
      continue;
    }
    const locked = lockMap.get(name);
    const exact = exactVersionFromSpec(spec);
    const version = locked ?? exact;
    if (!version) continue;
    dependencies.push({
      name,
      version,
      spec,
      source: locked ? "lock" : "spec",
    });
  }

  return { packageJson: pkgPath, dependencies };
}