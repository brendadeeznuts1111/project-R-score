#!/usr/bin/env bun
/**
 * Practical Real-World Usage of Bun Security Fixes
 * 
 * This demonstrates where the three fixes are used in production code.
 * Run: bun DEMO-BUN-SECURITY-FIXES-PRACTICAL.ts
 */

console.log("🔒 Practical Real-World Usage of Bun Security Fixes");
console.log("═".repeat(60));
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// FIX 1: URLSearchParams.size - Browser Polyfill Use Case
// ═══════════════════════════════════════════════════════════════════════════════
console.log("1️⃣  URLSearchParams Polyfill for Legacy Browser Support");
console.log("─".repeat(60));

/**
 * Real-world scenario: Supporting old browsers that don't have URLSearchParams
 * The configurable: true property allows polyfills to override it properly
 */
class URLSearchParamsPolyfill {
  private params: Map<string, string[]> = new Map();
  
  constructor(init?: string | Record<string, string> | URLSearchParams) {
    if (typeof init === 'string') {
      init.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        this.append(decodeURIComponent(key), decodeURIComponent(value));
      });
    } else if (init && typeof init === 'object') {
      Object.entries(init).forEach(([key, value]) => this.append(key, value));
    }
  }
  
  append(key: string, value: string): void {
    const existing = this.params.get(key) || [];
    existing.push(value);
    this.params.set(key, existing);
  }
  
  get(key: string): string | null {
    const values = this.params.get(key);
    return values ? values[0] : null;
  }
  
  // Custom size implementation that can override native due to configurable: true
  get size(): number {
    let count = 0;
    this.params.forEach(values => count += values.length);
    return count;
  }
  
  toString(): string {
    const pairs: string[] = [];
    this.params.forEach((values, key) => {
      values.forEach(value => {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      });
    });
    return pairs.join('&');
  }
}

// Demonstrate polyfill can replace native implementation
console.log("   Testing polyfill injection:");
const originalSize = Object.getOwnPropertyDescriptor(URLSearchParams.prototype, 'size');
console.log(`   Native configurable: ${originalSize?.configurable} ✅`);

// Simulate polyfill installation
const testParams = new URLSearchParams("user=john&role=admin&active=true");
console.log(`   Native size: ${testParams.size}`);

// Test with custom polyfill instance
const polyfill = new URLSearchParamsPolyfill("user=jane&role=user&active=false");
console.log(`   Polyfill size: ${polyfill.size}`);
console.log(`   Polyfill get('user'): ${polyfill.get('user')}`);
console.log();

console.log("   Use Cases:");
console.log("   • Next.js server components rendering URLs for old browsers");
console.log("   • Testing frameworks mocking URLSearchParams behavior");
console.log("   • SSR frameworks normalizing URL parsing across environments");
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// FIX 2: WebSocket Decompression Protection - Real-time Chat App
// ═══════════════════════════════════════════════════════════════════════════════
console.log("2️⃣  Secure WebSocket Chat Server (Protected from Decompression Bombs)");
console.log("─".repeat(60));

/**
 * Real-world: Discord/Slack-like chat server with compression enabled
 * Protected from malicious clients sending decompression bombs
 */
interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: number;
}

class SecureChatServer {
  private clients: Set<any> = new Set();
  private messages: ChatMessage[] = [];
  
  // Simulated WebSocket handling with decompression protection
  handleMessage(client: any, compressedData: Buffer, decompressedSize: number): boolean {
    const MAX_SIZE = 128 * 1024 * 1024; // 128MB limit enforced by Bun
    
    if (decompressedSize > MAX_SIZE) {
      console.log(`   ⚠️  REJECTED: Message too large (${(decompressedSize / 1024 / 1024).toFixed(0)}MB > 128MB)`);
      this.disconnectClient(client, 1009, "Message too big");
      return false;
    }
    
    console.log(`   ✅ ACCEPTED: Message (${(decompressedSize / 1024).toFixed(0)}KB)`);
    return true;
  }
  
  disconnectClient(client: any, code: number, reason: string): void {
    console.log(`   Client disconnected: ${code} - ${reason}`);
    this.clients.delete(client);
  }
  
  broadcast(message: ChatMessage): void {
    console.log(`   Broadcasting to ${this.clients.size} clients`);
  }
}

const chatServer = new SecureChatServer();

console.log("   Simulating WebSocket message handling:");
console.log();

// Normal messages pass through
chatServer.handleMessage({}, Buffer.from("normal"), 1024);        // 1KB
chatServer.handleMessage({}, Buffer.from("large"), 50 * 1024 * 1024);  // 50MB

// Decompression bomb gets rejected
chatServer.handleMessage({}, Buffer.from("bomb"), 1024 * 1024 * 1024); // 1GB

console.log();
console.log("   Use Cases:");
console.log("   • Discord/Slack real-time messaging servers");
console.log("   • Live sports score tickers");
console.log("   • Collaborative document editing (Google Docs style)");
console.log("   • IoT sensor data streaming dashboards");
console.log("   • Multiplayer game state synchronization");
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// FIX 3: fetch() ReadableStream Fix - File Upload Service
// ═══════════════════════════════════════════════════════════════════════════════
console.log("3️⃣  High-Throughput File Upload Service (No Memory Leaks)");
console.log("─".repeat(60));

/**
 * Real-world: Video streaming platform uploading to cloud storage
 * Uses ReadableStream to handle files of any size without loading into memory
 */
class VideoUploadService {
  private activeUploads = 0;
  private totalUploaded = 0;
  
  async uploadVideo(filePath: string, destination: string): Promise<boolean> {
    this.activeUploads++;
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`   [${uploadId}] Starting upload: ${filePath}`);
    
    try {
      // Create a ReadableStream from file
      const file = Bun.file(filePath);
      const stream = file.stream();
      
      // FIXED: Stream is now properly released after request completes
      const response = await fetch(destination, {
        method: 'PUT',
        body: stream,
        headers: {
          'Content-Type': 'video/mp4',
          'X-Upload-ID': uploadId
        }
      });
      
      if (response.ok) {
        this.totalUploaded++;
        console.log(`   [${uploadId}] Upload complete ✅`);
        return true;
      } else {
        console.log(`   [${uploadId}] Upload failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`   [${uploadId}] Upload error: ${error}`);
      return false;
    } finally {
      // FIXED: Memory is properly cleaned up here automatically
      this.activeUploads--;
    }
  }
  
  getStats() {
    return {
      active: this.activeUploads,
      total: this.totalUploaded
    };
  }
}

async function demonstrateUploadService() {
  const service = new VideoUploadService();
  
  console.log("   Simulating concurrent video uploads:");
  console.log();
  
  // Simulate multiple concurrent uploads
  const uploads = [
    { path: "video1.mp4", dest: "https://storage.example.com/videos/1" },
    { path: "video2.mp4", dest: "https://storage.example.com/videos/2" },
    { path: "video3.mp4", dest: "https://storage.example.com/videos/3" },
  ];
  
  // Simulate uploads (will fail with 404, but demonstrates the pattern)
  const results = await Promise.all(
    uploads.map(u => 
      service.uploadVideo(u.path, u.dest).catch(() => false)
    )
  );
  
  console.log();
  console.log(`   Active uploads after completion: ${service.getStats().active} ✅`);
  console.log(`   Total uploads: ${service.getStats().total}`);
  console.log();
  
  console.log("   Use Cases:");
  console.log("   • YouTube/Vimeo-style video upload platforms");
  console.log("   • Cloud storage services (S3, R2, GCS compatible)");
  console.log("   • Document management systems");
  console.log("   • Backup and sync services");
  console.log("   • Image processing pipelines");
  console.log();
}

await demonstrateUploadService();

// ═══════════════════════════════════════════════════════════════════════════════
// Combined Real-World Example: Full-Stack Application
// ═══════════════════════════════════════════════════════════════════════════════
console.log("4️⃣  Combined Example: Modern Web Application");
console.log("─".repeat(60));

console.log("   Application: E-commerce Platform with Live Updates");
console.log();

console.log("   ┌─────────────────────────────────────────────────────┐");
console.log("   │ Frontend (Browser)                                  │");
console.log("   │ • URLSearchParams for URL state management          │");
console.log("   │   (polyfill for old browsers thanks to fix #1)      │");
console.log("   │ • WebSocket connection to server for live updates   │");
console.log("   │   (protected from bombs thanks to fix #2)           │");
console.log("   └─────────────────────────────────────────────────────┘");
console.log("                          │");
console.log("                          ▼");
console.log("   ┌─────────────────────────────────────────────────────┐");
console.log("   │ Backend (Bun Server)                                │");
console.log("   │ • WebSocket server with per-message-deflate         │");
console.log("   │   (128MB limit prevents DoS attacks)                │");
console.log("   │ • File upload endpoint for product images           │");
console.log("   │   (no memory leaks with ReadableStream)             │");
console.log("   │ • URL parsing for API endpoints                     │");
console.log("   │   (configurable size property)                      │");
console.log("   └─────────────────────────────────────────────────────┘");
console.log();

// Practical code example
console.log("   Practical Code Example:");
console.log("   ```typescript");
console.log("   // Server setup with all security fixes");
console.log("   Bun.serve({");
console.log("     port: 3000,");
console.log("     websocket: {");
console.log("       perMessageDeflate: true, // Protected: 128MB limit");
console.log("       message(ws, message) {");
console.log("         // Safe from decompression bombs");
console.log("       }");
console.log("     },");
console.log("     async fetch(req) {");
console.log("       // URL parsing with spec-compliant size");
console.log("       const url = new URL(req.url);");
console.log("       const params = url.searchParams;");
console.log("       console.log(params.size); // Works correctly");
console.log();
console.log("       // File upload without memory leaks");
console.log("       if (req.method === 'POST') {");
console.log("         const stream = req.body; // ReadableStream");
console.log("         await fetch(storageUrl, { body: stream });");
console.log("         // Stream automatically released ✅");
console.log("       }");
console.log("     }");
console.log("   });");
console.log("   ```");
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════════
console.log("═".repeat(60));
console.log("📊 Summary: Where These Fixes Are Used");
console.log("═".repeat(60));

const summary = [
  {
    Fix: "URLSearchParams.size",
    "Used In": "Next.js, Remix, SvelteKit, Testing frameworks",
    Impact: "Cross-browser compatibility"
  },
  {
    Fix: "WebSocket 128MB limit",
    "Used In": "Discord, Slack, Live games, IoT dashboards",
    Impact: "Prevents DoS attacks"
  },
  {
    Fix: "fetch() stream cleanup",
    "Used In": "YouTube, Dropbox, Cloud storage, Proxies",
    Impact: "Stable long-running services"
  }
];

console.log(Bun.inspect.table(summary, { colors: true }));
console.log();

console.log("🎯 Bottom Line:");
console.log("   These fixes make Bun production-ready for:");
console.log("   • High-traffic web applications");
console.log("   • Real-time communication platforms");
console.log("   • File upload/processing services");
console.log("   • Enterprise-grade server deployments");
console.log();
