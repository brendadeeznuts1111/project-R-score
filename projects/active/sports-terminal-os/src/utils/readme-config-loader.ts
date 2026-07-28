/**
 * README Config Loader — extract TOML from package READMEs.
 *
 * Reads a fenced ```toml block from a package's README.md and
 * parses it with Bun.TOML.parse. Enables versioned, self-documenting
 * configuration shipped as npm packages (no code, no build step).
 *
 * Pattern:
 *   1. Publish a package containing only README.md + package.json
 *   2. Embed machine-readable TOML config in a fenced code block
 *   3. `bun add <package>` → pinned in bun.lock
 *   4. `readConfigFromPackage("<package>")` → parsed config object
 *
 * Used by:
 *   - mega-liner-v3.ts (odds-selectors for DOM scraping)
 *   - Any service that needs versioned, lockable config
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Sports-terminal-os package root (stable when tests run from monorepo root). */
const PACKAGE_ROOT = join(import.meta.dir, "../..");

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load and parse the TOML config block from a package's README.md.
 *
 * Resolves the package from `node_modules/` (npm install) or
 * `packages/` (local workspace). Extracts the first ```toml
 * fenced code block and parses it.
 *
 * @param packageName  npm package name (e.g. "odds-selectors")
 * @param options.key  Optional: extract a specific TOML key as the root
 * @returns            Parsed TOML object (type depends on the block content)
 */
export async function readConfigFromPackage<T = Record<string, unknown>>(
  packageName: string,
  options?: { key?: string }
): Promise<T> {
  const readmePath = await resolveReadme(packageName);
  const raw = await Bun.file(readmePath).text();
  return parseTomlConfig<T>(packageName, raw, options);
}

/**
 * Sync variant of {@link readConfigFromPackage} for tests and CLI paths.
 */
export function readConfigFromPackageSync<T = Record<string, unknown>>(
  packageName: string,
  options?: { key?: string }
): T {
  const readmePath = resolveReadmeSync(packageName);
  const raw = readFileSync(readmePath, "utf8");
  return parseTomlConfig<T>(packageName, raw, options);
}

function parseTomlConfig<T>(
  packageName: string,
  raw: string,
  options?: { key?: string }
): T {
  const match = raw.match(/```toml\n([\s\S]*?)\n```/);
  if (!match) {
    throw new Error(
      `No \`\`\`toml block found in README.md of package "${packageName}"`
    );
  }

  const parsed = Bun.TOML.parse(match[1]) as Record<string, unknown>;

  if (options?.key) {
    const subtree = parsed[options.key];
    if (subtree === undefined) {
      throw new Error(
        `Key "${options.key}" not found in TOML block of package "${packageName}". ` +
          `Available keys: ${Object.keys(parsed).join(", ")}`
      );
    }
    return subtree as T;
  }

  return parsed as T;
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the README.md path for a package.
 *
 * Tries in order:
 *   1. `packages/<name>/README.md`     (local workspace package)
 *   2. `node_modules/<name>/README.md` (npm-installed package)
 */
async function resolveReadme(packageName: string): Promise<string> {
  const localPath = join(PACKAGE_ROOT, "packages", packageName, "README.md");
  if (await Bun.file(localPath).exists()) {
    return localPath;
  }

  const npmPath = join(PACKAGE_ROOT, "node_modules", packageName, "README.md");
  if (await Bun.file(npmPath).exists()) {
    return npmPath;
  }

  throw notFound(packageName, localPath, npmPath);
}

function resolveReadmeSync(packageName: string): string {
  const localPath = join(PACKAGE_ROOT, "packages", packageName, "README.md");
  if (existsSync(localPath)) return localPath;
  const npmPath = join(PACKAGE_ROOT, "node_modules", packageName, "README.md");
  if (existsSync(npmPath)) return npmPath;
  throw notFound(packageName, localPath, npmPath);
}

function notFound(packageName: string, localPath: string, npmPath: string): Error {
  return new Error(
    `Package "${packageName}" not found. Checked:\n` +
      `  - ${localPath}\n` +
      `  - ${npmPath}\n` +
      `Run \`bun add ${packageName}\` or create it in packages/.`
  );
}
