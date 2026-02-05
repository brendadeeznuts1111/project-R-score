#!/usr/bin/env bun
// node-sdk-bench.ts - AWS SDK Baseline (for compare)
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from 'dotenv';

config({ path: './.env' });

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

const scale = +process.argv[2] || 100;
const bucket = process.argv[3] || config.getEndpoint('storage').r2.bucket!;

console.log(`🐌 Node SDK Benchmark: ${scale} uploads to ${bucket}`);

const start = Date.now();
const promises = Array(scale).fill(0).map(async (_, i) => {
  const data = JSON.stringify({
    email: `node${i}@test.com`,
    success: true,
    country: 'US',
    city: 'Test City',
    timestamp: Date.now()
  });
  
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: `apple-ids/node-bench-${i}.json`,
    Body: data,
    ContentType: 'application/json',
  });
  
  return client.send(command);
});

await Promise.all(promises);
const nodeTime = Date.now() - start;
const throughput = scale / (nodeTime / 1000);

console.log(`Node SDK Time: ${nodeTime}ms (${throughput.toFixed(0)} IDs/s)`);
