// @see https://bun.com/docs/runtime/s3#bun-s3client-bun-s3 — S3Client
// @see https://bun.com/docs/runtime/s3#basic-usage — S3File read/write/list
// @see https://bun.com/docs/runtime/utils#bun-gzipsync — Bun.gzipSync / gunzipSync
/**
 * Package-docs R2 storage backed by Bun `S3Client` (SigV4).
 *
 * Aligns with {@link createS3RegistryStore} in `lib/factory/object-store.ts`.
 * Bodies are `Uint8Array` (not Node Buffer). Package isolation uses key prefixes
 * under `defaultBucket` (R2-friendly); fake Bearer `fetch` auth is gone.
 *
 * Inject `clientFactory` in tests for an in-memory bucket (no network).
 */

import { S3Client } from 'bun';
import { RSS_URLS } from '../../config/urls';
import { r2EndpointFromAccount } from '../../config/r2-env.ts';
import { withCircuitBreaker } from '../core/circuit-breaker';
import { crc32 } from '../core/crc32';
import { ConcurrencyManagers } from '../core/safe-concurrency';
import { requireR2Credentials } from '../security/r2-credentials.ts';
import { type AccessKeyId, type AccountId } from '../types/branded.ts';

const R2_CB_CONFIG = { failureThreshold: 5, resetTimeoutMs: 30000, callTimeoutMs: 10000 };

export interface R2StorageConfig {
  accountId: AccountId;
  accessKeyId: AccessKeyId;
  secretAccessKey: string;
  defaultBucket: string;
  encryptionKey?: string;
}

export type R2ListObject = { Key: string };

/**
 * Minimal S3Client-shaped surface used by this class (real Bun client or test double).
 */
export type R2S3Bucket = {
  write(
    path: string,
    data: string | ArrayBufferView | ArrayBuffer | Blob,
    options?: { type?: string }
  ): Promise<number>;
  file(path: string): {
    exists(): Promise<boolean>;
    arrayBuffer(): Promise<ArrayBuffer>;
  };
  list(input?: { prefix?: string; maxKeys?: number; continuationToken?: string }): Promise<{
    contents?: Array<{ key?: string }>;
    isTruncated?: boolean;
    nextContinuationToken?: string;
  }>;
};

export type R2StorageOptions = {
  /** Override S3 client construction (tests / alternate backends). */
  clientFactory?: (bucket: string) => R2S3Bucket;
};

function isNotFound(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b404\b|not\s*found|NoSuchKey|does not exist/i.test(msg);
}

function toBytes(data: Uint8Array | ArrayBuffer | string): Uint8Array {
  if (typeof data === 'string') return new TextEncoder().encode(data);
  if (data instanceof Uint8Array) return data;
  return new Uint8Array(data);
}

/** In-memory S3-shaped bucket for unit tests. */
export function createMemoryR2Bucket(): R2S3Bucket & {
  objects: Map<string, Uint8Array>;
} {
  const objects = new Map<string, Uint8Array>();
  return {
    objects,
    async write(path, data) {
      const bytes =
        typeof data === 'string'
          ? new TextEncoder().encode(data)
          : data instanceof Uint8Array
            ? data
            : data instanceof ArrayBuffer
              ? new Uint8Array(data)
              : new Uint8Array(await (data as Blob).arrayBuffer());
      objects.set(path, bytes);
      return bytes.byteLength;
    },
    file(path) {
      return {
        async exists() {
          return objects.has(path);
        },
        async arrayBuffer() {
          const hit = objects.get(path);
          if (!hit) throw new Error(`404 NoSuchKey: ${path}`);
          return hit.buffer.slice(hit.byteOffset, hit.byteOffset + hit.byteLength);
        },
      };
    },
    async list(input) {
      const prefix = input?.prefix ?? '';
      const keys = [...objects.keys()]
        .filter(k => k.startsWith(prefix))
        .sort()
        .slice(0, input?.maxKeys ?? 1000);
      return { contents: keys.map(key => ({ key })), isTruncated: false };
    },
  };
}

export class R2Storage {
  private readonly config: R2StorageConfig;
  private readonly endpoint: string;
  private readonly clients = new Map<string, R2S3Bucket>();
  private readonly clientFactory: (bucket: string) => R2S3Bucket;

  constructor(config: R2StorageConfig, opts?: R2StorageOptions) {
    const required = requireR2Credentials({
      accountId: config.accountId,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    });
    this.config = {
      ...config,
      accountId: required.accountId,
      accessKeyId: required.accessKeyId,
      secretAccessKey: required.secretAccessKey,
    };
    this.endpoint = r2EndpointFromAccount(this.config.accountId);
    this.clientFactory =
      opts?.clientFactory ??
      (bucket =>
        new S3Client({
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
          bucket,
          endpoint: this.endpoint,
        }));
  }

  /** S3 client for a bucket name (cached). */
  private clientFor(bucket: string): R2S3Bucket {
    let client = this.clients.get(bucket);
    if (!client) {
      client = this.clientFactory(bucket);
      this.clients.set(bucket, client);
    }
    return client;
  }

  /**
   * Register package isolation under the default bucket (key-prefix model).
   * R2 bucket creation is account-level; DIY Bearer createBucket is removed.
   */
  async createBucketForPackage(packageName: string): Promise<string> {
    const sanitized = packageName
      .replace(/[^a-zA-Z0-9\-_.]/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .substring(0, 50);

    if (!sanitized) {
      throw new Error('Package name contains no valid characters after sanitization');
    }

    const bucketName = this.config.defaultBucket;
    const packageConfig = {
      bucket: bucketName,
      created: new Date().toISOString(),
      package: packageName,
      prefix: `packages/${packageName}/`,
    };

    await this.putJson(`_config/${packageName}/bucket.json`, packageConfig);
    return bucketName;
  }

  async uploadPackageDocs(
    packageName: string,
    docs: object | string | number | boolean | null
  ): Promise<string> {
    const bucketName = await this.getOrCreateBucket(packageName);
    const timestamp = Date.now();
    const key = `packages/${packageName}/${timestamp}/docs.json`;

    const compressedData = Bun.gzipSync(new TextEncoder().encode(JSON.stringify(docs)));
    const body =
      compressedData instanceof Uint8Array ? compressedData : new Uint8Array(compressedData);
    const checksum = crc32(body);
    await this.put(bucketName, key, body, checksum.hex, 'application/json');

    const html = await this.generateHtmlDocs(packageName, docs);
    await this.put(
      bucketName,
      `packages/${packageName}/${timestamp}/index.html`,
      new TextEncoder().encode(html),
      undefined,
      'text/html; charset=utf-8'
    );

    return `https://${bucketName}.${this.config.accountId}.r2.dev/packages/${packageName}/`;
  }

  private async generateHtmlDocs(
    packageName: string,
    docs: object | string | number | boolean | null
  ): Promise<string> {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${packageName} - Bun Documentation</title>
    <meta name="generator" content="bun-docs">
    <style>
        body { font-family: system-ui; max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .api { background: #f5f5f5; padding: 1rem; margin: 1rem 0; border-radius: 8px; }
        .rss-feed { border-left: 4px solid #f0b90b; padding-left: 1rem; }
    </style>
</head>
<body>
    <h1>${packageName}</h1>
    <div id="docs">
        <pre>${JSON.stringify(docs, null, 2)}</pre>
    </div>
    <div id="rss-feed" class="rss-feed"></div>
    <script>
        fetch('${RSS_URLS.OUR_FEED}/${packageName}').then(r => r.json()).then(feed => {
            const container = document.getElementById('rss-feed');
            if (feed && feed.items) {
                container.innerHTML = feed.items.map(item =>
                    \`<article><h3>\${item.title}</h3><p>\${item.description || ''}</p></article>\`
                ).join('');
            }
        }).catch(() => {});
    </script>
</body>
</html>`;
  }

  async syncPackageCache(
    packageName: string,

    localCache: Map<string, unknown>
  ): Promise<void> {
    const bucket = await this.getOrCreateBucket(packageName);

    const uploads = [...localCache.entries()].map(([key, value]) =>
      ConcurrencyManagers.networkRequests.withPermit(async () => {
        const data = new TextEncoder().encode(JSON.stringify(value));
        await this.put(bucket, `cache/${packageName}/${key}`, data, undefined, 'application/json');
      })
    );
    await Promise.all(uploads);
  }

  async getPackageDocs(
    packageName: string,
    version?: string
  ): Promise<object | string | number | boolean | null> {
    const key = version
      ? `packages/${packageName}/${version}/docs.json`
      : `packages/${packageName}/latest/docs.json`;

    const data = await this.getBytes(await this.getOrCreateBucket(packageName), key);
    if (!data) return null;

    const checksum = crc32(data);
    void checksum;

    const decompressed = Bun.gunzipSync(data);
    const bytes = decompressed instanceof Uint8Array ? decompressed : new Uint8Array(decompressed);
    return JSON.parse(new TextDecoder().decode(bytes)) as object | string | number | boolean | null;
  }

  async listPackages(): Promise<Array<{ name: string; versions: string[]; lastUpdated: string }>> {
    const packages = await this.listObjects('_config/');

    return Promise.all(
      packages
        .filter(p => p.Key.includes('bucket.json'))
        .map(async p => {
          const config = (await this.getJson(p.Key)) as {
            package?: string;
            created?: string;
          } | null;
          const pkgName = config?.package ?? 'unknown';
          const docs = await this.listObjects(`packages/${pkgName}/`);

          return {
            name: pkgName,
            versions: docs
              .filter(d => d.Key.endsWith('/docs.json'))
              .map(d => d.Key.split('/').slice(-2, -1)[0] || 'unknown'),
            lastUpdated: config?.created ?? '',
          };
        })
    );
  }

  /** Put bytes (or UTF-8 string) into a named bucket via S3Client. */
  async put(
    bucket: string,
    key: string,
    data: Uint8Array | ArrayBuffer | string,
    _crc32Hex?: string,
    contentType?: string
  ): Promise<void> {
    try {
      await withCircuitBreaker(
        'r2-storage',
        async () => {
          const body = toBytes(data);
          await this.clientFor(bucket).write(key, body, {
            type: contentType ?? 'application/octet-stream',
          });
        },
        R2_CB_CONFIG
      );
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error(`Failed to put ${bucket}/${key}: ${String(error)}`);
    }
  }

  /** Get object bytes; null when missing. */
  async getBytes(bucket: string, key: string): Promise<Uint8Array | null> {
    try {
      return await withCircuitBreaker(
        'r2-storage',
        async () => {
          const file = this.clientFor(bucket).file(key);
          try {
            if (!(await file.exists())) return null;
            return new Uint8Array(await file.arrayBuffer());
          } catch (err) {
            if (isNotFound(err)) return null;
            throw err;
          }
        },
        R2_CB_CONFIG
      );
    } catch {
      return null;
    }
  }

  public async get(key: string): Promise<string | null> {
    const data = await this.getBytes(this.config.defaultBucket, key);
    return data ? new TextDecoder().decode(data) : null;
  }

  public async upload(key: string, data: string): Promise<void> {
    await this.put(
      this.config.defaultBucket,
      key,
      new TextEncoder().encode(data),
      undefined,
      'text/plain; charset=utf-8'
    );
  }

  /** Public for RSS / package consumers (was private; typed as any before). */
  public async putJson(
    key: string,
    data: object | string | number | boolean | null
  ): Promise<void> {
    await this.put(
      this.config.defaultBucket,
      key,
      new TextEncoder().encode(JSON.stringify(data)),
      undefined,
      'application/json'
    );
  }

  /** Public for RSS / package consumers. */
  public async getJson(key: string): Promise<object | string | number | boolean | null> {
    const data = await this.getBytes(this.config.defaultBucket, key);
    if (!data) return null;
    return JSON.parse(new TextDecoder().decode(data)) as object | string | number | boolean | null;
  }

  private async listObjects(prefix: string): Promise<R2ListObject[]> {
    try {
      return await withCircuitBreaker(
        'r2-storage',
        async () => {
          const client = this.clientFor(this.config.defaultBucket);
          const out: R2ListObject[] = [];
          let continuationToken: string | undefined;
          do {
            const page = await client.list({
              prefix,
              maxKeys: 1000,
              ...(continuationToken ? { continuationToken } : {}),
            });
            for (const item of page.contents ?? []) {
              if (item.key) out.push({ Key: item.key });
            }
            continuationToken = page.isTruncated ? page.nextContinuationToken : undefined;
          } while (continuationToken);
          return out;
        },
        R2_CB_CONFIG
      );
    } catch {
      return [];
    }
  }

  async getOrCreateBucket(packageName: string): Promise<string> {
    if (!packageName || typeof packageName !== 'string' || packageName.trim().length === 0) {
      throw new Error('Invalid package name: must be a non-empty string');
    }

    const config = (await this.getJson(`_config/${packageName}/bucket.json`)) as {
      bucket?: string;
    } | null;
    if (config?.bucket && typeof config.bucket === 'string') {
      return config.bucket;
    }

    return await this.createBucketForPackage(packageName);
  }
}
