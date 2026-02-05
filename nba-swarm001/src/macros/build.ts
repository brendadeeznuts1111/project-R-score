/**
 * Build-time macros for NBA Swarm
 * 
 * These functions execute at bundle-time and their results are inlined into the bundle
 */

/**
 * Get current Git commit hash at build time
 */
export function getGitCommitHash(): string {
  try {
    const { stdout, exitCode } = Bun.spawnSync({
      cmd: ["git", "rev-parse", "HEAD"],
      stdout: "pipe",
      stderr: "pipe",
    });
    
    if (exitCode === 0 && stdout.length > 0) {
      return stdout.toString().trim();
    }
    
    // Not a git repo or git not available
    return "";
  } catch {
    // Git command failed or not available
    return "";
  }
}

/**
 * Get build timestamp
 */
export function getBuildTimestamp(): number {
  return Date.now();
}

/**
 * Get build version from package.json
 */
export async function getBuildVersion(): Promise<string> {
  try {
    const file = Bun.file("package.json");
    const pkg = await file.json();
    return pkg.version || "1.0.0";
  } catch {
    return "1.0.0";
  }
}

/**
 * Generate build constants
 */
export async function getBuildConstants(): Promise<
  Record<string, string | number>
> {
  const version = await getBuildVersion();

  return {
    BUILD_TIME: Date.now(),
    NODE_ENV: process.env.NODE_ENV || "development",
    GIT_HASH: getGitCommitHash(),
    VERSION: version,
  };
}

