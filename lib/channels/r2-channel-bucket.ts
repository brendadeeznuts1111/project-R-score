// @see https://bun.com/docs/runtime/s3 — S3Client
/**
 * Adapt Bun S3Client → R2PutBucket for {@link R2ChannelStore} projectors on the Bun host.
 */
import { S3Client } from 'bun';
import { R2ChannelStore } from './channels.ts';
import type { R2PutBucket } from '../pages/r2-types.ts';
import type { OpsSyncR2Config } from '../operations/ops-sync.ts';

export function createR2PutBucketFromConfig(r2: OpsSyncR2Config): R2PutBucket {
  const client = new S3Client({
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    bucket: r2.bucket,
    endpoint: r2.endpoint,
    ...(r2.requestPayer ? { requestPayer: true } : {}),
  });

  return {
    async get(key: string) {
      const file = client.file(key);
      if (!(await file.exists())) return null;
      const text = await file.text();
      return {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(text));
            controller.close();
          },
        }),
      };
    },
    async put(key: string, value: string | ReadableStream | ArrayBuffer) {
      const file = client.file(key);
      const payload =
        typeof value === 'string'
          ? value
          : value instanceof ArrayBuffer
            ? new Uint8Array(value)
            : value;
      await file.write(payload, {
        type: key.endsWith('.jsonl')
          ? 'application/x-ndjson'
          : key.endsWith('.json')
            ? 'application/json'
            : 'text/plain',
        ...(r2.requestPayer ? { requestPayer: true } : {}),
      });
    },
  };
}

/** R2-backed channel store for durable ops outbox projection. */
export function createR2ChannelStoreFromConfig(r2: OpsSyncR2Config): R2ChannelStore {
  return new R2ChannelStore(createR2PutBucketFromConfig(r2));
}
