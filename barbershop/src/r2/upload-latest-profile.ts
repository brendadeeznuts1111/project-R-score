#!/usr/bin/env bun

import { readdirSync } from 'node:fs';
import { S3Client } from 'bun';
import { getFactorySecret } from './factory-secrets';

const ROOT = '/Users/nolarose/Projects/logs/profiles';

function latestDir() {
  const dirs = readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('sampling-'))
    .map((d) => d.name)
    .sort((a, b) => b.localeCompare(a));
  return dirs[0] ? `${ROOT}/${dirs[0]}` : null;
}

async function resolveR2() {
  const accountId = Bun.env.R2_ACCOUNT_ID || '';
  const endpoint = Bun.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '') || (await getFactorySecret('R2_ENDPOINT')) || '';
  const bucket = Bun.env.R2_BUCKET || Bun.env.R2_BUCKET_NAME || (await getFactorySecret('R2_BUCKET')) || '';
  const prefix = Bun.env.R2_PREFIX || (await getFactorySecret('R2_PREFIX')) || 'barbershop';
  const accessKeyId = Bun.env.R2_ACCESS_KEY_ID || (await getFactorySecret('R2_ACCESS_KEY_ID')) || '';
  const secretAccessKey = Bun.env.R2_SECRET_ACCESS_KEY || (await getFactorySecret('R2_SECRET_ACCESS_KEY')) || '';
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  return { endpoint, bucket, prefix: prefix.replace(/\/+$/g, ''), accessKeyId, secretAccessKey };
}

const dir = latestDir();
if (!dir) {
  console.error('[upload-latest-profile] no local sampling profiles found');
  process.exit(1);
}

const archivePath = `${dir}/sampling-profile.tar.gz`;
const summaryPath = `${dir}/summary.json`;
if (!(await Bun.file(archivePath).exists()) || !(await Bun.file(summaryPath).exists())) {
  console.error('[upload-latest-profile] latest profile is missing sampling-profile.tar.gz or summary.json');
  process.exit(1);
}

const r2 = await resolveR2();
if (!r2) {
  console.error('[upload-latest-profile] missing R2 config');
  process.exit(1);
}

const stamp = dir.split('/').pop()!.replace(/^sampling-/, '');
const baseKey = `${r2.prefix}/profiles/sampling/${stamp}`;
const archiveKey = `${baseKey}/sampling-profile.tar.gz`;
const summaryKey = `${baseKey}/summary.json`;

await S3Client.write(archiveKey, await Bun.file(archivePath).bytes(), {
  bucket: r2.bucket,
  endpoint: r2.endpoint,
  accessKeyId: r2.accessKeyId,
  secretAccessKey: r2.secretAccessKey,
  type: 'application/gzip'
});

await S3Client.write(summaryKey, await Bun.file(summaryPath).text(), {
  bucket: r2.bucket,
  endpoint: r2.endpoint,
  accessKeyId: r2.accessKeyId,
  secretAccessKey: r2.secretAccessKey,
  type: 'application/json'
});

console.log(`[upload-latest-profile] uploaded archive=${archiveKey}`);
console.log(`[upload-latest-profile] uploaded summary=${summaryKey}`);
