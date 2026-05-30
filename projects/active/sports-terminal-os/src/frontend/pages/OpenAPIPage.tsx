/**
 * OpenAPIPage — OpenAPI Spec Export
 *
 * Display OpenAPI 3.0 spec in JSON/YAML:
 *   - Download spec file button
 *   - Copy to clipboard
 *   - Basic spec viewer/editor
 */

import React, { useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Generated OpenAPI 3.0 spec
// ---------------------------------------------------------------------------

const OPENAPI_SPEC = {
  openapi: "3.0.3",
  info: {
    title: "Sports Terminal OS API",
    description: "Complete API for the Sports Terminal OS — sports betting risk management platform",
    version: "5.2.0",
    contact: { name: "API Support", email: "api@sportsterminal.local" },
    license: { name: "Proprietary" },
  },
  servers: [
    { url: "http://localhost:3000", description: "Local development" },
    { url: "/", description: "Same-origin" },
  ],
  tags: [
    { name: "Health", description: "Health checks and monitoring" },
    { name: "Auth", description: "Authentication and session management" },
    { name: "Sportsbook", description: "Sportsbook odds and line tracking" },
    { name: "Prediction Markets", description: "Prediction market data and arbitrage" },
    { name: "Players", description: "Player intelligence and search" },
    { name: "AI Agent", description: "AI-powered risk analysis" },
    { name: "IP Intelligence", description: "IP tracking and blocking" },
    { name: "Rules", description: "Rules engine management" },
    { name: "Risk", description: "Risk management and enforcement" },
    { name: "Vault", description: "Secrets management" },
    { name: "Sandbox", description: "Sandbox scenarios and testing" },
    { name: "Telegram", description: "Telegram bot management" },
    { name: "Streams", description: "Real-time data streams" },
    { name: "WebSocket", description: "WebSocket real-time connection" },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Basic health check",
        security: [],
        responses: {
          "200": { description: "System is healthy", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", example: "ok" }, version: { type: "string" }, timestamp: { type: "string" } } } } } },
        },
      },
    },
    "/api/health/ready": {
      get: { tags: ["Health"], summary: "Readiness probe", security: [], responses: { "200": { description: "Ready" } } },
    },
    "/api/health/live": {
      get: { tags: ["Health"], summary: "Liveness probe", security: [], responses: { "200": { description: "Alive" } } },
    },
    "/api/health/detailed": {
      get: { tags: ["Health"], summary: "Detailed health", security: [{ bearerAuth: [] }], responses: { "200": { description: "Detailed health status" } } },
    },
    "/api/metrics": {
      get: { tags: ["Health"], summary: "Prometheus metrics", security: [], responses: { "200": { description: "Prometheus format metrics" } } },
    },
    "/api/proxy/auth": {
      post: { tags: ["Auth"], summary: "Authenticate", security: [], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { username: { type: "string" }, password: { type: "string" } } } } } }, responses: { "200": { description: "Authentication successful" } } },
    },
    "/api/sportsbook/odds": {
      get: { tags: ["Sportsbook"], summary: "List odds", security: [{ bearerAuth: [] }], responses: { "200": { description: "List of odds" } } },
      post: { tags: ["Sportsbook"], summary: "Upsert odds", security: [{ bearerAuth: [] }], responses: { "200": { description: "Odds upserted" } } },
    },
    "/api/sportsbook/refresh": {
      post: { tags: ["Sportsbook"], summary: "Refresh odds", security: [{ bearerAuth: [] }], responses: { "200": { description: "Refresh triggered" } } },
    },
    "/api/prediction-markets": {
      get: { tags: ["Prediction Markets"], summary: "List markets", security: [{ bearerAuth: [] }], responses: { "200": { description: "List of prediction markets" } } },
    },
    "/api/prediction-markets/arbitrage": {
      get: { tags: ["Prediction Markets"], summary: "Get arbitrage opportunities", security: [{ bearerAuth: [] }], responses: { "200": { description: "Arbitrage opportunities" } } },
    },
    "/api/players/search": {
      get: { tags: ["Players"], summary: "Search players", security: [{ bearerAuth: [] }], responses: { "200": { description: "Player search results" } } },
    },
    "/api/agent/analyze-live": {
      post: { tags: ["AI Agent"], summary: "Live AI analysis", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { playerId: { type: "string" } } } } } }, responses: { "200": { description: "Analysis complete" } } },
    },
    "/api/kimi/chat": {
      post: { tags: ["AI Agent"], summary: "Kimi AI chat", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, model: { type: "string" } } } } } }, responses: { "200": { description: "AI response" } } },
    },
    "/api/vault/secrets": {
      get: { tags: ["Vault"], summary: "List secrets", security: [{ bearerAuth: [] }], responses: { "200": { description: "Secrets list (names only)" } } },
      post: { tags: ["Vault"], summary: "Store secret", security: [{ bearerAuth: [] }], responses: { "201": { description: "Secret stored" } } },
    },
    "/api/stream/live-wagers": {
      get: { tags: ["Streams"], summary: "Live wager SSE stream", security: [], responses: { "200": { description: "SSE stream", content: { "text/event-stream": {} } } } },
    },
    "/ws": {
      get: { tags: ["WebSocket"], summary: "WebSocket connection", security: [], responses: { "101": { description: "WebSocket upgrade" } } },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "JWT token obtained from /api/proxy/auth" },
    },
  },
};

// ---------------------------------------------------------------------------
// YAML converter
// ---------------------------------------------------------------------------

function toYaml(obj: unknown, indent = 0): string {
  const spaces = "  ".repeat(indent);
  if (obj === null) return "null";
  if (typeof obj === "string") return obj;
  if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return obj.map((item) => `${spaces}- ${toYaml(item, indent + 1).trimStart()}`).join("\n");
  }
  if (typeof obj === "object") {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return entries.map(([k, v]) => {
      if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        return `${spaces}${k}:\n${toYaml(v, indent + 1)}`;
      }
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object") {
        return `${spaces}${k}:\n${toYaml(v, indent + 1)}`;
      }
      return `${spaces}${k}: ${toYaml(v, 0)}`;
    }).join("\n");
  }
  return String(obj);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const OpenAPIPage: React.FC = () => {
  const [format, setFormat] = useState<"json" | "yaml">("json");
  const [copied, setCopied] = useState(false);

  const specString = format === "json"
    ? JSON.stringify(OPENAPI_SPEC, null, 2)
    : toYaml(OPENAPI_SPEC);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(specString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [specString]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([specString], { type: format === "json" ? "application/json" : "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `openapi.${format === "json" ? "json" : "yaml"}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [specString, format]);

  return (
    <div className="page-container" style={{ maxWidth: 1000 }}>
      <h1>OpenAPI Specification</h1>
      <p className="page-description">
        OpenAPI 3.0 specification for all API endpoints. Export as JSON or YAML.
      </p>

      <div className="openapi-toolbar">
        <div className="openapi-format-toggle">
          <button
            className={`btn btn-sm ${format === "json" ? "btn-primary" : ""}`}
            onClick={() => setFormat("json")}
          >
            JSON
          </button>
          <button
            className={`btn btn-sm ${format === "yaml" ? "btn-primary" : ""}`}
            onClick={() => setFormat("yaml")}
          >
            YAML
          </button>
        </div>
        <div className="openapi-actions">
          <button className="btn btn-sm" onClick={handleCopy}>
            {copied ? "✓ Copied!" : "📋 Copy"}
          </button>
          <button className="btn btn-sm btn-primary" onClick={handleDownload}>
            ⬇ Download
          </button>
        </div>
      </div>

      <pre className="openapi-spec-viewer">{specString}</pre>
    </div>
  );
};

export default OpenAPIPage;
