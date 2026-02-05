#!/usr/bin/env bun

// Advanced Bun Runtime & Process Control Demonstration
import { gc, serve } from "bun";
import { suffix } from "bun:ffi";

interface ProcessMetrics {
  timestamp: Date;
  pid: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  uptime: number;
  gcStats: {
    collections: number;
    duration: number;
    beforeGC: number;
    afterGC: number;
  };
}

interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  bunVersion: string;
  cpuCount: number;
}

// 1. Advanced Process Control with Manual GC
class ProcessController {
  private metrics: ProcessMetrics[] = [];
  private gcCount = 0;
  private startTime = Date.now();

  constructor() {
    // Set up process monitoring
    this.setupProcessHandlers();
  }

  // Manual garbage collection with monitoring
  performGC(force = false): ProcessMetrics["gcStats"] {
    const beforeGC = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    // Bun's manual garbage collection
    gc(force);

    const endTime = performance.now();
    const afterGC = process.memoryUsage().heapUsed;

    const stats: ProcessMetrics["gcStats"] = {
      collections: ++this.gcCount,
      duration: endTime - startTime,
      beforeGC,
      afterGC,
    };

    console.log(
      `🧹 GC #${stats.collections}: ${stats.duration.toFixed(2)}ms, freed ${(stats.beforeGC - stats.afterGC).toLocaleString()} bytes`
    );

    return stats;
  }

  // Advanced memory monitoring
  getProcessMetrics(): ProcessMetrics {
    const memUsage = process.memoryUsage();

    return {
      timestamp: new Date(),
      pid: process.pid,
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
      },
      uptime: (Date.now() - this.startTime) / 1000,
      gcStats: {
        collections: this.gcCount,
        duration: 0,
        beforeGC: 0,
        afterGC: 0,
      },
    };
  }

  // System information gathering
  getSystemInfo(): SystemInfo {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      bunVersion: Bun.version,
      cpuCount: navigator.hardwareConcurrency || 4,
    };
  }

  // Setup process event handlers
  private setupProcessHandlers() {
    process.on("SIGINT", () => {
      console.log("\n🛑 Received SIGINT, performing cleanup...");
      this.performGC(true);
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("\n🛑 Received SIGTERM, performing cleanup...");
      this.performGC(true);
      process.exit(0);
    });

    process.on("uncaughtException", (error) => {
      console.error("💥 Uncaught exception:", error);
      this.performGC(true);
      process.exit(1);
    });

    process.on("unhandledRejection", (reason) => {
      console.error("💥 Unhandled rejection:", reason);
    });
  }
}

// 2. Advanced Buffer Operations
class BufferManager {
  // Demonstrate Buffer.allocUnsafe (performance-focused)
  static createFastBuffer(size: number): Buffer {
    console.log(`📊 Creating fast buffer of ${size} bytes using allocUnsafe`);
    return Buffer.allocUnsafe(size);
  }

  // Safe buffer creation
  static createSafeBuffer(size: number): Buffer {
    console.log(`📊 Creating safe buffer of ${size} bytes using alloc`);
    return Buffer.alloc(size);
  }

  // Buffer performance comparison
  static async compareBufferPerformance(size = 1024 * 1024): Promise<void> {
    console.log(`🏁 Comparing buffer performance (${size} bytes)...`);

    // Test allocUnsafe
    const unsafeStart = performance.now();
    const unsafeBuffer = Buffer.allocUnsafe(size);
    unsafeBuffer.fill("A");
    const unsafeEnd = performance.now();

    // Test alloc
    const safeStart = performance.now();
    const safeBuffer = Buffer.alloc(size);
    safeBuffer.fill("B");
    const safeEnd = performance.now();

    console.log(`⚡ allocUnsafe: ${(unsafeEnd - unsafeStart).toFixed(2)}ms`);
    console.log(`🛡️  alloc: ${(safeEnd - safeStart).toFixed(2)}ms`);
    console.log(
      `📈 Performance improvement: ${((safeEnd - safeStart) / (unsafeEnd - unsafeStart)).toFixed(2)}x`
    );
  }
}

// 3. FFI Demonstration (if available)
class FFIDemonstration {
  static async demonstrateFFI(): Promise<void> {
    try {
      console.log("🔗 Demonstrating Bun FFI capabilities...");

      // This would work with a native library
      // For demo purposes, we'll show the structure
      const libPath = `./native-lib.${suffix}`;
      console.log(`📁 Would load library from: ${libPath}`);

      // Example of how to use FFI (commented out as we don't have a native lib)
      /*
      const { symbols: { nativeFunction }, ...lib } = dlopen(libPath, {
        nativeFunction: {
          args: [FFIType.ptr, FFIType.i32],
          returns: FFIType.i32,
        },
      });

      const result = nativeFunction(ptr, 42);
      console.log(`🔗 Native function result: ${result}`);
      lib.close();
      */

      console.log(
        "✅ FFI structure demonstrated (requires native library to execute)"
      );
    } catch (error) {
      console.log(
        "⚠️  FFI demo requires native library (structure shown above)"
      );
    }
  }
}

// 4. Advanced Server with Process Control
const processController = new ProcessController();

const server = serve({
  port: 3000,

  async fetch(req) {
    const url = new URL(req.url);

    try {
      switch (url.pathname) {
        case "/":
          return new Response(await getHomePage(), {
            headers: { "Content-Type": "text/html" },
          });

        case "/api/metrics":
          return new Response(
            JSON.stringify(processController.getProcessMetrics()),
            {
              headers: { "Content-Type": "application/json" },
            }
          );

        case "/api/system":
          return new Response(
            JSON.stringify(processController.getSystemInfo()),
            {
              headers: { "Content-Type": "application/json" },
            }
          );

        case "/api/gc":
          const force = url.searchParams.get("force") === "true";
          const gcStats = processController.performGC(force);
          return new Response(JSON.stringify(gcStats), {
            headers: { "Content-Type": "application/json" },
          });

        case "/api/buffer/performance":
          await BufferManager.compareBufferPerformance();
          return new Response(JSON.stringify({ status: "completed" }), {
            headers: { "Content-Type": "application/json" },
          });

        case "/api/ffi":
          await FFIDemonstration.demonstrateFFI();
          return new Response(JSON.stringify({ status: "completed" }), {
            headers: { "Content-Type": "application/json" },
          });

        case "/health":
          return new Response(
            JSON.stringify({
              status: "healthy",
              timestamp: new Date(),
              pid: process.pid,
              uptime: processController.getProcessMetrics().uptime,
            }),
            {
              headers: { "Content-Type": "application/json" },
            }
          );

        default:
          return new Response("Not Found", { status: 404 });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return new Response(`Error: ${errorMessage}`, { status: 500 });
    }
  },
});

// 5. Dynamic HTML Generation
async function getHomePage(): Promise<string> {
  const metrics = processController.getProcessMetrics();
  const systemInfo = processController.getSystemInfo();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Advanced Bun Process Control Dashboard</title>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
    <style>
        body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #1e40af; }
        .metric-label { color: #64748b; margin-top: 5px; }
        .controls { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
        button { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px; }
        button:hover { background: #2563eb; }
        .system-info { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .info-item { padding: 10px; background: #f1f5f9; border-radius: 4px; }
        .info-label { font-weight: bold; color: #374151; }
        .info-value { color: #6b7280; }
    </style>
</head>
<body x-data="{ metrics: ${JSON.stringify(metrics)}, systemInfo: ${JSON.stringify(systemInfo)} }">
    <div class="container">
        <div class="header">
            <h1>🔧 Advanced Bun Process Control Dashboard</h1>
            <p>Runtime & Process Control demonstration with zero external dependencies</p>
        </div>

        <div class="metrics">
            <div class="metric-card">
                <div class="metric-value" x-text="(metrics.memory.heapUsed / 1024 / 1024).toFixed(1) + ' MB'"></div>
                <div class="metric-label">Heap Used</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" x-text="metrics.pid"></div>
                <div class="metric-label">Process ID</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" x-text="metrics.uptime.toFixed(1) + 's'"></div>
                <div class="metric-label">Uptime</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" x-text="metrics.gcStats.collections"></div>
                <div class="metric-label">GC Collections</div>
            </div>
        </div>

        <div class="controls">
            <h2>🎛️ Process Controls</h2>
            <button @click="fetch('/api/gc').then(r => r.json()).then(data => { alert('GC completed: ' + data.collections + ' collections'); refreshMetrics(); })">
                🧹 Run Garbage Collection
            </button>
            <button @click="fetch('/api/gc?force=true').then(r => r.json()).then(data => { alert('Force GC completed: ' + data.collections + ' collections'); refreshMetrics(); })">
                🧹 Force Garbage Collection
            </button>
            <button @click="fetch('/api/buffer/performance').then(r => r.json()).then(() => { alert('Buffer performance test completed - check console'); })">
                📊 Test Buffer Performance
            </button>
            <button @click="fetch('/api/ffi').then(r => r.json()).then(() => { alert('FFI demonstration completed - check console'); })">
                🔗 Demonstrate FFI
            </button>
        </div>

        <div class="system-info">
            <h2>💻 System Information</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Platform</div>
                    <div class="info-value" x-text="systemInfo.platform"></div>
                </div>
                <div class="info-item">
                    <div class="info-label">Architecture</div>
                    <div class="info-value" x-text="systemInfo.arch"></div>
                </div>
                <div class="info-item">
                    <div class="info-label">Bun Version</div>
                    <div class="info-value" x-text="systemInfo.bunVersion"></div>
                </div>
                <div class="info-item">
                    <div class="info-label">CPU Count</div>
                    <div class="info-value" x-text="systemInfo.cpuCount"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        function refreshMetrics() {
            fetch('/api/metrics')
                .then(r => r.json())
                .then(data => {
                    window.Alpine.store().metrics = data;
                });
        }

        // Auto-refresh metrics every 2 seconds
        setInterval(refreshMetrics, 2000);
    </script>
</body>
</html>`;
  return html;
}

// 6. Background Tasks and Monitoring
console.log("🚀 Starting Advanced Bun Process Control Server...");
console.log(`📊 Process ID: ${process.pid}`);
console.log(`🔧 Bun Version: ${Bun.version}`);
console.log(`💻 Platform: ${process.platform}-${process.arch}`);

// Start periodic monitoring
setInterval(() => {
  const metrics = processController.getProcessMetrics();

  // Auto-GC if memory usage is high
  if (metrics.memory.heapUsed > 100 * 1024 * 1024) {
    // 100MB
    console.log("⚠️  High memory usage detected, running auto-GC...");
    processController.performGC();
  }
}, 10000); // Every 10 seconds

// Performance demonstration
setTimeout(async () => {
  console.log("🎯 Running performance demonstrations...");
  await BufferManager.compareBufferPerformance(512 * 1024); // 512KB
  await FFIDemonstration.demonstrateFFI();
}, 2000);

console.log(`✅ Server running at http://localhost:3000`);
console.log("🎛️  Process Control Features:");
console.log("  • Manual garbage collection with Bun.gc()");
console.log("  • Advanced memory monitoring");
console.log("  • Buffer performance comparison");
console.log("  • FFI capabilities demonstration");
console.log("  • Process event handling");
console.log("  • System information gathering");
console.log("  • Background task monitoring");
