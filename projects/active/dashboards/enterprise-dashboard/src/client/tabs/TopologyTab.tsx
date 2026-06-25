import { useState, useEffect, useMemo, useRef } from "react";
import { showGlobalToast } from "../hooks/useToast";
import type { ApiResponse } from "../types";

// =============================================================================
// Performance Metrics Types
// =============================================================================

interface RenderMetrics {
  nodesRendered: number;
  edgesRendered: number;
  frameTime: number;
  memoryUsage: number | null; // MB, Chrome only
  lastUpdate: number;
}

// =============================================================================
// Types (matching server topology.ts)
// =============================================================================

interface Route {
  path: string;
  methods: string[];
  group: string;
  auth: string;
  risk: number;
  devOnly?: boolean;
}

interface TopologyNode {
  id: string;
  label: string;
  group: string;
  type: "group" | "route";
  risk: number;
  auth: string;
  methods?: string[];
  devOnly?: boolean;
}

interface TopologyLink {
  source: string;
  target: string;
  type: "contains" | "depends";
}

interface TopologyGraph {
  nodes: TopologyNode[];
  links: TopologyLink[];
}

interface TopologyStats {
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

interface TopologyData {
  routes: Route[];
  grouped: Record<string, Route[]>;
  stats: TopologyStats;
  graph: TopologyGraph;
  timestamp: string;
}


// =============================================================================
// Constants
// =============================================================================

const RISK_LABELS = ["None", "Low", "Medium", "High", "Critical", "Severe"] as const;

const RISK_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", border: "border-green-400" },
  1: { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-700 dark:text-cyan-400", border: "border-cyan-400" },
  2: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-400" },
  3: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", border: "border-purple-400" },
  4: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", border: "border-red-400" },
  5: { bg: "bg-red-200 dark:bg-red-900/50", text: "text-red-800 dark:text-red-300", border: "border-red-600" },
};

const GROUP_ICONS: Record<string, string> = {
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

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-500",
  POST: "bg-green-500",
  PUT: "bg-yellow-500",
  DELETE: "bg-red-500",
  PATCH: "bg-purple-500",
};

// =============================================================================
// Component
// =============================================================================

export const TopologyTab: React.FC = () => {
  const [data, setData] = useState<TopologyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"tree" | "table" | "risk">("tree");
  const [riskFilter, setRiskFilter] = useState<number | null>(null);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showMetrics, setShowMetrics] = useState(false);
  const [metrics, setMetrics] = useState<RenderMetrics>({
    nodesRendered: 0,
    edgesRendered: 0,
    frameTime: 0,
    memoryUsage: null,
    lastUpdate: Date.now(),
  });
  const renderStartRef = useRef<number>(performance.now());

  // Fetch topology data
  const fetchTopology = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (riskFilter !== null) params.set("risk", riskFilter.toString());
      if (groupFilter) params.set("group", groupFilter);

      const response = await fetch(`/api/topology?${params}`);
      const result: ApiResponse<TopologyData> = await response.json();
      if (result.data) {
        setData(result.data);
        // Expand all groups by default
        setExpandedGroups(new Set(Object.keys(result.data.grouped)));
      } else if (result.error) {
        showGlobalToast(result.error, "error");
      }
    } catch (error: any) {
      showGlobalToast(`Failed to fetch topology: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopology();
  }, [riskFilter, groupFilter]);

  // Filter routes by search query
  const filteredRoutes = useMemo(() => {
    if (!data) return [];
    let routes = data.routes;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      routes = routes.filter(
        (r) =>
          r.path.toLowerCase().includes(query) ||
          r.group.toLowerCase().includes(query) ||
          r.auth.toLowerCase().includes(query) ||
          r.methods.some((m) => m.toLowerCase().includes(query))
      );
    }

    return routes;
  }, [data, searchQuery]);

  // Group filtered routes
  const filteredGrouped = useMemo(() => {
    return filteredRoutes.reduce((acc, route) => {
      if (!acc[route.group]) acc[route.group] = [];
      acc[route.group].push(route);
      return acc;
    }, {} as Record<string, Route[]>);
  }, [filteredRoutes]);

  // Track render metrics
  useEffect(() => {
    if (!data) return;

    const groups = Object.keys(filteredGrouped);
    const routeCount = filteredRoutes.length;

    // Calculate nodes: groups + routes
    const nodesRendered = groups.length + routeCount;
    // Calculate edges: each route connects to its group
    const edgesRendered = routeCount;

    // Frame time since render started
    const frameTime = performance.now() - renderStartRef.current;

    // Memory usage (Chrome only, non-standard)
    const perfMemory = (performance as any).memory;
    const memoryUsage = perfMemory?.usedJSHeapSize
      ? perfMemory.usedJSHeapSize / 1024 / 1024
      : null;

    setMetrics({
      nodesRendered,
      edgesRendered,
      frameTime,
      memoryUsage,
      lastUpdate: Date.now(),
    });

    // Reset render start for next update
    renderStartRef.current = performance.now();
  }, [data, filteredRoutes, filteredGrouped]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (data) {
      setExpandedGroups(new Set(Object.keys(data.grouped)));
    }
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          🗺️ Route Topology
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMetrics((v) => !v)}
            className={`px-3 py-2 rounded-lg transition-colors ${
              showMetrics
                ? "bg-purple-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
            title="Toggle performance metrics"
          >
            📊
          </button>
          <button
            onClick={fetchTopology}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Performance Metrics Panel */}
      {showMetrics && (
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm shadow-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-purple-400">📊</span>
            <span className="text-gray-300 font-semibold">Render Metrics</span>
            <span className="text-gray-600 text-xs ml-auto">
              {new Date(metrics.lastUpdate).toLocaleTimeString()}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricItem label="Nodes" value={metrics.nodesRendered} unit="" />
            <MetricItem label="Edges" value={metrics.edgesRendered} unit="" />
            <MetricItem label="Frame Time" value={metrics.frameTime.toFixed(2)} unit="ms" />
            <MetricItem
              label="Heap Memory"
              value={metrics.memoryUsage?.toFixed(2) ?? "N/A"}
              unit={metrics.memoryUsage ? "MB" : ""}
              dim={!metrics.memoryUsage}
            />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard label="Routes" value={data.stats.totalRoutes} icon="🛤️" />
          <StatCard label="Groups" value={data.stats.totalGroups} icon="📦" />
          <StatCard label="Authenticated" value={data.stats.authenticated} icon="🔒" />
          <StatCard label="Public" value={data.stats.unauthenticated} icon="🔓" />
          <StatCard
            label="High Risk"
            value={data.stats.highRisk}
            icon="⚠️"
            highlight={data.stats.highRisk > 0}
          />
          <StatCard
            label="Exposed High"
            value={data.stats.unauthHighRisk}
            icon="🚨"
            highlight={data.stats.unauthHighRisk > 0}
            danger
          />
        </div>
      )}

      {/* Filters & View Toggle */}
      <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search routes, groups, methods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Risk Filter */}
        <select
          value={riskFilter ?? ""}
          onChange={(e) => setRiskFilter(e.target.value ? parseInt(e.target.value) : null)}
          className="px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
        >
          <option value="">All Risk Levels</option>
          {RISK_LABELS.map((label, i) => (
            <option key={i} value={i}>
              {label} ({i})
            </option>
          ))}
        </select>

        {/* Group Filter */}
        {data && (
          <select
            value={groupFilter ?? ""}
            onChange={(e) => setGroupFilter(e.target.value || null)}
            className="px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">All Groups</option>
            {Object.keys(data.grouped)
              .sort()
              .map((group) => (
                <option key={group} value={group}>
                  {GROUP_ICONS[group] || "•"} {group}
                </option>
              ))}
          </select>
        )}

        {/* View Mode */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {(["tree", "table", "risk"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === mode
                  ? "bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {mode === "tree" ? "🌳 Tree" : mode === "table" ? "📋 Table" : "🎯 Risk"}
            </button>
          ))}
        </div>
      </div>

      {/* Content Views */}
      {viewMode === "tree" && (
        <TreeView
          grouped={filteredGrouped}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          expandAll={expandAll}
          collapseAll={collapseAll}
        />
      )}

      {viewMode === "table" && <TableView routes={filteredRoutes} />}

      {viewMode === "risk" && data && <RiskView stats={data.stats} routes={filteredRoutes} />}
    </div>
  );
};

// =============================================================================
// Sub-components
// =============================================================================

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: string;
  highlight?: boolean;
  danger?: boolean;
}> = ({ label, value, icon, highlight, danger }) => (
  <div
    className={`p-4 rounded-lg shadow ${
      danger && highlight
        ? "bg-red-100 dark:bg-red-900/30 border border-red-400"
        : highlight
        ? "bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400"
        : "bg-white dark:bg-gray-800"
    }`}
  >
    <div className="text-2xl mb-1">{icon}</div>
    <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{value}</div>
    <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
  </div>
);

const TreeView: React.FC<{
  grouped: Record<string, Route[]>;
  expandedGroups: Set<string>;
  toggleGroup: (group: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
}> = ({ grouped, expandedGroups, toggleGroup, expandAll, collapseAll }) => {
  const groups = Object.keys(grouped).sort();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Actions */}
      <div className="flex gap-2 p-4 border-b dark:border-gray-700">
        <button
          onClick={expandAll}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          Expand All
        </button>
        <span className="text-gray-400">|</span>
        <button
          onClick={collapseAll}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          Collapse All
        </button>
      </div>

      {/* Tree */}
      <div className="divide-y dark:divide-gray-700">
        {groups.map((group) => {
          const routes = grouped[group];
          const isExpanded = expandedGroups.has(group);
          const maxRisk = Math.max(...routes.map((r) => r.risk));
          const hasAuth = routes.some((r) => r.auth !== "none");

          return (
            <div key={group}>
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span
                  className={`transform transition-transform ${isExpanded ? "rotate-90" : ""}`}
                >
                  ▶
                </span>
                <span className="text-xl">{GROUP_ICONS[group] || "•"}</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{group}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({routes.length} routes)
                </span>
                {hasAuth && <span className="text-yellow-600">🔒</span>}
                <RiskBadge risk={maxRisk} />
              </button>

              {/* Routes */}
              {isExpanded && (
                <div className="bg-gray-50 dark:bg-gray-900/50">
                  {routes.map((route, i) => (
                    <div
                      key={route.path}
                      className="flex items-center gap-3 px-4 py-2 pl-14 border-t border-gray-100 dark:border-gray-800"
                    >
                      <MethodBadges methods={route.methods} />
                      <span className="font-mono text-sm text-gray-700 dark:text-gray-300 flex-1">
                        {route.path}
                      </span>
                      {route.auth !== "none" && (
                        <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                          🔒 {route.auth}
                        </span>
                      )}
                      <RiskBadge risk={route.risk} />
                      {route.devOnly && (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          dev
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TableView: React.FC<{ routes: Route[] }> = ({ routes }) => {
  const [sortKey, setSortKey] = useState<keyof Route>("path");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    return [...routes].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [routes, sortKey, sortDir]);

  const toggleSort = (key: keyof Route) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <Th onClick={() => toggleSort("path")} active={sortKey === "path"}>
                Path
              </Th>
              <Th onClick={() => toggleSort("methods" as any)} active={false}>
                Methods
              </Th>
              <Th onClick={() => toggleSort("group")} active={sortKey === "group"}>
                Group
              </Th>
              <Th onClick={() => toggleSort("auth")} active={sortKey === "auth"}>
                Auth
              </Th>
              <Th onClick={() => toggleSort("risk")} active={sortKey === "risk"}>
                Risk
              </Th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {sorted.map((route) => (
              <tr key={route.path} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-mono text-sm text-gray-700 dark:text-gray-300">
                  {route.path}
                  {route.devOnly && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500">
                      dev
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <MethodBadges methods={route.methods} />
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="mr-1">{GROUP_ICONS[route.group] || "•"}</span>
                  {route.group}
                </td>
                <td className="px-4 py-3 text-sm">
                  {route.auth === "none" ? (
                    <span className="text-gray-400">public</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs">
                      🔒 {route.auth}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <RiskBadge risk={route.risk} showLabel />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const RiskView: React.FC<{ stats: TopologyStats; routes: Route[] }> = ({ stats, routes }) => {
  const riskGroups = useMemo(() => {
    const groups: Record<number, Route[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (const route of routes) {
      groups[route.risk].push(route);
    }
    return groups;
  }, [routes]);

  return (
    <div className="space-y-6">
      {/* Risk Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Risk Distribution
        </h3>
        <div className="space-y-3">
          {RISK_LABELS.map((label, risk) => {
            const count = stats.byRisk[risk] || 0;
            const pct = stats.totalRoutes > 0 ? (count / stats.totalRoutes) * 100 : 0;
            const colors = RISK_COLORS[risk];

            return (
              <div key={risk} className="flex items-center gap-3">
                <div className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {label}
                </div>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors.bg} ${colors.border} border-r-2 transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="w-12 text-sm text-gray-600 dark:text-gray-400 text-right">
                  {count}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Average Risk Score:{" "}
            <span className="font-bold text-gray-800 dark:text-gray-200">
              {stats.avgRiskScore.toFixed(2)} / 5.0
            </span>
          </div>
        </div>
      </div>

      {/* High Risk Routes */}
      {(riskGroups[4].length > 0 || riskGroups[5].length > 0) && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-6 border border-red-200 dark:border-red-800">
          <h3 className="text-lg font-semibold mb-4 text-red-800 dark:text-red-400">
            ⚠️ Critical & Severe Risk Routes
          </h3>
          <div className="space-y-2">
            {[...riskGroups[5], ...riskGroups[4]].map((route) => (
              <div
                key={route.path}
                className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded"
              >
                <RiskBadge risk={route.risk} />
                <MethodBadges methods={route.methods} />
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300 flex-1">
                  {route.path}
                </span>
                {route.auth === "none" ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300">
                    🔓 EXPOSED
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                    🔒 {route.auth}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exposed Unauthenticated Routes with Risk >= 3 */}
      {stats.unauthHighRisk > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg shadow p-6 border border-orange-200 dark:border-orange-800">
          <h3 className="text-lg font-semibold mb-4 text-orange-800 dark:text-orange-400">
            🚨 Exposed High-Risk Routes (No Auth)
          </h3>
          <div className="space-y-2">
            {routes
              .filter((r) => r.risk >= 3 && r.auth === "none")
              .map((route) => (
                <div
                  key={route.path}
                  className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded"
                >
                  <RiskBadge risk={route.risk} />
                  <MethodBadges methods={route.methods} />
                  <span className="font-mono text-sm text-gray-700 dark:text-gray-300 flex-1">
                    {route.path}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {route.group}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Utility Components
// =============================================================================

const Th: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
}> = ({ children, onClick, active }) => (
  <th
    onClick={onClick}
    className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
      active ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
    }`}
  >
    {children}
  </th>
);

const RiskBadge: React.FC<{ risk: number; showLabel?: boolean }> = ({ risk, showLabel }) => {
  const colors = RISK_COLORS[risk];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      {showLabel ? RISK_LABELS[risk] : risk}
    </span>
  );
};

const MethodBadges: React.FC<{ methods: string[] }> = ({ methods }) => (
  <div className="flex gap-1">
    {methods.map((method) => (
      <span
        key={method}
        className={`px-1.5 py-0.5 rounded text-xs font-medium text-white ${
          METHOD_COLORS[method] || "bg-gray-500"
        }`}
      >
        {method}
      </span>
    ))}
  </div>
);

const MetricItem: React.FC<{
  label: string;
  value: string | number;
  unit: string;
  dim?: boolean;
}> = ({ label, value, unit, dim }) => (
  <div className={dim ? "opacity-50" : ""}>
    <div className="text-gray-500 text-xs uppercase tracking-wide">{label}</div>
    <div className="text-lg">
      <span className="text-green-400">{value}</span>
      {unit && <span className="text-gray-600 text-sm ml-1">{unit}</span>}
    </div>
  </div>
);

export default TopologyTab;
