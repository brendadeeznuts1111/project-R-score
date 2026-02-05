// Full T3-Lattice Registry Implementation from map.md

interface ComponentColor {
  name: string;
  hex: string;
}

interface Component {
  id: number;
  name: string;
  color: ComponentColor;
  slot: string;
  pattern: string;
  method: string;
  bunVersion: string;
  groups: string[];
  views: string[];
  endpoint: string;
  fullUrl: string;
  description: string;
  category: string;
  status: "stable" | "beta" | "experimental";
}

type ComponentCategory = string;

// Dummy components data (24 components based on DEPENDENCY_EDGES)
const COMPONENTS: Component[] = [
  { id: 1, name: "TOML Config", color: { name: "blue", hex: "#1f77b4" }, slot: "/slots/config", pattern: "config/**/*.toml", method: "GET", bunVersion: ">=1.0.0", groups: ["foundation"], views: ["overview", "detail", "expert"], endpoint: "/v3.3/config", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/config", description: "TOML configuration loader", category: "Config", status: "stable" },
  { id: 2, name: "DNS Prefetch", color: { name: "orange", hex: "#ff7f0e" }, slot: "/slots/network", pattern: "dns/**/*", method: "GET", bunVersion: ">=1.0.0", groups: ["network"], views: ["detail", "expert"], endpoint: "/v3.3/dns", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/dns", description: "DNS prefetching", category: "Network", status: "stable" },
  { id: 3, name: "Secrets", color: { name: "green", hex: "#2ca02c" }, slot: "/slots/security", pattern: "secrets/**/*", method: "GET", bunVersion: ">=1.0.0", groups: ["security"], views: ["overview", "detail", "expert"], endpoint: "/v3.3/secrets", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/secrets", description: "Secure secrets management", category: "Security", status: "stable" },
  { id: 4, name: "Fetch/ETag", color: { name: "red", hex: "#d62728" }, slot: "/slots/http", pattern: "http/**/*", method: "GET", bunVersion: ">=1.0.0", groups: ["performance"], views: ["detail", "expert"], endpoint: "/v3.3/fetch", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/fetch", description: "HTTP fetch with ETags", category: "HTTP", status: "stable" },
  { id: 5, name: "Channels", color: { name: "purple", hex: "#9467bd" }, slot: "/slots/channels", pattern: "channels/**/*", method: "GET,POST", bunVersion: ">=1.0.0", groups: ["transformation"], views: ["detail", "expert"], endpoint: "/v3.3/channels", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/channels", description: "Message channels", category: "Channels", status: "stable" },
  { id: 6, name: "SQLite", color: { name: "brown", hex: "#8c564b" }, slot: "/slots/storage", pattern: "db/**/*.db", method: "GET,POST", bunVersion: ">=1.0.0", groups: ["storage"], views: ["overview", "detail", "expert"], endpoint: "/v3.3/sqlite", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/sqlite", description: "SQLite database", category: "Storage", status: "stable" },
  { id: 7, name: "%j Logging", color: { name: "pink", hex: "#e377c2" }, slot: "/slots/logging", pattern: "logs/**/*", method: "POST", bunVersion: ">=1.0.0", groups: ["performance"], views: ["detail", "expert"], endpoint: "/v3.3/logging", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/logging", description: "JSON logging", category: "Logging", status: "stable" },
  { id: 8, name: "Table", color: { name: "gray", hex: "#7f7f7f" }, slot: "/slots/table", pattern: "tables/**/*", method: "GET", bunVersion: ">=1.0.0", groups: ["transformation"], views: ["detail", "expert"], endpoint: "/v3.3/table", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/table", description: "Data tables", category: "Data", status: "stable" },
  { id: 9, name: "S3 Stream", color: { name: "olive", hex: "#bcbd22" }, slot: "/slots/s3", pattern: "s3/**/*", method: "GET,PUT", bunVersion: ">=1.0.0", groups: ["network"], views: ["detail", "expert"], endpoint: "/v3.3/s3", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/s3", description: "S3 streaming", category: "Storage", status: "beta" },
  { id: 10, name: "Proxy", color: { name: "cyan", hex: "#17becf" }, slot: "/slots/proxy", pattern: "proxy/**/*", method: "GET,POST", bunVersion: ">=1.0.0", groups: ["system"], views: ["detail", "expert"], endpoint: "/v3.3/proxy", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/proxy", description: "HTTP proxy", category: "Proxy", status: "stable" },
  { id: 11, name: "Dashboard", color: { name: "magenta", hex: "#e7298a" }, slot: "/slots/dashboard", pattern: "ui/**/*", method: "GET", bunVersion: ">=1.0.0", groups: ["foundation", "ui"], views: ["detail", "expert"], endpoint: "/v3.3/dashboard", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/dashboard", description: "Web dashboard", category: "UI", status: "stable" },
  { id: 12, name: "URLPattern", color: { name: "lime", hex: "#98df8a" }, slot: "/slots/routing", pattern: "routes/**/*", method: "GET", bunVersion: ">=1.0.0", groups: ["transformation"], views: ["detail", "expert"], endpoint: "/v3.3/urlpattern", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/urlpattern", description: "URL pattern matching", category: "Routing", status: "stable" },
  { id: 13, name: "PTY Terminal", color: { name: "teal", hex: "#4e79a7" }, slot: "/slots/terminal", pattern: "tty/**/*", method: "GET,POST", bunVersion: ">=1.0.0", groups: ["foundation"], views: ["detail", "expert"], endpoint: "/v3.3/pty", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/pty", description: "Pseudo-terminal", category: "Terminal", status: "beta" },
  { id: 14, name: "Flags", color: { name: "navy", hex: "#1f77b4" }, slot: "/slots/flags", pattern: "flags/**/*", method: "GET", bunVersion: ">=1.0.0", groups: ["security"], views: ["detail", "expert"], endpoint: "/v3.3/flags", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/flags", description: "Feature flags", category: "Config", status: "stable" },
  { id: 15, name: "HTTP Pool", color: { name: "maroon", hex: "#d62728" }, slot: "/slots/pool", pattern: "pool/**/*", method: "GET,POST", bunVersion: ">=1.0.0", groups: ["network"], views: ["detail", "expert"], endpoint: "/v3.3/pool", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/pool", description: "HTTP connection pool", category: "HTTP", status: "stable" },
  { id: 16, name: "Compile", color: { name: "gold", hex: "#ffbb78" }, slot: "/slots/compile", pattern: "build/**/*", method: "POST", bunVersion: ">=1.0.0", groups: ["system"], views: ["detail", "expert"], endpoint: "/v3.3/compile", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/compile", description: "Code compilation", category: "Build", status: "stable" },
  { id: 17, name: "Timers", color: { name: "silver", hex: "#c7c7c7" }, slot: "/slots/timers", pattern: "timers/**/*", method: "GET", bunVersion: ">=1.0.0", groups: ["performance"], views: ["detail", "expert"], endpoint: "/v3.3/timers", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/timers", description: "Timer utilities", category: "Utils", status: "stable" },
  { id: 18, name: "UUIDv7", color: { name: "coral", hex: "#ff9896" }, slot: "/slots/uuid", pattern: "uuid/**/*", method: "GET", bunVersion: ">=1.0.0", groups: ["transformation"], views: ["detail", "expert"], endpoint: "/v3.3/uuid", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/uuid", description: "UUID generation", category: "Utils", status: "stable" },
  { id: 19, name: "stringWidth", color: { name: "khaki", hex: "#f7b6d2" }, slot: "/slots/string", pattern: "strings/**/*", method: "GET", bunVersion: ">=1.0.0", groups: ["foundation"], views: ["detail", "expert"], endpoint: "/v3.3/stringwidth", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/stringwidth", description: "String width calculation", category: "Utils", status: "stable" },
  { id: 20, name: "V8 APIs", color: { name: "violet", hex: "#c5b0d5" }, slot: "/slots/v8", pattern: "v8/**/*", method: "GET", bunVersion: ">=1.0.0", groups: ["system"], views: ["detail", "expert"], endpoint: "/v3.3/v8", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/v8", description: "V8 engine APIs", category: "Runtime", status: "experimental" },
  { id: 21, name: "Disposition", color: { name: "indigo", hex: "#8c564b" }, slot: "/slots/disposition", pattern: "disposition/**/*", method: "GET", bunVersion: ">=1.0.0", groups: ["system"], views: ["detail", "expert"], endpoint: "/v3.3/disposition", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/disposition", description: "Resource disposition", category: "Utils", status: "stable" },
  { id: 22, name: "Env Exp", color: { name: "turquoise", hex: "#17becf" }, slot: "/slots/env", pattern: "env/**/*", method: "GET", bunVersion: ">=1.0.0", groups: ["performance"], views: ["detail", "expert"], endpoint: "/v3.3/env", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/env", description: "Environment expansion", category: "Config", status: "stable" },
  { id: 23, name: "Bug Fixes", color: { name: "salmon", hex: "#e377c2" }, slot: "/slots/bugs", pattern: "fixes/**/*", method: "GET", bunVersion: ">=1.0.0", groups: ["system"], views: ["detail", "expert"], endpoint: "/v3.3/bugs", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/bugs", description: "Bug fixes collection", category: "Maintenance", status: "stable" },
  { id: 24, name: "Versioning", color: { name: "plum", hex: "#9467bd" }, slot: "/slots/version", pattern: "version/**/*", method: "GET", bunVersion: "any", groups: ["meta"], views: ["overview", "detail", "expert"], endpoint: "/v3.3/version", fullUrl: "https://api.example.com/@scoped/lattice-registry/v3.3/version", description: "Version management", category: "Meta", status: "stable" }
];

// Helper functions
function getComponentById(id: number): Component | undefined {
  return COMPONENTS.find(c => c.id === id);
}

function matchVersion(required: string, current: string): boolean {
  if (required === "any") return true;
  if (required.startsWith(">=")) {
    const reqVer = required.slice(2);
    return compareVersions(current, reqVer) >= 0;
  }
  return current === required;
}

function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const partA = partsA[i] || 0;
    const partB = partsB[i] || 0;
    if (partA > partB) return 1;
    if (partA < partB) return -1;
  }
  return 0;
}

function getComponentsByView(view: string): Component[] {
  const viewConfig = VIEWS[view];
  if (!viewConfig) return [];
  return viewConfig.componentIds.map(id => getComponentById(id)).filter(Boolean) as Component[];
}

function getComponentsByGroup(group: string): Component[] {
  return COMPONENTS.filter(c => c.groups.includes(group));
}

function getComponentsByVersion(bunVersion: string): Component[] {
  return COMPONENTS.filter(c => matchVersion(c.bunVersion, bunVersion));
}

function getComponentsByFeature(feature: string): Component[] {
  // Dummy implementation - would check feature flags
  return COMPONENTS.slice(0, 5);
}

function getComponentEndpoint(id: number): string {
  const comp = getComponentById(id);
  return comp?.endpoint || "";
}

function getComponentFullUrl(id: number): string {
  const comp = getComponentById(id);
  return comp?.fullUrl || "";
}

function getComponentColor(id: number): ComponentColor {
  const comp = getComponentById(id);
  return comp?.color || { name: "unknown", hex: "#000000" };
}

function getLoaderComponents(): Component[] {
  return COMPONENTS.filter(c => c.category === "Config");
}

function getHookComponents(): Component[] {
  return COMPONENTS.filter(c => c.category === "Utils");
}

function getTargetComponents(): Component[] {
  return COMPONENTS.filter(c => c.method.includes("POST"));
}

// Registry Client Implementation
import { randomUUIDv7, CookieMap } from "bun";

interface RegistryClientOptions {
  baseUrl?: string;
  scope?: string;
  version?: string;
  sessionId?: string;
  cacheEnabled?: boolean;
  cacheMaxAge?: number;
  headers?: Record<string, string>;
  timeout?: number;
}

class RegistryClient {
  private baseUrl: string;
  private scope: string;
  private version: string;
  private sessionId: string;
  private cookieMap: CookieMap;
  private cacheEnabled: boolean;
  private cacheMaxAge: number;
  private customHeaders: Record<string, string>;
  private timeout: number;

  constructor(options: RegistryClientOptions = {}) {
    this.baseUrl = options.baseUrl || "https://api.example.com";
    this.scope = options.scope || "@scoped/lattice-registry";
    this.version = options.version || "3.3.0";
    this.sessionId = options.sessionId || randomUUIDv7("base64url");
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.cacheMaxAge = options.cacheMaxAge || 3600;
    this.customHeaders = options.headers || {};
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.cookieMap = new CookieMap();
  }

  private getEndpoint(componentId: number): string {
    const component = COMPONENTS.find(c => c.id === componentId);
    if (!component) throw new Error(`Component ${componentId} not found`);
    return component.endpoint;
  }

  private getFullUrl(componentId: number): string {
    return `${this.baseUrl}/${this.scope}/${this.version}${this.getEndpoint(componentId)}`;
  }

  private getCacheKey(componentId: number): string {
    return `lattice_comp_${componentId}_${this.version}`;
  }

  private getHeaders(): Record<string, string> {
    return {
      "X-Lattice-Session": this.sessionId,
      "X-Lattice-Scope": this.scope,
      "X-Lattice-Version": this.version,
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...this.customHeaders // Include custom headers
    };
  }

  async fetch<T = unknown>(componentId: number, options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    bypassCache?: boolean;
    headers?: Record<string, string>;
    timeout?: number;
  } = {}): Promise<T> {
    const { method = "GET", body, bypassCache = false, headers: requestHeaders = {}, timeout } = options;
    const url = this.getFullUrl(componentId);
    const cacheKey = this.getCacheKey(componentId);

    // Cache check (GET requests only)
    if (this.cacheEnabled && method === "GET" && !bypassCache) {
      const cached = this.cookieMap.get(cacheKey, { url });
      if (cached) {
        return JSON.parse(cached) as T;
      }
    }

    // Merge headers: default + custom client headers + request-specific headers
    const allHeaders = {
      ...this.getHeaders(),
      ...requestHeaders
    };

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = timeout || this.timeout ? setTimeout(() => controller.abort(), timeout || this.timeout) : null;

    try {
      // Fetch from registry
      const response = await fetch(url, {
        method,
        headers: allHeaders,
        body: body ? JSON.stringify(body) : undefined,
        keepalive: true,
        signal: controller.signal
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Registry fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as T;

      // Cache response (GET requests only)
      if (this.cacheEnabled && method === "GET") {
        this.cookieMap.set(cacheKey, JSON.stringify(data), {
          domain: new URL(this.baseUrl).hostname,
          path: "/",
          secure: true,
          maxAge: this.cacheMaxAge
        });
      }

      return data;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout || this.timeout}ms`);
      }
      throw error;
    }
  }

  async fetchComponent(id: number): Promise<Component> {
    return this.fetch<Component>(id);
  }

  async fetchAll(view: "overview" | "detail" | "expert" = "detail"): Promise<Component[]> {
    const componentIds = getComponentsByView(view).map(c => c.id);
    return Promise.all(componentIds.map(id => this.fetchComponent(id)));
  }

  async fetchByGroup(group: string): Promise<Component[]> {
    const componentIds = getComponentsByGroup(group).map(c => c.id);
    return Promise.all(componentIds.map(id => this.fetchComponent(id)));
  }

  async fetchByVersion(bunVersion: string): Promise<Component[]> {
    const componentIds = getComponentsByVersion(bunVersion).map(c => c.id);
    return Promise.all(componentIds.map(id => this.fetchComponent(id)));
  }

  async checkFeature(feature: string): Promise<{ supported: boolean; components: Component[] }> {
    const components = getComponentsByFeature(feature);
    return {
      supported: components.length > 0,
      components
    };
  }

  getSessionId(): string {
    return this.sessionId;
  }

  clearCache(): void {
    this.cookieMap.delete(new URL(this.baseUrl).hostname, "/");
  }

  // Custom headers management
  setHeader(key: string, value: string): void {
    this.customHeaders[key] = value;
  }

  setHeaders(headers: Record<string, string>): void {
    this.customHeaders = { ...this.customHeaders, ...headers };
  }

  getHeaders(): Record<string, string> {
    return { ...this.customHeaders };
  }

  removeHeader(key: string): void {
    delete this.customHeaders[key];
  }

  clearHeaders(): void {
    this.customHeaders = {};
  }

  // Host management
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setHost(host: string): void {
    const url = new URL(this.baseUrl);
    url.host = host;
    this.baseUrl = url.toString();
  }

  getHost(): string {
    return new URL(this.baseUrl).host;
  }

  // Timeout management
  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  getTimeout(): number {
    return this.timeout;
  }
}

// Singleton instance
const registryClient = new RegistryClient();

// Progressive Disclosure Views
interface ViewConfig {
  name: string;
  description: string;
  componentIds: number[];
  icon: string;
}

const VIEWS: Record<string, ViewConfig> = {
  overview: {
    name: "Overview",
    description: "Core components essential for basic operation",
    componentIds: [1, 3, 6, 24],
    icon: "◎"
  },
  detail: {
    name: "Detail",
    description: "Extended components for full functionality",
    componentIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    icon: "◈"
  },
  expert: {
    name: "Expert",
    description: "All components including advanced features",
    componentIds: COMPONENTS.map(c => c.id),
    icon: "⬡"
  }
};

function getViewComponents(view: keyof typeof VIEWS): Component[] {
  const viewConfig = VIEWS[view];
  if (!viewConfig) throw new Error(`View "${view}" not found`);
  return viewConfig.componentIds.map(id => getComponentById(id)).filter(Boolean) as Component[];
}

function getViewConfig(view: keyof typeof VIEWS): ViewConfig | undefined {
  return VIEWS[view];
}

function getAllViews(): ViewConfig[] {
  return Object.values(VIEWS);
}

function getViewForComponent(componentId: number): string[] {
  const views: string[] = [];
  for (const [viewName, viewConfig] of Object.entries(VIEWS)) {
    if (viewConfig.componentIds.includes(componentId)) {
      views.push(viewName);
    }
  }
  return views;
}

function switchView(currentView: string, direction: "next" | "prev"): string {
  const viewNames = Object.keys(VIEWS);
  const currentIndex = viewNames.indexOf(currentView);
  
  if (direction === "next") {
    return viewNames[(currentIndex + 1) % viewNames.length];
  } else {
    return viewNames[(currentIndex - 1 + viewNames.length) % viewNames.length];
  }
}

interface ViewState {
  currentView: keyof typeof VIEWS;
  componentId: number | null;
  filters: ComponentFilters;
  sortBy: "id" | "name" | "category" | "version";
  sortOrder: "asc" | "desc";
}

interface ComponentFilters {
  categories?: ComponentCategory[];
  statuses?: Component["status"][];
  bunVersions?: string[];
  groups?: string[];
}

function filterComponents(components: Component[], filters: ComponentFilters): Component[] {
  return components.filter(comp => {
    if (filters.categories && !filters.categories.includes(comp.category)) return false;
    if (filters.statuses && !filters.statuses.includes(comp.status)) return false;
    if (filters.bunVersions && !filters.bunVersions.some(v => matchVersion(comp.bunVersion, v))) return false;
    if (filters.groups && !filters.groups.some(g => comp.groups.includes(g))) return false;
    return true;
  });
}

function sortComponents(
  components: Component[],
  sortBy: ViewState["sortBy"],
  sortOrder: ViewState["sortOrder"]
): Component[] {
  return [...components].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case "id":
        comparison = a.id - b.id;
        break;
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "category":
        comparison = a.category.localeCompare(b.category);
        break;
      case "version":
        comparison = a.bunVersion.localeCompare(b.bunVersion);
        break;
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });
}

// Component Graph (Dependency Tree)
interface GraphNode {
  id: number;
  name: string;
  category: string;
  hex: string;
  dependencies: number[];
  dependents: number[];
  depth: number;
}

interface GraphEdge {
  source: number;
  target: number;
  type: "dependency" | "peer" | "optional";
}

interface ComponentGraph {
  nodes: Map<number, GraphNode>;
  edges: GraphEdge[];
  roots: number[];
  levels: Map<number, number[]>;
}

const DEPENDENCY_EDGES: Record<number, number[]> = {
  16: [1, 6],   // Compile depends on TOML Config, SQLite
  11: [],       // Dashboard (no deps)
  13: [],       // PTY Terminal (no deps)
  19: [],       // stringWidth (no deps)
  1: [],        // TOML Config (no deps)
  6: [],        // SQLite (no deps)
  10: [16],     // Proxy depends on Compile
  20: [16],     // V8 APIs depends on Compile
  5: [],        // Channels (no deps)
  8: [5],       // Table depends on Channels
  12: [],       // URLPattern (no deps)
  18: [],       // UUIDv7 (no deps)
  2: [],        // DNS Prefetch (no deps)
  9: [2],       // S3 Stream depends on DNS Prefetch
  15: [2],      // HTTP Pool depends on DNS Prefetch
  3: [],        // Secrets (no deps)
  14: [3],      // Flags depends on Secrets
  4: [],        // Fetch/ETag (no deps)
  7: [4],       // %j Logging depends on Fetch/ETag
  17: [],       // Timers (no deps)
  22: [],       // Env Exp (no deps)
  21: [],       // Disposition (no deps)
  23: [],       // Bug Fixes (no deps)
  24: []        // Versioning (no deps)
};

function buildComponentGraph(): ComponentGraph {
  const nodes = new Map<number, GraphNode>();
  const edges: GraphEdge[] = [];
  const visited = new Set<number>();
  const levels = new Map<number, number[]>();

  // Build nodes
  for (const component of COMPONENTS) {
    const node: GraphNode = {
      id: component.id,
      name: component.name,
      category: component.category,
      hex: component.color.hex,
      dependencies: DEPENDENCY_EDGES[component.id] || [],
      dependents: [],
      depth: 0
    };
    nodes.set(component.id, node);
  }

  // Build edges and calculate depths
  for (const [targetId, sourceIds] of Object.entries(DEPENDENCY_EDGES)) {
    const target = nodes.get(Number(targetId));
    if (!target) continue;

    for (const sourceId of sourceIds) {
      const source = nodes.get(sourceId);
      if (!source) continue;

      edges.push({
        source: sourceId,
        target: Number(targetId),
        type: "dependency"
      });

      source.dependents.push(Number(targetId));
    }
  }

  // Calculate depth using BFS
  const queue: { id: number; depth: number }[] = [];
  
  // Find roots (no dependencies)
  const roots: number[] = [];
  for (const [id, node] of nodes) {
    if (node.dependencies.length === 0) {
      roots.push(id);
      queue.push({ id, depth: 0 });
    }
  }

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    const node = nodes.get(id)!;
    
    if (depth > node.depth) {
      node.depth = depth;
    }

    // Group by level
    if (!levels.has(depth)) {
      levels.set(depth, []);
    }
    levels.get(depth)!.push(id);

    for (const dependentId of node.dependents) {
      queue.push({ id: dependentId, depth: depth + 1 });
    }
  }

  return { nodes, edges, roots, levels };
}

function getComponentDepth(componentId: number): number {
  const graph = buildComponentGraph();
  const node = graph.nodes.get(componentId);
  return node?.depth ?? -1;
}

function getComponentDependencies(componentId: number): Component[] {
  const deps = DEPENDENCY_EDGES[componentId] || [];
  return deps.map(id => getComponentById(id)).filter(Boolean) as Component[];
}

function getComponentDependents(componentId: number): Component[] {
  const graph = buildComponentGraph();
  const node = graph.nodes.get(componentId);
  if (!node) return [];
  return node.dependents.map(id => getComponentById(id)).filter(Boolean) as Component[];
}

function getTopologicalOrder(): Component[] {
  const graph = buildComponentGraph();
  const result: Component[] = [];
  const visited = new Set<number>();
  const temp = new Set<number>();

  function visit(id: number) {
    if (temp.has(id)) throw new Error("Circular dependency detected");
    if (visited.has(id)) return;

    temp.add(id);
    
    const deps = DEPENDENCY_EDGES[id] || [];
    for (const depId of deps) {
      visit(depId);
    }

    temp.delete(id);
    visited.add(id);
    
    const component = getComponentById(id);
    if (component) result.push(component);
  }

  for (const [id] of graph.nodes) {
    if (!visited.has(id)) {
      visit(id);
    }
  }

  return result;
}

function renderGraphASCII(): string {
  const graph = buildComponentGraph();
  let output = "\n🌳 Component Dependency Graph\n";
  output += "═".repeat(60) + "\n\n";

  for (const [level, nodeIds] of graph.levels) {
    const indent = "  ".repeat(level);
    const nodes = nodeIds.map(id => {
      const node = graph.nodes.get(id)!;
      return `${node.hex}●${" ".repeat(2)}#${id.toString().padStart(2, "0")} ${node.name}`;
    }).join(`${" ".repeat(20 - level * 2)}`);

    output += `${indent}│\n`;
    output += `${indent}├─ Level ${level}: ${nodes}\n`;
  }

  output += "\n" + "═".repeat(60) + "\n";
  output += `Total Components: ${graph.nodes.size}\n`;
  output += `Total Dependencies: ${graph.edges.length}\n`;
  output += `Max Depth: ${Math.max(...Array.from(graph.levels.keys()))}\n`;

  return output;
}

// Dashboard Server
interface DashboardConfig {
  port: number;
  host?: string;
  title?: string;
  theme?: "light" | "dark" | "auto";
}

// Import CSS with Bun's native support
import css from "../web/dashboard.css" with { type: "text" };

function generateDashboardHTML(view: keyof typeof VIEWS = "overview"): string {
  const components = getViewComponents(view);
  const viewConfig = getViewConfig(view);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>T3-Lattice Registry v3.3 - Component Management Platform</title>
  <meta name="description" content="Professional component registry system with 24 components across 17 categories. Built with Bun for modern web applications.">
  <meta name="keywords" content="component registry, bun, typescript, saas, dashboard, lattice">
  <meta name="author" content="T3-Lattice Team">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="T3-Lattice Registry v3.3">
  <meta property="og:description" content="Modern component management platform">
  <meta property="og:type" content="website">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚀</text></svg>">
  <style>${css}</style>
</head>
<body>
  <div class="header">
    <h1>T3-Lattice Registry</h1>
    <p>Professional Component Management Platform • v3.3 • ${viewConfig?.description || "Advanced Registry System"}</p>
  </div>

  <div class="tabs">
    <a class="tab ${view === 'overview' ? 'active' : ''}" href="?view=overview">Overview</a>
    <a class="tab ${view === 'detail' ? 'active' : ''}" href="?view=detail">Detail</a>
    <a class="tab ${view === 'expert' ? 'active' : ''}" href="?view=expert">Expert</a>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${components.length}</div>
      <div class="stat-label">Components</div>
    </div>
    <div class="stat">
      <div class="stat-value">${new Set(components.map(c => c.category)).size}</div>
      <div class="stat-label">Categories</div>
    </div>
    <div class="stat">
      <div class="stat-value">${new Set(components.map(c => c.bunVersion)).size}</div>
      <div class="stat-label">Version Types</div>
    </div>
    <div class="stat">
      <div class="stat-value">${components.filter(c => c.status === 'stable').length}</div>
      <div class="stat-label">Stable</div>
    </div>
  </div>

  <div class="grid">
    ${components.map(comp => `
      <div class="card">
        <div class="card-header">
          <span class="color-dot" style="background: ${comp.color.hex}"></span>
          <span class="card-id">#${comp.id.toString().padStart(2, '0')}</span>
          <span class="card-name">${comp.name}</span>
        </div>
        <p style="font-size: 12px; color: #8b949e;">${comp.description}</p>
        <div class="card-meta">
          <span>${comp.slot}</span>
          <span>${comp.category}</span>
          <span class="badge badge-${comp.status}">${comp.status}</span>
        </div>
      </div>
    `).join("")}
  </div>

  <div class="graph-section">
    <h3 style="margin-bottom: 16px;">Dependency Graph</h3>
    <pre id="graph">${renderGraphASCII()}</pre>
  </div>
</body>
</html>`;
}

function startDashboard(config: DashboardConfig = { port: 8080 }): void {
  const server = Bun.serve({
    port: config.port,
    hostname: config.host || "0.0.0.0",
    fetch(req) {
      const url = new URL(req.url);
      const searchParams = url.searchParams;
      const view = (searchParams.get("view") as keyof typeof VIEWS) || "overview";

      if (!["overview", "detail", "expert"].includes(view)) {
        return new Response("Invalid view", { status: 400 });
      }

      return new Response(generateDashboardHTML(view), {
        headers: { "Content-Type": "text/html" }
      });
    }
  });

  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 T3-Lattice Dashboard v3.3                              ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║  URL: http://localhost:${server.port}                        ║
║  View: overview | detail | expert                           ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ║
║  Press Ctrl+C to stop                                      ║
╚════════════════════════════════════════════════════════════╝
  `);
}

// Generate registry manifest
function generateRegistryManifest() {
  return {
    version: "3.3.0",
    components: COMPONENTS,
    dependencies: DEPENDENCY_EDGES,
    views: VIEWS
  };
}

// Export everything in a single statement
export {
  // Data
  COMPONENTS,
  DEPENDENCY_EDGES,
  VIEWS,

  // Classes
  RegistryClient,
  registryClient,

  // Component utilities
  getComponentById,
  getComponentsByGroup,
  getComponentsByView,
  getComponentsByVersion,
  getComponentsByFeature,
  getComponentEndpoint,
  getComponentFullUrl,
  getComponentColor,
  getLoaderComponents,
  getHookComponents,
  getTargetComponents,
  matchVersion,

  // View utilities
  getViewComponents,
  getViewConfig,
  getAllViews,
  getViewForComponent,
  switchView,
  filterComponents,
  sortComponents,

  // Graph utilities
  buildComponentGraph,
  getComponentDepth,
  getComponentDependencies,
  getComponentDependents,
  getTopologicalOrder,
  renderGraphASCII,

  // Dashboard utilities
  generateDashboardHTML,
  startDashboard,

  // Manifest
  generateRegistryManifest
};