// @see https://github.com/brendadeeznuts1111/project-R-score/blob/main/packages/registry-client/README.md — RegistryClient
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/s3#bun-s3client-bun-s3 — S3Client (via object-store)
// @see https://bun.com/blog/bun-v1.3.6#s3-requester-pays-support — requestPayer (via object-store)
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * R2-backed artifact registry client.
 *
 * Stores artifacts in the factory registry R2 bucket with an npm-compatible
 * registry index (`registry.json`). Uses etag compare-before-write retries for
 * optimistic index updates. Auth is SigV4 via {@link createS3RegistryStore}.
 */

import { r2RequestPayerFromEnv } from '../../config/r2-env';
import {
  type ArtifactType,
  type ArtifactRelease,
  type PackageInfo,
  type RegistryIndex,
  asArtifactVersion,
  asArtifactId,
  validateArtifactName,
} from './artifact';
import { sortVersions, resolveVersion } from './semver';
import { parseRegistryObjectKey } from './http-keys';
import {
  type RegistryObjectStore,
  createS3RegistryStore,
  isPreconditionFailed,
  requireFactoryRegistryS3Config,
  factoryRegistryBucketFromEnv,
  tarballContentDisposition,
} from './object-store';
import { readPublishReadmeFromTarballBytes } from './publish-metadata';

/** Registry index file name stored in the bucket root. */
const INDEX_KEY = 'registry.json';

export type RegistryClientOptions = {
  /** Inject a store (tests). Default: SigV4 S3Client against factory registry bucket. */
  store?: RegistryObjectStore;
};

// ── Registry client ──────────────────────────────────────────────────────

export class RegistryClient {
  private readonly injectedStore?: RegistryObjectStore;
  private _store: RegistryObjectStore | undefined;

  constructor(options?: RegistryClientOptions) {
    this.injectedStore = options?.store;
  }

  /** Lazy so `factory env` can report missing creds without throwing at import. */
  private get store(): RegistryObjectStore {
    if (this.injectedStore) return this.injectedStore;
    if (!this._store) this._store = createS3RegistryStore();
    return this._store;
  }

  // ── Index operations ─────────────────────────────────────────────────

  /**
   * Fetch the registry index from R2, or return a fresh empty index if none exists.
   */
  async fetchIndex(
    options: { required?: boolean } = {}
  ): Promise<{ index: RegistryIndex; etag: string | null }> {
    const hit = await this.store.getJson<RegistryIndex>(INDEX_KEY);
    if (!hit) {
      if (options.required) {
        throw new Error('Registry index is unavailable');
      }
      return {
        index: { schemaVersion: 1, lastUpdated: new Date().toISOString(), packages: {} },
        etag: null,
      };
    }
    return { index: hit.value, etag: hit.etag };
  }

  /**
   * Write the registry index with etag compare-before-write retries.
   */
  async writeIndex(
    update: (index: RegistryIndex) => RegistryIndex,
    maxRetries = 3
  ): Promise<RegistryIndex> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const { index, etag } = await this.fetchIndex();
      const updated: RegistryIndex = { ...update(index), lastUpdated: new Date().toISOString() };

      try {
        await this.store.putJson(INDEX_KEY, updated, {
          contentType: 'application/json',
          ifMatch: etag,
        });
        return updated;
      } catch (err) {
        if (isPreconditionFailed(err) && attempt < maxRetries - 1) continue;
        throw new Error(
          `Failed to write registry index (attempt ${attempt + 1}): ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
    throw new Error('Failed to write registry index after max retries');
  }

  // ── Publish ──────────────────────────────────────────────────────────

  /**
   * Publish an artifact to the registry.
   *
   * When `readme` is omitted or `true`, prefer README inside an npm-style
   * `.tgz` payload (BM-5), then fall back to a CWD `README*` glob. Pass an
   * explicit string or `false` to override.
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
      /** README text, `true` to auto-detect, or `false` to skip. */
      readme?: string | boolean;
    }
  ): Promise<ArtifactRelease> {
    const artifactName = validateArtifactName(name);
    const artifactVersion = asArtifactVersion(version);
    const type = options?.type ?? 'library';
    const distTag = options?.distTag ?? 'latest';

    const blob = data instanceof Blob ? data : new Blob([data]);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const hasher = new Bun.CryptoHasher('sha256');
    hasher.update(bytes);
    const checksum = hasher.digest('hex');

    let readme: string | undefined;
    const readmeOpt = options?.readme;
    if (readmeOpt === undefined || readmeOpt === true) {
      // BM-5: tarball-embedded README beats CWD (monorepo root is often wrong).
      const looksGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
      if (looksGzip) {
        readme = await readPublishReadmeFromTarballBytes(bytes);
      }
      if (readme === undefined) {
        // Match bun publish v1.3.14: first README or README.* in CWD.
        try {
          for await (const f of new Bun.Glob('[Rr][Ee][Aa][Dd][Mm][Ee]*').scan({
            onlyFiles: true,
          })) {
            if (/^README(\..*)?$/i.test(f)) {
              readme = await Bun.file(f).text();
              break;
            }
          }
        } catch {
          // Binary, permission error, etc. — skip README silently
        }
      }
    } else if (typeof readmeOpt === 'string') {
      readme = readmeOpt;
    }

    const r2Key =
      type === 'library'
        ? `${name.startsWith('@') ? name : `@factorywager/${name}`}/${version}.tgz`
        : `projects/${name}/${version}.tgz`;

    await this.store.putBytes(r2Key, blob, {
      contentType: 'application/gzip',
      contentDisposition: tarballContentDisposition(r2Key),
    });

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

    await this.writeIndex(index => {
      const pkg: PackageInfo = index.packages[name] ?? {
        versions: [],
        'dist-tags': { latest: artifactVersion },
        releases: {},
      };

      const versions = pkg.versions.some(v => String(v) === version)
        ? pkg.versions
        : sortVersions([...pkg.versions, artifactVersion]);

      const distTags = { ...pkg['dist-tags'], [distTag]: artifactVersion };
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

    const data = await this.store.getBytes(release.storage.r2Key);
    if (!data) throw new Error(`Failed to download artifact: missing ${release.storage.r2Key}`);

    const hasher = new Bun.CryptoHasher('sha256');
    hasher.update(data);
    const checksum = hasher.digest('hex');
    if (checksum !== release.storage.checksum) {
      throw new Error(`Checksum mismatch for ${name}@${resolved}`);
    }

    return { data, release };
  }

  // ── Resolve / Versions / Promote ─────────────────────────────────────

  /** Resolve a name+range to a concrete version and release metadata (no download). */
  async resolve(
    name: string,
    range = 'latest'
  ): Promise<{ name: string; version: string; release: ArtifactRelease } | undefined> {
    const { index } = await this.fetchIndex();
    const pkg = index.packages[name];
    if (!pkg) return undefined;
    const resolved = resolveVersion(range, pkg.versions, pkg['dist-tags']);
    if (!resolved) return undefined;
    const release = pkg.releases[String(resolved)];
    if (!release) return undefined;
    return { name, version: String(resolved), release };
  }

  /** Published versions of a package, semver-sorted. */
  async listVersions(name: string): Promise<string[]> {
    const pkg = await this.list(name);
    if (!pkg) return [];
    return sortVersions([...pkg.versions]).map(String);
  }

  /** Move a dist-tag to an already-published version (etag-guarded index update). */
  async promote(name: string, version: string, distTag = 'latest'): Promise<RegistryIndex> {
    const artifactVersion = asArtifactVersion(version);
    return this.writeIndex(index => {
      const pkg = index.packages[name];
      if (!pkg) throw new Error(`promote: package not found: ${name}`);
      if (!pkg.releases[String(artifactVersion)]) {
        throw new Error(`promote: ${name}@${String(artifactVersion)} is not published`);
      }
      const updatedPkg: PackageInfo = {
        ...pkg,
        'dist-tags': { ...pkg['dist-tags'], [distTag]: artifactVersion },
      };
      return { ...index, packages: { ...index.packages, [name]: updatedPkg } };
    });
  }

  // ── Readme ────────────────────────────────────────────────────────────

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

  async list(name: string): Promise<PackageInfo | undefined> {
    const { index } = await this.fetchIndex();
    return index.packages[name];
  }

  async listAll(): Promise<Array<{ name: string; info: PackageInfo }>> {
    const { index } = await this.fetchIndex();
    return Object.entries(index.packages).map(([name, info]) => ({ name, info }));
  }

  /** Read allowlisted object bytes (read-only HTTP proxy). */
  async fetchObjectBytes(key: string): Promise<Uint8Array | null> {
    const safe = parseRegistryObjectKey(key);
    if (!safe) throw new Error(`Invalid registry object key: ${key}`);
    return this.store.getBytes(safe);
  }

  // ── Search ────────────────────────────────────────────────────────────

  async search(query: string): Promise<Array<{ name: string; info: PackageInfo }>> {
    const { index } = await this.fetchIndex();
    const q = query.toLowerCase();
    const results: Array<{ name: string; info: PackageInfo }> = [];

    for (const [name, info] of Object.entries(index.packages)) {
      if (name.toLowerCase().includes(q)) {
        results.push({ name, info });
        continue;
      }
      const latest = info['dist-tags']?.latest;
      if (latest) {
        const release = info.releases[String(latest)];
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
   * Verify that R2 credentials are set and the bucket responds to a signed probe.
   * Missing `registry.json` is still a successful probe (empty registry).
   */
  async checkEnv(): Promise<{
    ok: boolean;
    r2Key: boolean;
    r2Secret: boolean;
    bucketAccess: boolean;
    bucket: string;
    /** Bun ≥1.3.6 `requestPayer` — from `R2_REQUEST_PAYER`. */
    requestPayer: boolean;
    error?: string;
  }> {
    if (this.injectedStore) {
      const ping = await this.injectedStore.ping();
      return {
        ok: ping.ok,
        r2Key: true,
        r2Secret: true,
        bucketAccess: ping.ok,
        bucket: 'injected',
        requestPayer: false,
        error: ping.error,
      };
    }

    const r2Key = !!Bun.env.R2_ACCESS_KEY_ID?.trim();
    const r2Secret = !!Bun.env.R2_SECRET_ACCESS_KEY?.trim();
    const bucket = factoryRegistryBucketFromEnv();
    const requestPayer = r2RequestPayerFromEnv();

    if (!r2Key || !r2Secret) {
      return {
        ok: false,
        r2Key,
        r2Secret,
        bucketAccess: false,
        bucket,
        requestPayer,
        error: 'R2 credentials not set',
      };
    }

    try {
      // Validate config shape before ping (account id / endpoint).
      requireFactoryRegistryS3Config();
      const ping = await this.store.ping();
      return {
        ok: ping.ok,
        r2Key,
        r2Secret,
        bucketAccess: ping.ok,
        bucket,
        requestPayer,
        error: ping.error,
      };
    } catch (e) {
      return {
        ok: false,
        r2Key,
        r2Secret,
        bucketAccess: false,
        bucket,
        requestPayer,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}

/** Singleton registry client instance (live S3 store). */
export const registry = new RegistryClient();
