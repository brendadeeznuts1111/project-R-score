#!/usr/bin/env bun
/**
 * @fileoverview Create R2 bucket using admin credentials
 * @module scripts/create-r2-bucket
 * 
 * @description
 * Creates a new Cloudflare R2 bucket using S3-compatible API.
 * Requires admin credentials with bucket creation permissions.
 * 
 * @example
 * ```bash
 * bun run scripts/create-r2-bucket.ts my-bucket
 * bun run scripts/create-r2-bucket.ts list
 * ```
 * 
 * @see {@link https://developers.cloudflare.com/r2/} Cloudflare R2 Docs
 * @see {@link https://npm.factory-wager.com} FactoryWager NPM Registry
 * @see {@link https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com} R2 Endpoint
 */

/** R2 Account ID */
const R2_ACCOUNT_ID = "7a470541a704caaf91e71efccc78fd36";

/** R2 Access Key ID (admin) */
const R2_ACCESS_KEY_ID = "5827898f34598da457de7fdf8a5a2ebd";

/** R2 Secret Access Key (admin) */
const R2_SECRET_ACCESS_KEY = "35e3bfdec97455b9a0a7caf62d26b23edaae70642c36aeb223369617f6cf9165";

/** R2 S3-compatible endpoint */
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

/** FactoryWager registry URL */
const REGISTRY_URL = process.env.REGISTRY_URL || "https://npm.factory-wager.com";

/** Default bucket name */
const DEFAULT_BUCKET = "bun-secrets";

/**
 * Generate AWS Signature V4 for R2 authentication
 * @param method - HTTP method
 * @param path - Request path
 * @param headers - Additional headers
 * @param body - Request body
 * @returns Signed headers
 */
async function signRequest(
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: string
): Promise<Record<string, string>> {
  const date = new Date();
  const dateStamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = date.toISOString().replace(/[:\-]|\.[0-9]{3}/g, '').slice(0, 15) + 'Z';
  const region = 'auto';
  const service = 's3';

  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalUri = encodeURI(path);
  const canonicalQuerystring = '';
  
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const payloadHash = body 
    ? await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))
        .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''))
    : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest))
    .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));
  
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join('\n');

  const getSignatureKey = async (key: string, dateStamp: string, regionName: string, serviceName: string): Promise<ArrayBuffer> => {
    const kDate = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', new TextEncoder().encode('AWS4' + key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(dateStamp));
    const kRegion = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', kDate, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(regionName));
    const kService = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', kRegion, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(serviceName));
    const kSigning = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', kService, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode('aws4_request'));
    return kSigning;
  };

  const signingKey = await getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, region, service);
  const signature = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', signingKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(stringToSign));
  const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`;

  return {
    ...headers,
    'Host': host,
    'X-Amz-Date': amzDate,
    'X-Amz-Content-SHA256': payloadHash,
    'Authorization': authorizationHeader,
  };
}

/**
 * Create a new R2 bucket
 * @param bucketName - Name of the bucket to create
 */
async function createBucket(bucketName: string): Promise<void> {
  console.log(`Creating bucket: ${bucketName}...\n`);
  console.log(`   Endpoint: ${R2_ENDPOINT}`);
  console.log(`   Registry: ${REGISTRY_URL}\n`);
  
  const headers = await signRequest('PUT', `/${bucketName}`);
  
  const resp = await fetch(`${R2_ENDPOINT}/${bucketName}`, {
    method: 'PUT',
    headers,
  });
  
  if (resp.ok) {
    console.log(`✅ Bucket "${bucketName}" created successfully`);
    console.log(`   URL: ${R2_ENDPOINT}/${bucketName}`);
    console.log(`\n🚀 Next steps:`);
    console.log(`   1. Configure CORS if needed`);
    console.log(`   2. Set up bucket policies`);
    console.log(`   3. Use with: R2_BUCKET_NAME=${bucketName} bun run bun:secrets:init`);
  } else if (resp.status === 409) {
    console.log(`ℹ️  Bucket "${bucketName}" already exists`);
    console.log(`   URL: ${R2_ENDPOINT}/${bucketName}`);
  } else {
    console.error(`❌ Failed to create bucket: ${resp.status}`);
    const text = await resp.text();
    console.error(text.slice(0, 500));
  }
}

/**
 * List all R2 buckets
 */
async function listBuckets(): Promise<void> {
  console.log("Listing buckets...\n");
  console.log(`   Endpoint: ${R2_ENDPOINT}\n`);
  
  const headers = await signRequest('GET', '/');
  
  const resp = await fetch(`${R2_ENDPOINT}/`, {
    method: 'GET',
    headers,
  });
  
  if (resp.ok) {
    const xml = await resp.text();
    const buckets = [...xml.matchAll(/<Name>([^<]+)<\/Name>/g)].map(m => m[1]);
    console.log(`Found ${buckets.length} bucket(s):`);
    for (const bucket of buckets) {
      console.log(`  • ${bucket}`);
      console.log(`    ${R2_ENDPOINT}/${bucket}`);
    }
  } else {
    console.error(`❌ Failed to list buckets: ${resp.status}`);
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const cmd = process.argv[2] || DEFAULT_BUCKET;
  
  if (cmd === 'list') {
    await listBuckets();
  } else {
    await createBucket(cmd);
  }
}

await main();
