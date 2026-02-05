#!/usr/bin/env bun
import { S3Client } from "bun";

const client = new S3Client({
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  bucket: process.env.R2_BUCKET!,
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
});

try {
  await client.write("test.txt", Buffer.from("test"));
  console.log(`✅ Bucket "${process.env.R2_BUCKET}" is ready`);
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
}
