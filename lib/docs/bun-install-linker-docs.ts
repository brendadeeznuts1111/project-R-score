// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Isolated installs + global virtual store — doc anchors and lockfile metadata.
 *
 * @see https://bun.com/docs/pm/isolated-installs
 * @see https://bun.com/docs/pm/global-store
 * @see https://bun.com/docs/pm/lockfile
 */
import { bunDocs } from './bun-site-url.ts';
import { joinPath } from '../path-bun.ts';

export const INSTALL_LINKER_DOCS = {
  isolatedInstalls: bunDocs('pm/isolated-installs'),
  globalStore: bunDocs('pm/global-store'),
  lockfile: bunDocs('pm/lockfile'),
  bunfigGlobalStore: 'https://bun.com/docs/runtime/bunfig#install-globalstore',
} as const;

/** configVersion = 1 + workspaces → isolated linker default (Bun docs). */
export const LOCKFILE_CONFIG_VERSION_ISOLATED_DEFAULT = 1 as const;

export type LockfileInstallMeta = {
  configVersion: number | null;
  lockfileVersion: number | null;
  hasWorkspaces: boolean;
  /** True when Bun docs say isolated is the default linker for this lockfile. */
  expectsIsolatedDefault: boolean;
};

export async function readLockfileInstallMeta(
  rootDir: string
): Promise<LockfileInstallMeta | null> {
  const lockPath = joinPath(rootDir, 'bun.lock');
  if (!(await Bun.file(lockPath).exists())) return null;
  const text = await Bun.file(lockPath).text();
  const configMatch = text.match(/"configVersion":\s*(\d+)/);
  const lockMatch = text.match(/"lockfileVersion":\s*(\d+)/);
  const hasWorkspaces = text.includes('"workspaces"');
  const configVersion = configMatch ? Number(configMatch[1]) : null;
  return {
    configVersion,
    lockfileVersion: lockMatch ? Number(lockMatch[1]) : null,
    hasWorkspaces,
    expectsIsolatedDefault:
      configVersion === LOCKFILE_CONFIG_VERSION_ISOLATED_DEFAULT && hasWorkspaces,
  };
}

export async function probeLockfileConfigVersion(
  rootDir: string
): Promise<{ ok: boolean; note: string; meta: LockfileInstallMeta | null }> {
  const meta = await readLockfileInstallMeta(rootDir);
  if (!meta) {
    return { ok: false, note: 'bun.lock missing', meta: null };
  }
  if (meta.configVersion === 0) {
    return {
      ok: false,
      note: 'configVersion=0 (hoisted legacy) — workspace monorepo expects configVersion=1 for isolated default',
      meta,
    };
  }
  if (meta.expectsIsolatedDefault) {
    return {
      ok: true,
      note: `configVersion=${meta.configVersion} + workspaces → isolated linker default per Bun docs`,
      meta,
    };
  }
  if (meta.configVersion === LOCKFILE_CONFIG_VERSION_ISOLATED_DEFAULT) {
    return {
      ok: true,
      note: `configVersion=${meta.configVersion} (non-workspace project)`,
      meta,
    };
  }
  return {
    ok: false,
    note: `unexpected configVersion=${String(meta.configVersion)} workspaces=${meta.hasWorkspaces}`,
    meta,
  };
}
