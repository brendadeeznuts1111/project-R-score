/**
 * Optimized R2 Client for Bun.js
 *
 * High-performance Cloudflare R2 client with AWS Signature V4 authentication,
 * streaming support, and Bun-specific optimizations
 */

import { createHash, createHmac } from 'crypto';

interface R2ClientConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  bucket: string;
}

interface R2Object {
  key: string;
  size: number;
  etag: string;
  lastModified: Date;
  storageClass?: string;
}

interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  contentEncoding?: string;
  partSize?: number; // For multipart uploads
}

interface ListOptions {
  prefix?: string;
  delimiter?: string;
  maxKeys?: number;
  continuationToken?: string;
}

export class BunR2Client {
  private endpoint: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;
  private bucket: string;
  private service = 's3';

  constructor(config: R2ClientConfig) {
    this.endpoint = config.endpoint;
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region || 'auto';
    this.bucket = config.bucket;
  }

  /**
   * Upload object to R2 with optimized streaming
   */
  async putObject(
    key: string,
    data: Buffer | string | ReadableStream | Blob | File,
    options: UploadOptions = {}
  ): Promise<Response> {
    const url = `${this.endpoint}/${this.bucket}/${key}`;

    // Convert data to appropriate format
    const body = await this.prepareBody(data);
    const contentLength = await this.getContentLength(data);

    // Use multipart upload for large files
    if (contentLength > 100 * 1024 * 1024) {
      // 100MB threshold
      return this.multipartUpload(key, body, options);
    }

    const headers = await this.createSignedHeaders('PUT', `/${this.bucket}/${key}`, {
      'Content-Type': options.contentType || 'application/octet-stream',
      'Content-Length': contentLength.toString(),
      'x-amz-content-sha256': await this.hashData(body),
      'Cache-Control': options.cacheControl,
      'Content-Encoding': options.contentEncoding,
      ...this.formatMetadata(options.metadata),
    });

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`R2 upload failed: ${response.status} - ${error}`);
    }

    return response;
  }

  /**
   * Get object from R2 with streaming support
   */
  async getObject(key: string): Promise<Response> {
    const url = `${this.endpoint}/${this.bucket}/${key}`;

    const headers = await this.createSignedHeaders('GET', `/${this.bucket}/${key}`, {
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    });

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Object not found: ${key}`);
      }
      const error = await response.text();
      throw new Error(`R2 get failed: ${response.status} - ${error}`);
    }

    return response;
  }

  /**
   * Stream object directly to disk using Bun.write
   */
  async getObjectToFile(key: string, filePath: string): Promise<void> {
    const response = await this.getObject(key);

    if (!response.body) {
      throw new Error('No response body');
    }

    // Use Bun's optimized file writing
    await Bun.write(filePath, response.body);
  }

  /**
   * Delete object from R2
   */
  async deleteObject(key: string): Promise<Response> {
    const url = `${this.endpoint}/${this.bucket}/${key}`;

    const headers = await this.createSignedHeaders('DELETE', `/${this.bucket}/${key}`, {
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    });

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok && response.status !== 404) {
      const error = await response.text();
      throw new Error(`R2 delete failed: ${response.status} - ${error}`);
    }

    return response;
  }

  /**
   * List objects in bucket with pagination
   */
  async listObjects(options: ListOptions = {}): Promise<{
    objects: R2Object[];
    continuationToken?: string;
    isTruncated: boolean;
  }> {
    const params = new URLSearchParams({
      'list-type': '2',
      ...(options.prefix && { prefix: options.prefix }),
      ...(options.delimiter && { delimiter: options.delimiter }),
      ...(options.maxKeys && { 'max-keys': options.maxKeys.toString() }),
      ...(options.continuationToken && { 'continuation-token': options.continuationToken }),
    });

    const url = `${this.endpoint}/${this.bucket}?${params}`;

    const headers = await this.createSignedHeaders('GET', `/${this.bucket}?${params}`, {
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    });

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`R2 list failed: ${response.status} - ${error}`);
    }

    const xml = await response.text();
    return this.parseListResponse(xml);
  }

  /**
   * Check if object exists
   */
  async headObject(key: string): Promise<{ exists: boolean; metadata?: Record<string, string> }> {
    const url = `${this.endpoint}/${this.bucket}/${key}`;

    const headers = await this.createSignedHeaders('HEAD', `/${this.bucket}/${key}`, {
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    });

    const response = await fetch(url, {
      method: 'HEAD',
      headers,
    });

    if (response.status === 404) {
      return { exists: false };
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`R2 head failed: ${response.status} - ${error}`);
    }

    const metadata: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      if (key.startsWith('x-amz-meta-')) {
        metadata[key.substring(11)] = value;
      }
    });

    return { exists: true, metadata };
  }

  /**
   * Copy object within R2
   */
  async copyObject(sourceKey: string, destKey: string): Promise<Response> {
    const url = `${this.endpoint}/${this.bucket}/${destKey}`;

    const headers = await this.createSignedHeaders('PUT', `/${this.bucket}/${destKey}`, {
      'x-amz-copy-source': `/${this.bucket}/${sourceKey}`,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    });

    const response = await fetch(url, {
      method: 'PUT',
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`R2 copy failed: ${response.status} - ${error}`);
    }

    return response;
  }

  /**
   * Generate presigned URL for temporary access
   */
  async getPresignedUrl(
    key: string,
    expiresIn: number = 3600,
    operation: 'GET' | 'PUT' = 'GET'
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const date = timestamp.substring(0, 8);
    const credentialScope = `${date}/${this.region}/${this.service}/aws4_request`;

    const queryParams = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': timestamp,
      'X-Amz-Expires': expiresIn.toString(),
      'X-Amz-SignedHeaders': 'host',
    });

    const canonicalRequest = [
      operation,
      `/${this.bucket}/${key}`,
      queryParams.toString(),
      `host:${new URL(this.endpoint).host}\n`,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      timestamp,
      credentialScope,
      this.hash(canonicalRequest),
    ].join('\n');

    const signingKey = this.getSigningKey(date);
    const signature = this.hmac(signingKey, stringToSign).toString('hex');

    queryParams.set('X-Amz-Signature', signature);

    return `${this.endpoint}/${this.bucket}/${key}?${queryParams}`;
  }

  /**
   * Multipart upload for large files
   */
  private async multipartUpload(
    key: string,
    data: Buffer | ReadableStream,
    options: UploadOptions
  ): Promise<Response> {
    const partSize = options.partSize || 10 * 1024 * 1024; // 10MB default

    // Initiate multipart upload
    const initResponse = await this.initiateMultipartUpload(key, options);
    const uploadId = await this.extractUploadId(initResponse);

    try {
      const parts = await this.uploadParts(key, uploadId, data, partSize);
      return await this.completeMultipartUpload(key, uploadId, parts);
    } catch (error) {
      await this.abortMultipartUpload(key, uploadId);
      throw error;
    }
  }

  private async initiateMultipartUpload(key: string, options: UploadOptions): Promise<Response> {
    const url = `${this.endpoint}/${this.bucket}/${key}?uploads`;

    const headers = await this.createSignedHeaders('POST', `/${this.bucket}/${key}?uploads`, {
      'Content-Type': options.contentType || 'application/octet-stream',
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      ...this.formatMetadata(options.metadata),
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to initiate multipart upload: ${response.statusText}`);
    }

    return response;
  }

  private async uploadParts(
    key: string,
    uploadId: string,
    data: Buffer | ReadableStream,
    partSize: number
  ): Promise<Array<{ partNumber: number; etag: string }>> {
    const parts: Array<{ partNumber: number; etag: string }> = [];

    if (data instanceof Buffer) {
      // Handle Buffer uploads
      const totalParts = Math.ceil(data.length / partSize);

      for (let i = 0; i < totalParts; i++) {
        const start = i * partSize;
        const end = Math.min(start + partSize, data.length);
        const partData = data.slice(start, end);
        const partNumber = i + 1;

        const etag = await this.uploadPart(key, uploadId, partNumber, partData);
        parts.push({ partNumber, etag });
      }
    } else {
      // Handle stream uploads
      let partNumber = 1;
      const reader = data.getReader();
      let buffer = new Uint8Array(partSize);
      let bufferOffset = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (value) {
          let valueOffset = 0;

          while (valueOffset < value.length) {
            const spaceInBuffer = partSize - bufferOffset;
            const bytesToCopy = Math.min(spaceInBuffer, value.length - valueOffset);

            buffer.set(value.slice(valueOffset, valueOffset + bytesToCopy), bufferOffset);
            bufferOffset += bytesToCopy;
            valueOffset += bytesToCopy;

            if (bufferOffset === partSize) {
              const etag = await this.uploadPart(key, uploadId, partNumber, buffer);
              parts.push({ partNumber, etag });
              partNumber++;
              buffer = new Uint8Array(partSize);
              bufferOffset = 0;
            }
          }
        }

        if (done) {
          if (bufferOffset > 0) {
            const etag = await this.uploadPart(
              key,
              uploadId,
              partNumber,
              buffer.slice(0, bufferOffset)
            );
            parts.push({ partNumber, etag });
          }
          break;
        }
      }
    }

    return parts;
  }

  private async uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    data: Buffer | Uint8Array
  ): Promise<string> {
    const url = `${this.endpoint}/${this.bucket}/${key}?partNumber=${partNumber}&uploadId=${uploadId}`;

    const headers = await this.createSignedHeaders(
      'PUT',
      `/${this.bucket}/${key}?partNumber=${partNumber}&uploadId=${uploadId}`,
      {
        'Content-Length': data.length.toString(),
        'x-amz-content-sha256': await this.hashData(data),
      }
    );

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: data,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload part ${partNumber}: ${response.statusText}`);
    }

    return response.headers.get('etag') || '';
  }

  private async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: Array<{ partNumber: number; etag: string }>
  ): Promise<Response> {
    const url = `${this.endpoint}/${this.bucket}/${key}?uploadId=${uploadId}`;

    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<CompleteMultipartUpload xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
${parts
  .map(
    p => `  <Part>
    <PartNumber>${p.partNumber}</PartNumber>
    <ETag>${p.etag}</ETag>
  </Part>`
  )
  .join('\n')}
</CompleteMultipartUpload>`;

    const headers = await this.createSignedHeaders(
      'POST',
      `/${this.bucket}/${key}?uploadId=${uploadId}`,
      {
        'Content-Type': 'text/xml',
        'x-amz-content-sha256': await this.hashData(xmlBody),
      }
    );

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: xmlBody,
    });

    if (!response.ok) {
      throw new Error(`Failed to complete multipart upload: ${response.statusText}`);
    }

    return response;
  }

  private async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    const url = `${this.endpoint}/${this.bucket}/${key}?uploadId=${uploadId}`;

    const headers = await this.createSignedHeaders(
      'DELETE',
      `/${this.bucket}/${key}?uploadId=${uploadId}`,
      { 'x-amz-content-sha256': 'UNSIGNED-PAYLOAD' }
    );

    await fetch(url, {
      method: 'DELETE',
      headers,
    });
  }

  /**
   * AWS Signature V4 signing
   */
  private async createSignedHeaders(
    method: string,
    path: string,
    headers: Record<string, string | undefined>
  ): Promise<HeadersInit> {
    const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const date = timestamp.substring(0, 8);
    const host = new URL(this.endpoint).host;

    // Clean headers
    const cleanHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined) {
        cleanHeaders[key.toLowerCase()] = value;
      }
    }

    cleanHeaders['host'] = host;
    cleanHeaders['x-amz-date'] = timestamp;

    const signedHeaders = Object.keys(cleanHeaders).sort().join(';');
    const canonicalHeaders = Object.keys(cleanHeaders)
      .sort()
      .map(key => `${key}:${cleanHeaders[key]}`)
      .join('\n');

    const canonicalRequest = [
      method,
      path,
      '', // Query string (handled separately for list operations)
      canonicalHeaders + '\n',
      signedHeaders,
      cleanHeaders['x-amz-content-sha256'] || 'UNSIGNED-PAYLOAD',
    ].join('\n');

    const credentialScope = `${date}/${this.region}/${this.service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      timestamp,
      credentialScope,
      this.hash(canonicalRequest),
    ].join('\n');

    const signingKey = this.getSigningKey(date);
    const signature = this.hmac(signingKey, stringToSign).toString('hex');

    const authorizationHeader = [
      `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(', ');

    return {
      ...cleanHeaders,
      Authorization: authorizationHeader,
    };
  }

  private getSigningKey(date: string): Buffer {
    const kDate = this.hmac(`AWS4${this.secretAccessKey}`, date);
    const kRegion = this.hmac(kDate, this.region);
    const kService = this.hmac(kRegion, this.service);
    return this.hmac(kService, 'aws4_request');
  }

  private hmac(key: string | Buffer, data: string): Buffer {
    return createHmac('sha256', key).update(data).digest();
  }

  private hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  private async hashData(
    data: Buffer | string | Uint8Array | ReadableStream | Blob | File
  ): Promise<string> {
    if (data instanceof ReadableStream) {
      return 'UNSIGNED-PAYLOAD'; // For streams, we can't calculate hash upfront
    }

    if (data instanceof Blob || data instanceof File) {
      const buffer = await data.arrayBuffer();
      return this.hash(Buffer.from(buffer).toString());
    }

    if (data instanceof Uint8Array) {
      return this.hash(Buffer.from(data).toString());
    }

    return this.hash(data.toString());
  }

  private async prepareBody(data: Buffer | string | ReadableStream | Blob | File): Promise<any> {
    if (data instanceof ReadableStream || data instanceof Blob || data instanceof File) {
      return data;
    }
    return Buffer.isBuffer(data) ? data : Buffer.from(data);
  }

  private async getContentLength(
    data: Buffer | string | ReadableStream | Blob | File
  ): Promise<number> {
    if (Buffer.isBuffer(data)) {
      return data.length;
    }
    if (typeof data === 'string') {
      return Buffer.byteLength(data);
    }
    if (data instanceof Blob || data instanceof File) {
      return data.size;
    }
    // For streams, we might not know the size upfront
    return 0;
  }

  private formatMetadata(metadata?: Record<string, string>): Record<string, string> {
    if (!metadata) return {};

    const formatted: Record<string, string> = {};
    for (const [key, value] of Object.entries(metadata)) {
      formatted[`x-amz-meta-${key}`] = value;
    }
    return formatted;
  }

  private parseListResponse(xml: string): {
    objects: R2Object[];
    continuationToken?: string;
    isTruncated: boolean;
  } {
    // Simple XML parsing - in production, use a proper XML parser
    const objects: R2Object[] = [];
    const contentMatches = xml.matchAll(/<Contents>[\s\S]*?<\/Contents>/g);

    for (const match of contentMatches) {
      const content = match[0];
      const key = content.match(/<Key>(.*?)<\/Key>/)?.[1] || '';
      const size = parseInt(content.match(/<Size>(.*?)<\/Size>/)?.[1] || '0');
      const etag = content.match(/<ETag>(.*?)<\/ETag>/)?.[1] || '';
      const lastModified = new Date(
        content.match(/<LastModified>(.*?)<\/LastModified>/)?.[1] || ''
      );

      objects.push({ key, size, etag, lastModified });
    }

    const continuationToken = xml.match(
      /<NextContinuationToken>(.*?)<\/NextContinuationToken>/
    )?.[1];
    const isTruncated = xml.match(/<IsTruncated>(.*?)<\/IsTruncated>/)?.[1] === 'true';

    return { objects, continuationToken, isTruncated };
  }

  private async extractUploadId(response: Response): Promise<string> {
    const xml = await response.text();
    const match = xml.match(/<UploadId>(.*?)<\/UploadId>/);
    if (!match) {
      throw new Error('Failed to extract upload ID from response');
    }
    return match[1];
  }
}

/**
 * Optimized batch operations for R2
 */
export class BunR2BatchClient extends BunR2Client {
  /**
   * Upload multiple files in parallel with progress tracking
   */
  async batchUpload(
    files: Array<{ key: string; data: Buffer | string; options?: UploadOptions }>,
    concurrency: number = 5
  ): Promise<Array<{ key: string; success: boolean; error?: string }>> {
    const results: Array<{ key: string; success: boolean; error?: string }> = [];

    // Process in batches
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(file => this.putObject(file.key, file.data, file.options))
      );

      batchResults.forEach((result, index) => {
        const file = batch[index];
        if (result.status === 'fulfilled') {
          results.push({ key: file.key, success: true });
        } else {
          results.push({
            key: file.key,
            success: false,
            error: result.reason?.message || 'Unknown error',
          });
        }
      });

      // Progress callback
      console.log(`Uploaded ${Math.min(i + concurrency, files.length)}/${files.length} files`);
    }

    return results;
  }

  /**
   * Delete multiple objects in batch
   */
  async batchDelete(keys: string[]): Promise<Array<{ key: string; success: boolean }>> {
    const results = await Promise.allSettled(keys.map(key => this.deleteObject(key)));

    return results.map((result, index) => ({
      key: keys[index],
      success: result.status === 'fulfilled',
    }));
  }

  /**
   * Sync local directory with R2 bucket
   */
  async syncDirectory(localPath: string, r2Prefix: string = ''): Promise<void> {
    const { $ } = await import('bun');

    // Get all files in directory
    const files = await $`find ${localPath} -type f`.lines();

    for (const file of files) {
      const relativePath = file.replace(localPath + '/', '');
      const r2Key = r2Prefix ? `${r2Prefix}/${relativePath}` : relativePath;

      // Check if file exists and compare checksums
      const localFile = Bun.file(file);
      const localHash = Bun.hash(await localFile.arrayBuffer());

      const { exists, metadata } = await this.headObject(r2Key);

      if (!exists || metadata?.hash !== localHash.toString()) {
        console.log(`Uploading ${relativePath}...`);
        await this.putObject(r2Key, await localFile.arrayBuffer(), {
          metadata: { hash: localHash.toString() },
        });
      } else {
        console.log(`Skipping ${relativePath} (unchanged)`);
      }
    }
  }
}

// Export singleton instance for convenience
export const r2Client = new BunR2Client({
  endpoint: process.env.R2_ENDPOINT || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  region: process.env.R2_REGION || 'auto',
  bucket: process.env.R2_BUCKET || '',
});

export const r2BatchClient = new BunR2BatchClient({
  endpoint: process.env.R2_ENDPOINT || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  region: process.env.R2_REGION || 'auto',
  bucket: process.env.R2_BUCKET || '',
});
