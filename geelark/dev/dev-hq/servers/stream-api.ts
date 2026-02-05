/**
 * Stream Monitoring API for BunFile Stream Management
 *
 * Provides real-time statistics for stdin, stdout, stderr and file I/O metrics
 */

import { Bun } from "bun";

// ============================================================================
// Types
// ============================================================================

interface StreamStats {
  stdin: {
    size: number;
    available: boolean;
    isTTY: boolean;
  };
  stdout: {
    size: number;
    buffered: number;
  };
  stderr: {
    size: number;
    lastError?: string;
  };
}

interface FileIOMetrics {
  readOperations: number;
  writeOperations: number;
  totalBytesRead: number;
  totalBytesWritten: number;
  avgReadTime: number;
  avgWriteTime: number;
  copyFileRangeUsage: boolean;
  sendfileUsage: boolean;
  clonefileUsage: boolean;
}

// ============================================================================
// Metrics Storage
// ============================================================================

class FileIOMonitor {
  private readOperations: number = 0;
  private writeOperations: number = 0;
  private totalBytesRead: number = 0;
  private totalBytesWritten: number = 0;
  private readTimes: number[] = [];
  private writeTimes: number[] = [];
  private lastError?: string;

  recordRead(bytes: number, duration: number): void {
    this.readOperations++;
    this.totalBytesRead += bytes;
    this.readTimes.push(duration);

    // Keep only last 100 measurements
    if (this.readTimes.length > 100) {
      this.readTimes.shift();
    }
  }

  recordWrite(bytes: number, duration: number): void {
    this.writeOperations++;
    this.totalBytesWritten += bytes;
    this.writeTimes.push(duration);

    // Keep only last 100 measurements
    if (this.writeTimes.length > 100) {
      this.writeTimes.shift();
    }
  }

  recordError(error: string): void {
    this.lastError = error;
  }

  getMetrics(): FileIOMetrics {
    const avgReadTime = this.readTimes.length > 0
      ? this.readTimes.reduce((a, b) => a + b, 0) / this.readTimes.length
      : 0;

    const avgWriteTime = this.writeTimes.length > 0
      ? this.writeTimes.reduce((a, b) => a + b, 0) / this.writeTimes.length
      : 0;

    return {
      readOperations: this.readOperations,
      writeOperations: this.writeOperations,
      totalBytesRead: this.totalBytesRead,
      totalBytesWritten: this.totalBytesWritten,
      avgReadTime,
      avgWriteTime,
      copyFileRangeUsage: process.platform === 'linux',
      sendfileUsage: process.platform === 'linux',
      clonefileUsage: process.platform === 'darwin'
    };
  }

  reset(): void {
    this.readOperations = 0;
    this.writeOperations = 0;
    this.totalBytesRead = 0;
    this.totalBytesWritten = 0;
    this.readTimes = [];
    this.writeTimes = [];
    this.lastError = undefined;
  }
}

const monitor = new FileIOMonitor();

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * GET /api/streams/stats
 *
 * Returns real-time statistics for stdin, stdout, stderr
 */
export async function getStreamStats(): Promise<Response> {
  try {
    const stats: StreamStats = {
      stdin: {
        size: Bun.stdin.size,
        available: Bun.stdin.size > 0,
        isTTY: process.stdin.isTTY
      },
      stdout: {
        size: Bun.stdout.size,
        buffered: 0 // Would need to track FileSink instances
      },
      stderr: {
        size: Bun.stderr.size,
        lastError: undefined // Could be populated from monitor
      }
    };

    return Response.json(stats);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * GET /api/file-io/metrics
 *
 * Returns file I/O performance metrics
 */
export async function getFileIOMetrics(): Promise<Response> {
  try {
    const metrics = monitor.getMetrics();
    return Response.json(metrics);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * POST /api/file-io/reset
 *
 * Resets file I/O metrics
 */
export async function resetFileIOMetrics(): Promise<Response> {
  try {
    monitor.reset();
    return Response.json({ success: true, message: "Metrics reset" });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * POST /api/streams/validate
 *
 * Validates input size against maximum allowed
 */
export async function validateInputSize(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const maxSize = body.maxSize || 16 * 1024 * 1024; // Default 16MB

    const stdinSize = Bun.stdin.size;

    if (stdinSize > maxSize) {
      return new Response(
        JSON.stringify({
          valid: false,
          size: stdinSize,
          error: `Input too large: ${stdinSize} bytes (max: ${maxSize})`
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return Response.json({
      valid: true,
      size: stdinSize,
      remaining: maxSize - stdinSize
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * POST /api/streams/flush
 *
 * Flushes stdout buffer
 */
export async function flushStdout(): Promise<Response> {
  try {
    await Bun.write(Bun.stdout, ""); // Trigger flush
    return Response.json({ success: true, message: "Stdout flushed" });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Wrap Bun.file() to monitor reads
 */
export async function monitoredRead(path: string): Promise<BunFile> {
  const file = Bun.file(path);
  const startTime = performance.now();

  try {
    // Read file
    await file.arrayBuffer();

    const duration = performance.now() - startTime;
    monitor.recordRead(file.size, duration);

    return file;
  } catch (error) {
    monitor.recordError(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Wrap Bun.write() to monitor writes
 */
export async function monitoredWrite(
  destination: string | BunFile,
  data: string | Blob | ArrayBuffer | TypedArray
): Promise<number> {
  const startTime = performance.now();

  try {
    const bytesWritten = await Bun.write(destination, data);
    const duration = performance.now() - startTime;

    monitor.recordWrite(bytesWritten, duration);

    return bytesWritten;
  } catch (error) {
    monitor.recordError(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Get Stream Monitor instance
 */
export function getMonitor(): FileIOMonitor {
  return monitor;
}

// ============================================================================
// CORS Headers for API
// ============================================================================

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Setup stream monitoring routes
 */
export function setupStreamRoutes(server: any): void {
  // Stream stats
  server.get("/api/streams/stats", async () => {
    const response = await getStreamStats();
    return new Response(response.body, {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": response.headers.get("Content-Type")! }
    });
  });

  // File I/O metrics
  server.get("/api/file-io/metrics", async () => {
    const response = await getFileIOMetrics();
    return new Response(response.body, {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": response.headers.get("Content-Type")! }
    });
  });

  // Reset metrics
  server.post("/api/file-io/reset", async () => {
    const response = await resetFileIOMetrics();
    return new Response(response.body, {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": response.headers.get("Content-Type")! }
    });
  });

  // Validate input size
  server.post("/api/streams/validate", async (req: Request) => {
    const response = await validateInputSize(req);
    return new Response(response.body, {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": response.headers.get("Content-Type")! }
    });
  });

  // Flush stdout
  server.post("/api/streams/flush", async () => {
    const response = await flushStdout();
    return new Response(response.body, {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": response.headers.get("Content-Type")! }
    });
  });

  // OPTIONS for CORS
  server.options("/api/streams/*", () => new Response(null, { headers: corsHeaders }));
  server.options("/api/file-io/*", () => new Response(null, { headers: corsHeaders }));
}

export { monitor, FileIOMonitor };
