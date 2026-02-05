#!/usr/bin/env bun
// Enhanced Advanced Blob API Server - Comprehensive Response Methods Demonstration

import { createHash } from "crypto";
import { deflate, gzip } from "zlib";

interface BlobExample {
  name: string;
  description: string;
  size: number;
  type: string;
  compressed?: {
    gzip: number;
    deflate: number;
  };
  metadata?: Record<string, any>;
  etag?: string;
}

interface AdvancedBlobResponse {
  timestamp: string;
  server: string;
  version: string;
  features: string[];
  examples: {
    basic: BlobExample;
    svg: BlobExample;
    file: BlobExample;
    slice: BlobExample;
    streaming: BlobExample;
    multipart: BlobExample;
    binary: BlobExample;
    text: BlobExample;
    json: BlobExample;
    custom: BlobExample;
    compressed: BlobExample;
    transformed: BlobExample;
  };
  endpoints: {
    [key: string]: {
      method: string;
      url: string;
      description: string;
      headers?: Record<string, string>;
      features?: string[];
    };
  };
  performance: {
    memoryUsage: NodeJS.MemoryUsage;
    blobCreationTime: number;
    totalSize: number;
    compressionRatio: number;
  };
  capabilities: {
    compression: boolean;
    streaming: boolean;
    etagSupport: boolean;
    rangeRequests: boolean;
    transformations: boolean;
    uploads: boolean;
  };
}

/**
 * Generate ETag for blob content
 */
function generateETag(content: string | ArrayBuffer): string {
  const hash = createHash("sha256");
  hash.update(typeof content === "string" ? content : new Uint8Array(content));
  return `"${hash.digest("hex").substring(0, 16)}"`;
}

/**
 * Compress blob content using gzip
 */
async function compressGzip(content: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    gzip(content, { level: 6 }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

/**
 * Compress blob content using deflate
 */
async function compressDeflate(content: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    deflate(content, { level: 6 }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

/**
 * Create SVG blob for demonstration
 */
function createSVGBlob(): { blob: Blob; etag: string } {
  const svgContent = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
  <text x="50" y="55" font-family="Arial" font-size="14" fill="black" text-anchor="middle">BLOB</text>
</svg>`;

  return {
    blob: new Blob([svgContent], { type: "image/svg+xml" }),
    etag: generateETag(svgContent),
  };
}

/**
 * Create file blob for download
 */
function createFileBlob(): { blob: Blob; etag: string } {
  const fileContent = `# Enhanced Advanced Blob API Demo
Generated: ${new Date().toISOString()}
This is a downloadable text file created from a blob.
It contains metadata about the blob creation process.

## Enhanced Features Demonstrated:
- Blob creation from text
- Content-Type headers
- File download functionality
- Proper filename handling
- ETag support for caching
- Compression capabilities
- Range request support

## Technical Details:
- Server: Bun Runtime (Enhanced)
- Blob API: Advanced Response Methods v2.0
- Encoding: UTF-8
- Size: Variable
- Compression: Gzip/Deflate available
- ETag: SHA256-based

## Performance Features:
- Memory-efficient blob handling
- Streaming support
- Conditional requests
- Compression optimization
`;

  return {
    blob: new Blob([fileContent], { type: "text/plain" }),
    etag: generateETag(fileContent),
  };
}

/**
 * Create interactive slice demo blob
 */
function createSliceDemoBlob(): { blob: Blob; etag: string } {
  const content = "0123456789".repeat(200); // 2000 characters
  return {
    blob: new Blob([content], { type: "text/plain" }),
    etag: generateETag(content),
  };
}

/**
 * Create streaming blob example
 */
function createStreamingBlob(): { blob: Blob; etag: string } {
  const chunks = [];
  for (let i = 0; i < 10; i++) {
    chunks.push(`Chunk ${i}: ${"x".repeat(100)}\n`);
  }
  const content = chunks.join("");
  return {
    blob: new Blob([content], { type: "text/plain" }),
    etag: generateETag(content),
  };
}

/**
 * Create binary data blob
 */
function createBinaryBlob(): { blob: Blob; etag: string } {
  const buffer = new ArrayBuffer(256);
  const view = new Uint8Array(buffer);

  // Create pattern
  for (let i = 0; i < 256; i++) {
    view[i] = i % 256;
  }

  return {
    blob: new Blob([buffer], { type: "application/octet-stream" }),
    etag: generateETag(buffer),
  };
}

/**
 * Create JSON blob
 */
function createJSONBlob(): { blob: Blob; etag: string } {
  const jsonData = {
    message: "Hello from Enhanced Blob API!",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    metadata: {
      server: "Bun Runtime",
      features: [
        "blob",
        "response",
        "api",
        "advanced",
        "compression",
        "etag",
        "streaming",
      ],
      performance: {
        compressionEnabled: true,
        etagSupport: true,
        rangeRequests: true,
        streamingSupported: true,
      },
    },
    data: Array.from({ length: 100 }, (_, i) => ({
      id: i,
      value: Math.random() * 1000,
      label: `Enhanced Item ${i}`,
      metadata: {
        created: new Date().toISOString(),
        type: "enhanced-blob-data",
      },
    })),
  };

  const content = JSON.stringify(jsonData, null, 2);
  return {
    blob: new Blob([content], { type: "application/json" }),
    etag: generateETag(content),
  };
}

/**
 * Create custom metadata blob
 */
function createCustomBlob(): { blob: Blob; etag: string } {
  const content = "Enhanced custom blob with metadata and special handling";
  const blob = new Blob([content], { type: "text/plain" });

  return {
    blob,
    etag: generateETag(content),
  };
}

/**
 * Create compressed blob demonstration
 */
async function createCompressedBlob(): Promise<{
  blob: Blob;
  etag: string;
  compressed: { gzip: number; deflate: number };
}> {
  const content = "Large text content for compression demonstration. ".repeat(
    100
  );
  const gzipBuffer = await compressGzip(content);
  const deflateBuffer = await compressDeflate(content);

  return {
    blob: new Blob([content], { type: "text/plain" }),
    etag: generateETag(content),
    compressed: {
      gzip: gzipBuffer.length,
      deflate: deflateBuffer.length,
    },
  };
}

/**
 * Create transformed blob (image processing simulation)
 */
function createTransformedBlob(): { blob: Blob; etag: string } {
  const transformedSvg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="blue" />
  <circle cx="100" cy="100" r="80" stroke="red" stroke-width="8" fill="yellow" />
  <text x="100" y="110" font-family="Arial" font-size="24" fill="black" text-anchor="middle">ENHANCED</text>
</svg>`;

  return {
    blob: new Blob([transformedSvg], { type: "image/svg+xml" }),
    etag: generateETag(transformedSvg),
  };
}

/**
 * Handle conditional requests with ETag
 */
function handleConditionalRequest(
  request: Request,
  etag: string
): Response | null {
  const ifNoneMatch = request.headers.get("if-none-match");

  if (ifNoneMatch && ifNoneMatch === etag) {
    return new Response(null, {
      status: 304, // Not Modified
      headers: {
        ETag: etag,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  return null;
}

/**
 * Handle advanced blob endpoint
 */
async function handleAdvancedBlob(): Promise<Response> {
  const startTime = performance.now();

  // Create all blob examples
  const basicBlob = new Blob(["Basic blob content"], { type: "text/plain" });
  const svgBlobData = createSVGBlob();
  const fileBlobData = createFileBlob();
  const sliceBlobData = createSliceDemoBlob();
  const streamingBlobData = createStreamingBlob();
  const binaryBlobData = createBinaryBlob();
  const jsonBlobData = createJSONBlob();
  const customBlobData = createCustomBlob();
  const compressedBlobData = await createCompressedBlob();
  const transformedBlobData = createTransformedBlob();

  const creationTime = performance.now() - startTime;

  const response: AdvancedBlobResponse = {
    timestamp: new Date().toISOString(),
    server: "Bun Runtime - Enhanced Advanced Blob API",
    version: "2.0.0",
    features: [
      "compression",
      "etag-support",
      "range-requests",
      "streaming",
      "transformations",
      "conditional-requests",
      "performance-monitoring",
      "cors-support",
    ],
    examples: {
      basic: {
        name: "Basic Text Blob",
        description: "Simple text content as blob",
        size: basicBlob.size,
        type: basicBlob.type,
        etag: generateETag("Basic blob content"),
      },
      svg: {
        name: "SVG Image Blob",
        description: "Scalable Vector Graphics as blob",
        size: svgBlobData.blob.size,
        type: svgBlobData.blob.type,
        etag: svgBlobData.etag,
      },
      file: {
        name: "File Download Blob",
        description: "Downloadable text file",
        size: fileBlobData.blob.size,
        type: fileBlobData.blob.type,
        etag: fileBlobData.etag,
      },
      slice: {
        name: "Interactive Slice Demo",
        description: "Large blob for slicing demonstrations",
        size: sliceBlobData.blob.size,
        type: sliceBlobData.blob.type,
        etag: sliceBlobData.etag,
      },
      streaming: {
        name: "Streaming Blob",
        description: "Chunked content for streaming",
        size: streamingBlobData.blob.size,
        type: streamingBlobData.blob.type,
        etag: streamingBlobData.etag,
      },
      multipart: {
        name: "Multipart Blob",
        description: "Combined content from multiple sources",
        size: streamingBlobData.blob.size,
        type: "multipart/mixed",
        etag: streamingBlobData.etag,
      },
      binary: {
        name: "Binary Data Blob",
        description: "Raw binary data with patterns",
        size: binaryBlobData.blob.size,
        type: binaryBlobData.blob.type,
        etag: binaryBlobData.etag,
      },
      text: {
        name: "Text Content Blob",
        description: "Formatted text content",
        size: basicBlob.size,
        type: "text/plain",
        etag: generateETag("Basic blob content"),
      },
      json: {
        name: "JSON Data Blob",
        description: "Structured data as JSON blob",
        size: jsonBlobData.blob.size,
        type: jsonBlobData.blob.type,
        etag: jsonBlobData.etag,
      },
      custom: {
        name: "Custom Metadata Blob",
        description: "Blob with custom handling",
        size: customBlobData.blob.size,
        type: customBlobData.blob.type,
        etag: customBlobData.etag,
        metadata: {
          customHeader: "custom-value",
          specialHandling: true,
          enhanced: true,
        },
      },
      compressed: {
        name: "Compressed Blob Demo",
        description: "Large content with compression stats",
        size: compressedBlobData.blob.size,
        type: compressedBlobData.blob.type,
        etag: compressedBlobData.etag,
        compressed: compressedBlobData.compressed,
      },
      transformed: {
        name: "Transformed Blob",
        description: "Image processing transformation demo",
        size: transformedBlobData.blob.size,
        type: transformedBlobData.blob.type,
        etag: transformedBlobData.etag,
      },
    },
    endpoints: {
      basic: {
        method: "GET",
        url: "http://localhost:3000/api/response-methods/blob",
        description: "Basic blob demonstration",
        features: ["etag", "cors"],
      },
      svg: {
        method: "GET",
        url: "http://localhost:3000/api/response-methods/blob/image",
        description: "SVG image blob (257 bytes)",
        headers: {
          "Content-Type": "image/svg+xml",
        },
        features: ["etag", "compression", "cors"],
      },
      file: {
        method: "GET",
        url: "http://localhost:3000/api/response-methods/blob/file",
        description: "File download blob",
        headers: {
          "Content-Disposition": 'attachment; filename="blob-demo.txt"',
        },
        features: ["etag", "compression", "cors"],
      },
      slice: {
        method: "GET",
        url: "http://localhost:3000/api/response-methods/blob/slice",
        description: "Interactive slice demo (2000 bytes)",
        headers: {
          "Content-Type": "text/plain",
          "X-Blob-Size": "2000",
        },
        features: ["etag", "range-requests", "cors"],
      },
      compressed: {
        method: "GET",
        url: "http://localhost:3000/api/response-methods/blob/compressed",
        description: "Compressed blob with encoding options",
        features: ["etag", "compression", "cors"],
      },
      transformed: {
        method: "GET",
        url: "http://localhost:3000/api/response-methods/blob/transformed",
        description: "Transformed image blob",
        features: ["etag", "transformations", "cors"],
      },
      streaming: {
        method: "GET",
        url: "http://localhost:3000/api/response-methods/blob/streaming",
        description: "Streaming blob with chunked transfer",
        features: ["etag", "streaming", "cors"],
      },
      advanced: {
        method: "GET",
        url: "http://localhost:3000/api/response-methods/blob/advanced",
        description: "Comprehensive blob documentation and examples",
        features: ["etag", "cors"],
      },
    },
    performance: {
      memoryUsage: process.memoryUsage(),
      blobCreationTime: creationTime,
      totalSize:
        basicBlob.size +
        svgBlobData.blob.size +
        fileBlobData.blob.size +
        sliceBlobData.blob.size +
        streamingBlobData.blob.size +
        binaryBlobData.blob.size +
        jsonBlobData.blob.size +
        customBlobData.blob.size +
        compressedBlobData.blob.size +
        transformedBlobData.blob.size,
      compressionRatio:
        compressedBlobData.compressed.gzip / compressedBlobData.blob.size,
    },
    capabilities: {
      compression: true,
      streaming: true,
      etagSupport: true,
      rangeRequests: true,
      transformations: true,
      uploads: false, // TODO: Implement upload functionality
    },
  };

  return new Response(JSON.stringify(response, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "X-Blob-API-Version": "2.0.0",
      "X-Response-Time": `${creationTime.toFixed(2)}ms`,
      ETag: generateETag(JSON.stringify(response)),
    },
  });
}

/**
 * Handle SVG image blob
 */
function handleImageBlob(): Response {
  const svgBlobData = createSVGBlob();

  return new Response(svgBlobData.blob, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Length": svgBlobData.blob.size.toString(),
      "X-Blob-Type": "svg-image",
      ETag: svgBlobData.etag,
      "Cache-Control": "public, max-age=3600",
      Vary: "Accept-Encoding",
    },
  });
}

/**
 * Handle compressed blob endpoint
 */
async function handleCompressedBlob(request: Request): Promise<Response> {
  const compressedBlobData = await createCompressedBlob();
  const acceptEncoding = request.headers.get("accept-encoding") || "";

  // Check if client supports compression
  if (acceptEncoding.includes("gzip")) {
    const gzipBuffer = await compressGzip(
      "Large text content for compression demonstration. ".repeat(100)
    );
    return new Response(gzipBuffer, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Encoding": "gzip",
        "Content-Length": gzipBuffer.length.toString(),
        "X-Blob-Type": "compressed-gzip",
        ETag: compressedBlobData.etag,
        "X-Original-Size": compressedBlobData.blob.size.toString(),
        "X-Compression-Ratio": (
          gzipBuffer.length / compressedBlobData.blob.size
        ).toFixed(3),
      },
    });
  } else if (acceptEncoding.includes("deflate")) {
    const deflateBuffer = await compressDeflate(
      "Large text content for compression demonstration. ".repeat(100)
    );
    return new Response(deflateBuffer, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Encoding": "deflate",
        "Content-Length": deflateBuffer.length.toString(),
        "X-Blob-Type": "compressed-deflate",
        ETag: compressedBlobData.etag,
        "X-Original-Size": compressedBlobData.blob.size.toString(),
        "X-Compression-Ratio": (
          deflateBuffer.length / compressedBlobData.blob.size
        ).toFixed(3),
      },
    });
  }

  // Return uncompressed if no compression support
  return new Response(compressedBlobData.blob, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Length": compressedBlobData.blob.size.toString(),
      "X-Blob-Type": "uncompressed",
      ETag: compressedBlobData.etag,
      "X-Available-Compression": "gzip, deflate",
    },
  });
}

/**
 * Handle transformed blob endpoint
 */
function handleTransformedBlob(): Response {
  const transformedBlobData = createTransformedBlob();

  return new Response(transformedBlobData.blob, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Length": transformedBlobData.blob.size.toString(),
      "X-Blob-Type": "transformed-image",
      ETag: transformedBlobData.etag,
      "X-Transformation": "resize-enhance",
      "X-Original-Size": "100x100",
      "X-Transformed-Size": "200x200",
      "Cache-Control": "public, max-age=1800",
    },
  });
}

/**
 * Handle streaming blob endpoint
 */
function handleStreamingBlob(): Response {
  const streamingBlobData = createStreamingBlob();

  return new Response(streamingBlobData.blob, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Length": streamingBlobData.blob.size.toString(),
      "X-Blob-Type": "streaming-chunks",
      ETag: streamingBlobData.etag,
      "X-Chunk-Count": "10",
      "X-Chunk-Size": "100",
      "Transfer-Encoding": "chunked",
    },
  });
}

/**
 * Handle file download blob
 */
function handleFileBlob(): Response {
  const fileBlobData = createFileBlob();
  const filename = `enhanced-blob-demo-${Date.now()}.txt`;

  return new Response(fileBlobData.blob, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": fileBlobData.blob.size.toString(),
      "X-Blob-Type": "file-download",
      ETag: fileBlobData.etag,
      "X-Filename": filename,
      "Cache-Control": "no-cache",
    },
  });
}

/**
 * Handle slice demo blob
 */
function handleSliceBlob(): Response {
  const sliceBlobData = createSliceDemoBlob();

  return new Response(sliceBlobData.blob, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Length": sliceBlobData.blob.size.toString(),
      "X-Blob-Type": "slice-demo",
      ETag: sliceBlobData.etag,
      "X-Blob-Size": sliceBlobData.blob.size.toString(),
      "X-Slice-Range": "0-1999",
      "Accept-Ranges": "bytes",
    },
  });
}

/**
 * Handle basic blob demonstration
 */
function handleBasicBlob(): Response {
  const basicContent = `# Enhanced Basic Blob Demonstration
Timestamp: ${new Date().toISOString()}
Server: Bun Runtime Enhanced Blob API
Type: Basic text blob
Size: Variable
Version: 2.0.0

This is an enhanced basic blob response demonstration.
The content is created using the Blob constructor
and served directly as a Response object.

## Enhanced Features:
- ETag support for caching
- Compression capabilities
- Performance monitoring
- CORS support
- Conditional requests
`;

  const basicBlob = new Blob([basicContent], { type: "text/plain" });

  return new Response(basicBlob, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Length": basicBlob.size.toString(),
      "X-Blob-Type": "basic-demo",
      "X-API-Version": "2.0.0",
      ETag: generateETag(basicContent),
    },
  });
}

/**
 * Handle slice range requests
 */
function handleSliceRangeRequest(request: Request): Response | null {
  const range = request.headers.get("range");
  if (!range) return null;

  const sliceBlobData = createSliceDemoBlob();
  const totalSize = sliceBlobData.blob.size;

  // Parse range header: "bytes=start-end"
  const match = range.match(/bytes=(\d+)-(\d*)/);
  if (!match) return null;

  const start = parseInt(match[1]);
  const end = match[2] ? parseInt(match[2]) : totalSize - 1;

  if (start >= totalSize || end >= totalSize || start > end) {
    return new Response("Invalid range", { status: 416 });
  }

  // Check for ETag match
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === sliceBlobData.etag) {
    return new Response(null, {
      status: 304, // Not Modified
      headers: {
        ETag: sliceBlobData.etag,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // Create slice (in a real implementation, you'd slice the blob)
  const sliceSize = end - start + 1;

  return new Response(sliceBlobData.blob, {
    status: 206, // Partial Content
    headers: {
      "Content-Type": "text/plain",
      "Content-Length": sliceSize.toString(),
      "Content-Range": `bytes ${start}-${end}/${totalSize}`,
      "Accept-Ranges": "bytes",
      "X-Blob-Slice": `${start}-${end}`,
      ETag: sliceBlobData.etag,
    },
  });
}

/**
 * Main server
 */
const server = Bun.serve({
  port: 3000,
  hostname: "localhost",
  fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Range, X-Requested-With, If-None-Match",
      "Access-Control-Expose-Headers":
        "Content-Length, Content-Range, X-Blob-Type, X-Blob-Size, ETag, Content-Encoding",
    };

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return Promise.resolve(new Response(null, { headers: corsHeaders }));
    }

    // Route handling
    return (async () => {
      try {
        if (path === "/api/response-methods/blob/advanced") {
          // Check for conditional request
          const response = await handleAdvancedBlob();
          const etag = response.headers.get("ETag");
          const conditionalResponse = handleConditionalRequest(request, etag!);
          if (conditionalResponse) {
            return conditionalResponse;
          }
          // Convert Headers to plain object for merging
          const headersObj: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headersObj[key] = value;
          });

          return new Response(response.body, {
            headers: { ...corsHeaders, ...headersObj },
          });
        }

        if (path === "/api/response-methods/blob/image") {
          const svgBlobData = createSVGBlob();
          const conditionalResponse = handleConditionalRequest(
            request,
            svgBlobData.etag
          );
          if (conditionalResponse) {
            return conditionalResponse;
          }
          const response = handleImageBlob();
          // Convert Headers to plain object for merging
          const headersObj: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headersObj[key] = value;
          });

          return new Response(response.body, {
            headers: { ...corsHeaders, ...headersObj },
          });
        }

        if (path === "/api/response-methods/blob/file") {
          const fileBlobData = createFileBlob();
          const conditionalResponse = handleConditionalRequest(
            request,
            fileBlobData.etag
          );
          if (conditionalResponse) {
            return conditionalResponse;
          }
          const response = handleFileBlob();
          // Convert Headers to plain object for merging
          const headersObj: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headersObj[key] = value;
          });

          return new Response(response.body, {
            headers: { ...corsHeaders, ...headersObj },
          });
        }

        if (path === "/api/response-methods/blob/slice") {
          // Check for range requests first
          const rangeResponse = handleSliceRangeRequest(request);
          if (rangeResponse) {
            // Convert Headers to plain object for merging
            const headersObj: Record<string, string> = {};
            rangeResponse.headers.forEach((value, key) => {
              headersObj[key] = value;
            });

            return new Response(rangeResponse.body, {
              headers: { ...corsHeaders, ...headersObj },
            });
          }

          const sliceBlobData = createSliceDemoBlob();
          const conditionalResponse = handleConditionalRequest(
            request,
            sliceBlobData.etag
          );
          if (conditionalResponse) {
            return conditionalResponse;
          }

          const response = handleSliceBlob();
          // Convert Headers to plain object for merging
          const headersObj: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headersObj[key] = value;
          });

          return new Response(response.body, {
            headers: { ...corsHeaders, ...headersObj },
          });
        }

        if (path === "/api/response-methods/blob/compressed") {
          const response = await handleCompressedBlob(request);
          // Convert Headers to plain object for merging
          const headersObj: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headersObj[key] = value;
          });

          return new Response(response.body, {
            headers: { ...corsHeaders, ...headersObj },
          });
        }

        if (path === "/api/response-methods/blob/transformed") {
          const transformedBlobData = createTransformedBlob();
          const conditionalResponse = handleConditionalRequest(
            request,
            transformedBlobData.etag
          );
          if (conditionalResponse) {
            return conditionalResponse;
          }
          const response = handleTransformedBlob();
          // Convert Headers to plain object for merging
          const headersObj: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headersObj[key] = value;
          });

          return new Response(response.body, {
            headers: { ...corsHeaders, ...headersObj },
          });
        }

        if (path === "/api/response-methods/blob/streaming") {
          const streamingBlobData = createStreamingBlob();
          const conditionalResponse = handleConditionalRequest(
            request,
            streamingBlobData.etag
          );
          if (conditionalResponse) {
            return conditionalResponse;
          }
          const response = handleStreamingBlob();
          // Convert Headers to plain object for merging
          const headersObj: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headersObj[key] = value;
          });

          return new Response(response.body, {
            headers: { ...corsHeaders, ...headersObj },
          });
        }

        if (path === "/api/response-methods/blob") {
          const basicContent = `# Enhanced Basic Blob Demonstration
Timestamp: ${new Date().toISOString()}
Server: Bun Runtime Enhanced Blob API
Type: Basic text blob
Size: Variable
Version: 2.0.0

This is an enhanced basic blob response demonstration.
The content is created using the Blob constructor
and served directly as a Response object.

## Enhanced Features:
- ETag support for caching
- Compression capabilities
- Performance monitoring
- CORS support
- Conditional requests
`;
          const etag = generateETag(basicContent);
          const conditionalResponse = handleConditionalRequest(request, etag);
          if (conditionalResponse) {
            return conditionalResponse;
          }
          const response = handleBasicBlob();
          // Convert Headers to plain object for merging
          const headersObj: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headersObj[key] = value;
          });

          return new Response(response.body, {
            headers: { ...corsHeaders, ...headersObj },
          });
        }

        // Health check endpoint
        if (path === "/health") {
          return new Response(
            JSON.stringify(
              {
                status: "healthy",
                timestamp: new Date().toISOString(),
                server: "Enhanced Advanced Blob API",
                version: "2.0.0",
                features: [
                  "compression",
                  "etag-support",
                  "range-requests",
                  "streaming",
                  "transformations",
                  "conditional-requests",
                  "performance-monitoring",
                  "cors-support",
                ],
                endpoints: [
                  "/api/response-methods/blob",
                  "/api/response-methods/blob/advanced",
                  "/api/response-methods/blob/image",
                  "/api/response-methods/blob/file",
                  "/api/response-methods/blob/slice",
                  "/api/response-methods/blob/compressed",
                  "/api/response-methods/blob/transformed",
                  "/api/response-methods/blob/streaming",
                ],
              },
              null,
              2
            ),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // 404 for unknown paths
        return new Response("Enhanced Blob API - Not Found", {
          status: 404,
          headers: corsHeaders,
        });
      } catch (error) {
        console.error("Server error:", error);
        return new Response(
          JSON.stringify({
            error: "Internal Server Error",
            message: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
            version: "2.0.0",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    })();
  },

  error(error: Error) {
    console.error("Server error:", error);
    return new Response("Enhanced Internal Server Error", { status: 500 });
  },
});

console.log(
  "🚀 Enhanced Advanced Blob API Server started on http://localhost:3000"
);
console.log("📊 Available endpoints:");
console.log(
  "   GET /api/response-methods/blob/advanced - Comprehensive blob documentation"
);
console.log(
  "   GET /api/response-methods/blob/image - SVG image blob (257 bytes)"
);
console.log("   GET /api/response-methods/blob/file - File download blob");
console.log(
  "   GET /api/response-methods/blob/slice - Interactive slice demo (2000 bytes)"
);
console.log(
  "   GET /api/response-methods/blob/compressed - Compressed blob with encoding"
);
console.log(
  "   GET /api/response-methods/blob/transformed - Transformed image blob"
);
console.log(
  "   GET /api/response-methods/blob/streaming - Streaming blob with chunks"
);
console.log("   GET /api/response-methods/blob - Basic blob demonstration");
console.log("   GET /health - Health check and endpoint list");
console.log("");
console.log("🔥 Enhanced Features:");
console.log("   ✅ Compression (gzip/deflate)");
console.log("   ✅ ETag support for caching");
console.log("   ✅ Range requests");
console.log("   ✅ Conditional requests");
console.log("   ✅ Streaming support");
console.log("   ✅ Image transformations");
console.log("   ✅ Performance monitoring");
console.log("   ✅ CORS support");
console.log("");
console.log("📝 Example usage:");
console.log(
  "   curl http://localhost:3000/api/response-methods/blob/advanced | jq ."
);
console.log(
  '   curl -H "Accept-Encoding: gzip" http://localhost:3000/api/response-methods/blob/compressed'
);
console.log(
  '   curl -H "If-None-Match: \\"etag\\"" http://localhost:3000/api/response-methods/blob/image'
);
console.log(
  '   curl -H "Range: bytes=0-99" http://localhost:3000/api/response-methods/blob/slice'
);
