#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/environment-variables#setting-environment-variables — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write
// @see https://bun.com/docs/runtime/glob — Bun.Glob

/**
 * Simple R2 Client for Filter Watch Logger
 *
 * Basic R2 upload functionality for storing watch session logs.
 * Uses signed S3 requests in production, local filesystem in development.
 */

import { join } from 'path';
import { signS3Request, getR2Credentials } from './s3-signer';

interface R2UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

function isLocalMode(): boolean {
  return Bun.env.NODE_ENV === 'development' || !Bun.env.R2_BUCKET_NAME;
}

/**
 * Upload data to R2 storage
 */
export async function uploadToR2(
  key: string,
  data: unknown,
  options: R2UploadOptions = {}
): Promise<void> {
  try {
    console.info(`📤 Uploading to R2: ${key}`);

    // For local development, store in local directory
    if (isLocalMode()) {
      const localFile = join(process.cwd(), 'data', 'r2-logs', key);
      // Bun.write creates parent directories
      await Bun.write(localFile, JSON.stringify(data, null, 2));
      console.info(`💾 Stored locally: ${localFile}`);
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

    console.info(`✅ Successfully uploaded to R2: ${key}`);
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
    console.info(`📋 Listing R2 objects: ${prefix}`);

    // For local development, list local files via Bun.Glob
    if (isLocalMode()) {
      const localDir = join(process.cwd(), 'data', 'r2-logs', prefix);
      try {
        const keys: string[] = [];
        const glob = new Bun.Glob('**/*');
        for await (const file of glob.scan({ cwd: localDir, onlyFiles: true })) {
          keys.push(join(prefix, file));
        }
        return keys;
      } catch {
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
    console.info(`📥 Downloading from R2: ${key}`);

    // For local development, read local file
    if (isLocalMode()) {
      const localFile = join(process.cwd(), 'data', 'r2-logs', key);
      const file = Bun.file(localFile);
      if (!(await file.exists())) {
        throw new Error(`Local file not found: ${localFile}`);
      }
      return file.json();
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
