// @see https://github.com/brendadeeznuts1111/project-R-score/blob/main/packages/registry-client/README.md — RegistryClient
/**
 * @factorywager/registry-client
 *
 * Runtime-neutral HTTP SDK for the FactoryWager registry read plane and an
 * explicitly configured local publish gateway. It uses Web APIs only, so the same
 * package works in Bun, browsers, and Cloudflare Workers.
 */

export interface RegistryStorage {
  readonly r2Key: string;
  readonly size: number;
  readonly checksum: string;
  readonly contentType: string;
}

export interface RegistryRelease {
  readonly name: string;
  readonly version: string;
  readonly type: 'library' | 'project' | 'template' | 'worker' | 'cli-tool';
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly publishedAt: string;
  readonly publisher: string;
  readonly storage: RegistryStorage;
}

export interface RegistryPackage {
  readonly versions: readonly string[];
  readonly 'dist-tags': Readonly<Record<string, string>>;
  readonly releases: Readonly<Record<string, RegistryRelease>>;
}

export interface RegistryIndex {
  readonly schemaVersion: 1;
  readonly lastUpdated: string;
  readonly packages: Readonly<Record<string, RegistryPackage>>;
}

export interface ResolvedArtifact {
  readonly release: RegistryRelease;
  readonly assetUrl: string;
}

export interface RegistryHealth {
  readonly status: 'ok' | 'degraded' | 'error';
  readonly indexOk?: boolean;
  readonly packages?: number;
  readonly versions?: number;
  readonly checkedAt?: string;
}

export interface PublishOptions {
  readonly tags?: readonly string[];
  readonly type?: RegistryRelease['type'];
  readonly description?: string;
}

export interface PublishResult {
  readonly success?: boolean;
  readonly ok?: boolean;
  readonly version: string;
  readonly checksum?: string;
  readonly size?: number;
}

export type RegistryFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type RegistryOperation = 'metadata-read' | 'artifact-read' | 'publish' | 'mirror-write';

export interface RegistryGrant {
  readonly operation: RegistryOperation;
  /** Exact origins; paths and credentials never widen an origin grant. */
  readonly origins: readonly string[];
  readonly reason: string;
}

export interface RegistryClientOptions {
  /** Anonymous/read-only Pages or CDN origin. */
  readonly baseUrl: string;
  /** Explicit local development publish origin. Never inferred from the read plane. */
  readonly publishUrl?: string;
  readonly apiKey?: string;
  readonly fetcher?: RegistryFetch;
  readonly grants?: readonly RegistryGrant[];
  readonly maxJsonBytes?: number;
  readonly maxArtifactBytes?: number;
}

export class RegistryHttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'RegistryHttpError';
  }
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TypeError('Registry URL must use http or https');
  }
  if (url.username || url.password) {
    throw new TypeError('Registry URL must not contain credentials');
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString().replace(/\/$/, '');
}

function isLocalPublishHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]'
  );
}

function encodePath(value: string): string {
  return value
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

function parseObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function parseExactString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    throw new TypeError(`${field} must be a nonempty bounded string`);
  }
  return value;
}

function parseBoundedString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new TypeError(`${field} must be a bounded string`);
  }
  return value;
}

function parseStringMap(value: unknown, field: string): Readonly<Record<string, string>> {
  const source = parseObject(value, field);
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(source)) {
    result[parseExactString(key, `${field} key`, 214)] = parseExactString(
      entry,
      `${field}.${key}`,
      128
    );
  }
  return result;
}

export function parseRegistryIndex(value: unknown): RegistryIndex {
  const index = parseObject(value, 'Registry index');
  if (index.schemaVersion !== 1) {
    throw new TypeError('Unsupported registry schema version');
  }
  const lastUpdated = parseExactString(index.lastUpdated, 'Registry index lastUpdated', 64);
  if (!Number.isFinite(Date.parse(lastUpdated))) {
    throw new TypeError('Registry index lastUpdated must be an ISO timestamp');
  }
  const packageSource = parseObject(index.packages, 'Registry index packages');
  if (Object.keys(packageSource).length > 10_000) {
    throw new TypeError('Registry index package count exceeds limit');
  }
  const packages: Record<string, RegistryPackage> = {};
  for (const [packageName, packageValue] of Object.entries(packageSource)) {
    parseExactString(packageName, 'Registry package name', 214);
    const packageRecord = parseObject(packageValue, `Registry package ${packageName}`);
    if (!Array.isArray(packageRecord.versions) || packageRecord.versions.length > 10_000) {
      throw new TypeError(`Registry package ${packageName} versions must be a bounded array`);
    }
    const versions = packageRecord.versions.map((entry, index) =>
      parseExactString(entry, `Registry package ${packageName} versions[${index}]`, 128)
    );
    const distTags = parseStringMap(
      packageRecord['dist-tags'],
      `Registry package ${packageName} dist-tags`
    );
    const releaseSource = parseObject(
      packageRecord.releases,
      `Registry package ${packageName} releases`
    );
    const releases: Record<string, RegistryRelease> = {};
    for (const [version, releaseValue] of Object.entries(releaseSource)) {
      const release = parseObject(releaseValue, `Registry release ${packageName}@${version}`);
      const storage = parseObject(
        release.storage,
        `Registry release ${packageName}@${version} storage`
      );
      const type = release.type;
      if (!['library', 'project', 'template', 'worker', 'cli-tool'].includes(String(type))) {
        throw new TypeError(`Registry release ${packageName}@${version} has invalid type`);
      }
      const size = storage.size;
      if (!Number.isSafeInteger(size) || Number(size) < 0) {
        throw new TypeError(`Registry release ${packageName}@${version} has invalid size`);
      }
      const checksum = parseExactString(storage.checksum, 'Registry storage checksum', 64);
      if (!/^[a-f0-9]{64}$/.test(checksum)) {
        throw new TypeError(`Registry release ${packageName}@${version} has invalid checksum`);
      }
      const releaseVersion = parseExactString(release.version, 'Registry release version', 128);
      if (releaseVersion !== version || !versions.includes(version)) {
        throw new TypeError(`Registry release ${packageName}@${version} is not in versions`);
      }
      const releaseName = parseExactString(release.name, 'Registry release name', 214);
      if (releaseName !== packageName) {
        throw new TypeError(`Registry release ${packageName}@${version} name mismatch`);
      }
      const publishedAt = parseExactString(release.publishedAt, 'Registry publishedAt', 64);
      if (!Number.isFinite(Date.parse(publishedAt))) {
        throw new TypeError(`Registry release ${packageName}@${version} has invalid publishedAt`);
      }
      releases[version] = {
        name: releaseName,
        version: releaseVersion,
        type: type as RegistryRelease['type'],
        ...(release.description === undefined
          ? {}
          : {
              description: parseBoundedString(release.description, 'Registry description', 4_096),
            }),
        ...(release.tags === undefined
          ? {}
          : {
              tags: Array.isArray(release.tags)
                ? release.tags.map((tag, index) =>
                    parseExactString(tag, `Registry tags[${index}]`, 128)
                  )
                : (() => {
                    throw new TypeError('Registry tags must be an array');
                  })(),
            }),
        publishedAt,
        publisher: parseExactString(release.publisher, 'Registry publisher', 256),
        storage: {
          r2Key: parseExactString(storage.r2Key, 'Registry storage r2Key', 1_024),
          size: Number(size),
          checksum,
          contentType: parseExactString(storage.contentType, 'Registry storage contentType', 256),
        },
      };
    }
    for (const [tag, version] of Object.entries(distTags)) {
      if (!releases[version])
        throw new TypeError(`Registry dist-tag ${tag} targets a missing release`);
    }
    packages[packageName] = { versions, 'dist-tags': distTags, releases };
  }
  return { schemaVersion: 1, lastUpdated, packages };
}

async function responseBytes(response: Response, maxBytes: number): Promise<Uint8Array> {
  const contentLength = response.headers.get('content-length');
  if (contentLength !== null && Number(contentLength) > maxBytes) {
    throw new RangeError(`Registry response exceeds ${maxBytes} byte limit`);
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel('registry response byte limit exceeded');
      throw new RangeError(`Registry response exceeds ${maxBytes} byte limit`);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function responseJson<TValue>(response: Response, maxBytes: number): Promise<TValue> {
  if (!response.ok) {
    const detail = new TextDecoder().decode(await responseBytes(response, Math.min(maxBytes, 500)));
    throw new RegistryHttpError(
      `Registry request failed (${response.status})${detail ? `: ${detail}` : ''}`,
      response.status
    );
  }
  const text = new TextDecoder().decode(await responseBytes(response, maxBytes));
  return JSON.parse(text) as TValue;
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const bytes = new Uint8Array(data.byteLength);
  bytes.set(data);
  const digest = await crypto.subtle.digest('SHA-256', bytes.buffer);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Total bytes in a Uint8Array view (length × BYTES_PER_ELEMENT; always 1 for Uint8). */
export function uint8TotalBytes(data: Uint8Array): number {
  return data.length * Uint8Array.BYTES_PER_ELEMENT;
}

export class RegistryClient {
  readonly baseUrl: string;
  readonly publishUrl?: string;
  private readonly apiKey?: string;
  private readonly fetcher: RegistryFetch;
  private readonly grants: readonly RegistryGrant[];
  private readonly maxJsonBytes: number;
  private readonly maxArtifactBytes: number;

  constructor(baseUrl: string, apiKey?: string);
  constructor(options: RegistryClientOptions);
  constructor(baseUrlOrOptions: string | RegistryClientOptions, apiKey?: string) {
    const options =
      typeof baseUrlOrOptions === 'string'
        ? { baseUrl: baseUrlOrOptions, apiKey }
        : baseUrlOrOptions;
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.publishUrl = options.publishUrl ? normalizeBaseUrl(options.publishUrl) : undefined;
    this.apiKey = options.apiKey;
    this.fetcher = options.fetcher ?? fetch;
    this.grants = options.grants ?? [];
    this.maxJsonBytes = options.maxJsonBytes ?? 1_048_576;
    this.maxArtifactBytes = options.maxArtifactBytes ?? 67_108_864;
    if (!Number.isSafeInteger(this.maxJsonBytes) || this.maxJsonBytes <= 0) {
      throw new TypeError('maxJsonBytes must be a positive safe integer');
    }
    if (!Number.isSafeInteger(this.maxArtifactBytes) || this.maxArtifactBytes <= 0) {
      throw new TypeError('maxArtifactBytes must be a positive safe integer');
    }
  }

  private requireGrant(operation: RegistryOperation, url: string): void {
    const requested = new URL(url);
    const granted = this.grants.some(
      grant =>
        grant.operation === operation &&
        grant.reason.trim().length > 0 &&
        grant.origins.some(origin => {
          try {
            const candidate = new URL(origin);
            return (
              !candidate.username && !candidate.password && candidate.origin === requested.origin
            );
          } catch {
            return false;
          }
        })
    );
    if (!granted) throw new Error(`Registry ${operation} requires an exact origin grant`);
  }

  async health(): Promise<RegistryHealth> {
    this.requireGrant('metadata-read', this.baseUrl);
    const response = await this.fetcher(`${this.baseUrl}/api/registry/health`, {
      headers: { Accept: 'application/json' },
    });
    return responseJson<RegistryHealth>(response, this.maxJsonBytes);
  }

  async fetchIndex(): Promise<RegistryIndex> {
    this.requireGrant('metadata-read', this.baseUrl);
    const response = await this.fetcher(`${this.baseUrl}/api/registry/registry.json`, {
      headers: { Accept: 'application/json' },
    });
    return parseRegistryIndex(await responseJson<unknown>(response, this.maxJsonBytes));
  }

  async resolve(name: string, selector = 'latest'): Promise<ResolvedArtifact | undefined> {
    const index = await this.fetchIndex();
    const pkg = index.packages[name];
    if (!pkg) return undefined;
    const version = pkg['dist-tags'][selector] ?? selector;
    const release = pkg.releases[version];
    if (!release) return undefined;
    return {
      release,
      assetUrl: `${this.baseUrl}/registry/storage/${encodePath(name)}/${version}/artifact.tgz`,
    };
  }

  async download(name: string, selector = 'latest'): Promise<Uint8Array | undefined> {
    const resolved = await this.resolve(name, selector);
    if (!resolved) return undefined;
    this.requireGrant('artifact-read', resolved.assetUrl);
    const response = await this.fetcher(resolved.assetUrl, {
      headers: { Accept: 'application/octet-stream' },
    });
    if (!response.ok) {
      throw new RegistryHttpError(`Artifact download failed (${response.status})`, response.status);
    }
    if (resolved.release.storage.size > this.maxArtifactBytes) {
      throw new RangeError(`Artifact exceeds ${this.maxArtifactBytes} byte limit`);
    }
    const data = await responseBytes(response, this.maxArtifactBytes);
    const receivedBytes = uint8TotalBytes(data);
    if (receivedBytes !== resolved.release.storage.size) {
      throw new Error(
        `Artifact size mismatch: expected ${resolved.release.storage.size}, received ${receivedBytes}`
      );
    }
    const checksum = await sha256Hex(data);
    if (checksum !== resolved.release.storage.checksum) {
      throw new Error(
        `Artifact checksum mismatch: expected ${resolved.release.storage.checksum}, received ${checksum}`
      );
    }
    return data;
  }

  async publish(
    name: string,
    version: string,
    artifact: Blob | Uint8Array | ArrayBuffer,
    options: PublishOptions = {}
  ): Promise<PublishResult> {
    if (!this.apiKey) {
      throw new Error('Registry publish requires an API key');
    }
    if (!this.publishUrl) {
      throw new Error('Registry publish requires an explicit publishUrl');
    }
    if (!isLocalPublishHost(new URL(this.publishUrl).hostname)) {
      throw new Error('Registry publishUrl must use an explicit local development origin');
    }
    this.requireGrant('publish', this.publishUrl);
    const blob =
      artifact instanceof Blob
        ? artifact
        : new Blob(
            [
              artifact instanceof ArrayBuffer
                ? artifact.slice(0)
                : Uint8Array.from(artifact).buffer,
            ],
            { type: 'application/gzip' }
          );
    const form = new FormData();
    form.set('version', version);
    form.set('tags', (options.tags ?? ['latest']).join(','));
    form.set(
      'metadata',
      JSON.stringify({
        type: options.type ?? 'library',
        description: options.description ?? '',
        tags: options.tags ?? ['latest'],
      })
    );
    form.set('file', blob, `${name.replaceAll('/', '-')}-${version}.tgz`);

    const response = await this.fetcher(
      `${this.publishUrl}/api/registry/${encodePath(name)}/versions`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: form,
      }
    );
    return responseJson<PublishResult>(response, this.maxJsonBytes);
  }
}

export default RegistryClient;
