/**
 * Harness Bun macros — bundle-time helpers (`bun build` + `with { type: "macro" }`).
 * @see https://bun.com/docs/bundler/macros
 */
export { getGitBranch, getGitCommitHash } from './git-commit';
export {
  getGitHubCanonicalConstants,
  getGitHubRepositoryParts,
  GITHUB_CASCADE,
  GITHUB_ORIGIN,
  GITHUB_REMOTES,
  type GitHubRepositoryParts,
} from './github-repository';
