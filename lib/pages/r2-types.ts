/**
 * Minimal R2 bucket binding types for Pages Functions + tests.
 *
 * @see ../../functions/api/registry/[[path]].ts
 */

export type R2ObjectBody = {
  body: ReadableStream | null;
  httpEtag?: string;
  httpMetadata?: { contentType?: string };
};

export type R2GetBucket = {
  get(key: string): Promise<R2ObjectBody | null>;
};

export type R2PutBucket = R2GetBucket & {
  put(
    key: string,
    value: string | ReadableStream | ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
};

export type RegistryPagesEnv = {
  REGISTRY_BUCKET?: R2PutBucket;
  REGISTRY_CORS_ORIGINS?: string;
  SESSION_SECRET?: string;
  OIDC_CLIENT_ID?: string;
  OIDC_CLIENT_SECRET?: string;
  OIDC_TOKEN_URL?: string;
  OIDC_REDIRECT_URI?: string;
  ALLOW_DEV_AUTH?: string;
  ALLOW_INSECURE_TELEGRAM_WEBHOOK?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  TELEGRAM_BOT_FACTORY?: string;
  TELEGRAM_BOT_SCIENCE?: string;
  TELEGRAM_BOT_TENNIS?: string;
  KALSHI_KEY?: string;
};

export async function r2GetText(bucket: R2GetBucket, key: string): Promise<string | null> {
  const object = await bucket.get(key);
  if (!object?.body) return null;
  return await new Response(object.body).text();
}

export async function r2GetJson<T>(bucket: R2GetBucket, key: string): Promise<T | null> {
  const text = await r2GetText(bucket, key);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function r2PutJson(
  bucket: R2PutBucket,
  key: string,
  // eslint-disable-next-line harness/no-unknown-function-param -- JSON wire value at R2 boundary
  value: unknown
): Promise<void> {
  await bucket.put(key, JSON.stringify(value, null, 2), {
    httpMetadata: { contentType: 'application/json' },
  });
}

export async function r2AppendText(bucket: R2PutBucket, key: string, line: string): Promise<void> {
  const prev = (await r2GetText(bucket, key)) ?? '';
  await bucket.put(key, `${prev}${line}`, {
    httpMetadata: { contentType: 'application/x-ndjson' },
  });
}
