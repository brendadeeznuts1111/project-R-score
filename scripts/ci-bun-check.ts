#!/usr/bin/env bun

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
  const versionProc = Bun.spawnSync(['bun', '--version'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (versionProc.exitCode === 0) {
    cliVersion = new TextDecoder().decode(versionProc.stdout).trim();
  }
} catch {
  // Fall back to Bun.version-only checks.
}

try {
  const revisionProc = Bun.spawnSync(['bun', '--revision'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (revisionProc.exitCode === 0) {
    cliRevision = new TextDecoder().decode(revisionProc.stdout).trim();
  }
} catch {
  // Fall back to Bun.revision-only checks.
}

const isCanary = [version, revision, cliVersion, cliRevision]
  .filter(Boolean)
  .some((value) => value.toLowerCase().includes('canary'));
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
  console.log(`Bun runtime check passed: ${version} (${revision})`);
}
