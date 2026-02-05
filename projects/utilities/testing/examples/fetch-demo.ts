/**
 * 🌐 Bun Fetch API - Complete Demo
 * https://bun.com/docs/runtime/networking/fetch
 */

import { s3 } from "bun";

// ═══════════════════════════════════════════════════════════
// RESPONSE BODY METHODS
// ═══════════════════════════════════════════════════════════

/**
 * response.text(): Promise<string>
 * Returns the response body as a string
 */
async function demoText() {
  const response = await fetch("https://httpbin.org/anything");
  const text: string = await response.text();
  console.log(`📄 Text length: ${text.length} chars`);
}

/**
 * response.json(): Promise<any>
 * Returns the response body as a parsed JSON object
 */
async function demoJson() {
  const response = await fetch("https://httpbin.org/json");
  const data: any = await response.json();
  console.log(`📦 JSON parsed:`, data);
}

/**
 * response.formData(): Promise<FormData>
 * Returns the response body as FormData
 */
async function demoFormData() {
  const response = await fetch("https://httpbin.org/post", {
    method: "POST",
    body: new FormData(),
  });
  const formData: FormData = await response.formData();
  console.log(`📋 FormData entries: ${formData.entries().length}`);
}

/**
 * response.bytes(): Promise<Uint8Array>
 * Returns the response body as a Uint8Array
 */
async function demoBytes() {
  const response = await fetch("https://httpbin.org/bytes/100");
  const bytes: Uint8Array = await response.bytes();
  console.log(`🧊 Bytes received: ${bytes.length}`);
}

/**
 * response.arrayBuffer(): Promise<ArrayBuffer>
 * Returns the response body as an ArrayBuffer
 */
async function demoArrayBuffer() {
  const response = await fetch("https://httpbin.org/bytes/100");
  const buffer: ArrayBuffer = await response.arrayBuffer();
  console.log(`📦 ArrayBuffer size: ${buffer.byteLength}`);
}

/**
 * response.blob(): Promise<Blob>
 * Returns the response body as a Blob
 */
async function demoBlob() {
  const response = await fetch("https://httpbin.org/image/jpeg");
  const blob: Blob = await response.blob();
  console.log(`🖼️ Blob type: ${blob.type}, size: ${blob.size}`);
}

// ═══════════════════════════════════════════════════════════
// HEADERS API
// ═══════════════════════════════════════════════════════════

/**
 * HeadersInit types:
 * - string[][]
 * - Record<string, string | ReadonlyArray<string>>
 * - Headers
 */
async function demoHeadersAPI() {
  // Create headers using different initialization types
  
  // Type 1: string[][]
  const headers1 = new Headers([
    ["Content-Type", "application/json"],
    ["Authorization", "Bearer token"],
  ]);
  
  // Type 2: Record
  const headers2: HeadersInit = {
    "Content-Type": "application/json",
    "X-Custom-Header": "value",
  };
  const headers2Obj = new Headers(headers2);
  
  // Type 3: Headers object
  const headers3 = new Headers(headers1);
  headers3.set("X-Request-Id", "12345");
  
  // Headers methods
  console.log(`📋 Total headers: ${headers3.count}`);
  console.log(`🔍 Content-Type: ${headers3.get("content-type")}`);
  console.log(`🔑 Header has Authorization: ${headers3.has("authorization")}`);
  
  // Headers iteration
  console.log("\n📜 All headers:");
  for (const [name, value] of headers3.entries()) {
    console.log(`   ${name}: ${value}`);
  }
  
  // Bun-specific: toJSON() is ~10x faster than Object.fromEntries()
  console.log("\n⚡ Bun-optimized toJSON():");
  const json = headers3.toJSON();
  console.log(`   Converted to object:`, json);
  
  // JSON.stringify automatically calls toJSON()
  const stringified = JSON.stringify(headers3);
  console.log(`   Stringified length: ${stringified.length} chars`);
  
  // getSetCookie() - special method for Set-Cookie headers
  const cookieHeaders = new Headers();
  cookieHeaders.append("Set-Cookie", "session=abc123; Path=/; HttpOnly");
  cookieHeaders.append("Set-Cookie", "tracking=xyz789; Path=/");
  console.log(`🍪 Set-Cookie values:`, cookieHeaders.getSetCookie());
  
  // forEach callback
  console.log("\n🔄 Using forEach:");
  headers3.forEach((value, key, parent) => {
    console.log(`   ${key}: ${value}`);
  });
}

// ═══════════════════════════════════════════════════════════
// STREAMING RESPONSE BODIES
// ═══════════════════════════════════════════════════════════

/**
 * Stream response using async iterator
 * 
 * ⚡ When using streams with HTTP(S):
 * - The data is streamed directly to the network without buffering the entire body in memory
 * - If the connection is lost, the stream will be canceled
 * - The Content-Length header is not automatically set unless the stream has a known size
 */
async function demoStreamingResponse() {
  const response = await fetch("https://httpbin.org/stream/10");
  
  let count = 0;
  for await (const chunk of response.body!) {
    count++;
    console.log(`📥 Chunk ${count}: ${chunk.length} bytes`);
  }
}

/**
 * Stream using ReadableStream.getReader()
 */
async function demoStreamReader() {
  const response = await fetch("https://httpbin.org/stream/5");
  const stream = response.body!;
  
  const reader = stream.getReader();
  let count = 0;
  
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    count++;
    console.log(`📖 Read ${count}: ${value.length} bytes`);
  }
}

// ═══════════════════════════════════════════════════════════
// STREAMING REQUEST BODIES
// ═══════════════════════════════════════════════════════════

/**
 * Stream data in request body using ReadableStream
 */
async function demoStreamingRequest() {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue("Hello, ");
      controller.enqueue("Bun! ");
      controller.enqueue("🚀");
      controller.close();
    },
  });

  const response = await fetch("https://httpbin.org/post", {
    method: "POST",
    body: stream,
  });

  const result = await response.json();
  console.log(`📤 Streamed data: ${result.data}`);
}

// ═══════════════════════════════════════════════════════════
// TIMEOUT AND CANCELLATION
// ═══════════════════════════════════════════════════════════

/**
 * Fetch with timeout using AbortSignal.timeout
 */
async function demoTimeout() {
  try {
    const response = await fetch("https://httpbin.org/delay/5", {
      signal: AbortSignal.timeout(1000), // 1 second timeout
    });
    console.log("✅ Response received");
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      console.log("⏱️ Request timed out!");
    }
  }
}

/**
 * Cancel request using AbortController
 */
async function demoCancelRequest() {
  const controller = new AbortController();
  
  // Cancel after 100ms
  setTimeout(() => controller.abort(), 100);
  
  try {
    const response = await fetch("https://httpbin.org/delay/5", {
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log("🚫 Request was cancelled");
    }
  }
}

// ═══════════════════════════════════════════════════════════
// UNIX DOMAIN SOCKETS
// ═══════════════════════════════════════════════════════════

/**
 * Fetch via Unix domain socket
 */
async function demoUnixSocket() {
  const response = await fetch("https://localhost/api/endpoint", {
    unix: "/var/run/docker.sock", // Example socket path
    method: "POST",
    body: JSON.stringify({ message: "Hello from Bun!" }),
    headers: { "Content-Type": "application/json" },
  });
  console.log(`🔌 Unix socket response: ${response.status}`);
}

// ═══════════════════════════════════════════════════════════
// TLS OPTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Fetch with custom TLS certificates
 */
async function demoTLS() {
  const response = await fetch("https://example.com", {
    tls: {
      key: Bun.file("/path/to/client-key.pem"),
      cert: Bun.file("/path/to/client-cert.pem"),
      // ca: [Bun.file("/path/to/ca.pem")],
    },
  });
  console.log(`🔐 TLS response: ${response.status}`);
}

/**
 * Fetch with custom TLS validation
 */
async function demoCustomTLSValidation() {
  const response = await fetch("https://example.com", {
    tls: {
      checkServerIdentity: (hostname, peerCertificate) => {
        // Custom validation logic
        if (hostname !== "expected-hostname.com") {
          return new Error("Hostname mismatch");
        }
      },
    },
  });
  console.log(`🔍 Custom TLS check: ${response.status}`);
}

/**
 * Fetch with disabled TLS validation (use with caution!)
 */
async function demoDisableTLSValidation() {
  const response = await fetch("https://self-signed.example.com", {
    tls: {
      rejectUnauthorized: false, // ⚠️ Disables TLS validation
    },
  });
  console.log(`⚠️ TLS validation disabled: ${response.status}`);
}

// ═══════════════════════════════════════════════════════════
// REQUEST OPTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Bun-specific fetch options
 */
async function demoRequestOptions() {
  const response = await fetch("https://httpbin.org/get", {
    // Control automatic response decompression (default: true)
    // Supports gzip, deflate, brotli (br), and zstd
    decompress: true,

    // Disable connection reuse for this request
    keepalive: false,

    // Debug logging level
    verbose: true, // or "curl" for more detailed output
  });
  
  console.log(`📡 Response: ${response.status}`);
}

// ═══════════════════════════════════════════════════════════
// FILE, DATA, AND BLOB URLS
// ═══════════════════════════════════════════════════════════

/**
 * Fetch local files using file:// protocol
 */
async function demoFileUrls() {
  // On macOS/Linux
  const response = await fetch("file:///etc/hostname");
  const text = await response.text();
  console.log(`📁 Local file content (first 50 chars): ${text.slice(0, 50)}...`);
  
  // On Windows, paths are automatically normalized
  // const response2 = await fetch("file:///C:/path/to/file.txt");
}

/**
 * Fetch data URLs
 */
async function demoDataUrls() {
  // Base64 encoded data
  const response = await fetch("data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==");
  const text = await response.text();
  console.log(`🔗 Data URL decoded: "${text}"`);
  
  // Plain text data URL
  const response2 = await fetch("data:text/html,<h1>Hello!</h1>");
  const html = await response2.text();
  console.log(`🔗 Data URL HTML: ${html}`);
}

/**
 * Fetch blobs using URL.createObjectURL()
 */
async function demoBlobUrls() {
  const blob = new Blob(["Hello, World!"], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  
  const response = await fetch(url);
  const text = await response.text();
  console.log(`🫧 Blob URL content: "${text}"`);
  
  // Clean up
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════
// DNS & PERFORMANCE OPTIMIZATIONS
// ═══════════════════════════════════════════════════════════

/**
 * DNS prefetching - prepare DNS lookup in advance
 */
async function demoDNSPrefetch() {
  const { dns } = await import("bun");
  
  console.log("🌐 Prefetching DNS for bun.com...");
  dns.prefetch("bun.com");
  console.log("✅ DNS prefetch initiated");
  
  // Now any fetch to bun.com will use the prefetched DNS
}

/**
 * DNS caching - view cache statistics
 */
async function demoDNSCaching() {
  const { dns } = await import("bun");
  
  console.log("📊 DNS cache statistics:");
  const stats = dns.getCacheStats();
  console.log(`   Cache entries: ${stats.size}`);
  console.log(`   Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
}

/**
 * Preconnect to a host
 */
async function demoPreconnect() {
  console.log("🔌 Preconnecting to https://httpbin.org...");
  await fetch.preconnect("https://httpbin.org");
  console.log("✅ Preconnect initiated (TCP + TLS handshake started)");
  
  // Now fetching from httpbin.org will be faster
}

/**
 * Connection pooling & keep-alive
 * 
 * 🔄 Bun automatically reuses connections (connection pooling)
 * This reduces time to establish connections
 * keepalive: false can disable connection reuse per request
 */
async function demoConnectionPooling() {
  console.log("🔄 Testing connection pooling (automatic)...");
  
  // Multiple requests to same host - Bun reuses connections
  const start = performance.now();
  
  await fetch("https://httpbin.org/get");
  await fetch("https://httpbin.org/get");
  await fetch("https://httpbin.org/get");
  
  const elapsed = performance.now() - start;
  console.log(`⏱️ 3 sequential requests: ${elapsed.toFixed(0)}ms (connections reused)`);
}

// ═══════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════

/**
 * Bun-specific error handling
 */
async function demoErrorHandling() {
  console.log("⚠️ Testing error cases:");
  
  // GET/HEAD with body throws an error
  try {
    await fetch("https://httpbin.org/get", {
      method: "GET",
      body: "this will throw"
    });
  } catch (error) {
    console.log("   ✅ GET/HEAD with body correctly throws error");
  }
  
  // TLS validation failure (when rejectUnauthorized is true)
  try {
    await fetch("https://expired.badssl.com");
  } catch (error) {
    console.log("   ✅ TLS validation error caught");
  }
}

// ═══════════════════════════════════════════════════════════
// AUTO CONTENT-TYPE & DEBUG VERBOSE
// ═══════════════════════════════════════════════════════════

/**
 * Demo automatic Content-Type for request bodies
 * 
 * ✅ Bun automatically sets Content-Type:
 * - For Blob objects: uses the blob's type
 * - For FormData: sets appropriate multipart boundary
 */
async function demoAutoContentType() {
  // Blob with type - Bun will set Content-Type automatically
  const blob = new Blob(["Hello, World!"], { type: "text/plain" });
  
  const response1 = await fetch("https://httpbin.org/post", {
    method: "POST",
    body: blob,
  });
  console.log(`📦 Blob upload (auto Content-Type: text/plain): ${response1.status}`);
  
  // FormData - Bun sets multipart/form-data with boundary
  const formData = new FormData();
  formData.append("name", "Test User");
  formData.append("file", new Blob(["file content"], { type: "text/plain" }), "test.txt");
  
  const response2 = await fetch("https://httpbin.org/post", {
    method: "POST",
    body: formData,
  });
  console.log(`📋 FormData upload (auto multipart boundary): ${response2.status}`);
}

/**
 * Demo verbose debugging
 * 
 * 🔍 Pass verbose: true to see request/response headers
 * Note: verbose is Bun-specific, not part of Web standard
 */
async function demoVerboseDebugging() {
  console.log("🔍 Verbose debugging output:");
  console.log("─".repeat(50));
  
  const response = await fetch("https://httpbin.org/headers", {
    verbose: true, // Bun-specific: prints headers to terminal
  });
  
  const data = await response.json();
  console.log("─".repeat(50));
  console.log(`✅ Response received: ${response.status}`);
  console.log(`📋 Headers sent: ${Object.keys(data.headers).length} headers`);
}

// ═══════════════════════════════════════════════════════════
// S3 URL SUPPORT
// ═══════════════════════════════════════════════════════════

/**
 * Fetch from S3 using environment credentials
 */
async function demoS3EnvCredentials() {
  const response = await fetch("s3://my-bucket/path/to/object");
  const data = await response.bytes();
  console.log(`☁️ S3 object size: ${data.length} bytes`);
}

/**
 * Fetch from S3 with explicit credentials
 */
async function demoS3ExplicitCredentials() {
  const response = await fetch("s3://my-bucket/path/to/object", {
    s3: {
      accessKeyId: "YOUR_ACCESS_KEY_ID",
      secretAccessKey: "YOUR_SECRET_ACCESS_KEY",
      region: "us-east-1",
    },
  });
  console.log(`☁️ S3 response: ${response.status}`);
}

/**
 * Upload to S3 with streaming (multipart)
 * 
 * ⚡ When using streams with S3:
 * - For PUT/POST requests, Bun automatically uses multipart upload
 * - The stream is consumed in chunks and uploaded in parallel
 * - Progress can be monitored through the S3 options
 */
async function demoS3StreamingUpload() {
  const stream = new ReadableStream({
    start(controller) {
      // Simulate chunked data
      for (let i = 0; i < 10; i++) {
        controller.enqueue(`Chunk ${i}\n`);
      }
      controller.close();
    },
  });

  await s3.write("s3://my-bucket/large-file.txt", stream, {
    // Bun automatically uses multipart upload for streams
    // Progress can be monitored through S3 options
    metadata: {
      uploadedAt: new Date().toISOString(),
    },
  });
  
  console.log("☁️ Streaming upload complete");
}

// ═══════════════════════════════════════════════════════════
// RUN ALL DEMOS
// ═══════════════════════════════════════════════════════════

async function runAllDemos() {
  console.log("🌐 Bun Fetch API Demo");
  console.log("═".repeat(50));

  // Simple demos
  console.log("\n📄 Response Body Methods:");
  await demoText();
  await demoJson();
  
  console.log("\n📋 Headers API:");
  await demoHeadersAPI();
  
  console.log("\n🌊 Streaming Responses:");
  await demoStreamingResponse();
  
  console.log("\n📤 Streaming Requests:");
  await demoStreamingRequest();
  
  console.log("\n⏱️ Timeout & Cancellation:");
  await demoTimeout();
  await demoCancelRequest();
  
  console.log("\n🔐 TLS Options:");
  await demoRequestOptions();
  
  console.log("\n📁 File URLs:");
  await demoFileUrls();
  
  console.log("\n🔗 Data URLs:");
  await demoDataUrls();
  
  console.log("\n🫧 Blob URLs:");
  await demoBlobUrls();
  
  console.log("\n🌐 DNS & Performance:");
  await demoDNSPrefetch();
  await demoDNSCaching();
  await demoPreconnect();
  await demoConnectionPooling();
  
  console.log("\n⚠️ Error Handling:");
  await demoErrorHandling();
  
  console.log("\n🏷️ Auto Content-Type:");
  await demoAutoContentType();
  
  console.log("\n🔍 Verbose Debugging:");
  await demoVerboseDebugging();
  
  console.log("\n☁️ S3 Support:");
  await demoS3StreamingUpload();
  
  console.log("\n═".repeat(50));
  console.log("✅ All demos completed");
}

// Run if executed directly
runAllDemos().catch(console.error);

export {
  demoText,
  demoJson,
  demoFormData,
  demoBytes,
  demoArrayBuffer,
  demoBlob,
  demoHeadersAPI,
  demoStreamingResponse,
  demoStreamReader,
  demoStreamingRequest,
  demoTimeout,
  demoCancelRequest,
  demoUnixSocket,
  demoTLS,
  demoCustomTLSValidation,
  demoDisableTLSValidation,
  demoRequestOptions,
  demoFileUrls,
  demoDataUrls,
  demoBlobUrls,
  demoDNSPrefetch,
  demoDNSCaching,
  demoPreconnect,
  demoConnectionPooling,
  demoErrorHandling,
  demoAutoContentType,
  demoVerboseDebugging,
  demoS3EnvCredentials,
  demoS3ExplicitCredentials,
  demoS3StreamingUpload,
  runAllDemos,
};
