/**
 * @factorywager/registry-client
 *
 * Runtime-neutral HTTP SDK for the FactoryWager registry read plane and the
 * authenticated private publish endpoint. It uses Web APIs only, so the same
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

export interface RegistryClientOptions {
  /** Anonymous/read-only Pages or CDN origin. */
  readonly baseUrl: string;
  /** Authenticated Bun publish origin. Defaults to baseUrl. */
  readonly publishUrl?: string;
  readonly apiKey?: string;
  readonly fetcher?: RegistryFetch;
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
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString().replace(/\/$/, '');
}

function encodePath(value: string): string {
  return value
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

function parseRegistryIndex(value: unknown): RegistryIndex {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Registry index must be an object');
  }
  if (Reflect.get(value, 'schemaVersion') !== 1) {
    throw new TypeError('Unsupported registry schema version');
  }
  const packages = Reflect.get(value, 'packages');
  if (typeof packages !== 'object' || packages === null || Array.isArray(packages)) {
    throw new TypeError('Registry index packages must be an object');
  }
  return value as RegistryIndex;
}

async function responseJson<TValue>(response: Response): Promise<TValue> {
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new RegistryHttpError(
      `Registry request failed (${response.status})${detail ? `: ${detail}` : ''}`,
      response.status
    );
  }
  return (await response.json()) as TValue;
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const bytes = new Uint8Array(data.byteLength);
  bytes.set(data);
  const digest = await crypto.subtle.digest('SHA-256', bytes.buffer);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export class RegistryClient {
  readonly baseUrl: string;
  readonly publishUrl: string;
  private readonly apiKey?: string;
  private readonly fetcher: RegistryFetch;

  constructor(baseUrl: string, apiKey?: string);
  constructor(options: RegistryClientOptions);
  constructor(baseUrlOrOptions: string | RegistryClientOptions, apiKey?: string) {
    const options =
      typeof baseUrlOrOptions === 'string'
        ? { baseUrl: baseUrlOrOptions, apiKey }
        : baseUrlOrOptions;
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.publishUrl = normalizeBaseUrl(options.publishUrl ?? options.baseUrl);
    this.apiKey = options.apiKey;
    this.fetcher = options.fetcher ?? fetch;
  }

  async health(): Promise<RegistryHealth> {
    const response = await this.fetcher(`${this.baseUrl}/api/registry/health`, {
      headers: { Accept: 'application/json' },
    });
    return responseJson<RegistryHealth>(response);
  }

  async fetchIndex(): Promise<RegistryIndex> {
    const response = await this.fetcher(`${this.baseUrl}/api/registry/registry.json`, {
      headers: { Accept: 'application/json' },
    });
    return parseRegistryIndex(await responseJson<unknown>(response));
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
      assetUrl: `${this.baseUrl}/api/registry/${encodePath(release.storage.r2Key)}`,
    };
  }

  async download(name: string, selector = 'latest'): Promise<Uint8Array | undefined> {
    const resolved = await this.resolve(name, selector);
    if (!resolved) return undefined;
    const response = await this.fetcher(resolved.assetUrl, {
      headers: { Accept: 'application/octet-stream' },
    });
    if (!response.ok) {
      throw new RegistryHttpError(`Artifact download failed (${response.status})`, response.status);
    }
    const data = new Uint8Array(await response.arrayBuffer());
    if (data.byteLength !== resolved.release.storage.size) {
      throw new Error(
        `Artifact size mismatch: expected ${resolved.release.storage.size}, received ${data.byteLength}`
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
    return responseJson<PublishResult>(response);
  }
}

export default RegistryClient;
