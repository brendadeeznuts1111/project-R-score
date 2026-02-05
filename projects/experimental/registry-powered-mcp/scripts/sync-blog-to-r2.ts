/**
 * Sync blog/dist to R2 bucket using Bun native S3 client
 */
import { S3Client } from "bun";
import { readdir, stat } from "fs/promises";
import { join, extname } from "path";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${Bun.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: Bun.env.R2_ACCESS_KEY_ID || "",
  secretAccessKey: Bun.env.R2_SECRET_ACCESS_KEY || "",
  bucket: Bun.env.R2_BUCKET || "",
});

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".xml": "application/xml",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

async function* walkDir(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(fullPath);
    } else {
      yield fullPath;
    }
  }
}

async function syncToR2() {
  const baseDir = "blog/dist";
  let uploaded = 0;
  let totalBytes = 0;

  for await (const filePath of walkDir(baseDir)) {
    const key = filePath.replace("blog/dist/", "blog/");
    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const file = Bun.file(filePath);
    const content = await file.text();

    await s3.write(key, content, { type: contentType });

    const fileSize = (await stat(filePath)).size;
    totalBytes += fileSize;
    uploaded++;
    console.log(`✓ ${key} (${contentType})`);
  }

  console.log(`\n✅ Synced ${uploaded} files (${(totalBytes / 1024).toFixed(1)} KB)`);
}

syncToR2().catch(console.error);
