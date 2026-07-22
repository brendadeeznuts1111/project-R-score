// @see https://bun.com/docs/bundler/macros — Bun macros (bundle-time only)
// @see https://bun.com/docs/bundler/macros#serializability — macro return values must serialize
// @see https://bun.com/docs/bundler/plugins — Bun.plugin (not used here; bundler extension surface)
// @see https://bun.com/docs/bundler/index#basic-example — Bun.build
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Bundle-time GitHub repository parts (serializable plain object).
 *
 * Uses the same resolve path as runtime [`../github-repository-ref.ts`](../github-repository-ref.ts).
 * Import with `{ type: "macro" }` under `bun build` to inline `{ host, owner, name, remote, source }`.
 * No fetch / HTMLRewriter here — network at build is out of scope.
 *
 * @example
 * ```ts
 * import { getGitHubRepositoryParts } from '../lib/macros/github-repository.ts' with { type: 'macro' };
 * const parts = getGitHubRepositoryParts();
 * ```
 */
import {
  resolveGitHubRepositoryRef,
  type GitHubRemoteSlot,
  type GitHubRepositoryRef,
} from '../github-repository-ref';

/** Serializable repo identity — safe to inline via macros. */
export type GitHubRepositoryParts = {
  host: string;
  owner: string; // brand-ok — github login/org
  name: string; // brand-ok — repository name
  remote: GitHubRemoteSlot;
  source: GitHubRepositoryRef['source'];
};

/**
 * Resolve owner/name/host/remote at bundle-time (or runtime if not imported as macro).
 * Default slot: `origin`.
 */
export function getGitHubRepositoryParts(
  remote: GitHubRemoteSlot = 'origin'
): GitHubRepositoryParts {
  const ref = resolveGitHubRepositoryRef({ remote });
  return {
    host: ref.host,
    owner: ref.owner,
    name: ref.name,
    remote: ref.remote,
    source: ref.source,
  };
}
