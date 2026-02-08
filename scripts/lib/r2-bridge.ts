import { S3Client } from 'bun';

export type R2BridgeConfig = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export function resolveR2BridgeConfig(input?: {
  endpoint?: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}): R2BridgeConfig {
  const accountId = Bun.env.R2_ACCOUNT_ID || Bun.env.CLOUDFLARE_ACCOUNT_ID || '';
  const endpoint =
    (input?.endpoint || Bun.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '')).trim();
  const bucket =
    (input?.bucket || Bun.env.R2_BENCH_BUCKET || Bun.env.R2_BUCKET || Bun.env.R2_BUCKET_NAME || '').trim();
  const accessKeyId = (input?.accessKeyId || Bun.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (input?.secretAccessKey || Bun.env.R2_SECRET_ACCESS_KEY || '').trim();

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing R2 config. Required: endpoint, bucket, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.'
    );
  }
  return { endpoint, bucket, accessKeyId, secretAccessKey };
}

export async function uploadJsonToR2(
  r2: R2BridgeConfig,
  key: string,
  data: unknown
): Promise<void> {
  await S3Client.write(key, JSON.stringify(data, null, 2), {
    bucket: r2.bucket,
    endpoint: r2.endpoint,
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    type: 'application/json',
  });
}

export function encodeBridgePayload(payload: unknown): Uint8Array {
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
  const decompressed = Bun.zstdDecompressSync(input.slice(1));
  const text = new TextDecoder().decode(decompressed);
  return JSON.parse(text);
}

export async function uploadCompressedStateToR2(
  r2: R2BridgeConfig,
  key: string,
  payload: unknown
): Promise<void> {
  const encoded = encodeBridgePayload(payload);
  await S3Client.write(key, encoded, {
    bucket: r2.bucket,
    endpoint: r2.endpoint,
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    type: 'application/octet-stream',
  });
}

