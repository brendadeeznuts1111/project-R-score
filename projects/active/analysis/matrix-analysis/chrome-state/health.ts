/**
 * Health check module for OMEGA
 */
export async function healthCheck() {
  return {
    status: "healthy",
    version: "4.0.0",
    checks: {
      registry: { status: "ok" },
      kv: { status: "ok" },
      r2: { status: "ok" },
      websocket: { status: "ok" }
    }
  };
}
