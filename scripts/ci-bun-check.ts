#!/usr/bin/env bun

// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import { isCanaryBunBuild } from '../lib/verification/bun-release-channel.ts';
import { resolveVerificationBunBinary } from '../lib/verification/resolve-bun-binary.ts';

function parseSemver(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function isAtLeast(version: string, minimum: string): boolean {
  const left = parseSemver(version);
  const right = parseSemver(minimum);
  if (!left || !right) return false;
  if (left.major !== right.major) return left.major > right.major;
  if (left.minor !== right.minor) return left.minor > right.minor;
  return left.patch >= right.patch;
}

const minimum = '1.3.9';
const version = Bun.version;
const revision = Bun.revision;
let cliVersion = '';
let cliRevision = '';

try {
  const resolved = resolveVerificationBunBinary({ fresh: true });
  const versionProc = Bun.spawnSync([resolved.path, '--version'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (versionProc.exitCode === 0) {
    cliVersion = new TextDecoder().decode(versionProc.stdout).trim();
  }
  const revisionProc = Bun.spawnSync([resolved.path, '--revision'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (revisionProc.exitCode === 0) {
    cliRevision = new TextDecoder().decode(revisionProc.stdout).trim();
  }
  if (cliVersion && cliVersion.split(/[\s+]/)[0] !== version.split(/[\s+]/)[0]) {
    console.error(
      `Bun PATH skew: runtime ${version} but spawned CLI ${cliVersion} at ${resolved.path} (source=${resolved.source})`
    );
    process.exit(1);
  }
} catch (e: unknown) {
  console.warn(
    `resolveVerificationBunBinary failed: ${e instanceof Error ? e.message : String(e)} — falling back to bare bun spawn`
  );
  try {
    const versionProc = Bun.spawnSync(bunSpawnArgs(['--version']), {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    if (versionProc.exitCode === 0) {
      cliVersion = new TextDecoder().decode(versionProc.stdout).trim();
    }
  } catch {
    // Fall back to Bun.version-only checks.
  }
}

// Bun.version and `bun --version` omit the channel in some canary builds, while
// `bun --revision` retains it (for example, 1.4.0-canary.1+<sha>).
const isCanary = isCanaryBunBuild([version, cliVersion, cliRevision]);
const allowCanary = Bun.env.ALLOW_CANARY_BUN_CI === '1' || Bun.env.ALLOW_CANARY_BUN_CI === 'true';

if (!isAtLeast(version, minimum)) {
  console.error(`Bun ${version} is below required minimum ${minimum}.`);
  process.exit(1);
}

if (isCanary && !allowCanary) {
  console.error(
    `Bun ${version} (${revision}) is a canary build. Required CI lane needs stable Bun >= ${minimum}.`
  );
  process.exit(1);
}

if (isCanary && allowCanary) {
  console.warn(`Canary build allowed by ALLOW_CANARY_BUN_CI: ${version} (${revision})`);
} else {
  console.info(`Bun runtime check passed: ${version} (${revision})`);
}
