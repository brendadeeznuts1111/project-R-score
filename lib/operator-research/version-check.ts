// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/semver/satisfies — Bun.semver.satisfies
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies — Bun.semver.satisfies
import { joinPath } from '../path-bun.ts';
import { ROOT } from './paths.ts';

export type VersionCheckResult = {
  bunVersion: string;
  bunRevision: string;
  required: string;
  satisfies: boolean;
  agentVersion: string;
  packageName: string;
};

type PackageEngines = {
  name?: string;
  version?: string;
  engines?: { bun?: string };
};

let cachedPkg: PackageEngines | null = null;

export async function loadPackageJson(): Promise<PackageEngines> {
  if (cachedPkg) return cachedPkg;
  const path = joinPath(ROOT, 'package.json');
  cachedPkg = (await Bun.file(path).json()) as PackageEngines;
  return cachedPkg;
}

export async function getRequiredBunRange(): Promise<string> {
  const pkg = await loadPackageJson();
  return pkg.engines?.bun ?? '>=1.3.14';
}

export async function checkBunVersion(): Promise<VersionCheckResult> {
  const pkg = await loadPackageJson();
  const required = pkg.engines?.bun ?? '>=1.3.14';
  const satisfies = Bun.semver.satisfies(Bun.version, required);
  return {
    bunVersion: Bun.version,
    bunRevision: Bun.revision,
    required,
    satisfies,
    agentVersion: pkg.version ?? '0.0.0',
    packageName: pkg.name ?? 'factorywager-enterprise',
  };
}

/**
 * Boot guard — warn (or exit in production) when Bun.version is out of range.
 * Import from the agent entrypoint.
 */
export async function assertBunVersion(
  opts: { strict?: boolean } = {}
): Promise<VersionCheckResult> {
  const result = await checkBunVersion();
  if (!result.satisfies) {
    const msg = `Bun version ${result.bunVersion} does not satisfy required range ${result.required}`;
    console.warn(`⚠️  ${msg}`);
    const strict =
      opts.strict === true ||
      Bun.env.NODE_ENV === 'production' ||
      Bun.env.OPERATOR_RESEARCH_STRICT_VERSION === '1';
    if (strict) {
      console.error(msg);
      process.exit(1);
    }
  }
  return result;
}
