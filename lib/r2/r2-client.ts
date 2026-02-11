#!/usr/bin/env bun

/**
 * Simple R2 Client for Filter Watch Logger
 *
 * Basic R2 upload functionality for storing watch session logs.
 * Uses signed S3 requests in production, local filesystem in development.
 */

import { signS3Request, getR2Credentials } from './s3-signer';

interface R2UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

function isLocalMode(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.R2_BUCKET_NAME;
}

/**
 * Upload data to R2 storage
 */
export async function uploadToR2(key: string, data: any, options: R2UploadOptions = {}): Promise<void> {
  try {
    console.log(`📤 Uploading to R2: ${key}`);

    // For local development, store in local directory
    if (isLocalMode()) {
      const fs = await import('fs');
      const path = await import('path');

      const localDir = path.join(process.cwd(), 'data', 'r2-logs');
      const localFile = path.join(localDir, key);

      // Ensure directory exists
      await fs.promises.mkdir(path.dirname(localFile), { recursive: true });

      // Write file
      await fs.promises.writeFile(localFile, JSON.stringify(data, null, 2));

      console.log(`💾 Stored locally: ${localFile}`);
      return;
    }

    // Production: signed PUT request
    const creds = getR2Credentials();
    const url = `${creds.endpoint}/${creds.bucket}/${key}`;
    const body = JSON.stringify(data);
    const signed = await signS3Request('PUT', url, creds, body);

    const response = await fetch(signed.url, {
      method: 'PUT',
      headers: signed.headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`R2 upload failed: ${response.status} ${response.statusText}`);
    }

    console.log(`✅ Successfully uploaded to R2: ${key}`);

  } catch (error) {
    console.error(`❌ Failed to upload to R2: ${key}`, error);
    throw error;
  }
}

/**
 * List R2 objects for a given prefix
 */
export async function listR2Objects(prefix: string): Promise<string[]> {
  try {
    console.log(`📋 Listing R2 objects: ${prefix}`);

    // For local development, list local files
    if (isLocalMode()) {
      const fs = await import('fs');
      const path = await import('path');

      const localDir = path.join(process.cwd(), 'data', 'r2-logs', prefix);

      try {
        const files = await fs.promises.readdir(localDir, { recursive: true });
        return files.map(file => path.join(prefix, file));
      } catch (error) {
        return [];
      }
    }

    // Production: signed GET with list-type=2
    const creds = getR2Credentials();
    const url = `${creds.endpoint}/${creds.bucket}?list-type=2&prefix=${encodeURIComponent(prefix)}`;
    const signed = await signS3Request('GET', url, creds);

    const response = await fetch(signed.url, { headers: signed.headers });

    if (!response.ok) {
      throw new Error(`R2 list failed: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    // Parse <Key> elements from S3 ListObjectsV2 XML response
    const keys: string[] = [];
    const keyRegex = /<Key>([^<]+)<\/Key>/g;
    let match: RegExpExecArray | null;
    while ((match = keyRegex.exec(xml)) !== null) {
      keys.push(match[1]);
    }
    return keys;

  } catch (error) {
    console.error(`❌ Failed to list R2 objects: ${prefix}`, error);
    return [];
  }
}

/**
 * Download data from R2
 */
export async function downloadFromR2(key: string): Promise<any> {
  try {
    console.log(`📥 Downloading from R2: ${key}`);

    // For local development, read local file
    if (isLocalMode()) {
      const fs = await import('fs');
      const path = await import('path');

      const localFile = path.join(process.cwd(), 'data', 'r2-logs', key);

      try {
        const data = await fs.promises.readFile(localFile, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        throw new Error(`Local file not found: ${localFile}`);
      }
    }

    // Production: signed GET request
    const creds = getR2Credentials();
    const url = `${creds.endpoint}/${creds.bucket}/${key}`;
    const signed = await signS3Request('GET', url, creds);

    const response = await fetch(signed.url, { headers: signed.headers });

    if (!response.ok) {
      throw new Error(`R2 download failed: ${response.status} ${response.statusText}`);
    }

    return response.json();

  } catch (error) {
    console.error(`❌ Failed to download from R2: ${key}`, error);
    throw error;
  }
}
