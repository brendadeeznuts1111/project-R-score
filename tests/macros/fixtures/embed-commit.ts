// @see https://bun.com/docs/bundler/macros#embed-latest-git-commit-hash — embed git commit hash
// @see https://bun.com/docs/bundler/macros#import-attributes — with { type: "macro" }
/**
 * Fixture entry for proving git macros inline under `bun build`.
 * Not imported by runtime tests except via spawn of `bun build`.
 */
import { getGitBranch, getGitCommitHash } from '../../../lib/macros/git-commit.ts' with {
  type: 'macro',
};
import { getGitHubRepositoryParts } from '../../../lib/macros/github-repository.ts' with {
  type: 'macro',
};

export const COMMIT = getGitCommitHash();
export const BRANCH = getGitBranch();
export const REPO = getGitHubRepositoryParts();

console.log(COMMIT);
console.log(BRANCH);
console.log(`${REPO.owner}/${REPO.name}`);
