// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher
// @see https://bun.com/docs/runtime/s3#bun-s3client-bun-s3
/**
 * Operations DB backup — local snapshot + optional R2 upload.
 */
import { joinPath } from '../lib/path-bun.ts';
import { S3Client } from 'bun';
import { DEFAULT_OPS_DB_PATH } from './db.ts';

export type BackupResult = {
  path: string;
  sha256: string;
  bytes: number;
  r2Key?: string;
};

export type R2BackupConfig = {
  endpoint: string;
  bucket: string;
  accessKeyId: string; // brand-ok — AWS credential key, not domain ID
  secretAccessKey: string;
  prefix?: string;
};

export async function backupOperationsDb(opts?: {
  sourcePath?: string;
  destDir?: string;
}): Promise<BackupResult> {
  const source = opts?.sourcePath ?? DEFAULT_OPS_DB_PATH;
  const destDir = opts?.destDir ?? 'data/backups';
  await Bun.$`mkdir -p ${destDir}`.quiet();

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = joinPath(destDir, `operations-${stamp}.db`);

  const bytes = await Bun.file(source).arrayBuffer();
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(bytes);
  const sha256 = hasher.digest('hex');

  await Bun.write(dest, bytes);

  return { path: dest, sha256, bytes: bytes.byteLength };
}

export async function uploadBackupToR2(
  localPath: string,
  meta: { sha256: string; bytes: number },
  r2: R2BackupConfig
): Promise<string> {
  const prefix = r2.prefix ?? 'ops/backups';
  const key = `${prefix}/${localPath.split('/').pop()}`;
  const body = await Bun.file(localPath).arrayBuffer();

  await S3Client.write(key, body, {
    bucket: r2.bucket,
    endpoint: r2.endpoint,
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    type: 'application/x-sqlite3',
  });

  const manifestKey = `${prefix}/latest.json`;
  await S3Client.write(
    manifestKey,
    JSON.stringify(
      {
        key,
        sha256: meta.sha256,
        bytes: meta.bytes,
        uploadedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    {
      bucket: r2.bucket,
      endpoint: r2.endpoint,
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
      type: 'application/json',
    }
  );

  return key;
}

export async function backupOperationsDbWithR2(opts?: {
  sourcePath?: string;
  destDir?: string;
  r2?: R2BackupConfig;
}): Promise<BackupResult> {
  const local = await backupOperationsDb(opts);
  if (opts?.r2) {
    local.r2Key = await uploadBackupToR2(local.path, local, opts.r2);
  }
  return local;
}
