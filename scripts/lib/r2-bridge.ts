// @see https://bun.com/docs/runtime/s3 — S3Client
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
import { S3Client, semver } from 'bun';
import {
  factoryRegistryBucketFromEnv,
  r2BucketFromEnv,
  r2EndpointFromAccount,
  r2RequestPayerFromEnv,
  requireR2Config,
} from '../../config/r2-env.ts';

export type R2BridgeConfig = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  requestPayer?: boolean;
};

const MIN_SAFE_ZSTD_BUN = '1.3.14';

function assertSafeZstdRuntime(): void {
  if (!semver.satisfies(Bun.version, `>=${MIN_SAFE_ZSTD_BUN}`)) {
    throw new Error(
      `Bun ${Bun.version} is below the safe zstd runtime ${MIN_SAFE_ZSTD_BUN}. Upgrade Bun before decoding compressed R2 payloads.`
    );
  }
}

/** Resolve S3 R2 bridge config via config/r2-env SSOT (optional field overrides). */
export function resolveR2BridgeConfig(input?: {
  endpoint?: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  requestPayer?: boolean;
}): R2BridgeConfig {
  const base = requireR2Config();
  const endpoint = (input?.endpoint || base.endpoint || r2EndpointFromAccount()).trim();
  const bucket = (input?.bucket || base.bucket || r2BucketFromEnv()).trim();
  const accessKeyId = (input?.accessKeyId || base.accessKeyId).trim();
  const secretAccessKey = (input?.secretAccessKey || base.secretAccessKey).trim();
  const requestPayer = input?.requestPayer ?? r2RequestPayerFromEnv();

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing R2 config. Required: endpoint, bucket, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY (see config/r2-env.ts).'
    );
  }
  return { endpoint, bucket, accessKeyId, secretAccessKey, requestPayer };
}

/**
 * Channel / outbox / telegram consumer plane — twin of Pages `REGISTRY_BUCKET`.
 *
 * Must not use the bench cascade (`r2BucketFromEnv` → `R2_BUCKET_NAME=bun-secrets`).
 * SSOT: `factoryRegistryBucketFromEnv()` → `factory-wager-registry`.
 */
export function resolveChannelR2BridgeConfig(
  input?: Parameters<typeof resolveR2BridgeConfig>[0]
): R2BridgeConfig {
  return resolveR2BridgeConfig({
    ...input,
    bucket: input?.bucket?.trim() || factoryRegistryBucketFromEnv(),
  });
}

export async function uploadJsonToR2(
  r2: R2BridgeConfig,
  key: string,
  data: object | string | number | boolean | null
): Promise<void> {
  const writeOpts: Record<string, unknown> = {
    bucket: r2.bucket,
    endpoint: r2.endpoint,
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    type: 'application/json',
  };
  if (r2.requestPayer) writeOpts.requestPayer = true;
  await S3Client.write(key, JSON.stringify(data, null, 2), writeOpts);
}

export function coerceBridgePayload(
  payload: object | string | number | boolean | null
): Uint8Array {
  assertSafeZstdRuntime();
  const compressed = Bun.zstdCompressSync(JSON.stringify(payload));
  return Uint8Array.from([0x01, ...compressed]);
}

export function decodeBridgePayload(input: Uint8Array): unknown {
  if (!input || input.length < 2) {
    throw new Error('bridge_payload_invalid');
  }
  const version = input[0];
  if (version !== 0x01) {
    throw new Error(`bridge_payload_unsupported_version_${version}`);
  }
  assertSafeZstdRuntime();
  const decompressed = Bun.zstdDecompressSync(input.slice(1));
  const text = new TextDecoder().decode(decompressed);
  return JSON.parse(text);
}

export async function uploadCompressedStateToR2(
  r2: R2BridgeConfig,
  key: string,
  payload: object | string | number | boolean | null
): Promise<void> {
  const encoded = coerceBridgePayload(payload);
  const writeOpts: Record<string, unknown> = {
    bucket: r2.bucket,
    endpoint: r2.endpoint,
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    type: 'application/octet-stream',
  };
  if (r2.requestPayer) writeOpts.requestPayer = true;
  await S3Client.write(key, encoded, writeOpts);
}
