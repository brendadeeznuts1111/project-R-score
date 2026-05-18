// Build-time macros - executed during bundling, not runtime
// Import with: import { ... } from "./macros/build-info.ts" with { type: "macro" };

export function getGitCommitHash(): string {
  const { stdout } = Bun.spawnSync({
    cmd: ["git", "rev-parse", "HEAD"],
    stdout: "pipe",
  });
  return stdout.toString().trim();
}

export function getGitCommitShort(): string {
  const { stdout } = Bun.spawnSync({
    cmd: ["git", "rev-parse", "--short", "HEAD"],
    stdout: "pipe",
  });
  return stdout.toString().trim();
}

export function getGitBranch(): string {
  const { stdout } = Bun.spawnSync({
    cmd: ["git", "rev-parse", "--abbrev-ref", "HEAD"],
    stdout: "pipe",
  });
  return stdout.toString().trim();
}

export function getBuildTimestamp(): string {
  return new Date().toISOString();
}

export function getBunVersion(): string {
  return Bun.version;
}

export function getBuildInfo() {
  return {
    commit: getGitCommitHash(),
    commitShort: getGitCommitShort(),
    branch: getGitBranch(),
    buildTime: getBuildTimestamp(),
    bunVersion: getBunVersion(),
  };
}
