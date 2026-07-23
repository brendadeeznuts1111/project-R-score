// @see https://bun.com/docs/runtime/s3#bun-s3client-bun-s3 — S3Client
// @see https://bun.com/docs/runtime/s3#basics — S3File read/write/stat/exists
// @see https://bun.com/blog/bun-v1.3.6#s3-requester-pays-support — requestPayer
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Injectible object store for the factory registry.
 *
 * Production: Bun `S3Client` (SigV4) against R2.
 * Tests: in-memory store — never mock global `fetch` for R2.
 */

import { S3Client } from 'bun';
import {
  cloudflareAccountIdFromEnv,
  factoryRegistryBucketFromEnv,
  r2EndpointFromAccount,
  r2RequestPayerFromEnv,
} from '../../config/r2-env';
import { type AccessKeyId, asAccessKeyId } from '../types/branded';

export { factoryRegistryBucketFromEnv };
export type ObjectPutOptions = {
  contentType?: string;
  /** When set, write fails with status 412 if the object etag does not match. */
  ifMatch?: string | null;
};

export type RegistryObjectStore = {
  /** Return null when the key is missing (404). */
  getJson<T>(key: string): Promise<{ value: T; etag: string | null } | null>;
  putJson(
    key: string,
    // eslint-disable-next-line harness/no-unknown-function-param -- JSON wire at S3 boundary
    value: unknown,
    opts?: ObjectPutOptions
  ): Promise<{ etag: string | null }>;
  putBytes(
    key: string,
    data: Blob | Uint8Array | ArrayBuffer,
    opts?: { contentType?: string }
  ): Promise<void>;
  getBytes(key: string): Promise<Uint8Array | null>;
  /** Probe that credentials + bucket respond (exists-or-missing is success). */
  ping(): Promise<{ ok: boolean; error?: string }>;
};

function isNotFound(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b404\b|not\s*found|NoSuchKey|does not exist/i.test(msg);
}

function isPreconditionFailed(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b412\b|PreconditionFailed|precondition/i.test(msg);
}

/** In-memory store for unit tests (supports If-Match). */
export function createMemoryObjectStore(): RegistryObjectStore & {
  objects: Map<string, { body: Uint8Array; etag: string; contentType: string }>;
} {
  const objects = new Map<string, { body: Uint8Array; etag: string; contentType: string }>();
  let seq = 0;

  const nextEtag = () => `"mem-${++seq}"`;

  return {
    objects,
    async getJson<T>(key: string) {
      const hit = objects.get(key);
      if (!hit) return null;
      return { value: JSON.parse(new TextDecoder().decode(hit.body)) as T, etag: hit.etag };
    },
    async putJson(key, value, opts) {
      const existing = objects.get(key);
      if (opts?.ifMatch != null && opts.ifMatch !== '') {
        if (!existing || existing.etag !== opts.ifMatch) {
          throw new Error('412 Precondition Failed');
        }
      }
      const body = new TextEncoder().encode(JSON.stringify(value, null, 2));
      const etag = nextEtag();
      objects.set(key, {
        body,
        etag,
        contentType: opts?.contentType ?? 'application/json',
      });
      return { etag };
    },
    async putBytes(key, data, opts) {
      const bytes =
        data instanceof Uint8Array
          ? data
          : data instanceof ArrayBuffer
            ? new Uint8Array(data)
            : new Uint8Array(await data.arrayBuffer());
      objects.set(key, {
        body: bytes,
        etag: nextEtag(),
        contentType: opts?.contentType ?? 'application/octet-stream',
      });
    },
    async getBytes(key) {
      return objects.get(key)?.body ?? null;
    },
    async ping() {
      return { ok: true };
    },
  };
}

export type S3RegistryStoreConfig = {
  accessKeyId: AccessKeyId;
  /** Secret material stays unbranded (never log / never brand). */
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  /**
   * Bun ≥1.3.6 — send `x-amz-request-payer` for Requester Pays buckets.
   * SSOT: `R2_REQUEST_PAYER` via `r2RequestPayerFromEnv()` (usually false for R2).
   */
  requestPayer?: boolean;
};

/** Credentials + endpoint for the factory artifact registry bucket. */
export function requireFactoryRegistryS3Config(): S3RegistryStoreConfig {
  const accessKeyRaw = Bun.env.R2_ACCESS_KEY_ID?.trim() ?? '';
  const secretAccessKey = Bun.env.R2_SECRET_ACCESS_KEY?.trim() ?? '';
  if (!accessKeyRaw || !secretAccessKey) {
    throw new Error('R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set');
  }
  const accountId = cloudflareAccountIdFromEnv();
  if (!accountId) {
    throw new Error('R2_ACCOUNT_ID or CLOUDFLARE_ACCOUNT_ID must be set');
  }
  return {
    accessKeyId: asAccessKeyId(accessKeyRaw),
    secretAccessKey,
    bucket: factoryRegistryBucketFromEnv(),
    endpoint: r2EndpointFromAccount(accountId),
    requestPayer: r2RequestPayerFromEnv(),
  };
}

/**
 * SigV4-backed store via Bun.S3Client.
 *
 * Conditional writes (`ifMatch`) use a second read-after attempt: Bun's S3 write
 * API does not expose If-Match, so we compare etag before write and retry at the
 * RegistryClient layer on conflict. Concurrent writers may still race; the
 * client retries writeIndex up to maxRetries.
 *
 * Requester Pays (`requestPayer`) lands on the client + write options (Bun v1.3.6+).
 */
export function createS3RegistryStore(config?: S3RegistryStoreConfig): RegistryObjectStore {
  const cfg = config ?? requireFactoryRegistryS3Config();
  const requestPayer = cfg.requestPayer === true;
  const client = new S3Client({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    bucket: cfg.bucket,
    endpoint: cfg.endpoint,
    ...(requestPayer ? { requestPayer: true } : {}),
  });

  return {
    async getJson<T>(key: string) {
      const file = client.file(key);
      try {
        if (!(await file.exists())) return null;
        const [value, stat] = await Promise.all([file.json(), file.stat()]);
        return { value: value as T, etag: stat.etag ?? null };
      } catch (err) {
        if (isNotFound(err)) return null;
        throw err;
      }
    },

    async putJson(key, value, opts) {
      const file = client.file(key);
      if (opts?.ifMatch != null && opts.ifMatch !== '') {
        try {
          const stat = await file.stat();
          if (stat.etag !== opts.ifMatch) {
            throw new Error('412 Precondition Failed');
          }
        } catch (err) {
          if (isPreconditionFailed(err)) throw err;
          if (isNotFound(err)) throw new Error('412 Precondition Failed');
          throw err;
        }
      }
      const body = JSON.stringify(value, null, 2);
      await file.write(body, {
        type: opts?.contentType ?? 'application/json',
        ...(requestPayer ? { requestPayer: true } : {}),
      });
      try {
        const stat = await file.stat();
        return { etag: stat.etag ?? null };
      } catch {
        return { etag: null };
      }
    },

    async putBytes(key, data, opts) {
      const file = client.file(key);
      const payload =
        data instanceof Blob ? data : data instanceof ArrayBuffer ? new Uint8Array(data) : data;
      await file.write(payload, {
        type: opts?.contentType ?? 'application/octet-stream',
        ...(requestPayer ? { requestPayer: true } : {}),
      });
    },

    async getBytes(key) {
      const file = client.file(key);
      try {
        if (!(await file.exists())) return null;
        return new Uint8Array(await file.arrayBuffer());
      } catch (err) {
        if (isNotFound(err)) return null;
        throw err;
      }
    },

    async ping() {
      try {
        // exists() on a missing key still proves Auth + bucket reachability when it
        // returns false; auth failures throw.
        await client.file('registry.json').exists();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}

export { isPreconditionFailed };
