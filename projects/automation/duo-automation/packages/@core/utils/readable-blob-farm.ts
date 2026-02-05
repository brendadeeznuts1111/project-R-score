// utils/readable-blob-farm.ts (Node Readable → R2 Inline)
import { Readable } from 'stream';
import { S3Client } from 'bun';

// Load R2 credentials from environment
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    // Support both R2_* and S3_* prefixed vars for flexibility
    s3Client = new S3Client({
      accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || 'sim-id',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || '',
      bucket: process.env.S3_BUCKET || process.env.R2_BUCKET || 'duoplus-storage',
      endpoint: process.env.S3_ENDPOINT || process.env.R2_ENDPOINT || '',
      region: process.env.S3_REGION || 'auto',
    });
  }
  return s3Client;
}

/**
 * Converts a Node Readable stream to a Blob (zero-copy via Response) 
 * and writes directly to S3/R2 with inline disposition.
 */
export async function readableToInlineBlob(key: string, readable: Readable) {
  const start = Bun.nanoseconds();
  const isSim = process.env.PRODUCTION_SIM === '1';
  
  if (isSim) {
    // Simulation mode - return mock URL
    const embedUrl = `https://sim.r2.dev/${key}`;
    console.log(`📱 Readable Blob Inline: ${key} (SIM) → ${embedUrl}`);
    return embedUrl;
  }
  
  const client = getS3Client();
  
  // Readable → Blob (zero-copy using the Response constructor)
  const response = new Response(readable as any);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Blob → S3.file().write() inline (Gig stream)
  const s3file = client.file(key);
  await s3file.write(uint8Array, {
    type: 'image/png',
    contentDisposition: 'inline; filename="stream-screenshot.png"'
  });
  
  const timeMs = (Bun.nanoseconds() - start) / 1e6;
  
  // Construct URL from endpoint pattern - use R2 public domain or construct from endpoint
  let embedUrl = '';
  if (process.env.R2_PUBLIC_DOMAIN) {
    embedUrl = `${process.env.R2_PUBLIC_DOMAIN}/${key}`;
  } else {
    const endpoint = process.env.S3_ENDPOINT || process.env.R2_ENDPOINT || '';
    const host = endpoint.replace('https://', '').replace('http://', '');
    const bucket = process.env.S3_BUCKET || process.env.R2_BUCKET || 'duoplus-storage';
    embedUrl = `https://${bucket}.${host}/${key}`;
  }
  
  console.log(`📱 Readable Blob Inline: ${key} (${timeMs.toFixed(0)}ms) → ${embedUrl}`);
  return embedUrl;
}

/**
 * Gig Readable Mock (Node Readable.from)
 */
export async function gigReadableStream(mb: number): Promise<Readable> {
  const size = mb * 1024 * 1024;
  let bytesSent = 0;
  return new Readable({
    read() {
      const remaining = size - bytesSent;
      if (remaining <= 0) {
        this.push(null);
        return;
      }
      const chunkSize = Math.min(64 * 1024, remaining); // 64KB chunks
      const chunk = Buffer.allocUnsafe(chunkSize);
      bytesSent += chunk.length;
      this.push(chunk);
    }
  });
}

/**
 * Farm: 100x1MB streams
 */
export async function streamFarm(count = 100, sizeMB = 1) {
  const startTime = Bun.nanoseconds();
  const urls = [];
  
  // Process in parallel with some concurrency control if needed, 
  // but the prompt suggests a serial/loop for the demo.
  for (let i = 0; i < count; i++) {
    const readable = await gigReadableStream(sizeMB);
    const key = `streams/farm-${i + 1}.png`;
    const url = await readableToInlineBlob(key, readable);
    urls.push(url);
  }
  
  const totalTimeSec = (Bun.nanoseconds() - startTime) / 1e9;
  const totalGB = (count * sizeMB) / 1024;
  const gbPerMin = (totalGB / totalTimeSec) * 60;
  
  console.log(`🌊 Stream Farm: ${count}x${sizeMB}MB Inline R2 (${gbPerMin.toFixed(0)}GB/min)`);
  return urls;
}

// Small CLI runner for the farm
if (import.meta.main) {
  await streamFarm(10, 1); // Default to 10 for quick check
}
