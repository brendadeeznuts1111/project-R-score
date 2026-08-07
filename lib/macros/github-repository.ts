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
 * Prefer frozen [`GITHUB_ORIGIN`](../github-repository-ref.ts) when the canonical monorepo link
 * edge is enough (no Actions/git probe).
 * No fetch / HTMLRewriter here — network at build is out of scope.
 *
 * @example
 * ```ts
 * import { getGitHubRepositoryParts } from '../lib/macros/github-repository.ts' with { type: 'macro' };
 * const parts = getGitHubRepositoryParts();
 * ```
 */
import {
  GITHUB_CASCADE,
  GITHUB_ORIGIN,
  GITHUB_REMOTES,
  htmlUrl,
  ownerName,
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
  /** Actions-style `owner/name` (derived). */
  ownerName: string;
  /** Link edge HTML home (derived — not identity SSOT). */
  url: string;
};

/**
 * Resolve owner/name/host/remote (+ derived url) at bundle-time (or runtime if not imported as macro).
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
    ownerName: ownerName(ref),
    url: htmlUrl(ref),
  };
}

/**
 * Frozen canonical constants (no Actions/git probe) — safe global import.
 * Prefer this for portal chrome / docs link edges that must match CANONICAL_REMOTES.
 */
export function getGitHubCanonicalConstants(remote: GitHubRemoteSlot = 'origin') {
  return GITHUB_REMOTES[remote];
}

/** Re-export frozen slots for macro consumers that want named constants. */
export { GITHUB_CASCADE, GITHUB_ORIGIN, GITHUB_REMOTES };
