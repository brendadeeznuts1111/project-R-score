/**
 * Route Topology Data & Analysis
 *
 * Shared module for route topology visualization.
 * Used by both CLI (scripts/topology.ts) and API (/api/topology).
 */

// =============================================================================
// Route Data Types
// =============================================================================

export interface Route {
  path: string;
  methods: string[];
  group: string;
  auth: string;
  risk: number; // 0-5: none, low, medium, high, critical, severe
  devOnly?: boolean;
}

export interface TopologyNode {
  id: string;
  label: string;
  group: string;
  type: "group" | "route";
  risk: number;
  auth: string;
  methods?: string[];
  devOnly?: boolean;
  x?: number;
  y?: number;
}

export interface TopologyLink {
  source: string;
  target: string;
  type: "contains" | "depends";
}

export interface TopologyGraph {
  nodes: TopologyNode[];
  links: TopologyLink[];
}

export interface TopologyStats {
  totalRoutes: number;
  totalGroups: number;
  byMethod: Record<string, number>;
  byRisk: Record<number, number>;
  authenticated: number;
  unauthenticated: number;
  highRisk: number;
  unauthHighRisk: number;
  avgRiskScore: number;
}

// =============================================================================
// Route Definitions (extracted from router.ts and index.ts)
// =============================================================================

export const ROUTES: Route[] = [
  // Core
  { path: "/health", methods: ["GET"], group: "health", auth: "none", risk: 0 },
  { path: "/api/dashboard", methods: ["GET"], group: "dashboard", auth: "none", risk: 0 },
  { path: "/api/stats", methods: ["GET"], group: "dashboard", auth: "none", risk: 0 },
  { path: "/api/routes", methods: ["GET"], group: "api", auth: "none", risk: 0 },
  { path: "/api/health-check", methods: ["GET"], group: "health", auth: "none", risk: 0 },
  { path: "/api/rescan", methods: ["POST"], group: "api", auth: "none", risk: 1 },

  // Projects
  { path: "/api/projects", methods: ["GET"], group: "projects", auth: "projects:read", risk: 1 },
  { path: "/api/projects/:id", methods: ["GET"], group: "projects", auth: "projects:read", risk: 1 },
  { path: "/api/projects/:id/open", methods: ["POST"], group: "projects", auth: "projects:write", risk: 3 },
  { path: "/api/projects/:id/git", methods: ["POST"], group: "projects", auth: "projects:write", risk: 4 },
  { path: "/api/integrity/:name", methods: ["GET"], group: "projects", auth: "projects:read", risk: 1 },

  // System
  { path: "/api/system", methods: ["GET"], group: "system", auth: "system:read", risk: 2 },
  { path: "/api/system/live", methods: ["GET"], group: "system", auth: "system:read", risk: 1 },
  { path: "/api/system/port/:port", methods: ["GET"], group: "system", auth: "system:read", risk: 2 },
  { path: "/api/system/gc", methods: ["POST"], group: "system", auth: "system:write", risk: 3 },
  { path: "/api/system/enhanced", methods: ["GET"], group: "system", auth: "system:read", risk: 2 },
  { path: "/api/system/queue", methods: ["GET"], group: "system", auth: "system:read", risk: 1 },

  // Network
  { path: "/api/network/stats", methods: ["GET"], group: "network", auth: "none", risk: 0 },
  { path: "/api/network/status", methods: ["GET"], group: "network", auth: "none", risk: 0 },
  { path: "/api/network/prefetch", methods: ["POST"], group: "network", auth: "none", risk: 1 },
  { path: "/api/network/preconnect", methods: ["POST"], group: "network", auth: "none", risk: 1 },
  { path: "/api/network/prefetch/batch", methods: ["POST"], group: "network", auth: "none", risk: 1 },
  { path: "/api/network/probe/:hostId", methods: ["POST"], group: "network", auth: "none", risk: 2 },
  { path: "/api/network/latency-test", methods: ["POST"], group: "network", auth: "none", risk: 1 },
  { path: "/api/network/clear", methods: ["POST"], group: "network", auth: "none", risk: 2 },
  { path: "/api/network/optimizations", methods: ["GET"], group: "network", auth: "none", risk: 0 },

  // Database
  { path: "/api/db/stats", methods: ["GET"], group: "database", auth: "database:read", risk: 2 },
  { path: "/api/db/metrics", methods: ["GET"], group: "database", auth: "database:read", risk: 2 },
  { path: "/api/db/activity", methods: ["GET"], group: "database", auth: "database:read", risk: 2 },
  { path: "/api/db/settings", methods: ["GET"], group: "database", auth: "database:read", risk: 2 },
  { path: "/api/db/settings/:key", methods: ["GET", "PUT"], group: "database", auth: "database:read", risk: 3 },
  { path: "/api/db/cleanup", methods: ["POST"], group: "database", auth: "database:write", risk: 4 },
  { path: "/api/db/vacuum", methods: ["POST"], group: "database", auth: "database:write", risk: 4 },

  // PTY
  { path: "/api/pty/sessions", methods: ["GET"], group: "pty", auth: "pty:access", risk: 3 },
  { path: "/api/pty/create", methods: ["POST"], group: "pty", auth: "pty:access", risk: 5 },
  { path: "/api/pty/session/:id", methods: ["GET"], group: "pty", auth: "pty:access", risk: 3 },
  { path: "/api/pty/session/:id/output", methods: ["GET"], group: "pty", auth: "pty:access", risk: 3 },
  { path: "/api/pty/session/:id/write", methods: ["POST"], group: "pty", auth: "pty:access", risk: 5 },
  { path: "/api/pty/session/:id/resize", methods: ["POST"], group: "pty", auth: "pty:access", risk: 2 },
  { path: "/api/pty/session/:id/kill", methods: ["DELETE"], group: "pty", auth: "pty:access", risk: 3 },
  { path: "/api/pty/exec", methods: ["POST"], group: "pty", auth: "pty:access", risk: 5 },

  // Admin
  { path: "/api/admin/sessions", methods: ["GET", "POST", "DELETE"], group: "admin", auth: "admin", risk: 4 },
  { path: "/api/admin/api-keys", methods: ["GET", "POST"], group: "admin", auth: "admin", risk: 5 },
  { path: "/api/admin/api-keys/:id", methods: ["GET", "PUT", "DELETE"], group: "admin", auth: "admin", risk: 5 },

  // URLPattern
  { path: "/api/urlpattern/analyze", methods: ["GET"], group: "urlpattern", auth: "urlpattern:read", risk: 1 },
  { path: "/api/urlpattern/test", methods: ["POST"], group: "urlpattern", auth: "none", risk: 1 },
  { path: "/api/urlpattern/report", methods: ["GET"], group: "urlpattern", auth: "urlpattern:read", risk: 1 },
  { path: "/api/urlpattern/patterns", methods: ["GET"], group: "urlpattern", auth: "urlpattern:read", risk: 2 },

  // Peek Cache
  { path: "/api/peek-cache/stats", methods: ["GET"], group: "peek-cache", auth: "urlpattern:read", risk: 1 },
  { path: "/api/peek-cache/warm", methods: ["POST"], group: "peek-cache", auth: "urlpattern:write", risk: 2 },
  { path: "/api/peek-cache/clear", methods: ["POST"], group: "peek-cache", auth: "urlpattern:write", risk: 2 },

  // Config
  { path: "/api/configs", methods: ["GET"], group: "configs", auth: "none", risk: 1 },
  { path: "/api/configs/:name", methods: ["GET"], group: "configs", auth: "none", risk: 1 },
  { path: "/api/configs/validate/:name", methods: ["POST"], group: "configs", auth: "none", risk: 1 },
  { path: "/api/configs/schema/:name", methods: ["GET"], group: "configs", auth: "none", risk: 0 },
  { path: "/api/configs/reload", methods: ["POST"], group: "configs", auth: "none", risk: 3 },

  // Metrics & Analytics
  { path: "/api/metrics/enterprise", methods: ["GET"], group: "metrics", auth: "none", risk: 1 },
  { path: "/api/metrics/enterprise.json", methods: ["GET"], group: "metrics", auth: "none", risk: 1 },
  { path: "/api/server/metrics", methods: ["GET"], group: "metrics", auth: "none", risk: 1 },
  { path: "/api/analytics/matrix", methods: ["GET"], group: "analytics", auth: "none", risk: 1 },
  { path: "/api/analytics/endpoint", methods: ["GET"], group: "analytics", auth: "none", risk: 1 },
  { path: "/api/analytics/projects", methods: ["GET"], group: "analytics", auth: "none", risk: 1 },

  // Anomalies
  { path: "/api/anomalies/detect", methods: ["GET"], group: "anomalies", auth: "none", risk: 1 },
  { path: "/api/anomalies/model", methods: ["GET"], group: "anomalies", auth: "none", risk: 0 },

  // Snapshots
  { path: "/api/snapshot", methods: ["GET", "POST"], group: "snapshots", auth: "none", risk: 2 },
  { path: "/api/snapshots", methods: ["GET"], group: "snapshots", auth: "none", risk: 1 },
  { path: "/api/snapshots/:filename", methods: ["GET"], group: "snapshots", auth: "none", risk: 2 },

  // Session
  { path: "/api/theme", methods: ["GET", "POST"], group: "session", auth: "none", risk: 0 },
  { path: "/api/session", methods: ["GET", "POST"], group: "session", auth: "none", risk: 1 },
  { path: "/api/ui-state", methods: ["GET", "POST"], group: "session", auth: "none", risk: 0 },
  { path: "/api/logout", methods: ["POST"], group: "session", auth: "none", risk: 1 },
  { path: "/api/sync", methods: ["POST"], group: "session", auth: "none", risk: 1 },

  // Export & Logs
  { path: "/api/export/s3", methods: ["POST"], group: "export", auth: "none", risk: 3 },
  { path: "/api/logs/search", methods: ["GET"], group: "logs", auth: "none", risk: 2 },

  // Topology (this endpoint)
  { path: "/api/topology", methods: ["GET"], group: "topology", auth: "none", risk: 0 },

  // Debug (dev-only)
  { path: "/api/debug/cookies", methods: ["GET"], group: "debug", auth: "none", risk: 2, devOnly: true },
  { path: "/api/debug/parse-cookie", methods: ["POST"], group: "debug", auth: "none", risk: 2, devOnly: true },
  { path: "/api/debug/create-cookie", methods: ["POST"], group: "debug", auth: "none", risk: 3, devOnly: true },
];

// =============================================================================
// Group Metadata
// =============================================================================

export const GROUP_ICONS: Record<string, string> = {
  health: "💚",
  dashboard: "📊",
  api: "🔌",
  projects: "📁",
  system: "⚙️",
  network: "🌐",
  database: "🗄️",
  pty: "💻",
  admin: "🔐",
  urlpattern: "🔀",
  "peek-cache": "⚡",
  configs: "📝",
  metrics: "📈",
  analytics: "📉",
  anomalies: "🔍",
  snapshots: "📸",
  session: "👤",
  export: "📤",
  logs: "📋",
  topology: "🗺️",
  debug: "🐛",
};

export const RISK_LABELS = ["None", "Low", "Medium", "High", "Critical", "Severe"] as const;

export const RISK_COLORS: Record<number, string> = {
  0: "#22c55e", // green
  1: "#06b6d4", // cyan
  2: "#eab308", // yellow
  3: "#a855f7", // purple
  4: "#ef4444", // red
  5: "#dc2626", // dark red
};

// =============================================================================
// Topology Graph Builder
// =============================================================================

export interface TopologyOptions {
  includeGuards?: boolean;
  riskFilter?: number | null;
  groupFilter?: string | null;
  sortBy?: "risk" | "group" | "path" | "method";
}

/**
 * Build a topology graph for visualization
 */
export function buildTopologyGraph(options: TopologyOptions = {}): TopologyGraph {
  const { riskFilter, groupFilter } = options;

  // Filter routes
  let routes = [...ROUTES];
  if (riskFilter !== null && riskFilter !== undefined) {
    routes = routes.filter(r => r.risk >= riskFilter);
  }
  if (groupFilter) {
    routes = routes.filter(r => r.group === groupFilter);
  }

  // Get unique groups
  const groups = [...new Set(routes.map(r => r.group))];

  // Build nodes
  const nodes: TopologyNode[] = [];

  // Add group nodes
  for (const group of groups) {
    const groupRoutes = routes.filter(r => r.group === group);
    const maxRisk = Math.max(...groupRoutes.map(r => r.risk));
    nodes.push({
      id: `group:${group}`,
      label: `${GROUP_ICONS[group] || "•"} ${group}`,
      group,
      type: "group",
      risk: maxRisk,
      auth: groupRoutes.some(r => r.auth !== "none") ? "mixed" : "none",
    });
  }

  // Add route nodes
  for (const route of routes) {
    nodes.push({
      id: `route:${route.path}`,
      label: route.path,
      group: route.group,
      type: "route",
      risk: route.risk,
      auth: route.auth,
      methods: route.methods,
      devOnly: route.devOnly,
    });
  }

  // Build links (group -> route)
  const links: TopologyLink[] = [];
  for (const route of routes) {
    links.push({
      source: `group:${route.group}`,
      target: `route:${route.path}`,
      type: "contains",
    });
  }

  return { nodes, links };
}

/**
 * Calculate topology statistics
 */
export function getTopologyStats(routes: Route[] = ROUTES): TopologyStats {
  const byMethod: Record<string, number> = {};
  const byRisk: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const route of routes) {
    // Count methods
    for (const method of route.methods) {
      byMethod[method] = (byMethod[method] || 0) + 1;
    }
    // Count risk levels
    byRisk[route.risk] = (byRisk[route.risk] || 0) + 1;
  }

  const groups = [...new Set(routes.map(r => r.group))];
  const authenticated = routes.filter(r => r.auth !== "none").length;
  const highRisk = routes.filter(r => r.risk >= 4).length;
  const unauthHighRisk = routes.filter(r => r.risk >= 3 && r.auth === "none").length;
  const avgRiskScore = routes.reduce((sum, r) => sum + r.risk, 0) / routes.length;

  return {
    totalRoutes: routes.length,
    totalGroups: groups.length,
    byMethod,
    byRisk,
    authenticated,
    unauthenticated: routes.length - authenticated,
    highRisk,
    unauthHighRisk,
    avgRiskScore,
  };
}

/**
 * Generate DOT format for Graphviz
 */
export function generateDotGraph(options: TopologyOptions = {}): string {
  const graph = buildTopologyGraph(options);
  const lines: string[] = [
    "digraph RouteTopology {",
    "  rankdir=LR;",
    "  node [shape=box, style=rounded];",
    "",
  ];

  // Add group subgraphs
  const groups = [...new Set(graph.nodes.filter(n => n.type === "group").map(n => n.group))];

  for (const group of groups) {
    const groupNode = graph.nodes.find(n => n.id === `group:${group}`);
    const routeNodes = graph.nodes.filter(n => n.type === "route" && n.group === group);

    lines.push(`  subgraph cluster_${group.replace("-", "_")} {`);
    lines.push(`    label="${GROUP_ICONS[group] || ""} ${group}";`);
    lines.push(`    style=filled;`);
    lines.push(`    fillcolor="${groupNode ? RISK_COLORS[groupNode.risk] : "#f0f0f0"}20";`);

    for (const node of routeNodes) {
      const color = RISK_COLORS[node.risk];
      const authLabel = node.auth !== "none" ? " 🔒" : "";
      lines.push(`    "${node.id}" [label="${node.label}${authLabel}", color="${color}", fillcolor="${color}20"];`);
    }

    lines.push("  }");
    lines.push("");
  }

  // Add edges
  for (const link of graph.links) {
    lines.push(`  "${link.source}" -> "${link.target}";`);
  }

  lines.push("}");
  return lines.join("\n");
}

/**
 * Group routes by category for tree view
 */
export function getGroupedRoutes(): Record<string, Route[]> {
  return ROUTES.reduce((acc, route) => {
    if (!acc[route.group]) acc[route.group] = [];
    acc[route.group].push(route);
    return acc;
  }, {} as Record<string, Route[]>);
}

/**
 * Get exposed (unauthenticated) high-risk routes
 */
export function getExposedHighRiskRoutes(minRisk = 3): Route[] {
  return ROUTES.filter(r => r.risk >= minRisk && r.auth === "none");
}
