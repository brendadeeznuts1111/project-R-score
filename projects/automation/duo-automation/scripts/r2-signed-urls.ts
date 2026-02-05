#!/usr/bin/env bun
// [DUOPLUS][CLOUDFLARE][TS][META:{r2,s3,presigned}][STORAGE][#REF:R2-SIGN-46][BUN:4.6]

import { createHmac } from 'crypto';
import { urlLink } from './tty-hyperlink';

/**
 * Cloudflare R2 Signed URLs v4.6
 *
 * Generate pre-signed URLs for secure R2 object access.
 * Compatible with S3 signature v4.
 *
 * Account: 7a470541a704caaf91e71efccc78fd36
 * Endpoint: https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com
 */

const DEFAULT_ACCOUNT_ID = '7a470541a704caaf91e71efccc78fd36';
const DEFAULT_BUCKET = 'duoplus-artifacts';
const DEFAULT_EXPIRY = 3600; // 1 hour

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

interface SignedUrlOptions {
  key: string;
  expiresIn?: number; // seconds
  method?: 'GET' | 'PUT';
  contentType?: string;
}

interface SignedUrlResult {
  url: string;
  expiresAt: Date;
  method: string;
  key: string;
}

/**
 * R2 Signed URL Generator
 * Uses AWS Signature Version 4 (compatible with R2)
 */
class R2SignedUrlGenerator {
  private config: R2Config;
  private endpoint: string;
  private region = 'auto'; // R2 uses 'auto' region

  constructor(config?: Partial<R2Config>) {
    this.config = {
      accountId: config?.accountId || process.env.R2_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || DEFAULT_ACCOUNT_ID,
      accessKeyId: config?.accessKeyId || process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: config?.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY || '',
      bucket: config?.bucket || process.env.R2_BUCKET_NAME || DEFAULT_BUCKET,
    };

    this.endpoint = `https://${this.config.accountId}.r2.cloudflarestorage.com`;

    if (!this.config.accessKeyId || !this.config.secretAccessKey) {
      console.warn('⚠️  R2 credentials not set. Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY');
    }
  }

  /**
   * Generate pre-signed URL for object
   */
  generateSignedUrl(options: SignedUrlOptions): SignedUrlResult {
    const {
      key,
      expiresIn = DEFAULT_EXPIRY,
      method = 'GET',
      contentType,
    } = options;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresIn * 1000);

    // AWS Signature V4 components
    const amzDate = this.formatAmzDate(now);
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;

    // Canonical request components
    const host = `${this.config.accountId}.r2.cloudflarestorage.com`;
    const canonicalUri = `/${this.config.bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;

    // Query parameters for pre-signed URL
    const queryParams = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.config.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': expiresIn.toString(),
      'X-Amz-SignedHeaders': 'host',
    });

    // Sort query parameters
    const sortedParams = new URLSearchParams([...queryParams.entries()].sort());
    const canonicalQueryString = sortedParams.toString();

    // Canonical headers
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';

    // Canonical request
    const payloadHash = 'UNSIGNED-PAYLOAD';
    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    // String to sign
    const canonicalRequestHash = this.sha256(canonicalRequest);
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    // Signing key
    const signingKey = this.getSignatureKey(
      this.config.secretAccessKey,
      dateStamp,
      this.region,
      's3'
    );

    // Signature
    const signature = this.hmacHex(signingKey, stringToSign);

    // Final URL
    const signedUrl = `${this.endpoint}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

    return {
      url: signedUrl,
      expiresAt,
      method,
      key,
    };
  }

  /**
   * Generate upload URL (PUT)
   */
  generateUploadUrl(key: string, expiresIn = DEFAULT_EXPIRY, contentType?: string): SignedUrlResult {
    return this.generateSignedUrl({
      key,
      expiresIn,
      method: 'PUT',
      contentType,
    });
  }

  /**
   * Generate download URL (GET)
   */
  generateDownloadUrl(key: string, expiresIn = DEFAULT_EXPIRY): SignedUrlResult {
    return this.generateSignedUrl({
      key,
      expiresIn,
      method: 'GET',
    });
  }

  /**
   * Generate multiple signed URLs
   */
  generateBatch(keys: string[], method: 'GET' | 'PUT' = 'GET', expiresIn = DEFAULT_EXPIRY): SignedUrlResult[] {
    return keys.map(key => this.generateSignedUrl({ key, method, expiresIn }));
  }

  // ═══════════════════════════════════════════════════════════
  // AWS Signature V4 Helper Methods
  // ═══════════════════════════════════════════════════════════

  private formatAmzDate(date: Date): string {
    return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  }

  private sha256(data: string): string {
    const hash = new Bun.CryptoHasher('sha256');
    hash.update(data);
    return hash.digest('hex');
  }

  private hmac(key: Buffer | string, data: string): Buffer {
    return createHmac('sha256', key).update(data).digest();
  }

  private hmacHex(key: Buffer | string, data: string): string {
    return createHmac('sha256', key).update(data).digest('hex');
  }

  private getSignatureKey(
    secretKey: string,
    dateStamp: string,
    region: string,
    service: string
  ): Buffer {
    const kDate = this.hmac(`AWS4${secretKey}`, dateStamp);
    const kRegion = this.hmac(kDate, region);
    const kService = this.hmac(kRegion, service);
    const kSigning = this.hmac(kService, 'aws4_request');
    return kSigning;
  }

  /**
   * Get endpoint URL
   */
  getEndpoint(): string {
    return this.endpoint;
  }

  /**
   * Get bucket name
   */
  getBucket(): string {
    return this.config.bucket;
  }
}

/**
 * Display signed URL result
 */
function displayResult(result: SignedUrlResult): void {
  console.log('\n' + '═'.repeat(60));
  console.log(`📦 R2 Signed URL Generated`);
  console.log('═'.repeat(60));
  console.log(`Method:     ${result.method}`);
  console.log(`Key:        ${result.key}`);
  console.log(`Expires:    ${result.expiresAt.toISOString()}`);
  console.log(`\nURL:`);
  console.log(result.url);
  console.log('═'.repeat(60));
}

// ═══════════════════════════════════════════════════════════
// CLI INTERFACE
// ═══════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Check for credentials
  const hasCredentials = process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
  if (!hasCredentials && command !== '--help' && command !== '-h') {
    console.log('⚠️  R2 credentials not configured');
    console.log('   Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY environment variables');
    console.log(`\n   Create R2 API token: ${urlLink('https://dash.cloudflare.com/?to=/:account/r2/api-tokens', 'R2 API Tokens')}`);
    console.log('\n   Example:');
    console.log('   R2_ACCESS_KEY_ID=xxx R2_SECRET_ACCESS_KEY=yyy bun run r2:sign --get myfile.pdf');
    process.exit(1);
  }

  const generator = command !== '--help' && command !== '-h' ? new R2SignedUrlGenerator() : null;

  switch (command) {
    case '--get':
    case '-g': {
      const key = args[1];
      const expiresIn = parseInt(args[2]) || DEFAULT_EXPIRY;
      if (!key) {
        console.log('Usage: bun run r2:sign --get <key> [expiresIn]');
        process.exit(1);
      }
      const result = generator!.generateDownloadUrl(key, expiresIn);
      displayResult(result);
      break;
    }

    case '--put':
    case '-p': {
      const key = args[1];
      const expiresIn = parseInt(args[2]) || DEFAULT_EXPIRY;
      if (!key) {
        console.log('Usage: bun run r2:sign --put <key> [expiresIn]');
        process.exit(1);
      }
      const result = generator!.generateUploadUrl(key, expiresIn);
      displayResult(result);
      console.log('\n📤 Upload with curl:');
      console.log(`curl -X PUT -T <file> "${result.url}"`);
      break;
    }

    case '--batch':
    case '-b': {
      const method = (args[1]?.toUpperCase() as 'GET' | 'PUT') || 'GET';
      const keys = args.slice(2);
      if (keys.length === 0) {
        console.log('Usage: bun run r2:sign --batch GET|PUT key1 key2 key3');
        process.exit(1);
      }
      const results = generator!.generateBatch(keys, method);
      console.log(`\n📦 Generated ${results.length} signed URLs (${method})`);
      console.log('═'.repeat(60));
      for (const result of results) {
        console.log(`\n🔑 ${result.key}`);
        console.log(`   Expires: ${result.expiresAt.toISOString()}`);
        console.log(`   URL: ${result.url.slice(0, 80)}...`);
      }
      break;
    }

    case '--info':
    case '-i': {
      console.log('\n📦 R2 Configuration');
      console.log('═'.repeat(50));
      console.log(`Account ID:  ${process.env.R2_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || DEFAULT_ACCOUNT_ID}`);
      console.log(`Bucket:      ${process.env.R2_BUCKET_NAME || DEFAULT_BUCKET}`);
      console.log(`Endpoint:    ${generator!.getEndpoint()}`);
      console.log(`Credentials: ${hasCredentials ? '✅ Configured' : '❌ Not set'}`);
      console.log('═'.repeat(50));
      break;
    }

    case '--help':
    case '-h':
    default:
      console.log(`
📦 R2 Signed URL Generator v4.6

Generate pre-signed URLs for secure Cloudflare R2 access.
Account: ${DEFAULT_ACCOUNT_ID}
Bucket: ${DEFAULT_BUCKET}

Usage:
  bun run scripts/r2-signed-urls.ts --get <key> [expires]     # Download URL
  bun run scripts/r2-signed-urls.ts --put <key> [expires]     # Upload URL
  bun run scripts/r2-signed-urls.ts --batch GET|PUT <keys>    # Multiple URLs
  bun run scripts/r2-signed-urls.ts --info                    # Show config

npm scripts:
  bun run r2:sign --get reports/2024/q1.pdf                   # Download URL
  bun run r2:sign --put uploads/image.jpg 7200                # Upload URL (2h)
  bun run r2:sign --batch GET file1.pdf file2.pdf             # Batch download

Examples:
  # Generate download URL (1 hour default)
  bun run r2:sign --get artifacts/build-123.zip

  # Generate upload URL with custom expiry (2 hours)
  bun run r2:sign --put uploads/report.pdf 7200

  # Upload file using generated URL
  curl -X PUT -T ./local-file.pdf "<signed-url>"

  # Download file using generated URL
  curl -o output.pdf "<signed-url>"

Environment:
  R2_ACCESS_KEY_ID      - R2 API Access Key ID (required)
  R2_SECRET_ACCESS_KEY  - R2 API Secret Access Key (required)
  R2_ACCOUNT_ID         - Cloudflare Account ID (optional)
  R2_BUCKET_NAME        - R2 Bucket name (optional, default: ${DEFAULT_BUCKET})

Create API Token: ${urlLink('https://dash.cloudflare.com/?to=/:account/r2/api-tokens', 'R2 API Tokens')}

⚠️  Security: Never expose signed URLs in client-side code.
    Generate them server-side and pass to authorized clients.
      `);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { R2SignedUrlGenerator, SignedUrlOptions, SignedUrlResult, DEFAULT_ACCOUNT_ID, DEFAULT_BUCKET };
