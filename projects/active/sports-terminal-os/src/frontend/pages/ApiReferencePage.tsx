/**
 * ApiReferencePage — API Documentation
 *
 * Interactive API reference for all 93+ endpoints:
 *   - Grouped by category (Auth, Players, Agents, Risk, Webhooks, etc.)
 *   - Method badges, path, description, auth requirement
 *   - Expandable: request params, response shape, example curl
 *   - Search/filter by category or endpoint name
 *   - Dark theme, clean documentation layout
 */

import React, { useState, useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EndpointDoc {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "WS";
  path: string;
  description: string;
  auth: "none" | "optional" | "required" | "admin";
  category: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  response?: string;
  example?: string;
}

// ---------------------------------------------------------------------------
// Endpoint data (generated from router.ts)
// ---------------------------------------------------------------------------

const ENDPOINTS: EndpointDoc[] = [
  // Zone 4: Health & Metrics
  { method: "GET", path: "/api/health", description: "Basic health check", auth: "none", category: "Health", response: '{"status":"ok","version":"5.2.0","timestamp":"2026-01-12T00:00:00.000Z"}', example: "curl http://localhost:3000/api/health" },
  { method: "GET", path: "/api/health/ready", description: "Readiness probe for K8s", auth: "none", category: "Health", response: '{"ready":true,"checks":{"database":"ok"}}', example: "curl http://localhost:3000/api/health/ready" },
  { method: "GET", path: "/api/health/live", description: "Liveness probe for K8s", auth: "none", category: "Health", response: '{"alive":true}', example: "curl http://localhost:3000/api/health/live" },
  { method: "GET", path: "/api/health/detailed", description: "Detailed health with all checks", auth: "admin", category: "Health", response: '{"status":"ok","checks":{...},"uptime":3600}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/health/detailed" },
  { method: "GET", path: "/api/metrics", description: "Prometheus-compatible metrics", auth: "none", category: "Metrics", response: '# HELP ...', example: "curl http://localhost:3000/api/metrics" },
  { method: "GET", path: "/api/benchmark", description: "Performance benchmark", auth: "optional", category: "Metrics", response: '{"dbRoundTripMs":2.5,"timestamp":"..."}', example: "curl http://localhost:3000/api/benchmark" },
  // Auth
  { method: "POST", path: "/api/proxy/auth", description: "Authenticate via proxy", auth: "none", category: "Auth", params: [{ name: "username", type: "string", required: true, description: "Login username" }, { name: "password", type: "string", required: true, description: "Password" }], response: '{"token":"...","sessionId":"...","expiresAt":...}', example: "curl -X POST -d '{\"username\":\"admin\",\"password\":\"***\"}' http://localhost:3000/api/proxy/auth" },
  { method: "POST", path: "/api/proxy/renewToken", description: "Renew authentication token", auth: "optional", category: "Auth", params: [{ name: "sessionId", type: "string", required: true, description: "Current session ID" }], response: '{"token":"...","expiresAt":...}', example: "curl -X POST -d '{\"sessionId\":\"...\"}' http://localhost:3000/api/proxy/renewToken" },
  { method: "GET", path: "/api/proxy/accountInfo", description: "Get account information", auth: "optional", category: "Auth", response: '{"id":"...","login":"...","balance":0}', example: "curl 'http://localhost:3000/api/proxy/accountInfo?sessionId=...'" },
  // Zone 1: Sportsbook
  { method: "GET", path: "/api/sportsbook/odds", description: "List all sportsbook odds", auth: "required", category: "Sportsbook", response: '{"odds":[],"total":0,"updatedAt":"..."}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/sportsbook/odds" },
  { method: "GET", path: "/api/sportsbook/odds/:id", description: "Get odds by event ID", auth: "required", category: "Sportsbook", response: '{"id":"...","event":"...","lines":[]}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/sportsbook/odds/abc123" },
  { method: "POST", path: "/api/sportsbook/odds", description: "Upsert odds data", auth: "required", category: "Sportsbook", params: [{ name: "eventId", type: "string", required: true, description: "Event identifier" }, { name: "lines", type: "array", required: true, description: "Array of line objects" }], response: '{"upserted":true,"id":"..."}', example: "curl -X POST -H 'Authorization: Bearer <token>' -d '{...}' http://localhost:3000/api/sportsbook/odds" },
  { method: "GET", path: "/api/sportsbook/health", description: "Sportsbook book health status", auth: "required", category: "Sportsbook", response: '{"books":[{"name":"...","status":"healthy"}]}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/sportsbook/health" },
  { method: "GET", path: "/api/sportsbook/best-lines", description: "Get best available lines", auth: "required", category: "Sportsbook", response: '{"bestLines":[],"count":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/sportsbook/best-lines" },
  { method: "GET", path: "/api/sportsbook/line-movements", description: "Get line movement history", auth: "required", category: "Sportsbook", response: '{"movements":[],"eventId":"..."}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/sportsbook/line-movements" },
  { method: "POST", path: "/api/sportsbook/refresh", description: "Trigger odds refresh", auth: "required", category: "Sportsbook", response: '{"refreshed":true,"count":42}', example: "curl -X POST -H 'Authorization: Bearer <token>' http://localhost:3000/api/sportsbook/refresh" },
  // Zone 3: Prediction Markets
  { method: "GET", path: "/api/prediction-markets", description: "List prediction markets", auth: "required", category: "Prediction Markets", response: '{"markets":[],"total":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/prediction-markets" },
  { method: "GET", path: "/api/prediction-markets/:id", description: "Get market detail", auth: "required", category: "Prediction Markets", response: '{"id":"...","marketName":"...","prices":{...}}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/prediction-markets/abc123" },
  { method: "GET", path: "/api/prediction-markets/providers", description: "List prediction providers", auth: "required", category: "Prediction Markets", response: '{"providers":["kalshi","polymarket","predictit","betfair"]}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/prediction-markets/providers" },
  { method: "GET", path: "/api/prediction-markets/arbitrage", description: "Get arbitrage opportunities", auth: "required", category: "Prediction Markets", response: '{"opportunities":[],"count":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/prediction-markets/arbitrage" },
  { method: "POST", path: "/api/prediction-markets/refresh", description: "Refresh prediction markets", auth: "required", category: "Prediction Markets", response: '{"refreshed":true,"count":12}', example: "curl -X POST -H 'Authorization: Bearer <token>' http://localhost:3000/api/prediction-markets/refresh" },
  { method: "GET", path: "/api/prediction-markets/categories", description: "List market categories", auth: "required", category: "Prediction Markets", response: '{"categories":["politics","sports","crypto","economics","entertainment"]}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/prediction-markets/categories" },
  { method: "GET", path: "/api/prediction-markets/stats", description: "Market statistics", auth: "required", category: "Prediction Markets", response: '{"totalMarkets":0,"totalVolume":0,"lastUpdated":"..."}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/prediction-markets/stats" },
  { method: "GET", path: "/api/prediction-markets/depth/:id", description: "Market depth data", auth: "required", category: "Prediction Markets", response: '{"marketId":"...","yesBids":[],"yesAsks":[]}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/prediction-markets/depth/abc123" },
  { method: "GET", path: "/api/prediction-markets/history/:id", description: "Price history for market", auth: "required", category: "Prediction Markets", response: '{"history":[],"marketId":"..."}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/prediction-markets/history/abc123" },
  { method: "POST", path: "/api/prediction-markets/arbitrage/:id/execute", description: "Execute arbitrage trade", auth: "required", category: "Prediction Markets", params: [{ name: "side", type: "string", required: true, description: "yes or no" }, { name: "amount", type: "number", required: true, description: "Trade amount" }], response: '{"executed":true,"profit":0.05}', example: "curl -X POST -H 'Authorization: Bearer <token>' -d '{\"side\":\"yes\",\"amount\":100}' http://localhost:3000/api/prediction-markets/arbitrage/abc123/execute" },
  // Players
  { method: "GET", path: "/api/players/search", description: "Search players", auth: "required", category: "Players", params: [{ name: "q", type: "string", required: false, description: "Search query" }, { name: "limit", type: "number", required: false, description: "Result limit" }], response: '{"players":[],"total":0}', example: "curl -H 'Authorization: Bearer <token>' 'http://localhost:3000/api/players/search?q=john'" },
  { method: "GET", path: "/api/players/:id", description: "Get player detail", auth: "required", category: "Players", response: '{"id":"...","login":"...","balance":0,"riskTier":"GREEN"}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/players/player123" },
  { method: "GET", path: "/api/players-search", description: "Advanced player search", auth: "required", category: "Players", response: '{"players":[],"total":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/players-search" },
  // Proxy Data
  { method: "GET", path: "/api/proxy/players", description: "List proxy players", auth: "required", category: "Proxy", response: '{"players":[],"total":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/proxy/players" },
  { method: "GET", path: "/api/proxy/wagers", description: "List proxy wagers", auth: "required", category: "Proxy", response: '{"wagers":[],"total":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/proxy/wagers" },
  { method: "GET", path: "/api/proxy/pending", description: "Get pending wagers/exposure", auth: "required", category: "Proxy", response: '{"pendingWagers":[],"totalPendingExposure":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/proxy/pending" },
  { method: "GET", path: "/api/proxy/agentPerformance", description: "Get agent performance data", auth: "required", category: "Proxy", response: '{"performances":[],"total":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/proxy/agentPerformance" },
  { method: "GET", path: "/api/proxy/agentDownline", description: "Get agent downline", auth: "required", category: "Proxy", response: '{"agents":[],"total":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/proxy/agentDownline" },
  { method: "GET", path: "/api/proxy/agentBilling", description: "Get agent billing data", auth: "required", category: "Proxy", response: '{"billing":[],"total":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/proxy/agentBilling" },
  // Agent Decisions
  { method: "POST", path: "/api/agent/analyze-live", description: "Run live AI analysis on player", auth: "required", category: "AI Agent", params: [{ name: "playerId", type: "string", required: true, description: "Player ID" }], response: '{"playerId":"...","riskTier":"GREEN","riskScore":0.25}', example: "curl -X POST -H 'Authorization: Bearer <token>' -d '{\"playerId\":\"p123\"}' http://localhost:3000/api/agent/analyze-live" },
  { method: "POST", path: "/api/agent/extract-features", description: "Extract player features", auth: "required", category: "AI Agent", params: [{ name: "playerId", type: "string", required: true, description: "Player ID" }], response: '{"playerId":"...","features":{},"archetype":"recreational"}', example: "curl -X POST -H 'Authorization: Bearer <token>' -d '{\"playerId\":\"p123\"}' http://localhost:3000/api/agent/extract-features" },
  { method: "GET", path: "/api/agent/rules", description: "List agent rules", auth: "required", category: "AI Agent", response: '{"rules":[],"total":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/agent/rules" },
  { method: "POST", path: "/api/agent/rules", description: "Create agent rule", auth: "admin", category: "AI Agent", params: [{ name: "name", type: "string", required: true, description: "Rule name" }, { name: "condition", type: "object", required: true, description: "Rule condition" }], response: '{"id":"...","name":"...","createdAt":"..."}', example: "curl -X POST -H 'Authorization: Bearer <token>' -d '{\"name\":\"...\",\"condition\":{...}}' http://localhost:3000/api/agent/rules" },
  { method: "DELETE", path: "/api/agent/rules/:id", description: "Delete agent rule", auth: "admin", category: "AI Agent", example: "curl -X DELETE -H 'Authorization: Bearer <token>' http://localhost:3000/api/agent/rules/rule123" },
  // IP Intelligence
  { method: "GET", path: "/api/agent/ip-tracking", description: "List IP tracking records", auth: "required", category: "IP Intelligence", response: '{"ips":[],"total":0,"flagged":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/agent/ip-tracking" },
  { method: "GET", path: "/api/agent/ip-tracking/:ip", description: "Get IP tracking detail", auth: "required", category: "IP Intelligence", response: '{"ipAddress":"...","playerIds":[],"players":[]}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/agent/ip-tracking/1.2.3.4" },
  { method: "POST", path: "/api/agent/ip-block", description: "Block an IP address", auth: "admin", category: "IP Intelligence", params: [{ name: "ipAddress", type: "string", required: true, description: "IP to block" }, { name: "reason", type: "string", required: false, description: "Block reason" }], response: '{"id":"...","ipAddress":"...","status":"active"}', example: "curl -X POST -H 'Authorization: Bearer <token>' -d '{\"ipAddress\":\"1.2.3.4\"}' http://localhost:3000/api/agent/ip-block" },
  // Rules Engine
  { method: "GET", path: "/api/rules", description: "List all rules", auth: "required", category: "Rules", response: '{"rules":[],"total":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/rules" },
  { method: "POST", path: "/api/rules", description: "Create a rule", auth: "admin", category: "Rules", response: '{"id":"...","createdAt":"..."}', example: "curl -X POST -H 'Authorization: Bearer <token>' -d '{...}' http://localhost:3000/api/rules" },
  { method: "DELETE", path: "/api/rules/:id", description: "Delete a rule", auth: "admin", category: "Rules", example: "curl -X DELETE -H 'Authorization: Bearer <token>' http://localhost:3000/api/rules/rule123" },
  // Risk
  { method: "POST", path: "/api/positions/generate", description: "Generate risk positions", auth: "required", category: "Risk", response: '{"positions":[],"generated":0}', example: "curl -X POST -H 'Authorization: Bearer <token>' http://localhost:3000/api/positions/generate" },
  { method: "GET", path: "/api/dashboard/metrics", description: "Get dashboard metrics", auth: "required", category: "Risk", response: '{"totalExposure":0,"activePositions":0,"alertsToday":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/dashboard/metrics" },
  { method: "POST", path: "/api/enforcement/apply-limit", description: "Apply enforcement limit", auth: "admin", category: "Risk", response: '{"enforcementId":"...","status":"applied"}', example: "curl -X POST -H 'Authorization: Bearer <token>' -d '{...}' http://localhost:3000/api/enforcement/apply-limit" },
  { method: "POST", path: "/api/enforcement/auto-enforce", description: "Trigger auto-enforcement", auth: "admin", category: "Risk", response: '{"autoEnforced":0}', example: "curl -X POST -H 'Authorization: Bearer <token>' http://localhost:3000/api/enforcement/auto-enforce" },
  // Kimi AI
  { method: "POST", path: "/api/kimi/chat", description: "Chat with Kimi AI", auth: "required", category: "AI", params: [{ name: "message", type: "string", required: true, description: "Chat message" }, { name: "context", type: "object", required: false, description: "Additional context" }], response: '{"message":{"role":"assistant","content":"..."},"model":"kimi"}', example: "curl -X POST -H 'Authorization: Bearer <token>' -d '{\"message\":\"Hello\"}' http://localhost:3000/api/kimi/chat" },
  // Sandbox
  { method: "POST", path: "/api/sandbox/v2/save", description: "Save sandbox scenario", auth: "required", category: "Sandbox", response: '{"scenarioId":"...","saved":true}', example: "curl -X POST -H 'Authorization: Bearer <token>' -d '{...}' http://localhost:3000/api/sandbox/v2/save" },
  { method: "POST", path: "/api/sandbox/v2/ab-test", description: "Create A/B test", auth: "required", category: "Sandbox", response: '{"testId":"...","status":"created"}', example: "curl -X POST -H 'Authorization: Bearer <token>' -d '{...}' http://localhost:3000/api/sandbox/v2/ab-test" },
  { method: "POST", path: "/api/sandbox/v2/generate-summaries", description: "Generate summaries", auth: "required", category: "Sandbox", response: '{"summaries":[],"generated":0}', example: "curl -X POST -H 'Authorization: Bearer <token>' http://localhost:3000/api/sandbox/v2/generate-summaries" },
  // Vault
  { method: "GET", path: "/api/vault/secrets", description: "List secrets (names only)", auth: "admin", category: "Vault", response: '{"secrets":[],"total":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/vault/secrets" },
  { method: "POST", path: "/api/vault/secrets", description: "Store a secret", auth: "admin", category: "Vault", params: [{ name: "key", type: "string", required: true, description: "Secret name" }, { name: "value", type: "string", required: true, description: "Secret value" }], response: '{"key":"...","createdAt":"..."}', example: "curl -X POST -H 'Authorization: Bearer <token>' -d '{\"key\":\"API_KEY\",\"value\":\"***\"}' http://localhost:3000/api/vault/secrets" },
  { method: "DELETE", path: "/api/vault/secrets/:key", description: "Delete a secret", auth: "admin", category: "Vault", example: "curl -X DELETE -H 'Authorization: Bearer <token>' http://localhost:3000/api/vault/secrets/API_KEY" },
  // Export
  { method: "GET", path: "/api/export/:type", description: "Export data as CSV", auth: "required", category: "Export", response: "CSV data", example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/export/players > players.csv" },
  // Telegram
  { method: "GET", path: "/api/health/system-status", description: "Get system status for Telegram", auth: "none", category: "Telegram", response: '{"status":"ok","bots":[],"queues":[]}', example: "curl http://localhost:3000/api/health/system-status" },
  { method: "GET", path: "/api/telegram/delivery-stats", description: "Get Telegram delivery stats", auth: "admin", category: "Telegram", response: '{"stats":[],"total":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/telegram/delivery-stats" },
  { method: "GET", path: "/api/telegram/bot/:botId/stats", description: "Get bot statistics", auth: "admin", category: "Telegram", response: '{"botId":"...","messagesSent":0,"errors":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/telegram/bot/bot123/stats" },
  { method: "GET", path: "/api/telegram/bot/:botId/delivery-log", description: "Get bot delivery log", auth: "admin", category: "Telegram", response: '{"logs":[],"total":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/telegram/bot/bot123/delivery-log" },
  { method: "GET", path: "/api/telegram/topics-status", description: "Get Telegram topics status", auth: "admin", category: "Telegram", response: '{"topics":[],"total":0}', example: "curl -H 'Authorization: Bearer <token>' http://localhost:3000/api/telegram/topics-status" },
  { method: "POST", path: "/api/admin/bots/refresh", description: "Refresh bot configuration", auth: "admin", category: "Admin", response: '{"refreshed":true,"count":0}', example: "curl -X POST -H 'Authorization: Bearer <token>' http://localhost:3000/api/admin/bots/refresh" },
  // Streams
  { method: "GET", path: "/api/stream/live-wagers", description: "SSE live wager stream", auth: "none", category: "Streams", response: "SSE events", example: "curl -N http://localhost:3000/api/stream/live-wagers" },
  // WebSocket
  { method: "WS", path: "/ws", description: "WebSocket real-time connection", auth: "none", category: "WebSocket", response: "WS messages", example: "wscat -c ws://localhost:3000/ws" },
];

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const CATEGORIES = Array.from(new Set(ENDPOINTS.map((e) => e.category)));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ApiReferencePage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);

  const filteredEndpoints = useMemo(() => {
    let result = ENDPOINTS;
    if (selectedCategory !== "All") {
      result = result.filter((e) => e.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.path.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.method.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [search, selectedCategory]);

  const grouped = useMemo(() => {
    const map: Record<string, EndpointDoc[]> = {};
    for (const ep of filteredEndpoints) {
      if (!map[ep.category]) map[ep.category] = [];
      map[ep.category].push(ep);
    }
    return map;
  }, [filteredEndpoints]);

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET": return "#4caf50";
      case "POST": return "#4a9eff";
      case "PUT": return "#ff9800";
      case "DELETE": return "#f44336";
      case "PATCH": return "#9c27b0";
      default: return "#6a6a80";
    }
  };

  const getAuthBadge = (auth: string) => {
    switch (auth) {
      case "none": return { label: "PUBLIC", color: "#4caf50" };
      case "optional": return { label: "OPTIONAL", color: "#ff9800" };
      case "required": return { label: "AUTH", color: "#4a9eff" };
      case "admin": return { label: "ADMIN", color: "#f44336" };
      default: return { label: auth.toUpperCase(), color: "#6a6a80" };
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 1200 }}>
      <h1>API Reference</h1>
      <p className="page-description">
        Complete reference for all {ENDPOINTS.length}+ endpoints. Search or filter by category.
      </p>

      {/* Search + Filter */}
      <div className="api-ref-filters">
        <input
          type="text"
          placeholder="Search endpoints..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="api-ref-search"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="api-ref-category-select"
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="api-ref-count">{filteredEndpoints.length} endpoints</span>
      </div>

      {/* Endpoints by category */}
      {Object.entries(grouped).map(([category, endpoints]) => (
        <div key={category} className="api-ref-category">
          <h2 className="api-ref-category-title">{category}</h2>
          <div className="api-ref-list">
            {endpoints.map((ep) => {
              const key = `${ep.method}-${ep.path}`;
              const isExpanded = expandedEndpoint === key;
              const authBadge = getAuthBadge(ep.auth);

              return (
                <div key={key} className={`api-ref-item ${isExpanded ? "expanded" : ""}`}>
                  <div
                    className="api-ref-summary"
                    onClick={() => setExpandedEndpoint(isExpanded ? null : key)}
                  >
                    <span
                      className="api-ref-method"
                      style={{ background: `${getMethodColor(ep.method)}20`, color: getMethodColor(ep.method), borderColor: `${getMethodColor(ep.method)}40` }}
                    >
                      {ep.method}
                    </span>
                    <code className="api-ref-path">{ep.path}</code>
                    <span className="api-ref-desc">{ep.description}</span>
                    <span
                      className="api-ref-auth-badge"
                      style={{ background: `${authBadge.color}20`, color: authBadge.color }}
                    >
                      {authBadge.label}
                    </span>
                    <span className="api-ref-toggle">{isExpanded ? "▾" : "▸"}</span>
                  </div>

                  {isExpanded && (
                    <div className="api-ref-detail">
                      {ep.params && ep.params.length > 0 && (
                        <div className="api-ref-section">
                          <h4>Parameters</h4>
                          <table className="api-ref-params-table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Required</th>
                                <th>Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ep.params.map((p) => (
                                <tr key={p.name}>
                                  <td><code>{p.name}</code></td>
                                  <td><span className="api-ref-type">{p.type}</span></td>
                                  <td>{p.required ? "Yes" : "No"}</td>
                                  <td>{p.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {ep.response && (
                        <div className="api-ref-section">
                          <h4>Response</h4>
                          <pre className="api-ref-code">{ep.response}</pre>
                        </div>
                      )}
                      {ep.example && (
                        <div className="api-ref-section">
                          <h4>Example</h4>
                          <pre className="api-ref-code api-ref-curl">{ep.example}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ApiReferencePage;
