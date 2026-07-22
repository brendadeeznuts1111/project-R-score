// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
/**
 * Granular GitHub repository identity (owner / name / host / remote).
 * URL is derived at the link edge via htmlUrl — not an interior SSOT.
 *
 * Resolve: Actions GITHUB_* → git remote → CANONICAL_REMOTES[slot].
 * Fail-loud on garbage Actions/git wire (never silent hardcode as "env").
 * Transport (e.g. fetch unix sockets) is intentionally out of scope here.
 *
 * @see ./docs/repo-docs.ts — CANONICAL_REMOTES
 */
import { CANONICAL_REMOTES } from './docs/repo-docs';

export type GitHubRemoteSlot = 'origin' | 'cascade';

export type GitHubRepositoryRef = {
  host: string;
  owner: string; // brand-ok — github login/org
  name: string; // brand-ok — repository name (not full URL)
  remote: GitHubRemoteSlot;
  source: 'actions' | 'git-remote' | 'canonical';
};

export type GithubTokenPresence = {
  tokenSource: 'GITHUB_TOKEN' | 'GITHUB_ACCESS_TOKEN' | 'GH_TOKEN' | 'none';
  apiDomain: string;
};

type EnvMap = { [key: string]: string | undefined };

/** Link edge only — not stored as the identity SSOT. */
export function htmlUrl(ref: Pick<GitHubRepositoryRef, 'host' | 'owner' | 'name'>): string {
  return `https://${ref.host}/${ref.owner}/${ref.name}`;
}

/** Compact Actions-style `owner/name`. */
export function ownerName(ref: Pick<GitHubRepositoryRef, 'owner' | 'name'>): string {
  return `${ref.owner}/${ref.name}`;
}

/** Link edge: `/tree/<branch>` (branch segments URI-encoded). */
export function treeUrl(ref: GitHubRepositoryRef, branch: string): string {
  const branchPath = branch
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
  return `${htmlUrl(ref)}/tree/${branchPath}`;
}

/** Link edge: `/commit/<sha>`. */
export function commitUrl(ref: GitHubRepositoryRef, sha: string): string {
  return `${htmlUrl(ref)}/commit/${sha}`;
}

export function parseOwnerName(full: string): { owner: string; name: string } | undefined {
  const trimmed = full.trim().replace(/^\/+|\/+$/g, '');
  const parts = trimmed.split('/');
  if (parts.length !== 2) return undefined;
  const owner = parts[0]!;
  const name = parts[1]!.replace(/\.git$/i, '');
  if (!owner || !name) return undefined;
  return { owner, name };
}

export function parseGitRemoteUrl(
  raw: string
): { host: string; owner: string; name: string } | undefined {
  const value = raw.trim();
  if (!value) return undefined;

  if (value.startsWith('git@')) {
    // git@github.com:owner/name.git
    const m = /^git@([^:]+):(.+)$/.exec(value);
    if (!m) return undefined;
    const host = m[1]!;
    const path = parseOwnerName(m[2]!);
    if (!path) return undefined;
    return { host, ...path };
  }

  // ssh://git@github.com/owner/name.git
  if (/^ssh:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      const host = u.hostname;
      const path = parseOwnerName(u.pathname);
      if (!host || !path) return undefined;
      return { host, ...path };
    } catch {
      return undefined;
    }
  }

  try {
    const withProto = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const u = new URL(withProto);
    const path = parseOwnerName(u.pathname);
    if (!path) return undefined;
    return { host: u.hostname, ...path };
  } catch {
    return undefined;
  }
}

function hostFromServerUrl(serverUrl: string | undefined): string {
  if (!serverUrl?.trim()) return 'github.com';
  try {
    const u = new URL(serverUrl.trim());
    return u.hostname || 'github.com';
  } catch {
    throw new Error(`GITHUB_SERVER_URL is not a valid URL: ${JSON.stringify(serverUrl)}`);
  }
}

function readGitRemoteUrl(remote: GitHubRemoteSlot): string | undefined {
  const result = Bun.spawnSync(['git', 'remote', 'get-url', remote], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (result.exitCode !== 0) return undefined;
  const text = result.stdout.toString().trim();
  return text || undefined;
}

function fromCanonical(remote: GitHubRemoteSlot): GitHubRepositoryRef {
  const c = CANONICAL_REMOTES[remote];
  return {
    host: c.host,
    owner: c.owner,
    name: c.name,
    remote,
    source: 'canonical',
  };
}

/**
 * Resolve repository identity for a named remote slot.
 * @param gitRemoteUrl test seam — `undefined` = probe git; `null` = skip git; string = fake remote
 */
export function resolveGitHubRepositoryRef(opts?: {
  remote?: GitHubRemoteSlot;
  env?: EnvMap;
  gitRemoteUrl?: string | null;
}): GitHubRepositoryRef {
  const remote = opts?.remote ?? 'origin';
  const env = opts?.env ?? Bun.env;

  const full = env.GITHUB_REPOSITORY?.trim();
  if (full) {
    const fromFull = parseOwnerName(full);
    if (!fromFull) {
      throw new Error(`GITHUB_REPOSITORY is not owner/name: ${JSON.stringify(full)}`);
    }
    const ownerEnv = env.GITHUB_REPOSITORY_OWNER?.trim();
    if (ownerEnv && ownerEnv !== fromFull.owner) {
      throw new Error(
        `GITHUB_REPOSITORY_OWNER (${JSON.stringify(ownerEnv)}) disagrees with GITHUB_REPOSITORY (${JSON.stringify(full)})`
      );
    }
    return {
      host: hostFromServerUrl(env.GITHUB_SERVER_URL),
      owner: ownerEnv || fromFull.owner,
      name: fromFull.name,
      remote,
      source: 'actions',
    };
  }

  const gitUrl =
    opts?.gitRemoteUrl === undefined ? readGitRemoteUrl(remote) : (opts.gitRemoteUrl ?? undefined);
  if (gitUrl) {
    const parsed = parseGitRemoteUrl(gitUrl);
    if (!parsed) {
      throw new Error(
        `git remote ${remote} is not a parseable GitHub URL: ${JSON.stringify(gitUrl)}`
      );
    }
    return { ...parsed, remote, source: 'git-remote' };
  }

  return fromCanonical(remote);
}

/** Presence only — never returns token values. Bun create prefers GITHUB_TOKEN. */
export function githubTokenPresence(env: EnvMap = Bun.env): GithubTokenPresence {
  const apiDomain = env.GITHUB_API_DOMAIN?.trim() || 'api.github.com';
  if (env.GITHUB_TOKEN?.trim()) {
    return { tokenSource: 'GITHUB_TOKEN', apiDomain };
  }
  if (env.GITHUB_ACCESS_TOKEN?.trim()) {
    return { tokenSource: 'GITHUB_ACCESS_TOKEN', apiDomain };
  }
  if (env.GH_TOKEN?.trim()) {
    return { tokenSource: 'GH_TOKEN', apiDomain };
  }
  return { tokenSource: 'none', apiDomain };
}
