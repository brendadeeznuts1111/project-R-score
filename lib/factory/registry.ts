// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.sh/docs/runtime/semver#bun-semver-satisfies — Bun.semver.satisfies
// @see https://bun.sh/docs/runtime/semver#bun-semver-order — Bun.semver.order
// @see https://bun.sh/docs/runtime/semver#bun-semver-parse — Bun.semver.parse
// @see https://bun.sh/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.sh/docs/runtime/networking/fetch#sending-an-http-request — fetch
// @see https://bun.sh/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.sh/reference/bun/concatArrayBuffers — Bun.concatArrayBuffers
// @see https://bun.sh/docs/runtime/file-io#reading-files-bunfile — Bun.file
// @see https://bun.sh/docs/runtime/environment-variables — Bun.env
/**
 * R2-backed artifact registry client.
 *
 * Stores artifacts in the `factory-wager-registry` R2 bucket with an
 * npm-compatible registry index (`registry.json`). Uses optimistic locking
 * via R2 etags for atomic index updates.
 *
 * The registry is designed to be compatible with `bun publish --registry`,
 * so publishing can also be done directly via the standard npm protocol.
 */

import {
  type ArtifactName,
  type ArtifactVersion,
  type ArtifactId,
  type ArtifactType,
  type ArtifactRelease,
  type ArtifactStorage,
  type PackageInfo,
  type RegistryIndex,
  asArtifactName,
  asArtifactVersion,
  asArtifactId,
  tryArtifactName,
  tryArtifactVersion,
  validateArtifactName,
} from './artifact';
import { sortVersions, satisfiesRange, resolveVersion, latestVersion } from './semver';

// ── Constants ────────────────────────────────────────────────────────────

/** R2 bucket name for the factory artifact registry. */
const REGISTRY_BUCKET = 'factory-wager-registry';

/** Registry index file name stored in the bucket root. */
const INDEX_KEY = 'registry.json';

const S3_ENDPOINT = `https://${Bun.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// ── S3 helpers (R2 is S3-compatible) ─────────────────────────────────────

function s3Auth(): Record<string, string> {
  const key = Bun.env.R2_ACCESS_KEY_ID;
  const secret = Bun.env.R2_SECRET_ACCESS_KEY;
  if (!key || !secret) throw new Error('R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set');
  return {
    Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
  };
}

function bucketUrl(key: string): string {
  return `${S3_ENDPOINT}/${REGISTRY_BUCKET}/${key}`;
}

// ── Registry client ──────────────────────────────────────────────────────

export class RegistryClient {
  // ── Index operations ─────────────────────────────────────────────────

  /**
   * Fetch the registry index from R2, or return a fresh empty index if none exists.
   */
  async fetchIndex(): Promise<{ index: RegistryIndex; etag: string | null }> {
    const url = bucketUrl(INDEX_KEY);
    const res = await fetch(url, { headers: s3Auth() });
    if (res.status === 404) {
      return {
        index: { schemaVersion: 1, lastUpdated: new Date().toISOString(), packages: {} },
        etag: null,
      };
    }
    if (!res.ok) throw new Error(`Failed to fetch registry index: ${res.status}`);
    const etag = res.headers.get('etag');
    const index = (await res.json()) as RegistryIndex;
    return { index, etag };
  }

  /**
   * Write the registry index to R2 with etag-based optimistic locking.
   * Retries on conflict (up to 3 attempts).
   */
  async writeIndex(
    update: (index: RegistryIndex) => RegistryIndex,
    maxRetries = 3
  ): Promise<RegistryIndex> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const { index, etag } = await this.fetchIndex();
      const updated: RegistryIndex = { ...update(index), lastUpdated: new Date().toISOString() };

      const headers: Record<string, string> = {
        ...s3Auth(),
        'Content-Type': 'application/json',
      };
      if (etag) headers['If-Match'] = etag;

      const url = bucketUrl(INDEX_KEY);
      const res = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updated, null, 2),
      });

      if (res.ok) return updated;
      if (res.status === 412 && attempt < maxRetries - 1) {
        // 412 Precondition Failed — etag conflict, retry
        continue;
      }
      throw new Error(`Failed to write registry index (attempt ${attempt + 1}): ${res.status}`);
    }
    throw new Error('Failed to write registry index after max retries');
  }

  // ── Publish ──────────────────────────────────────────────────────────

  /**
   * Publish an artifact to the registry.
   *
   * Auto-detects `README.md` in CWD when `readme` option is `true` (default).
   *
   * @param name - Artifact name (e.g. "my-lib")
   * @param version - Version string ("1.0.0" or "build-2026-07-22")
   * @param data - Raw file data (Buffer, Uint8Array, or Blob)
   * @param options - Publish options
   * @returns The published release metadata
   */
  async publish(
    name: string,
    version: string,
    data: BufferSource | Blob,
    options?: {
      type?: ArtifactType;
      description?: string;
      author?: string;
      tags?: string[];
      dependencies?: Record<string, string>;
      publisher?: string;
      distTag?: string;
      /** README text, `true` to auto-detect `README.md` in CWD, or `false` to skip. */
      readme?: string | boolean;
    }
  ): Promise<ArtifactRelease> {
    const artifactName = validateArtifactName(name);
    const artifactVersion = asArtifactVersion(version);
    const type = options?.type ?? 'library';
    const distTag = options?.distTag ?? 'latest';

    // Compute SHA-256 checksum via Bun.CryptoHasher
    const blob = data instanceof Blob ? data : new Blob([data]);
    const hasher = new Bun.CryptoHasher('sha256');
    hasher.update(await blob.arrayBuffer());
    const checksum = hasher.digest('hex');

    // Auto-detect README (mirrors `bun publish` behavior)
    let readme: string | undefined;
    const readmeOpt = options?.readme;
    if (readmeOpt === undefined || readmeOpt === true) {
      const readmeFile = Bun.file('README.md');
      try {
        const exists = await readmeFile.exists();
        if (exists) readme = await readmeFile.text();
      } catch {
        // Binary, permission error, etc. — skip README silently
      }
    } else if (typeof readmeOpt === 'string') {
      readme = readmeOpt;
    }

    // Build R2 key: @factorywager/<name>/<version>.tgz
    const r2Key =
      type === 'library'
        ? `@factorywager/${name}/${version}.tgz`
        : `projects/${name}/${version}.tgz`;

    // Upload the artifact file
    const headers: Record<string, string> = {
      ...s3Auth(),
      'Content-Type': 'application/gzip',
      'x-amz-checksum-sha256': checksum,
    };
    const uploadUrl = bucketUrl(r2Key);
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: blob,
    });
    if (!uploadRes.ok) throw new Error(`Failed to upload artifact: ${uploadRes.status}`);

    // Build release metadata
    const release: ArtifactRelease = {
      id: asArtifactId(artifactName, artifactVersion),
      name: artifactName,
      version: artifactVersion,
      type,
      description: options?.description,
      author: options?.author,
      tags: options?.tags ?? [],
      dependencies: options?.dependencies,
      readme,
      publishedAt: new Date().toISOString(),
      publisher: options?.publisher ?? 'factory-cli',
      storage: {
        r2Key,
        size: blob.size,
        checksum,
        contentType: 'application/gzip',
      },
    };

    // Update the registry index
    await this.writeIndex(index => {
      const pkg: PackageInfo = index.packages[name] ?? {
        versions: [],
        'dist-tags': { latest: artifactVersion },
        releases: {},
      };

      // Update versions list
      const versions = pkg.versions.some(v => String(v) === version)
        ? pkg.versions
        : sortVersions([...pkg.versions, artifactVersion]);

      // Update dist-tags
      const distTags = { ...pkg['dist-tags'], [distTag]: artifactVersion };

      // Store release metadata
      const releases = { ...pkg.releases, [version]: release };

      const updatedPkg: PackageInfo = { versions, 'dist-tags': distTags, releases };

      return {
        ...index,
        packages: { ...index.packages, [name]: updatedPkg },
      };
    });

    return release;
  }

  // ── Install ──────────────────────────────────────────────────────────

  /**
   * Install (download) an artifact from the registry.
   *
   * @param name - Artifact name
   * @param range - Version specifier (e.g. "^1.0.0", "latest", exact version)
   * @returns The downloaded file data and release metadata, or undefined if not found
   */
  async install(
    name: string,
    range = 'latest'
  ): Promise<{ data: Uint8Array; release: ArtifactRelease } | undefined> {
    const { index } = await this.fetchIndex();
    const pkg = index.packages[name];
    if (!pkg) return undefined;

    const resolved = resolveVersion(range, pkg.versions, pkg['dist-tags']);
    if (!resolved) return undefined;

    const release = pkg.releases[String(resolved)];
    if (!release) return undefined;

    // Download — stream if body supports async iteration, fall back to buffered
    const url = bucketUrl(release.storage.r2Key);
    const res = await fetch(url, { headers: s3Auth() });
    if (!res.ok) throw new Error(`Failed to download artifact: ${res.status}`);

    const hasher = new Bun.CryptoHasher('sha256');
    let data: Uint8Array;

    if (res.body && typeof res.body[Symbol.asyncIterator] === 'function') {
      // Streaming path — hash incrementally, assemble with concatArrayBuffers
      const chunks: Uint8Array[] = [];
      let total = 0;
      for await (const chunk of res.body) {
        chunks.push(chunk);
        total += chunk.byteLength;
        hasher.update(chunk);
      }
      data = total ? Bun.concatArrayBuffers(chunks, total, true) : new Uint8Array(0);
    } else {
      // Buffered path — single read (used by test mocks)
      data = new Uint8Array(await res.arrayBuffer());
      hasher.update(data);
    }
    const checksum = hasher.digest('hex');
    if (checksum !== release.storage.checksum) {
      throw new Error(`Checksum mismatch for ${name}@${resolved}`);
    }

    return { data, release };
  }

  // ── Readme ────────────────────────────────────────────────────────────

  /**
   * Fetch the README text for a specific release.
   *
   * Returns the stored README from the registry index, or `undefined` if
   * no README was published with this release.
   */
  async fetchReadme(name: string, version: string): Promise<string | undefined> {
    const { index } = await this.fetchIndex();
    const pkg = index.packages[name];
    if (!pkg) return undefined;

    const resolved = resolveVersion(version, pkg.versions, pkg['dist-tags']);
    if (!resolved) return undefined;

    const release = pkg.releases[String(resolved)];
    return release?.readme;
  }

  // ── List ──────────────────────────────────────────────────────────────

  /**
   * List all versions of an artifact.
   */
  async list(name: string): Promise<PackageInfo | undefined> {
    const { index } = await this.fetchIndex();
    return index.packages[name];
  }

  /**
   * List all packages in the registry.
   */
  async listAll(): Promise<Array<{ name: string; info: PackageInfo }>> {
    const { index } = await this.fetchIndex();
    return Object.entries(index.packages).map(([name, info]) => ({ name, info }));
  }

  // ── Search ────────────────────────────────────────────────────────────

  /**
   * Search the registry by name/description/tags.
   */
  async search(query: string): Promise<Array<{ name: string; info: PackageInfo }>> {
    const { index } = await this.fetchIndex();
    const q = query.toLowerCase();
    const results: Array<{ name: string; info: PackageInfo }> = [];

    for (const [name, info] of Object.entries(index.packages)) {
      if (name.toLowerCase().includes(q)) {
        results.push({ name, info });
        continue;
      }
      // Check latest release description/tags
      const latestVersion = info['dist-tags']?.latest;
      if (latestVersion) {
        const release = info.releases[String(latestVersion)];
        if (release) {
          if (release.description?.toLowerCase().includes(q)) {
            results.push({ name, info });
            continue;
          }
          if (release.tags?.some(t => t.toLowerCase().includes(q))) {
            results.push({ name, info });
          }
        }
      }
    }

    return results;
  }

  // ── Health / env check ────────────────────────────────────────────────

  /**
   * Verify that R2 credentials and bucket access work.
   */
  async checkEnv(): Promise<{
    ok: boolean;
    r2Key: boolean;
    r2Secret: boolean;
    bucketAccess: boolean;
    error?: string;
  }> {
    const r2Key = !!Bun.env.R2_ACCESS_KEY_ID;
    const r2Secret = !!Bun.env.R2_SECRET_ACCESS_KEY;

    let bucketAccess = false;
    let error: string | undefined;

    if (r2Key && r2Secret) {
      try {
        const res = await fetch(S3_ENDPOINT, { headers: s3Auth() });
        bucketAccess = res.ok || res.status === 403; // 403 means auth works but listing may be denied
      } catch (e) {
        error = String(e);
      }
    } else {
      error = 'R2 credentials not set';
    }

    return {
      ok: r2Key && r2Secret && bucketAccess,
      r2Key,
      r2Secret,
      bucketAccess,
      error,
    };
  }
}

/** Singleton registry client instance. */
export const registry = new RegistryClient();
