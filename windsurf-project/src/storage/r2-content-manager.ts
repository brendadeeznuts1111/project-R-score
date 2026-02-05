import config from '../src/config/config-loader';
// src/storage/r2-content-manager.ts - Enhanced with Content-Disposition (§Pattern:123.1)
import { s3, dns, fetch as bunFetch } from "bun";
import { BunR2AppleManager } from "./r2-apple-manager.js";
import { classifyPath } from "../../utils/urlpattern-r2";

export interface ContentDispositionOptions {
  type: 'inline' | 'attachment';
  filename?: string;
  filenameEncoding?: 'utf-8' | 'latin-1';
}

export interface S3UploadResult {
  key: string;
  size: number;
  disposition: string;
  url: string;
  contentType: string;
  cacheControl: string;
}

export interface DownloadLink {
  url: string;
  filename: string;
  expiresAt: Date;
}

export interface FileMetadata {
  path: string;
  size: number;
  contentType?: string;
  contentDisposition?: string;
  compression?: string;
  lastModified?: Date;
  classification?: any;
  customMetadata?: Record<string, string>;
}

export class R2ContentManager {
  private verbose: boolean = false;

  constructor(
    private bucket: string,
    private appleManager?: BunR2AppleManager
  ) {
    // Attempt to prefetch DNS for common S3/R2 patterns if possible
    // Note: In Bun's native S3 client, the endpoint is usually derived
    this.prefetchDNS();
  }

  /**
   * Enable or disable verbose logging for underlying fetch operations
   */
  setVerbose(enabled: boolean): void {
    this.verbose = enabled;
  }

  /**
   * Prefetch DNS and preconnect to the R2 endpoint to speed up initial requests
   */
  private prefetchDNS(): void {
    try {
      // Common R2/S3 endpoint patterns
      const host = `${this.bucket}.r2.cloudflarestorage.com`;
      dns.prefetch(host);
    } catch {
      // Ignore prefetch errors
    }
  }

  /**
   * Explicitly preconnect to the storage endpoint
   */
  preconnect(): void {
    try {
      const host = `https://${this.bucket}.r2.cloudflarestorage.com`;
      // @ts-ignore: Bun specific API
      if (typeof bunFetch.preconnect === 'function') {
        // @ts-ignore
        bunFetch.preconnect(host);
      }
    } catch {
      // Ignore preconnect errors
    }
  }

  // Generate content-disposition header
  static generateContentDisposition(options: ContentDispositionOptions): string {
    const { type, filename, filenameEncoding = 'utf-8' } = options;
    
    if (!filename) {
      return type;
    }
    
    // Encode filename for safe header usage
    const encodedFilename = this.encodeFilename(filename, filenameEncoding);
    
    if (filenameEncoding === 'utf-8') {
      return `${type}; filename*=UTF-8''${encodedFilename}`;
    } else {
      return `${type}; filename="${encodedFilename}"`;
    }
  }

  // Encode filename for safe header usage
  private static encodeFilename(filename: string, encoding: string): string {
    if (encoding === 'utf-8') {
      // RFC 5987 encoding for UTF-8 filenames
      return encodeURIComponent(filename)
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29');
    } else {
      // Simple encoding for latin-1
      return filename.replace(/"/g, '\\"');
    }
  }

  // Upload with content-disposition
  async uploadWithDisposition(
    data: string | Buffer | ReadableStream | Blob,
    path: string,
    options: {
      contentDisposition: ContentDispositionOptions;
      contentType?: string;
      compression?: 'zstd' | 'gzip';
      metadata?: Record<string, string>;
      classify?: boolean;
      timeout?: number; // ms
      signal?: AbortSignal;
      proxy?: string | { url: string; headers?: Record<string, string> };
      headers?: Record<string, string> | Headers;
    }
  ): Promise<{
    success: boolean;
    path: string;
    size: number;
    contentDisposition: string;
    classification?: any;
    uploadTime: number;
  }> {
    const start = Bun.nanoseconds();
    
    // Classify path if requested
    const classification = options.classify ? classifyPath(path) : null;
    
    // Generate content-disposition header
    const contentDisposition = R2ContentManager.generateContentDisposition(
      options.contentDisposition
    );
    
    // Prepare metadata
    const metadata: Record<string, string> = {
      ...options.metadata,
      'x-amz-meta-content-disposition': contentDisposition,
      'x-amz-meta-upload-timestamp': Date.now().toString(),
    };
    
    if (classification) {
      metadata['x-amz-meta-pattern'] = classification.pattern;
      Object.entries(classification.metadata).forEach(([key, value]) => {
        metadata[`x-amz-meta-param-${key}`] = String(value);
      });
    }
    
    // Upload to R2 using Bun's native S3 client
    const file = (s3 as any).file(`${this.bucket}/${path}`);
    
    // Combine timeout signal with custom signal if provided
    let signal = options.signal;
    if (options.timeout) {
      const timeoutSignal = AbortSignal.timeout(options.timeout);
      if (signal) {
        // @ts-ignore: Bun specific signal.any
        signal = (AbortSignal as any).any([signal, timeoutSignal]);
      } else {
        signal = timeoutSignal;
      }
    }

    try {
      // Manual check before starting
      if (signal?.aborted) throw (signal as any).reason;

      // Bun's s3.file.write handles strings, buffers, and Blobs efficiently
      await file.write(data, {
        type: options.contentType || (data instanceof Blob ? data.type : undefined),
        contentDisposition,
        metadata,
        verbose: this.verbose,
        signal,
        proxy: options.proxy,
        headers: options.headers
      } as any);
      
      // Manual check after writing (for large streams)
      if (signal?.aborted) throw (signal as any).reason;
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error(`❌ R2 Upload Failed for ${path}:`, errorMsg);
      
      if (errorMsg.includes('403')) {
        throw new Error(`S3 Permission Denied: Ensure credentials have access to ${this.bucket}`);
      } else if (errorMsg.includes('404')) {
        throw new Error(`Bucket not found: ${this.bucket}`);
      }
      throw error;
    }
    
    const uploadTime = (Bun.nanoseconds() - start) / 1e6;
    
    // Calculate size correctly for all supported types
    let size = 0;
    if (data instanceof Buffer) size = data.length;
    else if (typeof data === 'string') size = new TextEncoder().encode(data).length; // Accurate byte size for strings
    else if (data instanceof Blob) size = data.size;
    else if (data instanceof ReadableStream) size = 0; // Unknown for streams
    
    return {
      success: true,
      path,
      size,
      contentDisposition,
      classification,
      uploadTime
    };
  }

  // Smart upload with auto-detection
  async smartUpload(
    data: any,
    path: string,
    smartOptions: {
      forceDownload?: boolean;
      guessFilename?: boolean;
      preserveOriginal?: boolean;
      classifyPath?: boolean;
    } = {}
  ): Promise<any> {
    const options = this.generateSmartOptions(data, path, smartOptions);
    return this.uploadWithDisposition(data, path, options as any);
  }

  // Generate smart options based on file type and path
  private generateSmartOptions(
    data: any,
    path: string,
    smartOptions: any
  ): any {
    const ext = path.split('.').pop()?.toLowerCase();
    const filename = path.split('/').pop() || 'file';
    
    // Default content type mapping
    const contentTypeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'json': 'application/json',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'html': 'text/html',
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'zip': 'application/zip',
      'gz': 'application/gzip',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg'
    };
    
    // Determine content disposition
    let contentDisposition: ContentDispositionOptions;
    
    if (smartOptions.forceDownload) {
      contentDisposition = {
        type: 'attachment',
        filename: smartOptions.preserveOriginal ? filename : 
                 smartOptions.guessFilename ? this.guessFilename(data, path) : 
                 'download.bin'
      };
    } else {
      // Inline for web-viewable content
      const inlineTypes = ['png', 'jpg', 'jpeg', 'gif', 'pdf', 'html', 'txt'];
      contentDisposition = {
        type: inlineTypes.includes(ext || '') ? 'inline' : 'attachment',
        filename
      };
    }
    
    // Use BunFile's inferred type if available and path doesn't have an extension
    let contentType = contentTypeMap[ext || ''];
    if (!contentType && data && typeof data === 'object' && 'type' in data && data.type) {
      contentType = data.type;
    }

    return {
      contentDisposition,
      contentType: contentType || 'application/octet-stream',
      compression: ext !== 'gz' && ext !== 'zip' ? 'zstd' : undefined,
      classify: smartOptions.classifyPath ?? true,
      metadata: {
        'x-amz-meta-smart-upload': 'true',
        'x-amz-meta-file-extension': ext || 'unknown'
      }
    };
  }

  // Guess filename from data or path
  private guessFilename(data: any, path: string): string {
    // If it's a BunFile, it might have a name property
    if (data && typeof data === 'object' && 'name' in data && data.name) {
      return data.name.split('/').pop() || data.name;
    }

    const ext = path.split('.').pop() || 'bin';
    
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (parsed.name || parsed.filename) {
          return `${parsed.name || parsed.filename}.${ext}`;
        }
      } catch {
        // Not JSON
      }
    }
    
    // Extract from path pattern
    const classified = classifyPath(path);
    if (classified?.metadata?.userId) {
      return `${classified.metadata.userId}.${ext}`;
    }
    
    // Default
    return `download.${ext}`;
  }

  // Get file with content-disposition override
  getFile(
    path: string,
    options: {
      contentDisposition?: ContentDispositionOptions;
      versionId?: string;
    } = {}
  ) {
    const contentDisposition = options.contentDisposition 
      ? R2ContentManager.generateContentDisposition(options.contentDisposition)
      : undefined;
    
    // @ts-ignore: Bun S3 options
    return (s3 as any).file(`${this.bucket}/${path}`, {
      versionId: options.versionId,
      contentDisposition
    });
  }

  // Download file with optional Blob return for browser/stream compatibility
  async downloadFile(
    path: string,
    options: {
      filename?: string;
      forceDownload?: boolean;
      customDisposition?: string;
      asBlob?: boolean;
      timeout?: number; // ms
      signal?: AbortSignal;
      proxy?: string | { url: string; headers?: Record<string, string> };
      headers?: Record<string, string> | Headers;
    } = {}
  ): Promise<{
    data: Blob | Buffer;
    metadata: FileMetadata;
    headers: Record<string, string>;
  }> {
    const file = this.getFile(path, {
      contentDisposition: options.customDisposition ? undefined : {
        type: options.forceDownload ? 'attachment' : 'inline',
        filename: options.filename || path.split('/').pop() || 'file'
      }
    });

    // Combine timeout signal with custom signal if provided
    let signal = options.signal;
    if (options.timeout) {
      const timeoutSignal = AbortSignal.timeout(options.timeout);
      if (signal) {
        // @ts-ignore: Bun specific signal.any
        signal = (AbortSignal as any).any([signal, timeoutSignal]);
      } else {
        signal = timeoutSignal;
      }
    }
    
    if (signal?.aborted) throw (signal as any).reason;

    const metadata = await this.getFileMetadata(path, { signal });
    const contentType = metadata.contentType || 'application/octet-stream';

    if (signal?.aborted) throw (signal as any).reason;
    
    // Generate headers with fallback support
    const r2Headers = await (file as any).headers;
    const headers: Record<string, string> = {
      'content-type': contentType,
      'content-length': metadata.size.toString(),
      'content-disposition': options.customDisposition || 
        (r2Headers ? (r2Headers as any).get('content-disposition') : metadata.contentDisposition) || 'inline'
    };
    
    if (options.asBlob) {
      // Return as Blob for efficient streaming handling or browser use
      // In Bun, we can create a Blob from the arrayBuffer or potentially use the s3 object directly
      const buffer = await (file as any).arrayBuffer({ 
        signal, 
        proxy: options.proxy,
        headers: options.headers
      });
      return {
        data: new Blob([buffer], { type: contentType }),
        metadata,
        headers
      };
    }

    const data = await (file as any).arrayBuffer({ 
      signal, 
      proxy: options.proxy,
      headers: options.headers
    });
    return {
      data: Buffer.from(data),
      metadata,
      headers
    };
  }

  // Get file metadata with optional timeout support
  async getFileMetadata(
    path: string,
    options: { signal?: AbortSignal } = {}
  ): Promise<FileMetadata> {
    const file = (s3 as any).file(`${this.bucket}/${path}`);
    // In Bun S3, exists() returns a boolean or stats-like object depending on version
    const exists = await (file as any).exists({ signal: options.signal });
    
    if (!exists) {
      throw new Error(`File not found: ${path}`);
    }
    
    // Bun's s3.file headers might need to be refreshed or could be null if not found
    const r2Headers = await (file as any).headers;
    if (!r2Headers) {
      // Return basic metadata if headers aren't available but file exists
      return {
        path,
        size: 0,
        lastModified: new Date(),
        classification: classifyPath(path)
      };
    }

    const classification = classifyPath(path);
    
    return {
      path,
      size: Number((r2Headers as any).get('content-length')) || 0,
      contentType: (r2Headers as any).get('content-type') || undefined,
      contentDisposition: (r2Headers as any).get('content-disposition') || undefined,
      compression: (r2Headers as any).get('x-amz-meta-compression') || undefined,
      lastModified: new Date((r2Headers as any).get('last-modified') || Date.now()),
      classification,
      customMetadata: this.extractCustomMetadata(r2Headers as any)
    };
  }

  // Extract custom metadata from headers
  private extractCustomMetadata(headers: Headers): Record<string, string> {
    const metadata: Record<string, string> = {};
    
    headers.forEach((value, key) => {
      if (key.startsWith('x-amz-meta-')) {
        const cleanKey = key.replace('x-amz-meta-', '');
        metadata[cleanKey] = value;
      }
    });
    
    return metadata;
  }

  // Bulk update content-disposition for existing files
  async bulkUpdateContentDisposition(
    pattern: string,
    contentDisposition: ContentDispositionOptions,
    options: {
      dryRun?: boolean;
      batchSize?: number;
      filter?: (path: string) => boolean;
    } = {}
  ): Promise<{
    updated: number;
    failed: number;
    results: Array<{ path: string; success: boolean; error?: string }>;
  }> {
    console.log(`🔄 Bulk updating content-disposition for pattern: ${pattern}`);
    
    // List files
    const filesRes = await (s3 as any).list(this.bucket, { prefix: pattern.split('*')[0] });
    const files = Array.isArray(filesRes) ? filesRes : [];
    const filteredFiles = options.filter 
      ? files.filter((f: any) => options.filter!(f.key))
      : files;
    
    const results: any[] = [];
    const batchSize = options.batchSize || 50;
    
    for (let i = 0; i < filteredFiles.length; i += batchSize) {
      const batch = filteredFiles.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (file: any) => {
          try {
            if (options.dryRun) {
              return { path: file.key, success: true, dryRun: true };
            }
            
            // Copy object with new metadata - using write as workaround if copy is missing in native S3
            const newDisposition = R2ContentManager.generateContentDisposition(contentDisposition);
            const sourceFile = (s3 as any).file(`${this.bucket}/${file.key}`);
            const targetFile = (s3 as any).file(`${this.bucket}/${file.key}`);
            
            // Note: Native atomic metadata update usually requires CopyObject
            if (typeof (s3 as any).copy === 'function') {
              await (s3 as any).copy(
                this.bucket,
                file.key,
                this.bucket,
                file.key,
                {
                  metadataDirective: 'REPLACE',
                  metadata: {
                    'x-amz-meta-content-disposition': newDisposition,
                    'x-amz-meta-updated-at': Date.now().toString()
                  }
                }
              );
            } else {
              // Workaround: Read and write back with new metadata
              const data = await (sourceFile as any).arrayBuffer();
              await (targetFile as any).write(data, {
                contentDisposition: newDisposition,
                metadata: {
                  'x-amz-meta-updated-at': Date.now().toString()
                }
              } as any);
            }
            
            return { path: file.key, success: true };
          } catch (error: any) {
            return { 
              path: file.key, 
              success: false, 
              error: error.message 
            };
          }
        })
      );
      
      results.push(...batchResults.map(r => 
        r.status === 'fulfilled' ? r.value : {
          path: 'unknown',
          success: false,
          error: 'Promise rejected'
        }
      ));
      
      console.log(`📦 Processed ${Math.min(i + batchSize, filteredFiles.length)}/${filteredFiles.length} files`);
    }
    
    const updated = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    return { updated, failed, results };
  }

  // Serve file via HTTP with proper headers using Blob streaming support
  async serveFile(
    path: string,
    request: Request,
    options: {
      cacheControl?: string;
      etag?: boolean;
      rangeSupport?: boolean;
    } = {}
  ): Promise<Response> {
    const file = this.getFile(path);
    const metadata = await this.getFileMetadata(path);
    
    // Check if file exists
    if (!(await (file as any).exists())) {
      return new Response('File not found', { status: 404 });
    }
    
    // Handle range requests
    if (options.rangeSupport && request.headers.has('range')) {
      return this.handleRangeRequest(file, request, metadata);
    }
    
    // Generate response using Blob-standard streaming
    const data = (file as any).stream();
    const headers = new Headers({
      'content-type': metadata.contentType || 'application/octet-stream',
      'content-length': metadata.size.toString(),
      'content-disposition': metadata.contentDisposition || 'inline',
      'cache-control': options.cacheControl || 'public, max-age=3600',
      'x-amz-meta-pattern': metadata.classification?.pattern || 'none',
      'x-content-type-options': 'nosniff'
    });
    
    if (options.etag) {
      // For streaming, we use the ETag from metadata
      if (metadata.customMetadata?.etag) {
        headers.set('etag', metadata.customMetadata.etag);
      }
    }
    
    return new Response(data, { headers });
  }

  // Handle range requests for large files
  private async handleRangeRequest(
    file: any,
    request: Request,
    metadata: FileMetadata
  ): Promise<Response> {
    const range = request.headers.get('range');
    if (!range) {
      return new Response('Range header required', { status: 400 });
    }
    
    const [unit, ranges] = range.split('=');
    if (unit !== 'bytes' || !ranges) {
      return new Response('Only byte ranges are supported', { status: 416 });
    }
    
    const [startStr, endStr] = ranges.split('-');
    const start = parseInt(startStr || '0', 10);
    const end = endStr ? parseInt(endStr, 10) : metadata.size - 1;
    
    if (isNaN(start) || isNaN(end) || start > end || end >= metadata.size) {
      return new Response('Invalid range', { status: 416 });
    }
    
    const length = end - start + 1;
    const data = await file.slice(start, end + 1);
    
    const headers = new Headers({
      'content-type': metadata.contentType || 'application/octet-stream',
      'content-range': `bytes ${start}-${end}/${metadata.size}`,
      'content-length': length.toString(),
      'accept-ranges': 'bytes',
      'content-disposition': metadata.contentDisposition || 'inline'
    });
    
    return new Response(data, { 
      status: 206, // Partial Content
      headers 
    });
  }

  // Generate ETag for file
  private async generateETag(data: ArrayBuffer): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `"${hashHex}"`;
  }

  /**
   * Create a Blob from a local file efficiently using Bun.file()
   * This is useful for passing to uploadWithDisposition or smartUpload
   */
  static createBlobFromFile(filePath: string): Blob {
    return Bun.file(filePath);
  }

  /**
   * Create a temporary Blob URL in Bun (similar to browser's URL.createObjectURL)
   * Note: This is primarily for browser compatibility or specific Bun fetch scenarios.
   */
  static createBlobUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  /**
   * Revoke a temporary Blob URL
   */
  static revokeBlobUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  // Generate download link with expiration
  async generateDownloadLink(
    path: string,
    options: {
      expiresIn?: number; // seconds
      filename?: string;
      forceDownload?: boolean;
      contentType?: string;
    } = {}
  ): Promise<string> {
    const expiresIn = options.expiresIn || 3600; // 1 hour default
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
    
    const contentDisposition = R2ContentManager.generateContentDisposition({
      type: options.forceDownload ? 'attachment' : 'inline',
      filename: options.filename || path.split('/').pop() || 'file'
    });
    
    // In a real implementation, you'd sign this URL with R2's presigned URL feature
    // This is a simplified version
    const params = new URLSearchParams({
      path,
      expires: expiresAt.toString(),
      disposition: encodeURIComponent(contentDisposition),
      cache: 'true'
    });
    
    if (options.contentType) {
      params.append('contentType', options.contentType);
    }
    
    return `/download?${params.toString()}`;
  }

  /**
   * Smart content disposition based on file extension (§Pattern:123.1)
   */
  async deployAsset(localPath: string, r2Key: string): Promise<S3UploadResult> {
    const file = Bun.file(localPath);
    const ext = r2Key.split('.').pop()?.toLowerCase() || '';
    
    // Determine disposition automatically
    const disposition = this.getSmartDisposition(ext, r2Key);
    const contentType = file.type || this.getContentType(ext);
    const cacheControl = this.getCacheControl(ext);
    
    const s3file = s3.file(`${this.bucket}/${r2Key}`, { 
      contentDisposition: disposition
    });
    await s3file.write(file);

    return {
      key: r2Key,
      size: file.size,
      disposition,
      url: `https://dashboards.empire-pro.com/${r2Key}`,
      contentType,
      cacheControl
    };
  }

  /**
   * Get smart content disposition based on file extension
   */
  private getSmartDisposition(extension: string, r2Key: string): string {
    // INLINE: Browser-renderable assets
    const inlineTypes = ['html', 'css', 'js', 'jpg', 'jpeg', 'png', 'svg', 'webp', 'gif', 'ico'];
    if (inlineTypes.includes(extension)) {
      return 'inline';
    }
    
    // ATTACHMENT: Downloads
    const attachmentTypes = ['json', 'csv', 'pdf', 'zip', 'txt', 'xml', 'log', 'dat'];
    if (attachmentTypes.includes(extension)) {
      const filename = r2Key.split('/').pop() || `file.${extension}`;
      return `attachment; filename="${filename}"`;
    }
    
    // Default: inline for unknown types
    return 'inline';
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(ext: string): string {
    const types: Record<string, string> = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'csv': 'text/csv',
      'pdf': 'application/pdf',
      'zip': 'application/zip',
      'txt': 'text/plain',
      'xml': 'application/xml',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'gif': 'image/gif',
      'ico': 'image/x-icon'
    };
    return types[ext] || 'application/octet-stream';
  }

  /**
   * Get cache control based on file type
   */
  private getCacheControl(ext: string): string {
    // Long cache for static assets
    if (['css', 'js', 'jpg', 'jpeg', 'png', 'svg', 'webp', 'gif', 'ico'].includes(ext)) {
      return 'public, max-age=31536000'; // 1 year
    }
    
    // No cache for dynamic content
    if (['json', 'html'].includes(ext)) {
      return 'public, max-age=300'; // 5 minutes
    }
    
    return 'public, max-age=86400'; // 1 day default
  }

  /**
   * Create downloadable report with dynamic filename
   */
  async createReport(data: any, reportType: 'json' | 'csv' | 'pdf'): Promise<DownloadLink> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `report-${timestamp}.${reportType}`;
    const key = `reports/${filename}`;
    
    // Serialize based on type
    let content: string;
    let contentType: string;
    
    switch (reportType) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        contentType = 'application/json';
        break;
      case 'csv':
        content = this.toCSV(data);
        contentType = 'text/csv';
        break;
      case 'pdf':
        // For PDF, you'd typically use a PDF library
        content = JSON.stringify(data); // Placeholder
        contentType = 'application/pdf';
        break;
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
    
    const s3file = s3.file(`${this.bucket}/${key}`, { 
      contentDisposition: `attachment; filename="${filename}"`
    });
    await s3file.write(new TextEncoder().encode(content));

    return {
      url: `https://dashboards.empire-pro.com/${key}`,
      filename,
      expiresAt: new Date(Date.now() + 86400000) // 24 hours
    };
  }

  /**
   * Convert data to CSV format
   */
  private toCSV(data: any[]): string {
    if (!Array.isArray(data) || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma or quote
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Bulk deploy assets with smart disposition
   */
  async bulkDeployAssets(assets: Array<{ localPath: string; r2Key: string }>): Promise<S3UploadResult[]> {
    const results: S3UploadResult[] = [];
    
    for (const asset of assets) {
      try {
        const result = await this.deployAsset(asset.localPath, asset.r2Key);
        results.push(result);
        console.log(`✅ ${asset.localPath} → ${result.disposition}`);
      } catch (error: any) {
        console.error(`❌ Failed to deploy ${asset.localPath}: ${error.message}`);
        // Continue with other assets
      }
    }
    
    return results;
  }
}

// Integration with existing BunR2AppleManager
export class EnhancedR2AppleManager extends BunR2AppleManager {
  private contentManager: R2ContentManager;

  constructor(config: any, bucket: string) {
    super(config, bucket);
    this.contentManager = new R2ContentManager(bucket, this);
  }

  // Override uploadAppleID with content-disposition support
  override async uploadAppleID(
    data: any,
    path: string,
    options: {
      compression?: boolean;
      contentDisposition?: ContentDispositionOptions;
      forceDownload?: boolean;
    } = {}
  ) {
    if (options.contentDisposition || options.forceDownload) {
      // Use content manager for enhanced features
      return (this.contentManager as any).uploadWithDisposition(
        JSON.stringify(data),
        path,
        {
          contentDisposition: options.contentDisposition || {
            type: options.forceDownload ? 'attachment' : 'inline',
            filename: `${data.email || 'apple-id'}.json`
          },
          contentType: 'application/json',
          compression: options.compression ? 'zstd' : undefined,
          classify: true,
          metadata: {
            'x-amz-meta-source': 'apple-manager',
            'x-amz-meta-upload-method': 'enhanced'
          }
        }
      );
    } else {
      // Fall back to original method
      return super.uploadAppleID(data, path);
    }
  }

  // New method: Upload screenshot with smart content-disposition
  async uploadScreenshotWithDisposition(
    screenshot: Buffer,
    path: string,
    options: {
      forceDownload?: boolean;
      customFilename?: string;
    } = {}
  ) {
    return this.contentManager.uploadWithDisposition(
      screenshot,
      path,
      {
        contentDisposition: {
          type: options.forceDownload ? 'attachment' : 'inline',
          filename: options.customFilename || path.split('/').pop() || 'screenshot.png'
        },
        contentType: 'image/png',
        classify: true,
        metadata: {
          'x-amz-meta-type': 'screenshot',
          'x-amz-meta-origin': 'apple-registration'
        }
      }
    );
  }

  // Generate download link for Apple ID data
  async getAppleIDDownloadLink(
    userId: string,
    options: {
      expiresIn?: number;
      forceDownload?: boolean;
    } = {}
  ): Promise<string> {
    const path = `apple-ids/${userId}.json`;
    return this.contentManager.generateDownloadLink(path, {
      expiresIn: options.expiresIn,
      filename: `apple-id-${userId}.json`,
      forceDownload: options.forceDownload,
      contentType: 'application/json'
    });
  }

  // Bulk update all Apple ID files to force download
  async bulkForceDownloadAppleIDs(options: {
    dryRun?: boolean;
    batchSize?: number;
  } = {}) {
    return this.contentManager.bulkUpdateContentDisposition(
      'apple-ids/*',
      {
        type: 'attachment',
        filename: 'apple-id.json'
      },
      options
    );
  }
}

// Utility functions
export function createContentDisposition(
  type: 'inline' | 'attachment',
  filename?: string
): string {
  return R2ContentManager.generateContentDisposition({ type, filename });
}

export function parseContentDisposition(header: string): {
  type: 'inline' | 'attachment';
  filename?: string;
  params: Record<string, string>;
} {
  const parts = header.split(';').map(p => p.trim());
  const type = parts[0] as 'inline' | 'attachment';
  const params: Record<string, string> = {};
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    const split = part.split('=');
    const key = split[0];
    const value = split[1];
    if (key && value) {
      params[key] = value.replace(/"/g, '');
    }
  }
  
  return {
    type,
    filename: params.filename || params['filename*']?.split("''")[1],
    params
  };
}

// Example usage
if (import.meta.main) {
  const { config } = await import('dotenv');
  config({ path: './.env' });
  
  const manager = new EnhancedR2AppleManager({}, config.getEndpoint('storage').r2.bucket!);
  
  // Example 1: Upload with forced download
  console.log('📤 Example 1: Uploading Apple ID with forced download');
  await (manager as any).uploadAppleID(
    { email: 'user@example.com', id: '123' },
    'apple-ids/user123.json',
    {
      forceDownload: true,
      compression: true
    }
  );
  
  // Example 2: Generate download link
  console.log('🔗 Example 2: Generating download link');
  const link = await manager.getAppleIDDownloadLink('user123', {
    expiresIn: 7200, // 2 hours
    forceDownload: true
  });
  console.log('Download link:', link);
  
  // Example 3: Smart upload with auto-detection
  console.log('🤖 Example 3: Smart upload');
  const contentManager = new R2ContentManager(config.getEndpoint('storage').r2.bucket!);
  await contentManager.smartUpload(
    JSON.stringify({ test: 'data' }),
    'reports/test.json',
    {
      forceDownload: false,
      guessFilename: true
    }
  );
  
  // Example 4: Bulk update content-disposition
  console.log('🔄 Example 4: Bulk updating content-disposition');
  const result = await contentManager.bulkUpdateContentDisposition(
    'apple-ids/*.json',
    { type: 'attachment', filename: 'apple-id.json' },
    { dryRun: true, batchSize: 10 }
  );
  
  if (result) {
    console.log(`✅ Would update ${result.updated} files, ${result.failed} failed`);
  }
}
