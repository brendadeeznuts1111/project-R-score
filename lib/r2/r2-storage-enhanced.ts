// lib/r2/r2-storage-enhanced.ts — Enhanced R2 storage with package integration

import { RSS_URLS } from '../../config/urls';

export interface R2StorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  defaultBucket: string;
  encryptionKey?: string;
}

interface BucketStats {
  name: string;
  created: Date;
  size: number;
}

export class R2Storage {
  private config: R2StorageConfig;
  private endpoint: string;
  private buckets: Map<string, BucketStats>;

  constructor(config: R2StorageConfig) {
    this.config = config;
    this.endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;
    this.buckets = new Map();
  }

  async createBucketForPackage(packageName: string): Promise<string> {
    const sanitized = packageName.replace(/[@/]/g, '-');
    const bucketName = `bun-docs-${sanitized}-${Date.now().toString(36)}`;

    await this.createBucket(bucketName);

    // Store bucket info in package config
    const packageConfig = {
      bucket: bucketName,
      created: new Date().toISOString(),
      package: packageName,
    };

    await this.putJson(`_config/${packageName}/bucket.json`, packageConfig);

    return bucketName;
  }

  async uploadPackageDocs(packageName: string, docs: any): Promise<string> {
    const bucketName = await this.getOrCreateBucket(packageName);
    const key = `packages/${packageName}/${Date.now()}/docs.json`;

    // Compress with Bun's zstd
    try {
      const compressed = Bun.zstdCompressSync(JSON.stringify(docs));
      await this.put(bucketName, key, compressed);
    } catch {
      // Fallback to uncompressed if zstd not available
      await this.put(bucketName, key, Buffer.from(JSON.stringify(docs)));
    }

    // Generate and upload static HTML docs
    const html = await this.generateHtmlDocs(packageName, docs);
    await this.put(bucketName, `packages/${packageName}/index.html`, Buffer.from(html));

    return `https://${bucketName}.${this.config.accountId}.r2.dev/packages/${packageName}/`;
  }

  private async generateHtmlDocs(packageName: string, docs: any): Promise<string> {
    const template = `
<!DOCTYPE html>
<html>
<head>
    <title>${packageName} - Bun Documentation</title>
    <meta name="generator" content="bun-docs">
    <style>
        body { font-family: system-ui; max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .api { background: #f5f5f5; padding: 1rem; margin: 1rem 0; border-radius: 8px; }
        .rss-feed { border-left: 4px solid #f0b90b; padding-left: 1rem; }
    </style>
</head>
<body>
    <h1>${packageName}</h1>
    <div id="docs">
        <pre>${JSON.stringify(docs, null, 2)}</pre>
    </div>
    <div id="rss-feed" class="rss-feed"></div>
    <script>
        // RSS feed integration
        fetch('${RSS_URLS.OUR_FEED}/${packageName}').then(r => r.json()).then(feed => {
            const container = document.getElementById('rss-feed');
            if (feed && feed.items) {
                container.innerHTML = feed.items.map(item =>
                    \`<article><h3>\${item.title}</h3><p>\${item.description || ''}</p></article>\`
                ).join('');
            }
        }).catch(() => {});
    </script>
</body>
</html>`;

    return template;
  }

  async syncPackageCache(packageName: string, localCache: Map<string, any>): Promise<void> {
    console.log(`🔄 Syncing ${packageName} cache to R2...`);

    const bucket = await this.getOrCreateBucket(packageName);
    const batch: Array<{ key: string; value: Buffer }> = [];

    for (const [key, value] of localCache.entries()) {
      try {
        const compressed = Bun.zstdCompressSync(JSON.stringify(value));
        batch.push({
          key: `cache/${packageName}/${key}`,
          value: compressed,
        });
      } catch {
        batch.push({
          key: `cache/${packageName}/${key}`,
          value: Buffer.from(JSON.stringify(value)),
        });
      }
    }

    // Upload in batches of 100
    for (let i = 0; i < batch.length; i += 100) {
      const chunk = batch.slice(i, i + 100);
      await Promise.all(chunk.map(item => this.put(bucket, item.key, item.value)));
      console.log(`Uploaded ${Math.min(i + 100, batch.length)}/${batch.length} items`);
    }

    console.log('✅ Cache sync complete');
  }

  async getPackageDocs(packageName: string, version?: string): Promise<any> {
    const key = version
      ? `packages/${packageName}/${version}/docs.json`
      : `packages/${packageName}/latest/docs.json`;

    const data = await this.get(await this.getOrCreateBucket(packageName), key);
    if (!data) return null;

    try {
      const decompressed = Bun.zstdDecompressSync(data);
      return JSON.parse(decompressed.toString());
    } catch {
      return JSON.parse(data.toString());
    }
  }

  async listPackages(): Promise<Array<{ name: string; versions: string[]; lastUpdated: string }>> {
    const packages = await this.listObjects('_config/');

    return Promise.all(
      packages
        .filter(p => p.Key?.includes('bucket.json'))
        .map(async p => {
          const config = await this.getJson(p.Key!);
          const docs = await this.listObjects(`packages/${config.package}/`);

          return {
            name: config.package,
            versions: docs
              .filter(d => d.Key?.endsWith('/docs.json'))
              .map(d => d.Key?.split('/').slice(-2, -1)[0] || 'unknown'),
            lastUpdated: config.created,
          };
        })
    );
  }

  // Core R2 operations
  private async createBucket(bucketName: string): Promise<void> {
    // R2 API call to create bucket
    const response = await fetch(`${this.endpoint}/buckets`, {
      method: 'POST',
      headers: this.getAuthHeaders('POST', '/buckets'),
      body: JSON.stringify({ bucket: bucketName }),
    });

    if (!response.ok) throw new Error(`Failed to create bucket: ${response.statusText}`);
  }

  private async put(bucket: string, key: string, data: Buffer): Promise<void> {
    await fetch(`${this.endpoint}/${bucket}/${key}`, {
      method: 'PUT',
      headers: this.getAuthHeaders('PUT', `/${bucket}/${key}`),
      body: data,
    });
  }

  private async get(bucket: string, key: string): Promise<Buffer | null> {
    const response = await fetch(`${this.endpoint}/${bucket}/${key}`, {
      headers: this.getAuthHeaders('GET', `/${bucket}/${key}`),
    });

    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  }

  private async putJson(key: string, data: any): Promise<void> {
    await this.put(this.config.defaultBucket, key, Buffer.from(JSON.stringify(data)));
  }

  private async getJson(key: string): Promise<any> {
    const data = await this.get(this.config.defaultBucket, key);
    return data ? JSON.parse(data.toString()) : null;
  }

  private async listObjects(prefix: string): Promise<any[]> {
    const response = await fetch(`${this.endpoint}/${this.config.defaultBucket}?prefix=${prefix}`, {
      headers: this.getAuthHeaders('GET', `/${this.config.defaultBucket}`),
    });

    const xml = await response.text();
    // Parse XML response
    return this.parseListObjectsResponse(xml);
  }

  async getOrCreateBucket(packageName: string): Promise<string> {
    const config = await this.getJson(`_config/${packageName}/bucket.json`);
    return config?.bucket || (await this.createBucketForPackage(packageName));
  }

  private getAuthHeaders(method: string, path: string): HeadersInit {
    // Simplified auth headers for R2
    return {
      Authorization: `Bearer ${this.config.accessKeyId}:${this.config.secretAccessKey}`,
      'Content-Type': 'application/json',
    };
  }

  private parseListObjectsResponse(xml: string): any[] {
    // Simplified XML parsing
    const keys = xml.match(/<Key>([^<]+)<\/Key>/g) || [];
    const sizes = xml.match(/<Size>([^<]+)<\/Size>/g) || [];

    return keys.map((key, i) => ({
      Key: key.replace(/<\/?Key>/g, ''),
      Size: sizes[i] ? parseInt(sizes[i].replace(/<\/?Size>/g, '')) : 0,
    }));
  }
}
