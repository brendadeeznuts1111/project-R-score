#!/usr/bin/env bun
// Cloudflare R2 Upload Script for Global Trading System
// Optimized for Bun's ultra-fast performance

import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';
import { createHash } from 'crypto';

interface UploadConfig {
  bucketName: string;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

class R2Uploader {
  private client: S3Client;
  private config: UploadConfig;
  private uploadedFiles: string[] = [];

  constructor() {
    this.config = {
      bucketName: process.env.R2_BUCKET_NAME || 'global-trading-packages',
      accountId: process.env.R2_ACCOUNT_ID || '',
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      region: process.env.R2_REGION || 'auto'
    };

    this.client = new S3Client({
      region: this.config.region,
      endpoint: `https://${this.config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  async uploadAll(): Promise<void> {
    console.log('🚀 Starting Global Trading System R2 Upload...');
    console.log(`📦 Target bucket: ${this.config.bucketName}`);
    console.log(`🌍 Account: ${this.config.accountId}`);
    console.log('');

    try {
      // Upload built packages
      await this.uploadDirectory('./dist', 'packages');
      
      // Upload dashboard
      if (existsSync('./trading-dashboard-enhanced.html')) {
        await this.uploadFile('./trading-dashboard-enhanced.html', 'dashboard/trading-dashboard-enhanced.html');
      }

      // Upload documentation
      if (existsSync('./TRADING_README.md')) {
        await this.uploadFile('./TRADING_README.md', 'docs/TRADING_README.md');
      }

      // Upload package.json for registry
      if (existsSync('./package.json')) {
        await this.uploadFile('./package.json', 'package.json');
      }

      // Generate and upload package manifest
      await this.generateManifest();

      console.log(`✅ Upload completed! ${this.uploadedFiles.length} files uploaded.`);
      console.log('🌍 Global Trading System is now available via Cloudflare CDN');
      
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error;
    }
  }

  private async uploadDirectory(dirPath: string, bucketPrefix: string): Promise<void> {
    if (!existsSync(dirPath)) {
      console.log(`⚠️  Directory ${dirPath} does not exist, skipping...`);
      return;
    }

    console.log(`📁 Uploading directory: ${dirPath} -> ${bucketPrefix}`);
    
    const files = readdirSync(dirPath);
    let uploadedCount = 0;

    for (const file of files) {
      const fullPath = join(dirPath, file);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        await this.uploadDirectory(fullPath, `${bucketPrefix}/${file}`);
      } else {
        const key = `${bucketPrefix}/${file}`;
        await this.uploadFile(fullPath, key);
        uploadedCount++;
      }
    }

    console.log(`  ✅ Uploaded ${uploadedCount} files from ${dirPath}`);
  }

  private async uploadFile(filePath: string, key: string): Promise<void> {
    try {
      const content = readFileSync(filePath);
      const contentType = this.getContentType(filePath);
      const contentHash = this.createHash(content);

      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: content,
        ContentType: contentType,
        Metadata: {
          'content-hash': contentHash,
          'upload-time': new Date().toISOString(),
          'system': 'global-trading-system',
          'version': '1.0.0'
        }
      });

      await this.client.send(command);
      this.uploadedFiles.push(key);
      
      console.log(`  📤 ${key} (${(content.length / 1024).toFixed(1)}KB)`);
      
    } catch (error) {
      console.error(`❌ Failed to upload ${key}:`, error);
      throw error;
    }
  }

  private getContentType(filename: string): string {
    const ext = extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.ts': 'application/typescript',
      '.json': 'application/json',
      '.html': 'text/html',
      '.css': 'text/css',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.wasm': 'application/wasm',
      '.map': 'application/json'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }

  private createHash(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private async generateManifest(): Promise<void> {
    console.log('📋 Generating package manifest...');

    const manifest = {
      name: 'global-trading-system',
      version: '1.0.0',
      description: 'Global High-Frequency Sports Trading System with 13-byte configuration',
      uploadedAt: new Date().toISOString(),
      files: this.uploadedFiles,
      packages: [
        {
          name: '@trading/core',
          version: '1.0.0',
          main: 'packages/core/index.js',
          size: this.getFileSize('./dist/core/index.js')
        },
        {
          name: '@trading/polymarket',
          version: '1.0.0',
          main: 'packages/integrations/polymarket-client.js',
          size: this.getFileSize('./dist/integrations/polymarket-client.js')
        },
        {
          name: '@trading/fanduel',
          version: '1.0.0',
          main: 'packages/integrations/fanduel-client.js',
          size: this.getFileSize('./dist/integrations/fanduel-client.js')
        },
        {
          name: '@trading/multi-region',
          version: '1.0.0',
          main: 'packages/multi-region/region-processor.js',
          size: this.getFileSize('./dist/multi-region/region-processor.js')
        },
        {
          name: '@trading/cross-platform',
          version: '1.0.0',
          main: 'packages/cross-platform/platform-manager.js',
          size: this.getFileSize('./dist/cross-platform/platform-manager.js')
        },
        {
          name: '@trading/global-integration',
          version: '1.0.0',
          main: 'packages/global-integration/integration-manager.js',
          size: this.getFileSize('./dist/global-integration/integration-manager.js')
        }
      ],
      performance: {
        configSpeed: '45ns',
        regions: ['us', 'uk', 'eu', 'apac'],
        platforms: ['polymarket', 'fanduel'],
        features: ['multi-region', 'arbitrage', 'auto-trading', 'risk-management']
      },
      deployment: {
        platform: 'cloudflare-r2',
        cdn: 'global',
        optimized: true,
        bunPowered: true
      }
    };

    const manifestContent = JSON.stringify(manifest, null, 2);
    const manifestCommand = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: 'manifest.json',
      Body: manifestContent,
      ContentType: 'application/json',
      Metadata: {
        'system': 'global-trading-system',
        'type': 'manifest'
      }
    });

    await this.client.send(manifestCommand);
    console.log('  ✅ Manifest uploaded: manifest.json');
  }

  private getFileSize(filePath: string): number {
    try {
      if (existsSync(filePath)) {
        return statSync(filePath).size;
      }
    } catch (error) {
      // File doesn't exist or can't be read
    }
    return 0;
  }

  async listUploadedFiles(): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        Prefix: 'packages/'
      });

      const response = await this.client.send(command);
      const packages = response.Contents?.map((obj: any) => obj.Key) || [];
      return packages;
    } catch (error) {
      console.error('❌ Failed to list files:', error);
      return [];
    }
  }
}

// Main execution
async function main() {
  const uploader = new R2Uploader();
  
  try {
    await uploader.uploadAll();
    
    console.log('');
    console.log('🎉 Global Trading System deployment completed!');
    console.log('📊 Deployment Summary:');
    console.log(`   • Files uploaded: ${uploader['uploadedFiles'].length}`);
    console.log(`   • Bucket: ${uploader['config'].bucketName}`);
    console.log(`   • Region: ${uploader['config'].region}`);
    console.log('   • CDN: Global Cloudflare network');
    console.log('');
    console.log('🌐 Access URLs:');
    console.log(`   • Dashboard: https://${uploader['config'].bucketName}.r2.cloudflarestorage.com/dashboard/trading-dashboard-enhanced.html`);
    console.log(`   • Manifest: https://${uploader['config'].bucketName}.r2.cloudflarestorage.com/manifest.json`);
    console.log('');
    console.log('⚡ Powered by Bun Package Manager & 13-byte configuration system');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
