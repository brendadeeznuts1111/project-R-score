import config from '../src/config/config-loader';

import { S3Client } from 'bun';

export interface S3NativeConfig {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  sessionToken?: string;
}

export class S3R2NativeManager {
  private client: any;
  private bucket: string;

  constructor(config: S3NativeConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      endpoint: config.endpoint,
      bucket: config.bucket,
      region: config.region || 'auto',
      sessionToken: config.sessionToken
    });
  }

  async uploadAppleID(data: any, key: string) {
    const json = JSON.stringify(data, null, 2);
    const start = Bun.nanoseconds();
    
    // Zstd + Disposition (inline for previews)
    await this.client.write(key, json, {
      type: 'application/json',
      contentDisposition: 'inline; filename="apple-id.json"',
      metadata: { 
        email: data.email, 
        success: String(data.success),
        batchID: data.batchID || 'none'
      }
    });
    
    const timeMs = (Bun.nanoseconds() - start) / 1e6;
    return { success: true, key, timeMs };
  }

  async downloadCSV(key: string, filename: string) {
    const file = this.client.file(key, {
      contentDisposition: `attachment; filename="${filename}"`
    });
    let url = file.url;
    if (!url && process.env.PRODUCTION_SIM === '1') {
      url = `https://sim.r2.dev/${key}`;
    }
    console.log(`💾 DL: ${url} → "${filename}"`);
    return url;
  }

  async uploadScreenshot(pngData: Uint8Array, key: string, metadata: any = {}) {
    const isSim = process.env.PRODUCTION_SIM === '1';
    console.log(`📸 S3 Native uploadScreenshot: ${key} (Size: ${pngData.length}B, SIM: ${isSim})`);
    const start = Bun.nanoseconds();
    
    if (this.client) {
      try {
        await this.client.write(key, pngData, {
          type: 'image/png',
          contentDisposition: 'inline; filename="screenshot.png"', // INLINE for embeds!
          metadata: { 
            ...metadata,
            disposition: 'inline', // Explicit
            created: new Date().toISOString()
          }
        });
      } catch (e) {
        if (!isSim) throw e;
      }
    }
    
    const timeMs = (Bun.nanoseconds() - start) / 1e6;
    let embedUrl = (this.client && !isSim) ? this.client.file(key).url : '';
    
    // Fallback URL construction - use R2 public domain or construct from endpoint
    if (!embedUrl) {
      if (process.env.PRODUCTION_SIM === '1') {
        embedUrl = `https://sim.r2.dev/${key}`;
      } else if (process.env.R2_PUBLIC_DOMAIN) {
        embedUrl = `${process.env.R2_PUBLIC_DOMAIN}/${key}`;
      } else {
        // Construct from endpoint: https://bucket.account.r2.cloudflarestorage.com/key
        const endpoint = process.env.S3_ENDPOINT || config.getEndpoint('storage').r2.endpoint || '';
        const host = endpoint.replace('https://', '').replace('http://', '');
        embedUrl = `https://${this.bucket}.${host}/${key}`;
      }
    }

    console.log(`🖼️ Inline Screenshot: ${key} (${timeMs.toFixed(0)}ms) → Embed URL: ${embedUrl}`);
    return { success: true, key, timeMs, embedUrl };
  }

  async bulkUpload(appleIDs: any[]) {
    const start = Bun.nanoseconds();
    const promises = appleIDs.map(id => 
      this.uploadAppleID(id, id.filename || `apple-${Bun.randomUUIDv7()}.json`)
    );
    const results = await Promise.all(promises);
    const totalMs = (Bun.nanoseconds() - start) / 1e6;
    return { results, totalMs };
  }

  async uploadPublicFile(key: string, data: any, type: string) {
    const isSim = process.env.PRODUCTION_SIM === '1';
    const start = Bun.nanoseconds();

    if (this.client && !isSim) {
      await this.client.write(key, data, {
        type,
        contentDisposition: `inline; filename="${key.split('/').pop()}"`,
        metadata: {
          created: new Date().toISOString(),
          disposition: 'inline'
        }
      });
    }

    const timeMs = (Bun.nanoseconds() - start) / 1e6;
    let url = (this.client && !isSim) ? this.client.file(key).url : '';

    if (!url) {
      if (isSim) {
        url = `https://sim.r2.dev/${key}`;
      } else {
        url = `https://files.apple.factory-wager.com/${key}`;
      }
    }

    return { success: true, key, timeMs, url };
  }
}
