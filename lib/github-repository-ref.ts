// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/templating/create — Bun create GITHUB_TOKEN / GITHUB_API_DOMAIN
/**
 * Granular GitHub repository identity (owner / name / host / remote).
 * URL is derived at the link edge via htmlUrl / GITHUB_ORIGIN.url — not an interior SSOT.
 *
 * Resolve: Actions GITHUB_* → git remote → CANONICAL_REMOTES[slot].
 * Fail-loud on garbage Actions/git wire (never silent hardcode as "env").
 * Transport (e.g. fetch unix sockets) is intentionally out of scope here.
 *
 * Global frozen constants (`GITHUB_ORIGIN`, `BUN_GITHUB_ENV`) are for docs/portal/bake
 * consumers that need a stable link edge without runtime resolve.
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

/**
 * Bun-native + Actions GitHub env **key names** (never values).
 *
 * - Bun create: `GITHUB_TOKEN` · `GITHUB_ACCESS_TOKEN` · `GITHUB_API_DOMAIN`
 * - Actions identity: `GITHUB_REPOSITORY*` · `GITHUB_SERVER_URL`
 * - Bun test CI reporters also read `GITHUB_REPOSITORY` · `GITHUB_SERVER_URL` · `GITHUB_RUN_ID`
 *
 * @see https://bun.com/docs/runtime/templating/create
 */
export const BUN_GITHUB_ENV = {
  /** Bun create — preferred over ACCESS_TOKEN when both set */
  TOKEN: 'GITHUB_TOKEN',
  /** Bun create — alias when TOKEN unset */
  ACCESS_TOKEN: 'GITHUB_ACCESS_TOKEN',
  /** Bun create — GitHub Enterprise / proxy API host */
  API_DOMAIN: 'GITHUB_API_DOMAIN',
  /** Actions — `owner/name` */
  REPOSITORY: 'GITHUB_REPOSITORY',
  /** Actions — owner (must agree with REPOSITORY when set) */
  REPOSITORY_OWNER: 'GITHUB_REPOSITORY_OWNER',
  /** Actions — e.g. https://github.com */
  SERVER_URL: 'GITHUB_SERVER_URL',
  /** Actions / Bun test reporters — run id */
  RUN_ID: 'GITHUB_RUN_ID',
  /** Actions — `"true"` when running on GitHub Actions */
  ACTIONS: 'GITHUB_ACTIONS',
  /** `gh` CLI token alias */
  GH_TOKEN: 'GH_TOKEN',
} as const;

export type BunGitHubEnvKey = (typeof BUN_GITHUB_ENV)[keyof typeof BUN_GITHUB_ENV];

/** Default github.com API host (override at runtime via `GITHUB_API_DOMAIN`). */
export const GITHUB_DEFAULT_API_DOMAIN = 'api.github.com' as const;

/** Default github.com web host. */
export const GITHUB_DEFAULT_HOST = 'github.com' as const;

/** Default branch for blob/raw link helpers. */
export const GITHUB_DEFAULT_BRANCH = 'main' as const;

/** Frozen remote slot + parts + link-edge `url` (from CANONICAL_REMOTES). */
export type GitHubRemoteConstants = {
  readonly remote: GitHubRemoteSlot;
  readonly host: string;
  readonly owner: string; // brand-ok — github login/org
  readonly name: string; // brand-ok — repository name
  /** Actions-style `owner/name`. */
  readonly ownerName: string;
  /** Link edge HTML home — prefer over inventing `REPO_URL`. */
  readonly url: string;
  /** `git@host:owner/name.git` clone form. */
  readonly gitSsh: string;
  /** Default API host for this public github.com remote. */
  readonly apiHost: typeof GITHUB_DEFAULT_API_DOMAIN;
};

function remoteConstants(remote: GitHubRemoteSlot): GitHubRemoteConstants {
  const c = CANONICAL_REMOTES[remote];
  return {
    remote,
    host: c.host,
    owner: c.owner,
    name: c.name,
    ownerName: `${c.owner}/${c.name}`,
    url: c.url,
    gitSsh: `git@${c.host}:${c.owner}/${c.name}.git`,
    apiHost: GITHUB_DEFAULT_API_DOMAIN,
  } as const;
}

/** Monorepo origin (`project-R-score`) — global frozen constants. */
export const GITHUB_ORIGIN: GitHubRemoteConstants = remoteConstants('origin');

/** Nested cascade product remote — do not default-push here. */
export const GITHUB_CASCADE: GitHubRemoteConstants = remoteConstants('cascade');

/** Both remote slots keyed for iteration / slot lookup. */
export const GITHUB_REMOTES = {
  origin: GITHUB_ORIGIN,
  cascade: GITHUB_CASCADE,
} as const satisfies Record<GitHubRemoteSlot, GitHubRemoteConstants>;

/** Link edge only — not stored as the identity SSOT. */
export function htmlUrl(ref: Pick<GitHubRepositoryRef, 'host' | 'owner' | 'name'>): string {
  return `https://${ref.host}/${ref.owner}/${ref.name}`;
}

/** Compact Actions-style `owner/name`. */
export function ownerName(ref: Pick<GitHubRepositoryRef, 'owner' | 'name'>): string {
  return `${ref.owner}/${ref.name}`;
}

function encodePathSegments(path: string): string {
  return path
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map(part => encodeURIComponent(part))
    .join('/');
}

function encodeBranchPath(branch: string): string {
  return branch
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
}

/** Link edge: `/tree/<branch>` (branch segments URI-encoded). */
export function treeUrl(
  ref: Pick<GitHubRepositoryRef, 'host' | 'owner' | 'name'>,
  branch: string
): string {
  return `${htmlUrl(ref)}/tree/${encodeBranchPath(branch)}`;
}

/** Link edge: `/commit/<sha>`. */
export function commitUrl(
  ref: Pick<GitHubRepositoryRef, 'host' | 'owner' | 'name'>,
  sha: string
): string {
  return `${htmlUrl(ref)}/commit/${sha}`;
}

/** Link edge: `/blob/<branch>/<path>` (branch + path segments URI-encoded). */
export function blobUrl(
  ref: Pick<GitHubRepositoryRef, 'host' | 'owner' | 'name'>,
  path: string,
  branch: string = GITHUB_DEFAULT_BRANCH
): string {
  return `${htmlUrl(ref)}/blob/${encodeBranchPath(branch)}/${encodePathSegments(path)}`;
}

/** Link edge: raw.githubusercontent.com content URL. */
export function rawUrl(
  ref: Pick<GitHubRepositoryRef, 'owner' | 'name'>,
  path: string,
  branch: string = GITHUB_DEFAULT_BRANCH
): string {
  return `https://raw.githubusercontent.com/${ref.owner}/${ref.name}/${encodeBranchPath(branch)}/${encodePathSegments(path)}`;
}

/** `https://` + API domain (Bun create `GITHUB_API_DOMAIN` or default). */
export function apiBaseUrl(apiDomain: string = GITHUB_DEFAULT_API_DOMAIN): string {
  const host = apiDomain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
  return `https://${host || GITHUB_DEFAULT_API_DOMAIN}`;
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
  if (!serverUrl?.trim()) return GITHUB_DEFAULT_HOST;
  try {
    const u = new URL(serverUrl.trim());
    return u.hostname || GITHUB_DEFAULT_HOST;
  } catch {
    throw new Error(
      `${BUN_GITHUB_ENV.SERVER_URL} is not a valid URL: ${JSON.stringify(serverUrl)}`
    );
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
  const c = GITHUB_REMOTES[remote];
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

  const full = env[BUN_GITHUB_ENV.REPOSITORY]?.trim();
  if (full) {
    const fromFull = parseOwnerName(full);
    if (!fromFull) {
      throw new Error(`${BUN_GITHUB_ENV.REPOSITORY} is not owner/name: ${JSON.stringify(full)}`);
    }
    const ownerEnv = env[BUN_GITHUB_ENV.REPOSITORY_OWNER]?.trim();
    if (ownerEnv && ownerEnv !== fromFull.owner) {
      throw new Error(
        `${BUN_GITHUB_ENV.REPOSITORY_OWNER} (${JSON.stringify(ownerEnv)}) disagrees with ${BUN_GITHUB_ENV.REPOSITORY} (${JSON.stringify(full)})`
      );
    }
    return {
      host: hostFromServerUrl(env[BUN_GITHUB_ENV.SERVER_URL]),
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
  const apiDomain = env[BUN_GITHUB_ENV.API_DOMAIN]?.trim() || GITHUB_DEFAULT_API_DOMAIN;
  if (env[BUN_GITHUB_ENV.TOKEN]?.trim()) {
    return { tokenSource: 'GITHUB_TOKEN', apiDomain };
  }
  if (env[BUN_GITHUB_ENV.ACCESS_TOKEN]?.trim()) {
    return { tokenSource: 'GITHUB_ACCESS_TOKEN', apiDomain };
  }
  if (env[BUN_GITHUB_ENV.GH_TOKEN]?.trim()) {
    return { tokenSource: 'GH_TOKEN', apiDomain };
  }
  return { tokenSource: 'none', apiDomain };
}
