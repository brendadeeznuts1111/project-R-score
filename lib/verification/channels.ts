// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Channel resolution for metadata-only verification (no binary switching).
 *
 * @see https://bun.com/docs/installation#upgrading — bun upgrade channels
 */
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
import type { ReleaseChannel, SemanticTags } from './types.ts';

export type ChannelResolution = {
  channel: ReleaseChannel;
  resolvedVersion: string;
  isPinned: boolean;
  latestAtResolution?: string;
};

const SEMVER_RE = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

export type ResolveChannelOptions = {
  fetchImpl?: typeof fetch;
  runtimeVersion?: string;
};

export function getRuntimeChannel(runtimeVersion = Bun.version): ChannelResolution {
  const isCanary = runtimeVersion.includes('canary');
  return {
    channel: isCanary ? 'canary' : 'stable',
    resolvedVersion: runtimeVersion,
    isPinned: false,
    latestAtResolution: runtimeVersion,
  };
}

export async function resolveChannel(
  channel: string,
  options: ResolveChannelOptions = {}
): Promise<ChannelResolution> {
  const fetchFn = options.fetchImpl ?? fetch;
  const runtimeVersion = options.runtimeVersion ?? Bun.version;
  const normalized = channel.trim().toLowerCase();

  if (normalized === 'runtime') {
    return getRuntimeChannel(runtimeVersion);
  }

  if (normalized === 'canary') {
    const res = await fetchFn('https://canary.bun.sh/version');
    if (!res.ok) throw new Error(`canary version fetch failed: ${res.status}`);
    const version = (await res.text()).trim();
    return {
      channel: 'canary',
      resolvedVersion: version,
      isPinned: false,
    };
  }

  if (normalized === 'latest' || normalized === 'stable') {
    const res = await fetchFn('https://bun.sh/latest');
    if (!res.ok) throw new Error(`latest version fetch failed: ${res.status}`);
    const version = (await res.text()).trim();
    return {
      channel: 'latest',
      resolvedVersion: version,
      isPinned: false,
      latestAtResolution: version,
    };
  }

  if (SEMVER_RE.test(channel.trim())) {
    return {
      channel: 'pinned',
      resolvedVersion: channel.trim(),
      isPinned: true,
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
  };
}

/** Sanitize channel + version for snapshot filenames. */
export function verificationSnapshotFilename(tags: SemanticTags): string {
  const ch = String(tags.channel).replace(/[^a-z0-9-]/gi, '-');
  const ver = tags.targetVersion.replace(/[^a-z0-9.-]/gi, '-');
  return `public/registry/verification-${ch}-${ver}.json`;
}
