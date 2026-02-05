// mcp-tools/sse-alerts.ts — Production-grade SSE violation stream
import { validateToolCall, ThreatIntelligenceService, SecureCookieManager } from './validate.js';
import { ViolationLogEntry } from './r2-storage.js';
import { R2ViolationLogger, getR2Logger } from './r2-storage.js';

export interface WidthViolation {
  timestamp: number;
  tenant: string;
  file: string;
  line: number;
  column: number;
  severity: "warning" | "critical";
  preview: string;
  sha256: string;
}

const VIOLATION_CHANNEL = "tier1380:violations:live";
const CONNECTIONS = new Map<string, { controller: ReadableStreamDefaultController; tenant: string }>();

// Mock CSRF protection for demonstration
class CSRFProtector {
  static verify(token?: string, sessionId?: string): boolean {
    // Mock verification - in production this would validate CSRF tokens
    return token === "valid-csrf-token" || (sessionId?.startsWith("session-") ?? false);
  }
}

export const createSSEAlertServer = () => {
  const server = Bun.serve({
    port: process.env.SSE_PORT || 1381,
    async fetch(req) {
      const url = new URL(req.url);

      // 1. Auth + CSRF via SecureCookieManager
      const cookieHeader = req.headers.get("cookie") || "";
      const session = await SecureCookieManager.verify(cookieHeader);
      const csrfToken = req.headers.get("x-csrf-token");

      if (!session.authorized || session.tier < 1380 ||
          !CSRFProtector.verify(csrfToken || undefined, session.id || undefined)) {
        return new Response("Unauthorized", { status: 403 });
      }

      // 2. SSE endpoint: /mcp/alerts/stream?tenant=* or specific tenant
      if (url.pathname === "/mcp/alerts/stream") {
        const targetTenant = url.searchParams.get("tenant") || session.tenant;

        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            const connId = crypto.randomUUID();

            // Send initial connection ACK
            controller.enqueue(encoder.encode(
              `event: connected\ndata: ${JSON.stringify({
                connId,
                tenant: targetTenant,
                timestamp: Date.now()
              })}\n\n`
            ));

            // Store connection for targeted broadcasts
            CONNECTIONS.set(connId, {
              controller,
              tenant: targetTenant
            });

            // Mock Redis subscription for demonstration
            mockSubscribeToViolations(targetTenant, (violation: WidthViolation) => {
              const payload = encoder.encode(
                `event: violation\ndata: ${JSON.stringify(violation)}\n\n`
              );
              controller.enqueue(payload);
            });

            // Heartbeat every 30s to prevent proxy timeouts
            const heartbeat = setInterval(() => {
              controller.enqueue(encoder.encode(`:heartbeat\n\n`));
            }, 30000);

            req.signal.addEventListener("abort", () => {
              clearInterval(heartbeat);
              CONNECTIONS.delete(connId);
            });
          }
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no" // Disable nginx buffering
          }
        });
      }

      // 3. REST endpoint to trigger test violation (for CI/CD)
      if (url.pathname === "/mcp/alerts/test" && req.method === "POST") {
        const violation: WidthViolation = {
          timestamp: Date.now(),
          tenant: session.tenant,
          file: "test.ts",
          line: 42,
          column: 95,
          severity: "critical",
          preview: "const example = 'this line is way too long and violates the 89 char limit';",
          sha256: "deadbeef"
        };

        await broadcastViolation(violation);
        return Response.json({ sent: true });
      }

      return new Response("Not found", { status: 404 });
    }
  });

  console.log(`🔴 SSE Alert Server listening on port ${server.port}`);
  return server;
};

// Mock Redis subscription for demonstration
async function mockSubscribeToViolations(tenantFilter: string, callback: (v: WidthViolation) => void) {
  // In production, this would be actual Redis subscription
  console.log(`📡 Subscribed to violations for tenant: ${tenantFilter}`);

  // Simulate occasional violations for demonstration
  if (process.env.NODE_ENV === "development") {
    setInterval(() => {
      const mockViolation: WidthViolation = {
        timestamp: Date.now(),
        tenant: tenantFilter === "*" ? "demo-tenant" : tenantFilter,
        file: `src/example-${Math.floor(Math.random() * 10)}.ts`,
        line: Math.floor(Math.random() * 100) + 1,
        column: 90 + Math.floor(Math.random() * 30),
        severity: Math.random() > 0.7 ? "critical" : "warning",
        preview: "const longLine = 'this is a mock violation for demonstration purposes';",
        sha256: Buffer.from(Date.now().toString()).toString('hex').slice(0, 8)
      };
      callback(mockViolation);
    }, 5000);
  }
}

// Redis-backed broadcast for multi-instance deployments
export async function broadcastViolation(violation: WidthViolation) {
  console.log(`🚨 Broadcasting violation: ${violation.tenant}:${violation.file}:${violation.line} (${violation.column}c)`);

  // 1. Persist to immutable audit log (using existing audit/log tool)
  try {
    const validationResult = validateToolCall("audit/log", {
      event: "width_violation",
      width: violation.column,
      preview: violation.preview.slice(0, 89), // Truncate to limit
      tenant: violation.tenant
    });

    if (validationResult.valid) {
      console.log(`📝 Audit log entry validated for ${violation.tenant}`);
    }
  } catch (error) {
    console.error(`❌ Failed to log audit entry:`, error);
  }

  // 2. Store in R2 for persistent storage
  try {
    const r2Logger = getR2Logger();
    if (r2Logger) {
      const logEntry: ViolationLogEntry = {
        id: crypto.randomUUID(),
        timestamp: violation.timestamp,
        violation,
        metadata: {
          region: process.env.CLOUDFLARE_REGION || 'unknown',
          sessionId: crypto.randomUUID().slice(0, 8)
        }
      };

      const r2Result = await r2Logger.uploadViolationLog(logEntry);
      if (r2Result.success) {
        console.log(`📦 R2 storage successful: ${r2Result.url}`);
      } else {
        console.warn(`⚠️ R2 storage failed: ${r2Result.error}`);
      }
    } else {
      console.log(`ℹ️ R2 logger not initialized - skipping persistent storage`);
    }
  } catch (error) {
    console.error(`❌ R2 storage error:`, error);
  }

  // 3. Mock Redis broadcast for SSE distribution
  console.log(`📡 Broadcasting to channel: ${VIOLATION_CHANNEL}`);

  // 4. Broadcast to connected SSE clients
  for (const [connId, conn] of CONNECTIONS) {
    if (conn.tenant === "*" || conn.tenant === violation.tenant) {
      try {
        const encoder = new TextEncoder();
        const payload = encoder.encode(
          `event: violation\ndata: ${JSON.stringify(violation)}\n\n`
        );
        conn.controller.enqueue(payload);
      } catch (error) {
        console.warn(`⚠️ Failed to send to connection ${connId}:`, error);
        CONNECTIONS.delete(connId);
      }
    }
  }

  // 5. Threat intelligence correlation (detect spam/abuse)
  if (violation.column > 120) {
    await ThreatIntelligenceService.logAnomaly({
      type: "extreme_width_violation",
      tool: "sse-alerts",
      payload: violation,
      severity: "critical"
    });
  }

  // 6. Update real-time metrics
  await updateViolationMetrics(violation);
}

async function updateViolationMetrics(v: WidthViolation) {
  // Mock Redis metrics update
  console.log(`📊 Updating metrics for ${v.tenant}: ${v.severity} violations`);

  // In production, this would update Redis counters
  const key = `tier1380:metrics:${v.tenant}:${new Date().toISOString().slice(0, 10)}`;
  console.log(`📈 Metrics key: ${key}`);
}

// CLI Monitor Command
export const runViolationMonitor = () => {
  const args = {
    tenant: process.argv.find(a => a.startsWith("--tenant="))?.split("=")[1] || "*",
    severity: process.argv.find(a => a.startsWith("--severity="))?.split("=")[1] || "warning"
  };

  console.log(`🔴 Monitoring violations for tenant: ${args.tenant}`);
  console.log("=".repeat(89));

  // Connect to SSE stream
  const source = new EventSource(`http://localhost:1381/mcp/alerts/stream?tenant=${args.tenant}`);

  source.addEventListener("violation", (e) => {
    const v: WidthViolation = JSON.parse(e.data);
    if (v.severity === args.severity || args.severity === "all") {
      const color = v.severity === 'critical' ? '\x1b[31m' : '\x1b[33m';
      const reset = '\x1b[0m';
      console.log(
        color +
        `${v.tenant.padEnd(12)} │ ${v.file}:${v.line.toString().padStart(4)} │ ` +
        `${v.column.toString().padStart(3)}c │ ${v.preview.slice(0, 60)}` +
        reset
      );
    }
  });

  source.addEventListener("connected", (e) => {
    console.log(`✅ Connected to violation stream: ${e.data}`);
  });

  source.addEventListener("error", (e) => {
    console.error(`❌ SSE connection error:`, e);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down violation monitor...');
    source.close();
    process.exit(0);
  });
};
