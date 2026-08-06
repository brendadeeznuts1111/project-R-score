// @see https://bun.com/reference/bun/semver/order — Bun.semver.order
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/semver#bun-semver-order-versiona-string-versionb-string-0-1-1 — Bun.semver.order
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Registry dist-tags for proof / snapshot packages.
 *
 * Lifecycle:
 *   pre  → written by snapshot cron / build (canary, pre-deploy)
 *   post → promoted after deploy verification succeeds
 *   latest → always points at the current “recommended” (post when available, else pre)
 *   stable → explicit production pin (manual promote)
 *
 * Upgrade path: consumers resolve `pre` → smoke → promote → `post`/`latest`.
 */
import { sha256Hex } from './bun-utils-proof.ts';

/** Canonical dist-tag names (npm-style). */
export const REGISTRY_DIST_TAGS = {
  /** Pre-deploy / canary snapshot. */
  pre: 'pre',
  /** Post-deploy verified snapshot. */
  post: 'post',
  /** Default install target. */
  latest: 'latest',
  /** Explicit production pin (opt-in). */
  stable: 'stable',
} as const;

export type RegistryDistTag = (typeof REGISTRY_DIST_TAGS)[keyof typeof REGISTRY_DIST_TAGS];

export type SnapshotPhase = 'pre' | 'post';

export type ProofPackageId =
  | '@factorywager/bun-utils-test'
  | '@factorywager/routing-test'
  | '@factorywager/registry-snapshot';

export const PROOF_PACKAGES: readonly ProofPackageId[] = [
  '@factorywager/bun-utils-test',
  '@factorywager/routing-test',
  '@factorywager/registry-snapshot',
] as const;

export type DistTagMap = Record<string, string>;

export type ProofPackageIndexEntry = {
  name: ProofPackageId;
  versions: string[];
  'dist-tags': DistTagMap;
  releases: Record<
    string,
    {
      version: string;
      publishedAt: string;
      proofHash?: string;
      phase: SnapshotPhase | 'legacy';
      path: string;
    }
  >;
};

export type ProofPackagesIndex = {
  schemaVersion: 1;
  lastUpdated: string;
  packages: Record<string, ProofPackageIndexEntry>;
};

export const PROOF_INDEX_PATH = 'public/registry/@factorywager/proof-packages.json';

/** Mint a monotonic snapshot version (semver-compatible build metadata). */
export function mintSnapshotVersion(now: Date = new Date()): string {
  // 0.0.0+YYYYMMDDTHHMMSS — sorts with Bun.semver.order via lexicographic build id
  const stamp = now.toISOString().replace(/[-:.]/g, '').slice(0, 15); // YYYYMMDDTHHMMSS
  return `0.0.0+${stamp}`;
}

/** Parse phase from env/CLI (default pre). */
export function resolveSnapshotPhase(
  raw: string | undefined = Bun.env.SNAPSHOT_PHASE
): SnapshotPhase {
  return raw === 'post' ? 'post' : 'pre';
}

/**
 * Tags applied when writing a snapshot at a given phase.
 * - pre: pre + latest (if no post yet handled by index merge)
 * - post: post + latest + stable (optional)
 */
export function tagsForPhase(phase: SnapshotPhase, opts: { pinStable?: boolean } = {}): string[] {
  if (phase === 'post') {
    const tags = [REGISTRY_DIST_TAGS.post, REGISTRY_DIST_TAGS.latest];
    if (opts.pinStable) tags.push(REGISTRY_DIST_TAGS.stable);
    return tags;
  }
  return [REGISTRY_DIST_TAGS.pre, REGISTRY_DIST_TAGS.latest];
}

/**
 * Upgrade recommendation: which tag a consumer should move to.
 * pre → post (after verify), post → stable (optional pin).
 */
export function nextUpgradeTag(current: string): RegistryDistTag | null {
  const c = current.trim().toLowerCase();
  if (c === REGISTRY_DIST_TAGS.pre) return REGISTRY_DIST_TAGS.post;
  if (c === REGISTRY_DIST_TAGS.post) return REGISTRY_DIST_TAGS.stable;
  if (c === REGISTRY_DIST_TAGS.latest) return REGISTRY_DIST_TAGS.stable;
  return null;
}

/** Load the proof packages index (empty shell when the file is missing). */
export async function loadProofIndex(path: string = PROOF_INDEX_PATH): Promise<ProofPackagesIndex> {
  const empty: ProofPackagesIndex = {
    schemaVersion: 1,
    lastUpdated: new Date(0).toISOString(),
    packages: {},
  };
  try {
    const file = Bun.file(path);
    if (!(await file.exists())) return empty;
    return (await file.json()) as ProofPackagesIndex;
  } catch {
    return empty;
  }
}

/**
 * Record a published proof version and update dist-tags for the phase.
 */
export function upsertProofPackageRelease(
  index: ProofPackagesIndex,
  name: ProofPackageId,
  version: string,
  opts: {
    phase: SnapshotPhase;
    proofHash?: string;
    path: string;
    publishedAt?: string;
    pinStable?: boolean;
  }
): ProofPackagesIndex {
  const publishedAt = opts.publishedAt ?? new Date().toISOString();
  const existing = index.packages[name] ?? {
    name,
    versions: [],
    'dist-tags': {},
    releases: {},
  };

  const versions = existing.versions.includes(version)
    ? existing.versions
    : [...existing.versions, version];

  // Prefer semver order when possible; fall back to string order
  versions.sort((a, b) => {
    try {
      return Bun.semver.order(b, a);
    } catch {
      return b.localeCompare(a);
    }
  });

  const distTags: DistTagMap = { ...existing['dist-tags'] };
  for (const tag of tagsForPhase(opts.phase, { pinStable: opts.pinStable })) {
    distTags[tag] = version;
  }
  // pre phase must not clobber post/stable if those already point at a verified build
  if (opts.phase === 'pre') {
    // latest moves to pre only when no post yet, or when post is older — keep post pin
    if (distTags[REGISTRY_DIST_TAGS.post] && !opts.pinStable) {
      // leave post; latest stays on post if set
      distTags[REGISTRY_DIST_TAGS.latest] =
        distTags[REGISTRY_DIST_TAGS.post] ?? distTags[REGISTRY_DIST_TAGS.latest] ?? version;
      distTags[REGISTRY_DIST_TAGS.pre] = version;
    }
  }

  const releases = {
    ...existing.releases,
    [version]: {
      version,
      publishedAt,
      proofHash: opts.proofHash,
      phase: opts.phase,
      path: opts.path,
    },
  };

  return {
    schemaVersion: 1,
    lastUpdated: publishedAt,
    packages: {
      ...index.packages,
      [name]: {
        name,
        versions,
        'dist-tags': distTags,
        releases,
      },
    },
  };
}

/** Promote package dist-tag from pre → post (or set post = current pre). */
export function promoteProofPackage(
  index: ProofPackagesIndex,
  name: ProofPackageId,
  opts: { pinStable?: boolean; version?: string } = {}
): ProofPackagesIndex {
  const pkg = index.packages[name];
  if (!pkg) return index;
  const version =
    opts.version ??
    pkg['dist-tags'][REGISTRY_DIST_TAGS.pre] ??
    pkg['dist-tags'][REGISTRY_DIST_TAGS.latest];
  if (!version) return index;

  const rel = pkg.releases[version];
  return upsertProofPackageRelease(index, name, version, {
    phase: 'post',
    proofHash: rel?.proofHash,
    path: rel?.path ?? `public/registry/${name.replace(/^@/, '')}/latest.json`,
    pinStable: opts.pinStable,
  });
}

export async function writeProofIndex(
  index: ProofPackagesIndex,
  path: string = PROOF_INDEX_PATH
): Promise<void> {
  const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '.';
  if (parent && parent !== '.') await Bun.$`mkdir -p ${parent}`.quiet();
  await Bun.write(path, `${JSON.stringify(index, null, 2)}\n`);
}

/**
 * Write artifact files for a proof package including tag pointers.
 * - latest.json always updated
 * - pre.json when phase=pre
 * - post.json when phase=post
 * - versioned file
 */

export async function writeTaggedProofArtifact(
  packageName: ProofPackageId,
  // eslint-disable-next-line harness/no-unknown-function-param
  body: unknown,
  opts: {
    phase: SnapshotPhase;
    version?: string;
    proofHash?: string;
    pinStable?: boolean;
  }
): Promise<{
  version: string;
  latestPath: string;
  versionPath: string;
  tagPaths: string[];
  proofHash: string;
}> {
  const version = opts.version ?? mintSnapshotVersion();
  const dir = `public/registry/${packageName}`;
  await Bun.$`mkdir -p ${dir}`.quiet();
  const text = `${JSON.stringify(body, null, 2)}\n`;
  const proofHash =
    opts.proofHash ??
    (typeof body === 'object' &&
    body &&
    'proofHash' in body &&
    typeof (body as { proofHash?: string }).proofHash === 'string'
      ? (body as { proofHash: string }).proofHash
      : sha256Hex(text));

  const latestPath = `${dir}/latest.json`;
  const versionPath = `${dir}/${version}.json`;
  await Bun.write(latestPath, text);
  await Bun.write(versionPath, text);

  const tagPaths: string[] = [];
  for (const tag of tagsForPhase(opts.phase, { pinStable: opts.pinStable })) {
    const tagPath = `${dir}/${tag}.json`;
    await Bun.write(tagPath, text);
    tagPaths.push(tagPath);
  }

  let index = await loadProofIndex();
  index = upsertProofPackageRelease(index, packageName, version, {
    phase: opts.phase,
    proofHash,
    path: latestPath,
    pinStable: opts.pinStable,
  });
  await writeProofIndex(index);

  return { version, latestPath, versionPath, tagPaths, proofHash };
}

/** Describe upgrade path for a consumer currently on `fromTag`. */
export function describeUpgrade(
  index: ProofPackagesIndex,
  name: ProofPackageId,
  fromTag: string = REGISTRY_DIST_TAGS.pre
): {
  fromTag: string;
  fromVersion: string | null;
  toTag: string | null;
  toVersion: string | null;
  action: 'promote' | 'pin-stable' | 'none';
} {
  const pkg = index.packages[name];
  const fromVersion = pkg?.['dist-tags'][fromTag] ?? null;
  const toTag = nextUpgradeTag(fromTag);
  const toVersion = toTag && pkg ? (pkg['dist-tags'][toTag] ?? null) : null;
  let action: 'promote' | 'pin-stable' | 'none' = 'none';
  if (toTag === REGISTRY_DIST_TAGS.post && fromTag === REGISTRY_DIST_TAGS.pre) action = 'promote';
  if (toTag === REGISTRY_DIST_TAGS.stable) action = 'pin-stable';
  return { fromTag, fromVersion, toTag, toVersion, action };
}
