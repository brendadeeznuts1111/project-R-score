#!/usr/bin/env bun

import * as jsc from 'bun:jsc';
import { S3Client } from 'bun';
import { mkdirSync } from 'node:fs';
import { getFactorySecret } from './factory-secrets';

function arg(name: string, fallback: string) {
  const exact = `--${name}=`;
  const found = Bun.argv.find((a) => a.startsWith(exact));
  return found ? found.slice(exact.length) : fallback;
}

const target = arg('url', 'http://localhost:3001/ops/status');
const iterations = Number(arg('iterations', '200'));
const sampleIntervalUs = Number(arg('interval-us', '100'));
const outputRoot = arg('outdir', '/Users/nolarose/Projects/logs/profiles');
const uploadR2 = arg('upload-r2', 'true') !== 'false';
const requireR2 = arg('require-r2', 'false') === 'true';
const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-');
const runDir = `${outputRoot}/sampling-${stamp}`;

mkdirSync(runDir, { recursive: true });

async function workload() {
  for (let i = 0; i < iterations; i++) {
    const res = await fetch(target, { headers: { Accept: 'application/json' } });
    await res.text();
  }
}

type R2Config = {
  bucket: string;
  prefix: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
};

async function resolveR2Config(): Promise<R2Config | null> {
  // Keep compatibility with lib/r2/bun-secrets-cli.ts conventions first.
  const envAccountId = Bun.env.R2_ACCOUNT_ID || '';
  const envBucketName = Bun.env.R2_BUCKET_NAME || '';
  const envEndpoint =
    Bun.env.R2_ENDPOINT || (envAccountId ? `https://${envAccountId}.r2.cloudflarestorage.com` : '');
  const envBucket = Bun.env.R2_BUCKET || envBucketName;
  const envPrefix = Bun.env.R2_PREFIX || 'barbershop';
  const envAccessKeyId = Bun.env.R2_ACCESS_KEY_ID || '';
  const envSecretAccessKey = Bun.env.R2_SECRET_ACCESS_KEY || '';

  const bucket = envBucket || (await getFactorySecret('R2_BUCKET')) || '';
  const prefix = Bun.env.R2_PREFIX || (await getFactorySecret('R2_PREFIX')) || envPrefix;
  const endpoint = envEndpoint || (await getFactorySecret('R2_ENDPOINT')) || '';
  const accessKeyId = envAccessKeyId || (await getFactorySecret('R2_ACCESS_KEY_ID')) || '';
  const secretAccessKey = envSecretAccessKey || (await getFactorySecret('R2_SECRET_ACCESS_KEY')) || '';
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) return null;
  return { bucket, prefix, endpoint, accessKeyId, secretAccessKey };
}

const startedAt = performance.now();
const profile = await jsc.profile(workload, sampleIntervalUs);
const durationMs = Math.round((performance.now() - startedAt) * 1000) / 1000;

const stackTracesRaw = (profile as Record<string, unknown>).stackTraces;
const stackTraces = Array.isArray(stackTracesRaw)
  ? stackTracesRaw.map((item) => String(item)).join('\n\n')
  : String(stackTracesRaw ?? '');
const functionsText = String((profile as Record<string, unknown>).functions ?? '');
const bytecodesText = String((profile as Record<string, unknown>).bytecodes ?? '');

await Bun.write(`${runDir}/functions.txt`, functionsText);
await Bun.write(`${runDir}/bytecodes.txt`, bytecodesText);
await Bun.write(`${runDir}/stack-traces.txt`, stackTraces);
await Bun.write(
  `${runDir}/summary.json`,
  JSON.stringify(
    {
      target,
      iterations,
      sampleIntervalUs,
      durationMs,
      generatedAt: now.toISOString(),
      profileKeys: Object.keys(profile as Record<string, unknown>),
      files: ['functions.txt', 'bytecodes.txt', 'stack-traces.txt']
    },
    null,
    2
  )
);

const archive = new Bun.Archive({
  'summary.json': await Bun.file(`${runDir}/summary.json`).text(),
  'functions.txt': functionsText,
  'bytecodes.txt': bytecodesText,
  'stack-traces.txt': stackTraces
}, { compress: 'gzip', level: 9 });

await Bun.write(`${runDir}/sampling-profile.tar.gz`, archive);

let uploadedArchiveKey: string | null = null;
let uploadedSummaryKey: string | null = null;
if (uploadR2) {
  const r2 = await resolveR2Config();
  if (!r2) {
    const message = '[sampling-profile] R2 upload skipped (missing R2 config: bucket/endpoint/access key/secret key)';
    if (requireR2) {
      throw new Error(message);
    }
    console.log(message);
  } else {
    const baseKey = `${r2.prefix.replace(/\/+$/g, '')}/profiles/sampling/${stamp}`;
    const archiveKey = `${baseKey}/sampling-profile.tar.gz`;
    const summaryKey = `${baseKey}/summary.json`;
    const archiveBytes = await Bun.file(`${runDir}/sampling-profile.tar.gz`).bytes();
    const summaryText = await Bun.file(`${runDir}/summary.json`).text();
    await S3Client.write(archiveKey, archiveBytes, {
      bucket: r2.bucket,
      endpoint: r2.endpoint,
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
      type: 'application/gzip'
    });
    await S3Client.write(summaryKey, summaryText, {
      bucket: r2.bucket,
      endpoint: r2.endpoint,
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
      type: 'application/json'
    });
    uploadedArchiveKey = archiveKey;
    uploadedSummaryKey = summaryKey;
  }
}

console.log(`[sampling-profile] target=${target}`);
console.log(`[sampling-profile] iterations=${iterations} sampleIntervalUs=${sampleIntervalUs} durationMs=${durationMs}`);
console.log(`[sampling-profile] output=${runDir}`);
console.log(`[sampling-profile] archive=${runDir}/sampling-profile.tar.gz`);
if (uploadedArchiveKey) {
  console.log(`[sampling-profile] r2ArchiveKey=${uploadedArchiveKey}`);
}
if (uploadedSummaryKey) {
  console.log(`[sampling-profile] r2SummaryKey=${uploadedSummaryKey}`);
}
