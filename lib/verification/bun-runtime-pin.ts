// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/semver/satisfies — Bun.semver.satisfies
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver.satisfies
import { joinPath } from '../path-bun.ts';

const DEFAULT_ROOT = joinPath(import.meta.dir, '../..');

export type BunPinCheck = {
  ok: boolean;
  runtime: string;
  revision: string;
  enginesBun: string | null;
  bunVersionFile: string | null;
  packageManager: string | null;
  issues: string[];
  message: string;
};

/**
 * Check exact stable-channel identity without consulting the network.
 * `engines.bun` is compatibility only; `.bun-version` + `packageManager` own
 * the reviewed executable version.
 */
export async function checkBunPin(
  runtime: string = Bun.version,
  options: { root?: string; revision?: string } = {}
): Promise<BunPinCheck> {
  const root = options.root ?? DEFAULT_ROOT;
  const pkgPath = joinPath(root, 'package.json');
  const pinPath = joinPath(root, '.bun-version');
  const revision = options.revision ?? Bun.revision;

  let enginesBun: string | null = null;
  let packageManager: string | null = null;
  try {
    const pkg = (await Bun.file(pkgPath).json()) as {
      engines?: { bun?: string };
      packageManager?: string;
    };
    enginesBun = pkg.engines?.bun ?? null;
    packageManager = pkg.packageManager ?? null;
  } catch {
    const issue = `unable to read ${pkgPath}`;
    return {
      ok: false,
      runtime,
      revision,
      enginesBun: null,
      bunVersionFile: null,
      packageManager: null,
      issues: [issue],
      message: issue,
    };
  }

  let bunVersionFile: string | null = null;
  if (await Bun.file(pinPath).exists()) {
    bunVersionFile = (await Bun.file(pinPath).text()).trim() || null;
  }

  const issues: string[] = [];
  if (!enginesBun) issues.push('package.json missing engines.bun');
  if (!bunVersionFile) {
    issues.push('.bun-version is missing or empty');
  } else {
    if (runtime !== bunVersionFile) {
      issues.push(`runtime ${runtime} does not equal reviewed pin ${bunVersionFile}`);
    }
    if (packageManager !== `bun@${bunVersionFile}`) {
      issues.push(
        `packageManager ${packageManager ?? 'missing'} does not equal bun@${bunVersionFile}`
      );
    }
    if (enginesBun && !Bun.semver.satisfies(bunVersionFile, enginesBun)) {
      issues.push(`reviewed pin ${bunVersionFile} does not satisfy engines.bun ${enginesBun}`);
    }
  }

  const parts = [
    `engines.bun ${enginesBun ?? 'missing'}`,
    `runtime ${runtime}`,
    `revision ${revision}`,
    bunVersionFile ? `.bun-version ${bunVersionFile}` : null,
    packageManager ? `packageManager ${packageManager}` : null,
  ].filter(Boolean);
  const ok = issues.length === 0;

  return {
    ok,
    runtime,
    revision,
    enginesBun,
    bunVersionFile,
    packageManager,
    issues,
    message: ok
      ? `Bun stable pin ok · ${parts.join(' · ')}`
      : `Bun stable pin mismatch · ${issues.join(' · ')}`,
  };
}

/** Refuse to start a long-lived service or merge proof on a non-reviewed runtime. */
export async function assertBunStablePin(options: { root?: string } = {}): Promise<BunPinCheck> {
  const result = await checkBunPin(Bun.version, options);
  if (!result.ok) throw new Error(result.message);
  return result;
}
