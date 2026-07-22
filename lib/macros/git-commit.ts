// @see https://bun.com/docs/bundler/macros — Bun macros (bundle-time only)
// @see https://bun.com/docs/bundler/macros#embed-latest-git-commit-hash — embed git commit hash
// @see https://bun.com/docs/bundler/macros#import-attributes — with { type: "macro" }
// @see https://bun.com/docs/bundler/index#basic-example — Bun.build
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
/**
 * Bundle-time git identity helpers.
 *
 * Import with `{ type: "macro" }` under `bun build` so calls are inlined.
 * Under `bun scripts/*.ts` these are ordinary functions (not substituted).
 *
 * @example
 * ```ts
 * import { getGitCommitHash } from '../lib/macros/git-commit.ts' with { type: 'macro' };
 * console.log(getGitCommitHash());
 * ```
 */

function gitText(args: string[]): string {
  try {
    const { stdout, exitCode } = Bun.spawnSync({
      cmd: ['git', ...args],
      stdout: 'pipe',
      stderr: 'pipe',
    });
    if (exitCode !== 0) return '';
    return stdout.toString().trim();
  } catch {
    return '';
  }
}

/** Full SHA of HEAD, or `''` if git is unavailable. */
export function getGitCommitHash(): string {
  return gitText(['rev-parse', 'HEAD']);
}

/** Current branch name (`HEAD` when detached), or `''` if unavailable. */
export function getGitBranch(): string {
  return gitText(['rev-parse', '--abbrev-ref', 'HEAD']);
}
