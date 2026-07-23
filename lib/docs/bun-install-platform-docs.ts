// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
/**
 * bun install platform-specific dependencies — lockfile normalization + --cpu/--os.
 *
 * @see https://bun.com/docs/pm/cli/install#platform-specific-dependencies
 * @see https://bun.com/docs/pm/cli/install#cpu-and-os-flags
 */
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// eslint-disable-next-line no-restricted-imports
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { joinPath } from '../path-bun.ts';
import { resolveVerificationBunBinary } from '../verification/resolve-bun-binary.ts';
import { bunDocs } from './bun-site-url.ts';

export const INSTALL_PLATFORM_DOCS = {
  platformSpecificDependencies: bunDocs('pm/cli/install', 'platform-specific-dependencies'),
  cpuAndOsFlags: bunDocs('pm/cli/install', 'cpu-and-os-flags'),
} as const;

/** SSOT — accepted `bun install --cpu` / `--os` flag values. */
export const BUN_INSTALL_PLATFORM_SUPPORTED = {
  cpu: ['arm', 'arm64', 'ia32', 'mips', 'mipsel', 'ppc', 'ppc64', 's390', 's390x', 'x32', 'x64'],
  os: ['aix', 'android', 'darwin', 'freebsd', 'linux', 'openbsd', 'sunos', 'win32'],
} as const;

/** Accepted `--cpu` values per Bun install docs. */
export const BUN_INSTALL_CPU_VALUES = BUN_INSTALL_PLATFORM_SUPPORTED.cpu;

/** Accepted `--os` values per Bun install docs. */
export const BUN_INSTALL_OS_VALUES = BUN_INSTALL_PLATFORM_SUPPORTED.os;

export type BunInstallCpu = (typeof BUN_INSTALL_CPU_VALUES)[number];
export type BunInstallOs = (typeof BUN_INSTALL_OS_VALUES)[number];

/** Doc coverage — mechanism vs probe. */
export const INSTALL_PLATFORM_COVERAGE = [
  {
    topic: 'lockfile normalization (cpu/os in bun.lock)',
    canonical: INSTALL_PLATFORM_DOCS.platformSpecificDependencies,
    probe: 'bun install --cpu/--os flags',
  },
  {
    topic: 'cross-platform target override (--cpu / --os)',
    canonical: INSTALL_PLATFORM_DOCS.cpuAndOsFlags,
    probe: 'bun install --cpu/--os flags',
    supported: BUN_INSTALL_PLATFORM_SUPPORTED,
  },
] as const;

export type BunInstallPlatformProbe = {
  ok: boolean;
  note: string;
  validExitCode: number | null;
  invalidExitCode: number | null;
  invalidMessage: string;
};

function decodeSpawnOutput(data: Uint8Array | string | undefined): string {
  if (data == null) return '';
  if (typeof data === 'string') return data;
  return new TextDecoder().decode(data);
}

/**
 * Probe that `--cpu` / `--os` are accepted for cross-platform dry-run installs
 * and invalid cpu values are rejected with a helpful error.
 */
export async function probeBunInstallPlatformFlags(): Promise<BunInstallPlatformProbe> {
  const dir = await mkdtemp(joinPath(tmpdir(), 'fw-bun-install-probe-'));
  const bunPath = resolveVerificationBunBinary().path;
  try {
    await Bun.write(
      joinPath(dir, 'package.json'),
      JSON.stringify({ name: 'fw-install-platform-probe', dependencies: {} })
    );

    const valid = Bun.spawnSync(
      [bunPath, 'install', '--cpu=x64', '--os=linux', '--dry-run', '--ignore-scripts'],
      { cwd: dir, stdout: 'pipe', stderr: 'pipe', stdin: 'ignore' }
    );

    const invalid = Bun.spawnSync(
      [bunPath, 'install', '--cpu=bogus', '--os=linux', '--dry-run', '--ignore-scripts'],
      { cwd: dir, stdout: 'pipe', stderr: 'pipe', stdin: 'ignore' }
    );

    const validOk = valid.exitCode === 0;
    const invalidMessage = decodeSpawnOutput(invalid.stderr).trim();
    const invalidOk = invalid.exitCode !== 0 && invalidMessage.includes('Invalid CPU');

    const ok = validOk && invalidOk;
    const note = ok
      ? 'dry-run --cpu=x64 --os=linux exit=0; invalid cpu rejected'
      : [
          validOk ? 'valid ok' : `valid exit=${valid.exitCode}`,
          invalidOk
            ? 'invalid ok'
            : `invalid exit=${invalid.exitCode} msg=${invalidMessage.slice(0, 120)}`,
        ].join('; ');

    return {
      ok,
      note,
      validExitCode: valid.exitCode,
      invalidExitCode: invalid.exitCode,
      invalidMessage,
    };
  } catch (e) {
    return {
      ok: false,
      note: e instanceof Error ? e.message : String(e),
      validExitCode: null,
      invalidExitCode: null,
      invalidMessage: '',
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
