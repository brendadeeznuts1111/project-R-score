// Build-time constants
// Uses git commands at module load (works in dev)
// For production: import from macros with { type: "macro" } for bundle-time inlining

function getGitCommit(): string {
  try {
    const { stdout, exitCode } = Bun.spawnSync({
      cmd: ["git", "rev-parse", "HEAD"],
      stdout: "pipe",
      stderr: "ignore",
    });
    return exitCode === 0 ? stdout.toString().trim() : "unknown";
  } catch {
    return "unknown";
  }
}

function getGitBranch(): string {
  try {
    const { stdout, exitCode } = Bun.spawnSync({
      cmd: ["git", "rev-parse", "--abbrev-ref", "HEAD"],
      stdout: "pipe",
      stderr: "ignore",
    });
    return exitCode === 0 ? stdout.toString().trim() : "unknown";
  } catch {
    return "unknown";
  }
}

export const BUILD_TIMESTAMP = Date.now();
export const BUILD_DATE = new Date().toISOString();
export const BUILD_ID = `${getGitCommit().slice(0, 7)}-${BUILD_TIMESTAMP.toString(36)}`;
export const GIT_COMMIT = getGitCommit();
export const GIT_BRANCH = getGitBranch();
export const BUN_VERSION = Bun.version;
