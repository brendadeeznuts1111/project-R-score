// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
/**
 * Channel resolution for metadata-only verification (no binary switching).
 *
 * Version sources match `bun upgrade` (GitHub Releases), not bun.sh text endpoints
 * or the npm `bun` package.
 *
 * @see https://bun.com/docs/installation#upgrading — bun upgrade channels
 * @see https://github.com/oven-sh/bun/blob/main/src/cli/upgrade_command.zig — updater API
 */
import { joinPath } from '../path-bun.ts';
import { githubTokenPresence } from '../github-repository-ref.ts';
import type { ReleaseChannel, SemanticTags, VerificationSnapshotIndex } from './types.ts';
import { VERIFICATION_SNAPSHOT_INDEX_PATH } from './types.ts';

export type ChannelResolveSource =
  | 'github-updater'
  | 'github-oven'
  | 'github-canary'
  | 'runtime'
  | 'pinned';

export type GithubAuthSource =
  | 'GITHUB_TOKEN'
  | 'GITHUB_ACCESS_TOKEN'
  | 'GH_TOKEN'
  | 'gh-cli'
  | 'none';

export type ChannelResolution = {
  channel: ReleaseChannel;
  resolvedVersion: string;
  isPinned: boolean;
  latestAtResolution?: string;
  /** Where the version string came from */
  resolveSource?: ChannelResolveSource;
  /** Auth used for the GitHub request (never the token value) */
  authSource?: GithubAuthSource;
  apiDomain?: string;
  canaryCommit?: string;
  canaryCommitShort?: string;
  channelReleaseUrl?: string;
  channelPublishedAt?: string;
  targetMatchesRuntime?: boolean;
};

export type CanaryParse = {
  displayVersion: string;
  commitFull: string;
  commitShort: string;
};

const SEMVER_RE = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

/** Path under api.github.com used by `bun upgrade` for stable. */
export const BUN_LATEST_RELEASE_PATH =
  '/repos/Jarred-Sumner/bun-releases-for-updater/releases/latest';

/** Fallback if the updater repo is unavailable. */
export const BUN_LATEST_RELEASE_PATH_FALLBACK = '/repos/oven-sh/bun/releases/latest';

/** Rolling canary tag used by `bun upgrade --canary`. */
export const BUN_CANARY_RELEASE_PATH = '/repos/oven-sh/bun/releases/tags/canary';

/** @deprecated Use path helpers + githubApiUrl — kept for test URL matching */
export const BUN_LATEST_RELEASE_API = `https://api.github.com${BUN_LATEST_RELEASE_PATH}`;
export const BUN_LATEST_RELEASE_API_FALLBACK = `https://api.github.com${BUN_LATEST_RELEASE_PATH_FALLBACK}`;
export const BUN_CANARY_RELEASE_API = `https://api.github.com${BUN_CANARY_RELEASE_PATH}`;

export type ResolveChannelOptions = {
  fetchImpl?: typeof fetch;
  runtimeVersion?: string;
  /** When env tokens missing, try `gh auth token` (default true). */
  allowGhCli?: boolean;
  /** Injected for tests — returns token from gh CLI. */
  ghTokenReader?: () => string | undefined;
  /**
   * Public Bun release feeds are anonymous-first (default).
   * Set true to send Authorization on the first request (CI rate-limit evasion).
   */
  preferAuth?: boolean;
  env?: {
    GITHUB_TOKEN?: string;
    GITHUB_ACCESS_TOKEN?: string;
    GH_TOKEN?: string;
    GITHUB_API_DOMAIN?: string;
  };
};

type EnvAuth = NonNullable<ResolveChannelOptions['env']>;

export type GithubAuthResolution = {
  token?: string;
  source: GithubAuthSource;
  apiDomain: string;
};

function readGhCliToken(): string | undefined {
  const gh = Bun.which('gh');
  if (!gh) return undefined;
  try {
    const proc = Bun.spawnSync([gh, 'auth', 'token'], {
      stdout: 'pipe',
      stderr: 'ignore',
    });
    if (proc.exitCode !== 0) return undefined;
    const tok = proc.stdout.toString().trim();
    return tok || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Prefer GITHUB_TOKEN (Bun create / Actions), then GITHUB_ACCESS_TOKEN, then GH_TOKEN,
 * then optional `gh auth token`. Presence metadata via githubTokenPresence.
 */
export function resolveGithubAuth(options: ResolveChannelOptions = {}): GithubAuthResolution {
  const env = options.env ?? Bun.env;
  const presence = githubTokenPresence(env);
  const apiDomain = presence.apiDomain;

  for (const key of ['GITHUB_TOKEN', 'GITHUB_ACCESS_TOKEN', 'GH_TOKEN'] as const) {
    const v = env[key]?.trim();
    if (v) return { token: v, source: key, apiDomain };
  }

  const allowGh = options.allowGhCli !== false;
  if (allowGh) {
    const reader = options.ghTokenReader ?? readGhCliToken;
    const fromGh = reader()?.trim();
    if (fromGh) return { token: fromGh, source: 'gh-cli', apiDomain };
  }

  return { token: undefined, source: 'none', apiDomain };
}

/** @deprecated Prefer resolveGithubAuth — returns token only */
export function resolveGithubAuthToken(
  env: EnvAuth = Bun.env,
  options: Pick<ResolveChannelOptions, 'allowGhCli' | 'ghTokenReader'> = {}
): string | undefined {
  return resolveGithubAuth({ env, ...options }).token;
}

export function githubApiUrl(path: string, apiDomain = 'api.github.com'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `https://${apiDomain}${p}`;
}

function githubHeaders(auth: GithubAuthResolution): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'FactoryWager-verify-channel',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  return headers;
}

/** Strip `bun-v` / `v` prefix from a GitHub release tag. */
export function parseBunReleaseTag(tag: string): string {
  const t = tag.trim();
  if (t.startsWith('bun-v')) return t.slice('bun-v'.length);
  if (t.startsWith('v') && /^\d/.test(t.slice(1))) return t.slice(1);
  return t;
}

type GithubRelease = {
  tag_name?: string;
  name?: string;
  body?: string;
  target_commitish?: string;
  html_url?: string;
  published_at?: string;
};

function parseGithubRelease(json: unknown): GithubRelease {
  if (!json || typeof json !== 'object') throw new Error('GitHub release: expected object');
  return json as GithubRelease;
}

/** @deprecated Prefer parseCanaryRelease */
export function parseCanaryVersion(release: GithubRelease): string {
  return parseCanaryRelease(release).displayVersion;
}

export function parseCanaryRelease(release: GithubRelease): CanaryParse {
  const name = release.name ?? '';
  const fromName = name.match(/Canary\s*\(([a-f0-9]{7,40})\)/i);
  if (fromName?.[1]) {
    const full = fromName[1].toLowerCase();
    return {
      displayVersion: `canary+${full.slice(0, 12)}`,
      commitFull: full,
      commitShort: full.slice(0, 12),
    };
  }

  const body = release.body ?? '';
  const fromBody = body.match(/commit:\s*([a-f0-9]{7,40})/i);
  if (fromBody?.[1]) {
    const full = fromBody[1].toLowerCase();
    return {
      displayVersion: `canary+${full.slice(0, 12)}`,
      commitFull: full,
      commitShort: full.slice(0, 12),
    };
  }

  const target = (release.target_commitish ?? '').trim().toLowerCase();
  if (/^[a-f0-9]{7,40}$/i.test(target)) {
    return {
      displayVersion: `canary+${target.slice(0, 12)}`,
      commitFull: target,
      commitShort: target.slice(0, 12),
    };
  }

  throw new Error('GitHub canary release: could not parse commit from name/body');
}

/** True when runtime revision shares a prefix with the channel target commit. */
export function revisionMatchesTarget(
  runtimeRevision: string | undefined,
  targetCommit: string | undefined
): boolean | undefined {
  if (!runtimeRevision || !targetCommit) return undefined;
  const a = runtimeRevision.toLowerCase();
  const b = targetCommit.toLowerCase();
  const n = Math.min(12, a.length, b.length);
  if (n < 7) return undefined;
  return a.slice(0, n) === b.slice(0, n);
}

function formatGithubFetchError(url: string, status: number, auth: GithubAuthResolution): string {
  const authHint =
    auth.source === 'none'
      ? ' Set GITHUB_TOKEN (or GITHUB_ACCESS_TOKEN / GH_TOKEN), or `gh auth login` / `gh auth refresh`.'
      : ` (auth=${auth.source})`;
  if (status === 403 || status === 429) {
    return `GitHub release fetch failed (${url}): ${status} — rate limited or forbidden.${authHint}`;
  }
  if (status === 401) {
    return `GitHub release fetch failed (${url}): 401 — bad/expired token.${authHint}`;
  }
  return `GitHub release fetch failed (${url}): ${status}.${auth.source === 'none' ? authHint : ''}`;
}

/**
 * Public Bun release feeds: anonymous-first (avoids broken `gh` tokens → 401).
 * Escalate with configured auth only on 403/429. `preferAuth` reverses the order.
 */
async function fetchGithubRelease(
  path: string,
  fetchFn: typeof fetch,
  auth: GithubAuthResolution,
  preferAuth = false
): Promise<{ release: GithubRelease; authUsed: GithubAuthResolution }> {
  const url = githubApiUrl(path, auth.apiDomain);
  const anon: GithubAuthResolution = {
    token: undefined,
    source: 'none',
    apiDomain: auth.apiDomain,
  };

  const attempts: GithubAuthResolution[] =
    preferAuth && auth.token ? [auth, anon] : auth.token ? [anon, auth] : [anon];

  let lastStatus = 0;
  for (const attempt of attempts) {
    const res = await fetchFn(url, { headers: githubHeaders(attempt) });
    if (res.ok) return { release: parseGithubRelease(await res.json()), authUsed: attempt };
    lastStatus = res.status;

    // Anonymous failed for non-rate-limit reasons and we have no further useful retry
    if (attempt.source === 'none' && res.status !== 403 && res.status !== 429) {
      // Still try auth if available (e.g. private mirror) except when anon got 401 (N/A)
      if (!auth.token || attempts.length === 1) {
        throw new Error(formatGithubFetchError(url, res.status, attempt));
      }
      continue;
    }
  }

  throw new Error(formatGithubFetchError(url, lastStatus, auth.token ? auth : anon));
}

export type ChannelAuthStatus = {
  source: GithubAuthSource;
  apiDomain: string;
  /** A token is configured (env or gh-cli), not that it was used for resolve */
  configured: boolean;
  /** Result of /rate_limit probe; null if not probed or no token */
  valid: boolean | null;
  remaining?: number;
  limit?: number;
  message: string;
};

/** Sync presence only (no network). */
export function describeChannelAuth(options: ResolveChannelOptions = {}): ChannelAuthStatus {
  const auth = resolveGithubAuth({ ...options, allowGhCli: options.allowGhCli !== false });
  const configured = auth.source !== 'none';
  return {
    source: auth.source,
    apiDomain: auth.apiDomain,
    configured,
    valid: null,
    message: configured
      ? `token configured via ${auth.source} (not probed)`
      : 'no token — public Bun release APIs use anonymous GitHub access',
  };
}

/**
 * Probe configured token against GET /rate_limit (secret-safe).
 * Anonymous-only setups report valid=null with a clear message.
 */
export async function probeChannelAuth(
  options: ResolveChannelOptions = {}
): Promise<ChannelAuthStatus> {
  const auth = resolveGithubAuth({ ...options, allowGhCli: options.allowGhCli !== false });
  const fetchFn = options.fetchImpl ?? fetch;
  const base: ChannelAuthStatus = {
    source: auth.source,
    apiDomain: auth.apiDomain,
    configured: auth.source !== 'none',
    valid: null,
    message: '',
  };

  if (!auth.token) {
    return {
      ...base,
      message: 'no token — anonymous access for public Bun release feeds',
    };
  }

  const url = githubApiUrl('/rate_limit', auth.apiDomain);
  try {
    const res = await fetchFn(url, { headers: githubHeaders(auth) });
    if (res.status === 401) {
      return {
        ...base,
        valid: false,
        message: `${auth.source} rejected (401) — set a PAT or run \`gh auth refresh\`; resolves still use anonymous for public feeds`,
      };
    }
    if (!res.ok) {
      return {
        ...base,
        valid: false,
        message: `${auth.source} probe failed (${res.status})`,
      };
    }
    const body = (await res.json()) as {
      resources?: { core?: { remaining?: number; limit?: number } };
      rate?: { remaining?: number; limit?: number };
    };
    const core = body.resources?.core ?? body.rate;
    const remaining = core?.remaining;
    const limit = core?.limit;
    return {
      ...base,
      valid: true,
      remaining,
      limit,
      message:
        remaining != null && limit != null
          ? `${auth.source} ok · rate ${remaining}/${limit} remaining`
          : `${auth.source} ok`,
    };
  } catch (e) {
    return {
      ...base,
      valid: false,
      message: `probe error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export function getRuntimeChannel(runtimeVersion = Bun.version): ChannelResolution {
  const isCanary = runtimeVersion.includes('canary');
  return {
    channel: isCanary ? 'canary' : 'stable',
    resolvedVersion: runtimeVersion,
    isPinned: false,
    latestAtResolution: runtimeVersion,
    resolveSource: 'runtime',
    authSource: 'none',
  };
}

export async function resolveChannel(
  channel: string,
  options: ResolveChannelOptions = {}
): Promise<ChannelResolution> {
  const fetchFn = options.fetchImpl ?? fetch;
  const runtimeVersion = options.runtimeVersion ?? Bun.version;
  const normalized = channel.trim().toLowerCase();
  const auth = resolveGithubAuth(options);

  if (normalized === 'runtime') {
    return getRuntimeChannel(runtimeVersion);
  }

  const preferAuth = options.preferAuth === true;

  if (normalized === 'canary') {
    const { release, authUsed } = await fetchGithubRelease(
      BUN_CANARY_RELEASE_PATH,
      fetchFn,
      auth,
      preferAuth
    );
    const parsed = parseCanaryRelease(release);
    return {
      channel: 'canary',
      resolvedVersion: parsed.displayVersion,
      isPinned: false,
      resolveSource: 'github-canary',
      authSource: authUsed.source,
      apiDomain: authUsed.apiDomain,
      canaryCommit: parsed.commitFull,
      canaryCommitShort: parsed.commitShort,
      channelReleaseUrl: release.html_url ?? 'https://github.com/oven-sh/bun/releases/tag/canary',
      channelPublishedAt: release.published_at,
      targetMatchesRuntime: revisionMatchesTarget(Bun.revision, parsed.commitFull),
    };
  }

  if (normalized === 'latest' || normalized === 'stable') {
    let release: GithubRelease;
    let authUsed = auth;
    let resolveSource: ChannelResolveSource = 'github-updater';
    try {
      const first = await fetchGithubRelease(BUN_LATEST_RELEASE_PATH, fetchFn, auth, preferAuth);
      release = first.release;
      authUsed = first.authUsed;
    } catch (firstErr) {
      try {
        const second = await fetchGithubRelease(
          BUN_LATEST_RELEASE_PATH_FALLBACK,
          fetchFn,
          auth,
          preferAuth
        );
        release = second.release;
        authUsed = second.authUsed;
        resolveSource = 'github-oven';
      } catch {
        throw firstErr instanceof Error ? firstErr : new Error(String(firstErr));
      }
    }
    const tag = release.tag_name;
    if (!tag) throw new Error('GitHub latest release: missing tag_name');
    const version = parseBunReleaseTag(tag);
    return {
      channel: 'latest',
      resolvedVersion: version,
      isPinned: false,
      latestAtResolution: version,
      resolveSource,
      authSource: authUsed.source,
      apiDomain: authUsed.apiDomain,
      channelReleaseUrl: release.html_url,
      channelPublishedAt: release.published_at,
      targetMatchesRuntime: runtimeVersion === version || runtimeVersion.startsWith(`${version}-`),
    };
  }

  if (SEMVER_RE.test(channel.trim())) {
    return {
      channel: 'pinned',
      resolvedVersion: channel.trim(),
      isPinned: true,
      resolveSource: 'pinned',
      authSource: 'none',
    };
  }

  throw new Error(`Unknown channel: ${channel}`);
}

export type BuildSemanticTagsOptions = ResolveChannelOptions & {
  provenanceId?: string; // brand-ok — opaque CI provenance key
  testedAt?: string;
  testSuiteCommit?: string;
};

export async function readTestSuiteCommit(): Promise<string | undefined> {
  const git = Bun.which('git');
  if (!git) return undefined;
  try {
    const proc = Bun.spawn([git, 'rev-parse', 'HEAD'], { stdout: 'pipe', stderr: 'ignore' });
    const out = (await new Response(proc.stdout).text()).trim();
    const code = await proc.exited;
    return code === 0 && out ? out : undefined;
  } catch {
    return undefined;
  }
}

export function resolveProvenanceId(testedAt: string): string {
  return (
    Bun.env.GITHUB_RUN_ID ??
    Bun.env.CI_RUN_ID ??
    Bun.env.CI_PIPELINE_ID ??
    `local-${testedAt.replace(/[:.]/g, '-')}`
  );
}

export async function buildSemanticTags(
  channel: string,
  options: BuildSemanticTagsOptions = {}
): Promise<SemanticTags> {
  const testedAt = options.testedAt ?? new Date().toISOString();
  const runtimeVersion = options.runtimeVersion ?? Bun.version;
  const resolution = await resolveChannel(channel, options);
  const testSuiteCommit = options.testSuiteCommit ?? (await readTestSuiteCommit());

  let latestAtTestTime = resolution.latestAtResolution;
  if (!latestAtTestTime && resolution.channel !== 'latest') {
    try {
      const latest = await resolveChannel('latest', options);
      latestAtTestTime = latest.resolvedVersion;
    } catch {
      latestAtTestTime = runtimeVersion;
    }
  }

  return {
    channel: resolution.channel,
    targetVersion: resolution.resolvedVersion,
    latestAtTestTime,
    testSuiteCommit,
    provenanceId: options.provenanceId ?? resolveProvenanceId(testedAt),
    testedAt,
    bunRevision: (Bun.revision || '').slice(0, 12) || undefined,
    runtimeVersion,
    platform: process.platform,
    arch: process.arch,
    channelResolveSource: resolution.resolveSource,
    githubAuthSource: resolution.authSource,
    canaryCommit: resolution.canaryCommit,
    canaryCommitShort: resolution.canaryCommitShort,
    channelReleaseUrl: resolution.channelReleaseUrl,
    channelPublishedAt: resolution.channelPublishedAt,
    targetMatchesRuntime: resolution.targetMatchesRuntime,
  };
}

/** Sanitize channel + version (+ optional suite) for snapshot filenames. */
export function verificationSnapshotFilename(
  tags: SemanticTags,
  suite: string = 'release'
): string {
  const ch = String(tags.channel).replace(/[^a-z0-9-]/gi, '-');
  const ver = tags.targetVersion.replace(/[^a-z0-9.+-]/gi, '-').replace(/\+/g, '-');
  const base = `public/registry/verification-${ch}-${ver}`;
  // release + all share the channel@version snapshot (full / meta proof).
  if (!suite || suite === 'release' || suite === 'all') return `${base}.json`;
  const safeSuite = suite.replace(/[^a-z0-9-]/gi, '-');
  return `${base}-${safeSuite}.json`;
}

export function snapshotIdFromTags(tags: SemanticTags, suite: string = 'release'): string {
  const base = `${tags.channel}@${tags.targetVersion}`;
  if (!suite || suite === 'release' || suite === 'all') return base;
  return `${base}+${suite}`;
}

/** Merge/upsert a snapshot entry into public/registry/verification-index.json */
export async function upsertVerificationSnapshotIndex(entry: {
  channel: string;
  targetVersion: string;
  suite?: string;
  runtimeVersion?: string;
  path: string;
  proofHash?: string;
  testedAt?: string;
  status?: string;
  /** When false, never rewrite index.canonical (e.g. bundler-only saves). */
  updateCanonical?: boolean;
}): Promise<VerificationSnapshotIndex> {
  const indexPath = joinPath(import.meta.dir, '../..', VERIFICATION_SNAPSHOT_INDEX_PATH);
  let index: VerificationSnapshotIndex = {
    type: 'VerificationSnapshotIndex',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    canonical: 'public/registry/release-features.json',
    snapshots: [],
  };
  try {
    const existing = Bun.file(indexPath);
    if (await existing.exists()) {
      const parsed = (await existing.json()) as VerificationSnapshotIndex;
      if (parsed?.type === 'VerificationSnapshotIndex' && Array.isArray(parsed.snapshots)) {
        index = parsed;
      }
    }
  } catch {
    /* start fresh */
  }

  const suite = entry.suite ?? 'release';
  const id = snapshotIdFromTags(
    {
      channel: entry.channel,
      targetVersion: entry.targetVersion,
      provenanceId: 'index',
      testedAt: entry.testedAt ?? new Date().toISOString(),
      runtimeVersion: entry.runtimeVersion ?? '',
    },
    suite
  );
  const next = {
    id,
    channel: entry.channel,
    targetVersion: entry.targetVersion,
    suite,
    runtimeVersion: entry.runtimeVersion,
    path: entry.path,
    proofHash: entry.proofHash,
    testedAt: entry.testedAt,
    status: entry.status,
  };
  // Unique by path so channel@version can appear as both canonical + snapshot
  index.snapshots = [next, ...index.snapshots.filter(s => s.path !== entry.path)];
  const mayUpdateCanonical = entry.updateCanonical !== false;
  if (
    mayUpdateCanonical &&
    (entry.path === index.canonical || entry.path.endsWith('release-features.json'))
  ) {
    index.canonical = entry.path.startsWith('public/')
      ? entry.path
      : 'public/registry/release-features.json';
  }
  index.updatedAt = new Date().toISOString();
  await Bun.write(indexPath, JSON.stringify(index, null, 2) + '\n');
  return index;
}
