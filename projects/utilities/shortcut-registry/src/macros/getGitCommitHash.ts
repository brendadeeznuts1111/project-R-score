/**
 * Bun Macro: Get Git commit hash at bundle-time
 * 
 * This macro executes `git rev-parse HEAD` during bundling and inlines
 * the commit hash into your bundle.
 * 
 * @example
 * ```ts
 * import { getGitCommitHash } from './macros/getGitCommitHash.ts' with { type: 'macro' };
 * 
 * const commitHash = getGitCommitHash();
 * console.log(`Built from commit: ${commitHash}`);
 * ```
 */

/**
 * Get the current Git commit hash at bundle-time
 * 
 * Uses Bun.spawnSync for synchronous execution during bundling.
 */
export function getGitCommitHash(): string {
  try {
    // @ts-ignore - Bun.spawnSync is available at runtime
    const { stdout } = Bun.spawnSync({
      cmd: ['git', 'rev-parse', 'HEAD'],
      stdout: 'pipe',
    });

    return stdout.toString().trim();
  } catch (error) {
    // If git is not available or not in a git repo, return a placeholder
    return 'unknown';
  }
}

/**
 * Get a short version of the Git commit hash (first 7 characters)
 */
export function getShortCommitHash(): string {
  const fullHash = getGitCommitHash();
  return fullHash.substring(0, 7);
}

/**
 * Get Git commit hash with timestamp
 */
export function getCommitInfo(): { hash: string; shortHash: string; timestamp: string } {
  const hash = getGitCommitHash();
  const shortHash = hash.substring(0, 7);
  
  try {
    // @ts-ignore - Bun.spawnSync is available at runtime
    const { stdout } = Bun.spawnSync({
      cmd: ['git', 'log', '-1', '--format=%ct', 'HEAD'],
      stdout: 'pipe',
    });
    
    const timestamp = stdout.toString().trim();
    return {
      hash,
      shortHash,
      timestamp: timestamp || new Date().toISOString(),
    };
  } catch {
    return {
      hash,
      shortHash,
      timestamp: new Date().toISOString(),
    };
  }
}
