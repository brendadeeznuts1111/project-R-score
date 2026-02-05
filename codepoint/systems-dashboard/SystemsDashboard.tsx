/**
 * Systems Dashboard - Bun CLI Configuration Manager
 *
 * A comprehensive interactive dashboard for configuring and managing Bun runtime
 * command-line interface features with real-time code generation and visual feedback.
 *
 * Features:
 * - Interactive CLI configuration controls
 * - Real-time code generation for Bun commands
 * - Advanced Bun features demonstration (stdin, networking, optimization)
 * - Visual feedback and status indicators
 * - Quick action presets for common scenarios
 * - Server monitoring with beautiful table visualization
 * - Multiple export formats (JSON, CSV, HTML, text)
 * - Responsive design with Tailwind CSS
 * - Integrated AI terminal with `/suggest` command
 *
 * @author Systems Dashboard Team
 * @version 1.0.0
 * @since 2024
 *
 * @example
 * // Start the dashboard
 * bun run dev
 *
 * // Access at http://localhost:3000
 * // Navigate to "⌨️ Command Line" tab for CLI configuration
 */

import { useEffect, useState } from "react";

// ============================================================================
// BUN TABLE UTILITIES
// ============================================================================

/**
 * Configuration options for enhanced Bun table functionality
 * @interface BunTableOptions
 */
interface BunTableOptions {
  colors?: boolean;
  maxRows?: number;
  showHeaders?: boolean;
  showIndex?: boolean;
  compact?: boolean;
  border?: boolean;
  padding?: number;
  alignment?: "left" | "center" | "right" | "auto";
  truncate?: number;
  ellipsis?: string;
  dateFormat?: string;
  numberFormat?: "decimal" | "currency" | "percentage" | "bytes";
  precision?: number;
  thousandsSeparator?: string;
  decimalSeparator?: string;
  currencySymbol?: string;
  showTotals?: boolean;
  groupBy?: string;
  sortBy?: string | string[];
  sortOrder?: "asc" | "desc";
  filter?: Record<string, any>;
  highlight?: {
    column: string;
    condition: (value: any) => boolean;
    style: string;
  }[];
  conditionalFormatting?: {
    column: string;
    rules: {
      condition: (value: any) => boolean;
      style: string;
      format?: (value: any) => string;
    }[];
  }[];
  customRenderers?: Record<string, (value: any, row: any) => string>;
  footer?: {
    text?: string;
    summary?: Record<string, (values: any[]) => string>;
  };
  responsive?: boolean;
  stickyHeader?: boolean;
  zebraStriping?: boolean;
  hoverHighlight?: boolean;
  export?: {
    format?: "csv" | "json" | "xlsx" | "pdf";
    filename?: string;
    includeHeaders?: boolean;
  };
}

interface BunTranspilationConfig {
  define?: Record<string, string>;
  drop?: string[];
  loader?: Record<string, string>;
  target?: string;
  reactTransform?: "react" | "automatic" | "classic";
}

interface BunNetworkingConfig {
  dnsResolution?: "verbatim" | "ipv4first" | "ipv6first";
  serveOptions?: {
    port?: number;
    hostname?: string;
    websocket?: boolean;
  };
  environmentVars?: Record<string, string>;
}

interface BunGlobalConfig {
  configFile?: string;
  workspaces?: string[];
  lockfile?: boolean;
  cache?: string;
}

interface BunDevelopmentWorkflow {
  watchMode?: boolean;
  hotMode?: boolean;
  noClearScreen?: boolean;
  preserveWatchOutput?: boolean;
  saveOnKeypress?: boolean;
  consoleDepth?: number;
  smolMode?: boolean;
}

interface BunRuntimeControl {
  useBunRuntime?: boolean;
  shell?: "bun" | "system";
  exposeGC?: boolean;
  garbageCollectionForce?: boolean;
  zeroFillBuffers?: boolean;
  nodeAddons?: "strict" | "throw" | "warn" | "none" | "warn-with-error-code";
  processControl?: boolean;
}

interface BunNetworkingSecurity {
  dnsResolution?: "verbatim" | "ipv4first" | "ipv6first";
  tlsVersion?: "default" | "1.0" | "1.1" | "1.2" | "1.3";
  certificateValidation?: "strict" | "lenient" | "disabled";
  proxy?: {
    enabled: boolean;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
  };
  timeout?: {
    connect: number;
    read: number;
    write: number;
    total: number;
  };
  retries?: {
    attempts: number;
    delay: number;
    backoff: "linear" | "exponential";
  };
  compression?: boolean;
  keepAlive?: boolean;
  maxRedirects?: number;
  userAgent?: string;
  headers?: Record<string, string>;
  security?: {
    hsts?: boolean;
    csp?: boolean;
    cors?: {
      enabled: boolean;
      origins: string[];
      methods: string[];
      headers: string[];
    };
    rateLimit?: {
      enabled: boolean;
      requests: number;
      window: number;
    };
  };
}

/**
 * Main configuration interface for Bun command-line interface
 *
 * This interface defines all available configuration options for the Bun runtime,
 * including stdin/stdout/stdout handling, console formatting, optimization settings,
 * networking configuration, execution flags, and more.
 *
 * @interface BunCommandLine
 * @example
 * const config: BunCommandLine = {
 *   stdin: { enabled: true, treatAsTypeScript: true },
 *   console: { depth: 10, colors: true },
 *   optimization: { smol: false, minify: true },
 *   networking: { port: 3000, maxHttpHeaderSize: 16384 }
 * };
 */
interface BunCommandLine {
  stdin?: {
    enabled: boolean;
    pipeFrom?: string;
    encoding?: "utf8" | "buffer" | "json";
    transform?: boolean;
    filter?: string;
    treatAsTypeScript?: boolean;
    jsxSupport?: boolean;
    fileRedirect?: boolean;
    temporaryFile?: boolean;
    directExecution?: boolean;
  };
  stdout?: {
    encoding?: "utf8" | "buffer" | "json";
    pipeTo?: string;
    append?: boolean;
  };
  stderr?: {
    encoding?: "utf8" | "buffer" | "json";
    pipeTo?: string;
    append?: boolean;
  };
  console?: {
    /** @default 2 */
    depth?: number;
    /** @default 10000 */
    maxStringLength?: number;
    /** @default false */
    showHidden?: boolean;
    /** @default true */
    colors?: boolean;
    /** @default false */
    compact?: boolean;
    breakLength?: number;
    getters?: boolean;
    proxy?: boolean;
    iterableLimit?: number;
    maxArrayLength?: number;
    maxBufferLength?: number;
  };
  optimization?: {
    /** @default false - Uses less memory, but runs GC more often */
    smol?: boolean;
    minify?: boolean;
    compress?: boolean;
    treeShaking?: boolean;
    deadCodeElimination?: boolean;
    inlineFunctions?: boolean;
    constantFolding?: boolean;
    bundleSize?: "smol" | "tiny" | "minified" | "default";
    /** @default "bun" */
    target?: "bun" | "node" | "browser" | "deno";
    /** @default "neutral" */
    platform?: "linux" | "macos" | "windows" | "neutral";
  };
  installation?: {
    /** @default "auto" - installs when no node_modules exist */
    autoInstall?: "auto" | "fallback" | "force";
    install?: boolean;
    preferOffline?: boolean;
    preferLatest?: boolean;
    conditions?: string[];
    mainFields?: string[];
    preserveSymlinks?: boolean;
    preserveSymlinksMain?: boolean;
    /** @default ".tsx,.ts,.jsx,.js,.json" */
    extensionOrder?: string;
    /**
     * Minimum age requirement for npm packages in seconds to prevent supply chain attacks.
     * Package versions published more recently than this threshold will be filtered out.
     * @default 0
     */
    minimumReleaseAge?: number;
    /**
     * Packages to exclude from the minimum release age gate.
     * Useful for trusted packages like @types/node or typescript.
     * @default []
     */
    minimumReleaseAgeExcludes?: string[];
  };
  transpilation?: {
    tsconfigOverride?: string;
    define?: Record<string, string>;
    drop?: string[];
    loader?: Record<string, string>;
    noMacros?: boolean;
    jsxFactory?: string;
    jsxFragment?: string;
    /** @default "react" */
    jsxImportSource?: string;
    /** @default "automatic" */
    jsxRuntime?: "automatic" | "classic";
    jsxSideEffects?: boolean;
    ignoreDceAnnotations?: boolean;
  };
  networking?: {
    /** @default 3000 */
    port?: number;
    /** @default "http" */
    protocol?: "http" | "https" | "http2";
    fetchPreconnect?: string[];
    /** @default 16384 (16 KiB) */
    maxHttpHeaderSize?: number;
    /** @default "verbatim" */
    dnsResultOrder?: "verbatim" | "ipv4first" | "ipv6first";
    useSystemCa?: boolean;
    useOpensslCa?: boolean;
    useBundledCa?: boolean;
    redisPreconnect?: boolean;
    sqlPreconnect?: boolean;
    userAgent?: string;
  };
  global?: {
    envFile?: string[];
    cwd?: string;
    config?: string;
  };
  resolution?: {
    priority?: "scripts" | "files" | "binaries" | "system";
    allowedExtensions?: string[];
    preferSourceFiles?: boolean;
    packageJsonPriority?: boolean;
    absolutePathBehavior?: "execute" | "resolve";
    relativePathBehavior?: "execute" | "resolve";
    binaryFallback?: boolean;
    systemCommandFallback?: boolean;
  };
  flags?: {
    hot?: boolean;
    watch?: boolean;
    smol?: boolean;
    bun?: boolean;
    version?: boolean;
    help?: boolean;
    eval?: string;
    print?: string;
    preload?: string[];
    import?: string[];
    external?: string[];
    define?: Record<string, string>;
    cwd?: string;
    env?: Record<string, string>;
  };
  init?: {
    /** @default false - Accept all defaults */
    yes?: boolean;
    /** @default undefined - Scaffold a React app */
    react?: boolean | "tailwind" | "shadcn";
    /** @default false - Use npm for dependency management */
    npm?: boolean;
  };
  create?: {
    /**
     * The template to use for project creation (e.g., 'next-app', 'react').
     * Can be:
     * - Official template: 'react', 'next-app'
     * - GitHub repo: 'user/repo'
     * - Local template: Checks '$HOME/.bun-create/<name>' or './.bun-create/<name>'
     */
    template?: string;
    /** The destination directory for the new project. Defaults to current directory if omitted. */
    destination?: string;
    /** @default false - Overwrite existing files. **IMPORTANT**: By default, Bun will not overwrite any existing files. */
    force?: boolean;
    /** @default false - Disable auto install */
    noInstall?: boolean;
    /** @default false - Disable git initialization */
    noGit?: boolean;
    /** @default false - Open the project in the default editor */
    open?: boolean;
  };
  execution?: {
    entryPoint?: string;
    arguments?: string[];
    workingDirectory?: string;
    nodeOptions?: string[];
    maxHeap?: string;
    heapLimit?: string;
  };
}

interface ServerMonitoringData {
  id: string;
  name: string;
  region: string;
  cpu: number;
  memory: number;
  status: "healthy" | "warning" | "critical";
  uptime: number;
  connections: number;
  lastUpdate: Date;
  loadAverage: [number, number, number]; // 1min, 5min, 15min
  diskUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  networkStats: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  processes: {
    total: number;
    running: number;
    sleeping: number;
  };
  version: string;
  kernel: string;
  containerRuntime?: "docker" | "podman" | "containerd";
  healthChecks: {
    http: boolean;
    tcp: boolean;
    database: boolean;
    cache: boolean;
  };
  alerts: {
    critical: number;
    warning: number;
    info: number;
  };
}

interface APIEndpointInfo {
  method: "GET" | "POST" | "PUT" | "DELETE" | "WS";
  path: string;
  component: string;
  latency: number;
  auth: "none" | "required" | "optional";
  description: string;
  status: "active" | "deprecated" | "experimental";
}

interface SystemPerformanceMetric {
  metric: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
  threshold: number;
  status: "healthy" | "warning" | "critical";
  lastUpdate: Date;
}

interface DashboardTableData {
  columns: Array<{
    key: string;
    header: string;
    type: "string" | "number" | "percentage" | "duration" | "bytes" | "timestamp" | "badge" | "status" | "icon" | "code" | "boolean" | "array" | "object";
    width?: number;
    align?: "left" | "right" | "center";
    sortable?: boolean;
    filterable?: boolean;
    format?: string;
    precision?: number;
    unit?: string;
    colorMap?: Record<string, string>;
    iconMap?: Record<string, string>;
    transform?: (value: any) => any;
    aggregate?: "sum" | "avg" | "min" | "max" | "count";
  }>;
  rows: any[];
  caption?: string;
  title?: string;
  description?: string;
  metadata?: {
    totalRows: number;
    lastUpdated: Date;
    source: string;
    version: string;
    refreshInterval?: number;
  };
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  sorting?: {
    column: string;
    direction: "asc" | "desc";
  };
  filtering?: {
    [key: string]: any;
  };
  export?: {
    formats: Array<"csv" | "json" | "xlsx" | "pdf" | "xml">;
    filename?: string;
  };
  actions?: Array<{
    label: string;
    icon?: string;
    action: (row: any, index: number) => void;
    condition?: (row: any) => boolean;
  }>;
}

/**
 * Systems Dashboard Component
 *
 * The main dashboard component that provides comprehensive Bun CLI configuration
 * and server monitoring capabilities.
 *
 * Features:
 * - Interactive CLI configuration controls with real-time updates
 * - Dynamic code generation for Bun commands
 * - Server monitoring with beautiful table visualization
 * - Export functionality (JSON, CSV, HTML, text)
 * - Visual feedback and status indicators
 * - Quick action presets for common scenarios
 * - Responsive design with Tailwind CSS
 *
 * @component
 * @returns {JSX.Element} The rendered dashboard component
 *
 * @example
 * // Use the component
 * <SystemsDashboard />
 *
 * @example
 * // Access CLI configuration
 * // Navigate to "⌨️ Command Line" tab after mounting
 */
export default function SystemsDashboard() {
  const [servers, setServers] = useState<ServerMonitoringData[]>([
    {
      id: "1",
      name: "web-01",
      region: "us-east",
      cpu: 45,
      memory: 65,
      status: "healthy",
      uptime: 99.9,
      connections: 2450,
      lastUpdate: new Date(),
      loadAverage: [0.45, 0.52, 0.48],
      diskUsage: { used: 250, total: 500, percentage: 50 },
      networkStats: {
        bytesIn: 1048576000,
        bytesOut: 524288000,
        packetsIn: 250000,
        packetsOut: 125000
      },
      processes: { total: 156, running: 3, sleeping: 150 },
      version: "Ubuntu 22.04 LTS",
      kernel: "5.15.0-88-generic",
      containerRuntime: "docker",
      healthChecks: { http: true, tcp: true, database: true, cache: true },
      alerts: { critical: 0, warning: 1, info: 3 }
    },
    {
      id: "2",
      name: "web-02",
      region: "us-west",
      cpu: 78,
      memory: 89,
      status: "warning",
      uptime: 98.5,
      connections: 1890,
      lastUpdate: new Date(),
      loadAverage: [1.2, 1.5, 1.3],
      diskUsage: { used: 420, total: 500, percentage: 84 },
      networkStats: {
        bytesIn: 838860800,
        bytesOut: 419430400,
        packetsIn: 200000,
        packetsOut: 100000
      },
      processes: { total: 203, running: 5, sleeping: 195 },
      version: "Ubuntu 22.04 LTS",
      kernel: "5.15.0-88-generic",
      containerRuntime: "docker",
      healthChecks: { http: true, tcp: true, database: false, cache: true },
      alerts: { critical: 0, warning: 3, info: 2 }
    },
    {
      id: "3",
      name: "api-01",
      region: "eu-central",
      cpu: 22,
      memory: 34,
      status: "healthy",
      uptime: 99.7,
      connections: 850,
      lastUpdate: new Date(),
      loadAverage: [0.22, 0.28, 0.25],
      diskUsage: { used: 150, total: 500, percentage: 30 },
      networkStats: {
        bytesIn: 524288000,
        bytesOut: 262144000,
        packetsIn: 125000,
        packetsOut: 62500
      },
      processes: { total: 98, running: 2, sleeping: 94 },
      version: "Debian 11",
      kernel: "5.10.0-23-amd64",
      containerRuntime: "podman",
      healthChecks: { http: true, tcp: true, database: true, cache: true },
      alerts: { critical: 0, warning: 0, info: 1 }
    },
    {
      id: "4",
      name: "db-01",
      region: "asia-pacific",
      cpu: 92,
      memory: 95,
      status: "critical",
      uptime: 95.2,
      connections: 320,
      lastUpdate: new Date(),
      loadAverage: [2.8, 3.2, 3.0],
      diskUsage: { used: 475, total: 500, percentage: 95 },
      networkStats: {
        bytesIn: 2147483648,
        bytesOut: 1073741824,
        packetsIn: 500000,
        packetsOut: 250000
      },
      processes: { total: 245, running: 8, sleeping: 230 },
      version: "Ubuntu 20.04 LTS",
      kernel: "5.4.0-166-generic",
      containerRuntime: "containerd",
      healthChecks: { http: false, tcp: true, database: false, cache: false },
      alerts: { critical: 4, warning: 2, info: 0 }
    },
  ]);

  const [apiEndpoints] = useState<APIEndpointInfo[]>([
    {
      method: "GET",
      path: "/health",
      component: "HealthChecker",
      latency: 0.1,
      auth: "none",
      description: "Health check endpoint",
      status: "active",
    },
    {
      method: "GET",
      path: "/metrics",
      component: "StatsCollector",
      latency: 0.3,
      auth: "required",
      description: "Prometheus metrics",
      status: "active",
    },
    {
      method: "POST",
      path: "/api/v1/proxy",
      component: "ProxyServer",
      latency: 1.2,
      auth: "required",
      description: "Create proxy session",
      status: "active",
    },
    {
      method: "WS",
      path: "/ws/proxy",
      component: "WebSocketProxy",
      latency: 0.8,
      auth: "optional",
      description: "WebSocket proxy endpoint",
      status: "experimental",
    },
    {
      method: "DELETE",
      path: "/api/v1/connections/:id",
      component: "ConnectionManager",
      latency: 0.3,
      auth: "required",
      description: "Close connection",
      status: "active",
    },
  ]);

  const [performanceMetrics] = useState<SystemPerformanceMetric[]>([
    {
      metric: "Active Connections",
      value: 2456,
      unit: "connections",
      trend: "up",
      threshold: 10000,
      status: "healthy",
      lastUpdate: new Date(),
    },
    {
      metric: "Avg Latency",
      value: 42.5,
      unit: "ms",
      trend: "down",
      threshold: 100,
      status: "healthy",
      lastUpdate: new Date(),
    },
    {
      metric: "Error Rate",
      value: 0.12,
      unit: "%",
      trend: "up",
      threshold: 1,
      status: "warning",
      lastUpdate: new Date(),
    },
    {
      metric: "Throughput",
      value: 12500,
      unit: "req/s",
      trend: "up",
      threshold: 10000,
      status: "healthy",
      lastUpdate: new Date(),
    },
    {
      metric: "Memory Usage",
      value: 245,
      unit: "MB",
      trend: "stable",
      threshold: 512,
      status: "healthy",
      lastUpdate: new Date(),
    },
  ]);

  const [selectedTable, setSelectedTable] = useState<
    "servers" | "api" | "performance" | "headers" | "bun-apis" | "development-workflow" | "runtime-control" | "table-config" | "networking-security" | "command-line" | "health"
  >("servers");
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProvider, setUploadProvider] = useState<"s3" | "r2">("s3");
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [exportFormat, setExportFormat] = useState<
    "text" | "json" | "csv" | "html"
  >("text");
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [tableCode, setTableCode] = useState("");

  // Bun-specific state for enhanced features
  const [bunTableOptions, setBunTableOptions] = useState<BunTableOptions>({
    colors: true,
    maxRows: 10,
    showHeaders: true,
    showIndex: true,
    compact: false,
    border: true,
    padding: 2,
    alignment: "auto",
    truncate: 20,
    ellipsis: "...",
    dateFormat: "YYYY-MM-DD HH:mm:ss",
    numberFormat: "decimal",
    precision: 2,
    thousandsSeparator: ",",
    decimalSeparator: ".",
    currencySymbol: "$",
    showTotals: true,
    sortBy: "name",
    sortOrder: "asc",
    responsive: true,
    stickyHeader: true,
    zebraStriping: true,
    hoverHighlight: true,
    export: {
      format: "csv",
      filename: "bun-table-export",
      includeHeaders: true
    }
  });
  const [transpilationConfig, setTranspilationConfig] = useState<BunTranspilationConfig>({
    define: { "process.env.NODE_ENV": "development" },
    drop: ["console"],
    loader: { ".ts": "tsx" },
    target: "bun",
    reactTransform: "automatic"
  });
  const [networkingConfig, setNetworkingConfig] = useState<BunNetworkingConfig>({
    dnsResolution: "verbatim",
    serveOptions: { port: 3000, hostname: "localhost", websocket: true },
    environmentVars: { "REDIS_URL": "redis://localhost:6379" }
  });
  const [globalConfig, setGlobalConfig] = useState<BunGlobalConfig>({
    configFile: "bunfig.toml",
    workspaces: ["packages/*"],
    lockfile: true,
    cache: "./.bun-cache"
  });

  const [developmentWorkflow, setDevelopmentWorkflow] = useState<BunDevelopmentWorkflow>({
    watchMode: true,
    hotMode: false,
    noClearScreen: false,
    preserveWatchOutput: true,
    saveOnKeypress: true,
    consoleDepth: 10,
    smolMode: false
  });

  const [runtimeControl, setRuntimeControl] = useState<BunRuntimeControl>({
    useBunRuntime: true,
    shell: "bun",
    exposeGC: true,
    garbageCollectionForce: false,
    zeroFillBuffers: false,
    nodeAddons: "warn",
    processControl: true
  });

  const [networkingSecurity, setNetworkingSecurity] = useState<BunNetworkingSecurity>({
    dnsResolution: "verbatim",
    tlsVersion: "1.3",
    certificateValidation: "strict",
    proxy: {
      enabled: false,
      host: "",
      port: 8080,
      username: "",
      password: ""
    },
    timeout: {
      connect: 10000,
      read: 30000,
      write: 30000,
      total: 60000
    },
    retries: {
      attempts: 3,
      delay: 1000,
      backoff: "exponential"
    },
    compression: true,
    keepAlive: true,
    maxRedirects: 5,
    userAgent: "Bun/SystemsDashboard",
    headers: {
      "User-Agent": "Bun/SystemsDashboard",
      "Accept": "application/json",
      "Connection": "keep-alive"
    },
    security: {
      hsts: true,
      csp: true,
      cors: {
        enabled: true,
        origins: ["*"],
        methods: ["GET", "POST", "PUT", "DELETE"],
        headers: ["Content-Type", "Authorization"]
      },
      rateLimit: {
        enabled: false,
        requests: 100,
        window: 60000
      }
    }
  });

  const [commandLine, setCommandLine] = useState<BunCommandLine>({
    stdin: {
      enabled: true,
      pipeFrom: "process.stdin",
      encoding: "utf8",
      transform: true,
      filter: "",
      treatAsTypeScript: true,
      jsxSupport: true,
      fileRedirect: true,
      temporaryFile: false,
      directExecution: true
    },
    stdout: {
      encoding: "utf8",
      pipeTo: "",
      append: false
    },
    stderr: {
      encoding: "utf8",
      pipeTo: "",
      append: false
    },
    console: {
      depth: 10,
      maxStringLength: 10000,
      showHidden: false,
      colors: true,
      compact: false,
      breakLength: 80,
      getters: true,
      proxy: true,
      iterableLimit: 100,
      maxArrayLength: 100,
      maxBufferLength: 1000
    },
    optimization: {
      smol: false,
      minify: false,
      compress: true,
      treeShaking: true,
      deadCodeElimination: true,
      inlineFunctions: false,
      constantFolding: true,
      bundleSize: "default",
      target: "bun",
      platform: "neutral"
    },
    installation: {
      autoInstall: "auto",
      install: false,
      preferOffline: false,
      preferLatest: false,
      conditions: ["node", "bun"],
      mainFields: ["main", "module", "browser"],
      preserveSymlinks: false,
      preserveSymlinksMain: false,
      extensionOrder: ".tsx,.ts,.jsx,.js,.json"
    },
    transpilation: {
      tsconfigOverride: "",
      define: {},
      drop: [],
      loader: {},
      noMacros: false,
      jsxFactory: "React.createElement",
      jsxFragment: "React.Fragment",
      jsxImportSource: "react",
      jsxRuntime: "automatic",
      jsxSideEffects: false,
      ignoreDceAnnotations: false
    },
    networking: {
      port: 3000,
      fetchPreconnect: [],
      maxHttpHeaderSize: 16384,
      dnsResultOrder: "verbatim",
      useSystemCa: false,
      useOpensslCa: false,
      useBundledCa: true,
      redisPreconnect: false,
      sqlPreconnect: false,
      userAgent: "Bun/SystemsDashboard"
    },
    global: {
      envFile: [],
      cwd: process.cwd(),
      config: "bunfig.toml"
    },
    resolution: {
      priority: "scripts",
      allowedExtensions: [".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs"],
      preferSourceFiles: true,
      packageJsonPriority: true,
      absolutePathBehavior: "execute",
      relativePathBehavior: "execute",
      binaryFallback: true,
      systemCommandFallback: true
    },
    flags: {
      hot: false,
      watch: false,
      smol: false,
      bun: true,
      version: false,
      help: false,
      eval: "",
      print: "",
      preload: [],
      import: [],
      external: [],
      env: {}
    },
    execution: {
      entryPoint: "input.js",
      arguments: [],
      workingDirectory: process.cwd(),
      nodeOptions: [],
      maxHeap: "1GB",
      heapLimit: "2GB"
    }
  });

  const [tableConfig, setTableConfig] = useState<DashboardTableData>({
    columns: [],
    rows: [],
    title: "Systems Dashboard",
    description: "Real-time monitoring and metrics visualization",
    metadata: {
      totalRows: 0,
      lastUpdated: new Date(),
      source: "Bun Runtime",
      version: "1.0.0",
      refreshInterval: 2000
    },
    pagination: {
      page: 1,
      pageSize: 10,
      totalItems: 0,
      hasNext: false,
      hasPrev: false
    },
    sorting: {
      column: "name",
      direction: "asc"
    },
    filtering: {},
    export: {
      formats: ["csv", "json", "xlsx", "pdf"],
      filename: "dashboard-export"
    },
    actions: [
      {
        label: "View Details",
        icon: "👁️",
        action: (row, index) => console.log("View details:", row),
        condition: (row) => row.status !== "critical"
      },
      {
        label: "Restart",
        icon: "🔄",
        action: (row, index) => console.log("Restart server:", row.name),
        condition: (row) => row.status === "critical"
      }
    ]
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Simulate real-time updates
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      setServers((prev: ServerMonitoringData[]) =>
        prev.map((server: ServerMonitoringData) => ({
          ...server,
          cpu: Math.max(
            0,
            Math.min(100, server.cpu + (Math.random() - 0.5) * 10),
          ),
          memory: Math.max(
            0,
            Math.min(100, server.memory + (Math.random() - 0.5) * 5),
          ),
          connections: Math.max(
            0,
            server.connections + Math.floor((Math.random() - 0.5) * 100),
          ),
          loadAverage: [
            Math.max(0, server.loadAverage[0] + (Math.random() - 0.5) * 0.2),
            Math.max(0, server.loadAverage[1] + (Math.random() - 0.5) * 0.1),
            Math.max(0, server.loadAverage[2] + (Math.random() - 0.5) * 0.05)
          ],
          diskUsage: {
            ...server.diskUsage,
            used: Math.max(
              0,
              Math.min(server.diskUsage.total, server.diskUsage.used + Math.floor((Math.random() - 0.5) * 10))
            ),
            percentage: Math.max(0, Math.min(100, server.diskUsage.percentage + (Math.random() - 0.5) * 2))
          },
          networkStats: {
            bytesIn: Math.max(0, server.networkStats.bytesIn + Math.floor((Math.random() - 0.5) * 1000000)),
            bytesOut: Math.max(0, server.networkStats.bytesOut + Math.floor((Math.random() - 0.5) * 500000)),
            packetsIn: Math.max(0, server.networkStats.packetsIn + Math.floor((Math.random() - 0.5) * 100)),
            packetsOut: Math.max(0, server.networkStats.packetsOut + Math.floor((Math.random() - 0.5) * 50))
          },
          processes: {
            ...server.processes,
            total: Math.max(50, Math.min(300, server.processes.total + Math.floor((Math.random() - 0.5) * 5))),
            running: Math.max(1, Math.min(10, server.processes.running + Math.floor((Math.random() - 0.5) * 2))),
            sleeping: Math.max(40, Math.min(280, server.processes.sleeping + Math.floor((Math.random() - 0.5) * 5)))
          },
          lastUpdate: new Date(),
          status:
            server.cpu > 85 || server.memory > 90 || server.diskUsage.percentage > 90
              ? "critical"
              : server.cpu > 70 || server.memory > 80 || server.diskUsage.percentage > 80
                ? "warning"
                : "healthy",
        })),
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [isLiveMode]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "good":
      case "excellent":
      case "active":
        return "text-green-600 bg-green-50 border-green-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "critical":
        return "text-red-600 bg-red-50 border-red-200";
      case "experimental":
        return "text-purple-600 bg-purple-50 border-purple-200";
      case "deprecated":
        return "text-gray-600 bg-gray-50 border-gray-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatHealthCheckIcon = (status: boolean): string => {
    return status ? "✅" : "❌";
  };

  const getLoadAverageColor = (load: number): string => {
    if (load < 1.0) return "text-green-400";
    if (load < 2.0) return "text-yellow-400";
    return "text-red-400";
  };

  const getDiskUsageColor = (percentage: number): string => {
    if (percentage < 70) return "text-green-400";
    if (percentage < 90) return "text-yellow-400";
    return "text-red-400";
  };

  // Enhanced table utility functions
  const formatCellValue = (value: any, column: any): string => {
    if (value === null || value === undefined) return "";

    switch (column.type) {
      case "percentage":
        return `${value}%`;
      case "bytes":
        return formatBytes(value);
      case "duration":
        return `${value}ms`;
      case "timestamp":
        return new Date(value).toLocaleString();
      case "number":
        return column.precision ? value.toFixed(column.precision) : value.toString();
      case "boolean":
        return value ? "✅" : "❌";
      case "array":
        return Array.isArray(value) ? value.join(", ") : "";
      case "object":
        return JSON.stringify(value, null, 2);
      default:
        return value.toString();
    }
  };

  const getCellValueColor = (value: any, column: any): string => {
    if (column.colorMap && column.colorMap[value]) {
      return column.colorMap[value];
    }

    switch (column.type) {
      case "percentage":
        if (value > 85) return "text-red-400";
        if (value > 70) return "text-yellow-400";
        return "text-green-400";
      case "status":
        return getStatusColor(value);
      default:
        return "";
    }
  };

  const sortData = (data: any[], column: string, direction: "asc" | "desc"): any[] => {
    return [...data].sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];

      if (aVal === bVal) return 0;

      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;

      return direction === "desc" ? -comparison : comparison;
    });
  };

  const filterData = (data: any[], filters: Record<string, any>): any[] => {
    return data.filter(row => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const rowValue = row[key];
        if (typeof rowValue === "string") {
          return rowValue.toLowerCase().includes(value.toLowerCase());
        }
        return rowValue === value;
      });
    });
  };

  const paginateData = (data: any[], page: number, pageSize: number): any[] => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  };

  const exportData = (data: any[], format: string, filename: string): void => {
    let content: string;
    let mimeType: string;

    switch (format) {
      case "csv":
        const headers = Object.keys(data[0] || {});
        content = [
          headers.join(","),
          ...data.map(row => headers.map(header => row[header]).join(","))
        ].join("\n");
        mimeType = "text/csv";
        break;
      default:
        content = JSON.stringify(data, null, 2);
        mimeType = "application/json";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Enhanced Bun table utility functions
  const formatValue = (value: any, options: BunTableOptions): string => {
    if (value === null || value === undefined) return "";

    const { numberFormat, precision, thousandsSeparator, decimalSeparator, currencySymbol, dateFormat } = options;

    if (typeof value === "number") {
      switch (numberFormat) {
        case "currency":
          return `${currencySymbol}${value.toFixed(precision || 2)}`;
        case "percentage":
          return `${(value * 100).toFixed(precision || 1)}%`;
        case "bytes":
          return formatBytes(value);
        default:
          const parts = value.toFixed(precision || 0).split(".");
          parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator || ",");
          return parts.join(decimalSeparator || ".");
      }
    }

    if (value instanceof Date) {
      const { dateFormat: format } = options;
      if (format === "YYYY-MM-DD HH:mm:ss") {
        return value.toISOString().replace("T", " ").slice(0, 19);
      }
      return value.toLocaleString();
    }

    return String(value);
  };

  const truncateText = (text: string, length: number, ellipsis: string = "..."): string => {
    if (text.length <= length) return text;
    return text.slice(0, length) + ellipsis;
  };

  const applyConditionalFormatting = (value: any, rules: any[], column: string): string => {
    const rule = rules.find(r => r.condition(value));
    if (rule) {
      const formattedValue = rule.format ? rule.format(value) : String(value);
      return `<span style="${rule.style}">${formattedValue}</span>`;
    }
    return String(value);
  };

  const generateTableWithBunOptions = (data: any[], options: BunTableOptions): string => {
    const {
      showHeaders,
      showIndex,
      colors,
      maxRows,
      border,
      padding,
      alignment,
      truncate,
      ellipsis,
      sortBy,
      sortOrder,
      showTotals
    } = options;

    let processedData = [...data];

    // Apply sorting
    if (sortBy) {
      processedData.sort((a, b) => {
        const aVal = a[sortBy as string];
        const bVal = b[sortBy as string];
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return sortOrder === "desc" ? -comparison : comparison;
      });
    }

    // Apply max rows
    if (maxRows) {
      processedData = processedData.slice(0, maxRows);
    }

    const columns = Object.keys(processedData[0] || {});
    const rows = processedData.map((row, index) => {
      const rowData = columns.map(column => {
        let value = formatValue(row[column], options);

        if (truncate && value.length > truncate) {
          value = truncateText(value, truncate, ellipsis);
        }

        return value;
      });

      if (showIndex) {
        return [index + 1, ...rowData];
      }
      return rowData;
    });

    const headers = showIndex ? ["#", ...columns] : columns;

    return `// Enhanced Bun.inspect.table() with options
const tableData = ${JSON.stringify(processedData, null, 2)};

// Basic table with enhanced options
console.log(Bun.inspect.table(tableData, ${JSON.stringify(options, null, 2)}));

// Custom column selection
console.log(Bun.inspect.table(tableData, ["name", "cpu", "status"], ${JSON.stringify(options, null, 2)}));`;
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "text-green-600 bg-green-100";
      case "POST":
        return "text-blue-600 bg-blue-100";
      case "PUT":
        return "text-orange-600 bg-orange-100";
      case "DELETE":
        return "text-red-600 bg-red-100";
      case "WS":
        return "text-purple-600 bg-purple-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return "↑";
      case "down":
        return "↓";
      case "stable":
        return "→";
      default:
        return "→";
    }
  };

  const generateTableCode = (type: string) => {
    let code = "";

    if (type === "servers") {
      code = `// Enhanced Server Monitoring Table with Bun.inspect.table()
const serverData = ${JSON.stringify(servers.map(s => ({
  name: s.name,
  region: s.region,
  version: s.version,
  containerRuntime: s.containerRuntime,
  cpu: s.cpu,
  memory: s.memory,
  loadAverage: s.loadAverage,
  diskUsage: s.diskUsage,
  networkStats: {
    bytesIn: formatBytes(s.networkStats.bytesIn),
    bytesOut: formatBytes(s.networkStats.bytesOut),
    packetsIn: s.networkStats.packetsIn,
    packetsOut: s.networkStats.packetsOut
  },
  processes: s.processes,
  healthChecks: s.healthChecks,
  status: s.status,
  alerts: s.alerts
})), null, 2)};

// Basic Bun table output
console.log(Bun.inspect.table(serverData));

// With custom column selection
console.log(Bun.inspect.table(serverData, ["name", "cpu", "memory", "status"]));

// With colors enabled
console.log(Bun.inspect.table(serverData, { colors: true }));

// Utility functions for formatting
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatHealthCheckIcon(status) {
  return status ? "✅" : "❌";
}`;
    } else if (type === "api") {
      code = `// API Endpoints Table with Bun.inspect.table()
const apiData = ${JSON.stringify(apiEndpoints, null, 2)};

console.log(Bun.inspect.table(apiData, ["method", "path", "latency"], { colors: true }));`;
    } else if (type === "performance") {
      code = `// Performance Metrics Table with Bun.inspect.table()
const metricsData = ${JSON.stringify(performanceMetrics.map(m => ({
  metric: m.metric,
  value: m.value,
  unit: m.unit,
  trend: m.trend,
  threshold: m.threshold,
  status: m.status
})), null, 2)};

console.log(Bun.inspect.table(metricsData, ["metric", "value", "status"], { colors: true }));`;
    } else if (type === "bun-apis") {
      code = `// Bun APIs Configuration Matrix
const bunAPIs = {
  transpilation: ${JSON.stringify(transpilationConfig, null, 2)},
  networking: ${JSON.stringify(networkingConfig, null, 2)},
  global: ${JSON.stringify(globalConfig, null, 2)},
  developmentWorkflow: ${JSON.stringify(developmentWorkflow, null, 2)}
};

console.log(Bun.inspect.table(bunAPIs.transpilation));
console.log(Bun.inspect.table(bunAPIs.networking));
console.log(Bun.inspect.table(bunAPIs.global));
console.log(Bun.inspect.table(bunAPIs.developmentWorkflow));`;
    } else if (type === "development-workflow") {
      code = `// Bun Development Workflow Configuration
const devConfig = ${JSON.stringify(developmentWorkflow, null, 2)};

// CLI Commands
${developmentWorkflow.watchMode ? 'bun --watch index.tsx' : 'bun index.tsx'}
${developmentWorkflow.hotMode ? 'bun --hot server.ts' : ''}
${developmentWorkflow.noClearScreen ? 'bun --watch --no-clear-screen' : ''}
${developmentWorkflow.smolMode ? 'bun run --smol' : ''}

// Example server with hot reload
declare global {
  var reloadCount: number;
}

globalThis.reloadCount ??= 0;
console.log(\`Reloaded \${globalThis.reloadCount} times\`);
globalThis.reloadCount++;

// Keep process alive
setInterval(() => {}, 1000000);`;
    } else if (type === "networking-security") {
      code = `// Bun Networking & Security Configuration
const networkConfig = ${JSON.stringify(networkingSecurity, null, 2)};

// DNS Resolution Examples
// Bun.serve({
//   hostname: "localhost",
//   port: 3000,
//   fetch(req) {
//     return new Response("Hello from Bun!");
//   }
// });

// TLS Configuration
const tlsOptions = {
  ca: process.env.CA_CERT,
  key: process.env.TLS_KEY,
  cert: process.env.TLS_CERT,
  rejectUnauthorized: ${networkingSecurity.certificateValidation !== 'disabled'}
};

// HTTP Client with Security
const response = await fetch("https://api.example.com/data", {
  method: "GET",
  headers: ${JSON.stringify(networkingSecurity.headers, null, 2)},
  timeout: ${networkingSecurity.timeout?.total || 60000},
  redirect: "manual",
  tls: tlsOptions
});

// Proxy Configuration
${networkingSecurity.proxy?.enabled ? `const proxyAgent = new ProxyAgent("http://${networkingSecurity.proxy.host}:${networkingSecurity.proxy.port}");` : '// Proxy disabled'}

// Rate Limiting Implementation
${networkingSecurity.security?.rateLimit?.enabled ? `
class RateLimiter {
  constructor(requests, window) {
    this.requests = requests;
    this.window = window;
    this.clients = new Map();
  }

  isAllowed(clientId) {
    const now = Date.now();
    const client = this.clients.get(clientId) || { count: 0, resetTime: now + this.window };

    if (now > client.resetTime) {
      client.count = 0;
      client.resetTime = now + this.window;
    }

    if (client.count >= this.requests) {
      return false;
    }

    client.count++;
    this.clients.set(clientId, client);
    return true;
  }
}

const rateLimiter = new RateLimiter(${networkingSecurity.security.rateLimit.requests}, ${networkingSecurity.security.rateLimit.window});` : '// Rate limiting disabled'}

// CORS Middleware
${networkingSecurity.security?.cors?.enabled ? `
const corsMiddleware = (req) => {
  const origin = req.headers.get("origin");
  const allowedOrigins = ${JSON.stringify(networkingSecurity.security.cors.origins)};

  if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": ${JSON.stringify(networkingSecurity.security.cors.methods.join(", "))},
      "Access-Control-Allow-Headers": ${JSON.stringify(networkingSecurity.security.cors.headers.join(", "))}
    };
  }
  return {};
};` : '// CORS disabled'}

// Security Headers
const securityHeaders = {
  "Strict-Transport-Security": ${networkingSecurity.security?.hsts ? '"max-age=31536000; includeSubDomains"' : 'undefined'},
  "Content-Security-Policy": ${networkingSecurity.security?.csp ? '"default-src \\"self\\""' : 'undefined'},
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff"
};`;
    } else if (type === "command-line") {
      code = `// Bun Command Line Interface & Optimization Configuration
const commandConfig = ${JSON.stringify(commandLine, null, 2)};

// Optimization Configuration for Bun
const { optimization } = commandConfig;
console.log("⚡ Optimization Configuration Applied:");
console.log("Smol Mode:", ${commandLine.optimization?.smol || false});
console.log("Minify:", ${commandLine.optimization?.minify || false});
console.log("Compress:", ${commandLine.optimization?.compress || true});
console.log("Tree Shaking:", ${commandLine.optimization?.treeShaking || true});
console.log("Bundle Size:", "${commandLine.optimization?.bundleSize || 'default'}");
console.log("Target:", "${commandLine.optimization?.target || 'bun'}");

// Configure optimization settings
const configureOptimization = () => {
  // Apply smol mode optimizations
  if (${commandLine.optimization?.smol || false}) {
    console.log("🔥 Smol mode activated - Maximum optimization enabled");
    // Smol mode enables all optimizations
    globalThis.BUN_SMOL = true;
  }

  // Configure bundle size optimization
  const bundleSize = "${commandLine.optimization?.bundleSize || 'default'}";
  const optimizationLevel = {
    "smol": "maximum",
    "tiny": "aggressive",
    "minified": "standard",
    "default": "minimal"
  }[bundleSize] || "minimal";

    Bun.inspect.defaultOptions.maxStringLength = ${commandLine.console?.maxStringLength || 10000};
    Bun.inspect.defaultOptions.showHidden = ${commandLine.console?.showHidden || false};
    Bun.inspect.defaultOptions.colors = ${commandLine.console?.colors || true};
    Bun.inspect.defaultOptions.compact = ${commandLine.console?.compact || false};
    Bun.inspect.defaultOptions.breakLength = ${commandLine.console?.breakLength || 80};
    Bun.inspect.defaultOptions.getters = ${commandLine.console?.getters || true};
    Bun.inspect.defaultOptions.proxy = ${commandLine.console?.proxy || true};
    Bun.inspect.defaultOptions.iterableLimit = ${commandLine.console?.iterableLimit || 100};
    Bun.inspect.defaultOptions.maxArrayLength = ${commandLine.console?.maxArrayLength || 100};
    Bun.inspect.defaultOptions.maxBufferLength = ${commandLine.console?.maxBufferLength || 1000};
  }
};

// Apply console configuration
configureConsole();

// Optimization utility functions
const optimizationUtils = {
  // Enable smol mode for maximum performance
  enableSmolMode: () => {
    console.log("🚀 Enabling smol mode...");
    // Enable all optimizations
    const optimizations = {
      minify: true,
      compress: true,
      treeShaking: true,
      deadCodeElimination: true,
      inlineFunctions: true,
      constantFolding: true
    };

    Object.entries(optimizations).forEach(([opt, enabled]) => {
      console.log(\`  ✅ \${opt}: \${enabled}\`);
    });

    return optimizations;
  },

  // Get current optimization status
  getOptimizationStatus: () => {
    return {
      smol: ${commandLine.optimization?.smol || false},
      minify: ${commandLine.optimization?.minify || false},
      compress: ${commandLine.optimization?.compress || true},
      treeShaking: ${commandLine.optimization?.treeShaking || true},
      deadCodeElimination: ${commandLine.optimization?.deadCodeElimination || true},
      inlineFunctions: ${commandLine.optimization?.inlineFunctions || false},
      constantFolding: ${commandLine.optimization?.constantFolding || true},
      bundleSize: "${commandLine.optimization?.bundleSize || 'default'}",
      target: "${commandLine.optimization?.target || 'bun'}",
      platform: "${commandLine.optimization?.platform || 'neutral'}"
    };
  },

  // Calculate potential size savings
  calculateSavings: (originalSize) => {
    const { smol, minify, compress, bundleSize } = ${JSON.stringify(commandLine.optimization)};
    let savings = 0;

    if (smol) savings += 0.4; // 40% reduction
    if (minify) savings += 0.2; // 20% reduction
    if (compress) savings += 0.1; // 10% reduction

    const bundleMultiplier = {
      "smol": 0.5,
      "tiny": 0.3,
      "minified": 0.7,
      "default": 1.0
    }[bundleSize] || 1.0;

    const finalSize = originalSize * (1 - savings) * bundleMultiplier;
    const totalSavings = ((originalSize - finalSize) / originalSize * 100).toFixed(1);

    return {
      original: originalSize,
      final: finalSize,
      savings: \`\${totalSavings}%\`
    };
  }
};

// Test console depth with nested objects
const deepObject = {
  level1: {
    level2: {
      level3: {
        level4: {
          level5: {
            level6: {
              level7: {
                level8: {
                  level9: {
                    level10: {
                      level11: "This is beyond depth limit"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

console.log("🔍 Testing Console Depth:");
console.log(deepObject);

// Test array and buffer limits
const largeArray = Array.from({ length: 150 }, (_, i) => ({ index: i, data: \`Item \${i}\` }));
const largeBuffer = Buffer.from("A".repeat(1500));

console.log("📊 Testing Array Limits:");
console.log(largeArray);

console.log("📋 Testing Buffer Limits:");
console.log(largeBuffer);

// Demonstrate optimization features
console.log("⚡ Optimization Features:");
console.log("Status:", optimizationUtils.getOptimizationStatus());

// Calculate size savings example
const exampleSize = 1024 * 1024; // 1MB
const savings = optimizationUtils.calculateSavings(exampleSize);
console.log("💾 Size Savings Example:");
console.log("Original:", (savings.original / 1024).toFixed(1) + "KB");
console.log("Final:", (savings.final / 1024).toFixed(1) + "KB");
console.log("Savings:", savings.savings);

${commandLine.optimization?.smol ? `
// Smol mode specific optimizations
console.log("🔥 Smol Mode Active:");
console.log("- Maximum code elimination");
console.log("- Aggressive minification");
console.log("- Tree shaking enabled");
console.log("- Dead code removal");
console.log("- Constant folding");
console.log("- Function inlining");
console.log("- Bundle size optimization");
` : ''}

// STDIN Pipe Examples with bun run -
// Read from stdin and execute as TypeScript with JSX support
${commandLine.stdin?.enabled ? `
// Basic stdin execution
console.log("📡 Basic stdin execution:");
// Example: echo "console.log('Hello')" | bun run -
// Output: Hello

// TypeScript in stdin
console.log("🔷 TypeScript execution:");
// Example: echo "const x: number = 42; console.log(x);" | bun run -
// Output: 42

// JSX in stdin
console.log("⚛️ JSX execution:");
// Example: echo "const jsx = <div>Hello JSX</div>; console.log(jsx);" | bun run -
// Output: <div>Hello JSX</div>

// File redirection examples
console.log("📁 File redirection:");
// Example: echo "console.log!('This is TypeScript!' as any)" > secretly-typescript.js
//          bun run - < secretly-typescript.js
// Output: This is TypeScript!

// BunFile instances for stdin, stdout, stderr
console.log("📂 BunFile Stream Management:");
console.log("Bun.stdin (readonly):", typeof Bun.stdin);
console.log("Bun.stdout (writable):", typeof Bun.stdout);
console.log("Bun.stderr (writable):", typeof Bun.stderr);

// Advanced stdin processing with Bun.stdin
const processStdinWithBunFile = async () => {
  console.log("🔧 Processing stdin with Bun.stdin...");

  // Bun.stdin is a readonly BunFile instance
  const stdin = Bun.stdin;
  console.log("✅ stdin type:", stdin.constructor.name);
  console.log("📏 stdin size:", await stdin.size());

  // Read from stdin as text
  const decoder = new TextDecoder("${commandLine.stdin.encoding}");

  for await (const chunk of stdin) {
    const data = decoder.decode(chunk);
    console.log("📥 Received from stdin:", data);

    ${commandLine.stdin.transform ? `// Transform data
    const transformed = data.toUpperCase().trim();
    console.log("🔄 Transformed:", transformed);` : ''}

    // Write to stdout using Bun.stdout
    if (Bun.stdout) {
      await Bun.stdout.write("📤 Processed: " + data + "\\n");
    }
  }
};

// Advanced stdout management with Bun.stdout
const manageStdoutWithBunFile = async () => {
  console.log("📤 Managing stdout with Bun.stdout...");

  // Bun.stdout is a writable BunFile instance
  const stdout = Bun.stdout;
  console.log("✅ stdout type:", stdout.constructor.name);

  ${commandLine.stdout?.pipeTo ? `
  // Redirect stdout to file
  const outputFile = Bun.file("${commandLine.stdout.pipeTo}");
  const writer = outputFile.writer();

  // Write custom output
  await writer.write("📝 Custom output from Bun.stdout\\n");
  await writer.end();

  console.log("✅ Stdout redirected to: ${commandLine.stdout.pipeTo}");` : `
  // Write directly to stdout
  await stdout.write("📝 Direct write to Bun.stdout\\n");
  console.log("✅ Output written to console");`}
};

// Advanced stderr management with Bun.stderr
const manageStderrWithBunFile = async () => {
  console.log("❌ Managing stderr with Bun.stderr...");

  // Bun.stderr is a writable BunFile instance
  const stderr = Bun.stderr;
  console.log("✅ stderr type:", stderr.constructor.name);

  ${commandLine.stderr?.pipeTo ? `
  // Redirect stderr to file
  const errorFile = Bun.file("${commandLine.stderr.pipeTo}");
  const errorWriter = errorFile.writer();

  // Write error output
  await errorWriter.write("❌ Error output from Bun.stderr\\n");
  await errorWriter.end();

  console.log("✅ Stderr redirected to: ${commandLine.stderr.pipeTo}");` : `
  // Write directly to stderr
  await stderr.write("❌ Direct write to Bun.stderr\\n");
  console.log("✅ Error output written to console");`}
};

// Stream manipulation utilities
const streamUtils = {
  // Pipe between streams
  pipeStream: async (source, destination) => {
    console.log("🔄 Piping stream:", source.constructor.name, "→", destination.constructor.name);

    for await (const chunk of source) {
      await destination.write(chunk);
    }
  },

  // Stream information
  getStreamInfo: async (stream, name) => {
    try {
      const size = await stream.size();
      return {
        name,
        type: stream.constructor.name,
        size,
        readable: stream.readable,
        writable: stream.writable
      };
    } catch (error) {
      return {
        name,
        type: stream.constructor.name,
        error: error.message
      };
    }
  },

  // Demonstrate all streams
  demonstrateStreams: async () => {
    console.log("📊 Stream Information:");

    const stdinInfo = await streamUtils.getStreamInfo(Bun.stdin, "stdin");
    const stdoutInfo = await streamUtils.getStreamInfo(Bun.stdout, "stdout");
    const stderrInfo = await streamUtils.getStreamInfo(Bun.stderr, "stderr");

    console.log("📥 stdin:", stdinInfo);
    console.log("📤 stdout:", stdoutInfo);
    console.log("❌ stderr:", stderrInfo);
  }
};

// File redirect simulation with BunFile API
${commandLine.stdin?.fileRedirect ? `
const simulateFileRedirectWithBunFile = async () => {
  console.log("📂 File redirect with BunFile API:");

  // Create a file with TypeScript code
  const typescriptFile = Bun.file("secretly-typescript.js");
  const writer = typescriptFile.writer();
  await writer.write("console.log!('This is TypeScript!' as any)");
  await writer.end();

  // Read the file and pipe to stdin simulation
  const content = await typescriptFile.text();
  console.log("📄 File content:", content);

  // Simulate bun run - < secretly-typescript.js
  console.log("🚀 Simulating: bun run - < secretly-typescript.js");
  console.log("✅ TypeScript code executed via stdin");

  // Clean up
  await Bun.file("secretly-typescript.js").delete();
};

simulateFileRedirectWithBunFile();` : ''}

// Execute stream demonstrations
console.log("🔧 BunFile Stream Examples:");
await processStdinWithBunFile();
await manageStdoutWithBunFile();
await manageStderrWithBunFile();
await streamUtils.demonstrateStreams();

// Read from stdin with encoding
const stdin = Bun.stdin;
const decoder = new TextDecoder("${commandLine.stdin.encoding}");

for await (const chunk of stdin) {
  const data = decoder.decode(chunk);
  console.log("📥 Received from stdin:", data);

  ${commandLine.stdin.transform ? `// Transform data
  const transformed = data.toUpperCase().trim();
  console.log("🔄 Transformed:", transformed);` : ''}
}

// Advanced stdin processing
const processStdinCode = async (code) => {
  console.log("🔧 Processing stdin code...");

  // All stdin code is treated as TypeScript with JSX support
  const { treatAsTypeScript, jsxSupport } = ${JSON.stringify(commandLine.stdin)};

  if (treatAsTypeScript) {
    console.log("✅ TypeScript support enabled");
  }

  if (jsxSupport) {
    console.log("⚛️ JSX support enabled");
  }

  // Execute the code without temporary files
  try {
    const { directExecution } = ${JSON.stringify(commandLine.stdin)};
    if (directExecution) {
      console.log("⚡ Direct execution mode - no temporary files");
      // Code is executed directly from stdin
    }

    return code;
  } catch (error) {
    console.error("❌ Stdin execution error:", error);
    return null;
  }
};

// Stdin utility functions
const stdinUtils = {
  // Execute code from stdin
  executeFromStdin: async (code) => {
    console.log("🚀 Executing from stdin...");
    console.log("📝 Code:", code);
    console.log("🔷 TypeScript: ${commandLine.stdin?.treatAsTypeScript ? 'enabled' : 'disabled'}");
    console.log("⚛️ JSX: ${commandLine.stdin?.jsxSupport ? 'enabled' : 'disabled'}");
    console.log("⚡ Direct execution: ${commandLine.stdin?.directExecution ? 'enabled' : 'disabled'}");
  },

  // Process file redirection
  processFileRedirect: (filename) => {
    console.log("📁 Processing file redirect:", filename);
    console.log("🔷 Treated as TypeScript with JSX support");
    console.log("⚡ No temporary files created");
  },

  // Show stdin capabilities
  showCapabilities: () => {
    return {
      languages: ["JavaScript", "TypeScript", "JSX", "TSX"],
      features: {
        typescript: ${commandLine.stdin?.treatAsTypeScript},
        jsx: ${commandLine.stdin?.jsxSupport},
        fileRedirect: ${commandLine.stdin?.fileRedirect},
        directExecution: ${commandLine.stdin?.directExecution},
        noTempFiles: ${commandLine.stdin?.temporaryFile === false}
      },
      encoding: "${commandLine.stdin?.encoding}",
      transform: ${commandLine.stdin?.transform}
    };
  }
};

// Demonstrate stdin capabilities
console.log("🔧 Stdin Configuration:");
console.log(JSON.stringify(stdinUtils.showCapabilities(), null, 2));

// Example usage scenarios
console.log("💻 Usage Examples:");
console.log("1. Basic execution:");
console.log("   echo 'console.log('Hello')' | bun run -");
console.log("");
console.log("2. TypeScript execution:");
console.log("   echo 'const x: number = 42; console.log(x);' | bun run -");
console.log("");
console.log("3. JSX execution:");
console.log("   echo 'const jsx = <div>Hello</div>; console.log(jsx);' | bun run -");
console.log("");
console.log("4. File redirection:");
console.log("   bun run - < script.js");
console.log("");
console.log("5. Data processing:");
console.log("   cat data.json | bun run -");

// Pipe from file example
const fileContent = await Bun.file("${commandLine.stdin?.pipeFrom || 'input.txt'}").text();
console.log("📄 File content processed via stdin:");
console.log(fileContent);

// Filter and process
const lines = fileContent.split('\\n');
${commandLine.stdin?.filter ? `const filtered = lines.filter(line => line.includes("${commandLine.stdin.filter}"));` : 'const filtered = lines;'}
console.log("🔍 Filtered lines:", filtered);

` : '// STDIN disabled'}

// STDOUT Configuration with Bun.stdout
${commandLine.stdout?.pipeTo ? `
// Pipe output to file using Bun.stdout
const outputFile = Bun.file("${commandLine.stdout.pipeTo}");
const writer = outputFile.writer();
await writer.write("Hello from Bun.stdout!");
await writer.end();
console.log("✅ Output written to ${commandLine.stdout.pipeTo}");` : `
// Write to console using Bun.stdout
await Bun.stdout.write("Hello from Bun.stdout!\\n");
console.log("✅ Output written to console");`}

// STDERR Configuration with Bun.stderr
${commandLine.stderr?.pipeTo ? `
// Pipe errors to file using Bun.stderr
const errorFile = Bun.file("${commandLine.stderr?.pipeTo}");
const errorWriter = errorFile.writer();
await errorWriter.write("Error occurred!");
await errorWriter.end();
console.log("✅ Errors written to ${commandLine.stderr.pipeTo}");` : `
// Write errors to console using Bun.stderr
await Bun.stderr.write("Error occurred!\\n");
console.log("✅ Errors written to console");`}

// Command Line Flags Usage
const { flags } = commandConfig;
const args = process.argv.slice(2);

// Build command string with optimization options
const buildCommand = () => {
  let cmd = "bun";

  if (flags.hot) cmd += " --hot";
  if (flags.watch) cmd += " --watch";
  if (flags.smol) cmd += " --smol";
  if (flags.version) cmd += " --version";
  if (flags.help) cmd += " --help";

  // Add console depth flag
  cmd += " --console-depth ${commandLine.console?.depth || 10}";

  // Add optimization flags
  ${commandLine.optimization?.smol ? 'cmd += " --smol";' : ''}
  ${commandLine.optimization?.minify ? 'cmd += " --minify";' : ''}

  if (flags.eval) cmd += \` --eval "\${flags.eval}"\`;
  if (flags.print) cmd += \` --print "\${flags.print}"\`;

  if (flags.preload?.length) {
    flags.preload.forEach(preload => {
      cmd += \` --preload \${preload}\`;
    });
  }

  if (flags.import?.length) {
    flags.import.forEach(imp => {
      cmd += \` --import \${imp}\`;
    });
  }

  Object.entries(flags.define || {}).forEach(([key, value]) => {
    cmd += \` --define \${key}=\${value}\`;
  });

  if (flags.external?.length) {
    flags.external.forEach(ext => {
      cmd += \` --external \${ext}\`;
    });
  }

  if (flags.cwd && flags.cwd !== process.cwd()) {
    cmd += \` --cwd \${flags.cwd}\`;
  }

  cmd += \` \${commandConfig.execution?.entryPoint || 'index.js'}\`;

  return cmd;
};

// Environment variables setup
if (flags.env) {
  Object.entries(flags.env).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

// Memory management
if (commandConfig.execution?.maxHeap) {
  process.env.NODE_OPTIONS = \`--max-old-space-size=\${commandConfig.execution.maxHeap.replace('GB', '000')}\`;
}

// Console utility functions
const consoleUtils = {
  inspectDeep: (obj, customDepth = ${commandLine.console?.depth || 10}) => {
    const originalDepth = Bun.inspect.defaultOptions.depth;
    Bun.inspect.defaultOptions.depth = customDepth;
    console.log(obj);
    Bun.inspect.defaultOptions.depth = originalDepth;
  },

  logCompact: (obj) => {
    const originalCompact = Bun.inspect.defaultOptions.compact;
    Bun.inspect.defaultOptions.compact = true;
    console.log(obj);
    Bun.inspect.defaultOptions.compact = originalCompact;
  },

  logColorless: (obj) => {
    const originalColors = Bun.inspect.defaultOptions.colors;
    Bun.inspect.defaultOptions.colors = false;
    console.log(obj);
    Bun.inspect.defaultOptions.colors = originalColors;
  }
};

// Example usage
console.log("Generated command:", buildCommand());
console.log("Working directory:", commandConfig.execution?.workingDirectory);
console.log("Memory limit:", commandConfig.execution?.heapLimit);

// Process stdin data with transformation
const processData = async (input) => {
  const { encoding, transform, filter } = commandConfig.stdin || {};

  try {
    let data = input;

    if (encoding === "json") {
      data = JSON.parse(input);
    } else if (encoding === "buffer") {
      data = Buffer.from(input);
    }

    if (transform && typeof data === "string") {
      data = data.toUpperCase();
    }

    if (filter && typeof data === "string") {
      data = data.split('\\n').filter(line => line.includes(filter)).join('\\n');
    }

    return data;
  } catch (error) {
    console.error("Processing error:", error);
    return input;
  }
};

// Usage examples:
// bun --smol run script.js
// bun --smol --minify --compress run script.js
// bun --smol --console-depth 15 --eval "console.log(optimizationUtils.getOptimizationStatus())"
// cat data.txt | bun --smol run script.js`;
    }

  setTableCode(code);
  setShowCodeModal(true);
};

const handleExportTable = () => {
  let data = "";
  let filename = "";

  if (selectedTable === "servers") {
    filename = `servers.${exportFormat}`;
    if (exportFormat === "json") {
      data = JSON.stringify(servers, null, 2);
    } else if (exportFormat === "csv") {
      data = "name,region,cpu,memory,status,uptime,connections\n";
      servers.forEach((s) => {
        data += `${s.name},${s.region},${s.cpu},${s.memory},${s.status},${s.uptime},${s.connections}\n`;
      });
    } else {
      data = "Server Monitoring Data\n\n";
      servers.forEach((s: ServerMonitoringData) => {
        data += `${s.name} (${s.region}) - CPU: ${s.cpu}%, Memory: ${s.memory}%, Status: ${s.status}\n`;
      });
    }
  }

  // Create download
  const blob = new Blob([data], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const handleS3Upload = async () => {
  setIsUploading(true);
  const provider = uploadProvider === "r2" ? "Cloudflare R2" : "S3";
  setUploadStatus(`🚀 Starting ${provider} upload...`);

  try {
    setUploadStatus(`📤 Preparing files for ${provider} upload...`);

    // Generate sample data with different content types
    const csvData = "Name,Age,City\nJohn,30,New York\nJane,25,Los Angeles\nBob,35,Chicago";
    const imageData = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="; // 1x1 PNG
    const pdfData = "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF";

    // Simulate upload progress
    await new Promise(resolve => setTimeout(resolve, 1000));
    setUploadStatus(`☁️ Uploading CSV report to ${provider}...`);

    // Example: Force download with custom filename
    console.log(`// 📄 Force download with custom filename`);
    console.log(`await s3.write("reports/data.csv", csvData, {`);
    console.log(`  contentDisposition: 'attachment; filename="report-2024.csv"'`);
    console.log(`});`);

    await new Promise(resolve => setTimeout(resolve, 800));
    setUploadStatus(`🖼️ Uploading image to ${provider}...`);

    // Example: Show inline in browser
    console.log(`// 🖼️ Show inline in browser`);
    console.log(`await s3.write("assets/image.png", imageData, {`);
    console.log(`  contentDisposition: "inline"`);
    console.log(`});`);

    await new Promise(resolve => setTimeout(resolve, 800));
    setUploadStatus(`📋 Uploading PDF invoice to ${provider}...`);

    // Example: Dynamic filenames
    console.log(`// 📋 Dynamic filenames`);
    console.log(`const user = { id: "user123", name: "John Doe" };`);
    console.log(`await s3.write(\`\${user.id}.pdf\`, pdfData, {`);
    console.log(`  contentDisposition: \`attachment; filename="\${user.name}-invoice.pdf"\``);
    console.log(`});`);

    await new Promise(resolve => setTimeout(resolve, 800));
    setUploadStatus(`✅ Upload completed! Check console for ${provider} examples.`);

    // Instructions for the user
    if (uploadProvider === "r2") {
      console.log("\n📋 To upload to Cloudflare R2, run: bun run r2:upload");
      console.log("Make sure to set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, and R2_BUCKET environment variables");
      console.log("\n🔧 Content-Disposition Examples for R2:");
      console.log("// Force download: attachment; filename='report.csv'");
      console.log("// Inline display: inline");
      console.log("// Dynamic: attachment; filename='user-invoice.pdf'");
    } else {
      console.log("\n📋 To upload to S3, run: bun run s3:upload");
      console.log("Make sure to set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET environment variables");
      console.log("\n🔧 Content-Disposition Examples for S3:");
      console.log("// Force download: attachment; filename='report.csv'");
      console.log("// Inline display: inline");
      console.log("// Dynamic: attachment; filename='user-invoice.pdf'");
    }

  } catch (error) {
    setUploadStatus(`❌ Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    setIsUploading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            🖥️ Systems Dashboard
          </h1>
          <p className="text-gray-300 text-lg">
            Bun inspect.table() - Complete Practical Guide Implementation
          </p>
        </header>

        {/* Controls */}
        <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {(["servers", "api", "performance", "headers", "bun-apis", "development-workflow", "runtime-control", "table-config", "networking-security", "command-line", "health"] as const).map((table) => (
                <button
                  key={table}
                  onClick={() => setSelectedTable(table)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    selectedTable === table
                      ? "bg-blue-600 text-white"
                      : "bg-white/20 text-gray-300 hover:bg-white/30"
                  }`}
                >
                  {table === "servers"
                    ? "🖥️ Servers"
                    : table === "api"
                      ? "🔗 API"
                      : table === "performance"
                        ? "📊 Metrics"
                        : table === "headers"
                          ? "📋 Headers"
                          : table === "bun-apis"
                            ? "🔧 Bun APIs"
                            : table === "development-workflow"
                              ? "⚡ Dev Workflow"
                              : table === "runtime-control"
                                ? "⚙️ Runtime Control"
                                : table === "table-config"
                                  ? "📋 Table Config"
                                  : table === "networking-security"
                                    ? "🔒 Network Security"
                                    : table === "command-line"
                                      ? "⌨️ Command Line"
                                      : "🏥 Health"}
                </button>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setIsLiveMode(!isLiveMode)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isLiveMode
                    ? "bg-green-600 text-white"
                    : "bg-white/20 text-gray-300 hover:bg-white/30"
                }`}
              >
                {isLiveMode ? "🔴 Live" : "⏸️ Paused"}
              </button>

              <button
                onClick={handleS3Upload}
                disabled={isUploading}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isUploading
                    ? "bg-orange-600 text-white cursor-wait"
                    : "bg-orange-500/80 text-white hover:bg-orange-600"
                }`}
              >
                {isUploading ? "☁️ Uploading..." : `📤 Upload to ${uploadProvider.toUpperCase()}`}
              </button>

              <select
                value={uploadProvider}
                onChange={(e) => setUploadProvider(e.target.value as "s3" | "r2")}
                disabled={isUploading}
                className="px-3 py-2 bg-white/20 text-gray-300 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="s3">🟠 AWS S3</option>
                <option value="r2">🟠 Cloudflare R2</option>
              </select>

              {uploadStatus && (
                <div className="px-4 py-2 rounded-lg bg-black/30 text-yellow-300 text-sm border border-yellow-500/30">
                  {uploadStatus}
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setIsLiveMode(!isLiveMode)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isLiveMode
                    ? "bg-green-600 text-white"
                    : "bg-white/20 text-gray-300 hover:bg-white/30"
                }`}
              >
                {isLiveMode ? "🔴 Live" : "⏸️ Paused"}
              </button>

              <button
                onClick={() => generateTableCode(selectedTable)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200"
              >
                📝 Code
              </button>

              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as any)}
                className="px-4 py-2 bg-white/20 text-gray-300 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text</option>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="html">HTML</option>
              </select>

              <button
                onClick={handleExportTable}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
              >
                📥 Export
              </button>
            </div>
          </div>
        </section>

        {/* Servers Table */}
        {selectedTable === "servers" && (
          <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Server Monitoring
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-white text-sm">
                <thead className="border-b border-white/20">
                  <tr>
                    <th className="px-3 py-3 text-left">Server</th>
                    <th className="px-3 py-3 text-left">Region</th>
                    <th className="px-3 py-3 text-right">CPU %</th>
                    <th className="px-3 py-3 text-right">Memory %</th>
                    <th className="px-3 py-3 text-right">Load Avg</th>
                    <th className="px-3 py-3 text-right">Disk %</th>
                    <th className="px-3 py-3 text-left">Network</th>
                    <th className="px-3 py-3 text-left">Processes</th>
                    <th className="px-3 py-3 text-left">Health</th>
                    <th className="px-3 py-3 text-left">Status</th>
                    <th className="px-3 py-3 text-right">Alerts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {servers.map((server) => (
                    <tr
                      key={server.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-3 py-3">
                        <div>
                          <div className="font-mono text-xs">{server.name}</div>
                          <div className="text-xs text-gray-400">{server.version}</div>
                          <div className="text-xs text-gray-500">{server.containerRuntime}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs">{server.region}</td>
                      <td className="px-3 py-3 text-right">
                        <span
                          className={
                            server.cpu > 85
                              ? "text-red-400"
                              : server.cpu > 70
                                ? "text-yellow-400"
                                : "text-green-400"
                          }
                        >
                          {server.cpu}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          className={
                            server.memory > 85
                              ? "text-red-400"
                              : server.memory > 70
                                ? "text-yellow-400"
                                : "text-green-400"
                          }
                        >
                          {server.memory}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="text-xs space-y-1">
                          <div className={getLoadAverageColor(server.loadAverage[0])}>
                            {server.loadAverage[0].toFixed(2)}
                          </div>
                          <div className={getLoadAverageColor(server.loadAverage[1])}>
                            {server.loadAverage[1].toFixed(2)}
                          </div>
                          <div className={getLoadAverageColor(server.loadAverage[2])}>
                            {server.loadAverage[2].toFixed(2)}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="text-xs">
                          <div className={getDiskUsageColor(server.diskUsage.percentage)}>
                            {server.diskUsage.percentage}%
                          </div>
                          <div className="text-gray-400">
                            {formatBytes(server.diskUsage.used * 1024 * 1024 * 1024)}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs space-y-1">
                          <div className="text-green-400">↓ {formatBytes(server.networkStats.bytesIn)}</div>
                          <div className="text-blue-400">↑ {formatBytes(server.networkStats.bytesOut)}</div>
                          <div className="text-gray-400">
                            {server.networkStats.packetsIn.toLocaleString()} / {server.networkStats.packetsOut.toLocaleString()} pkt
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs space-y-1">
                          <div className="text-gray-300">Total: {server.processes.total}</div>
                          <div className="text-green-400">Running: {server.processes.running}</div>
                          <div className="text-gray-400">Sleeping: {server.processes.sleeping}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs space-y-1">
                          <div>{formatHealthCheckIcon(server.healthChecks.http)} HTTP</div>
                          <div>{formatHealthCheckIcon(server.healthChecks.tcp)} TCP</div>
                          <div>{formatHealthCheckIcon(server.healthChecks.database)} DB</div>
                          <div>{formatHealthCheckIcon(server.healthChecks.cache)} Cache</div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(server.status)}`}
                        >
                          {server.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="text-xs space-y-1">
                          {server.alerts.critical > 0 && (
                            <div className="text-red-400">🚨 {server.alerts.critical}</div>
                          )}
                          {server.alerts.warning > 0 && (
                            <div className="text-yellow-400">⚠️ {server.alerts.warning}</div>
                          )}
                          {server.alerts.info > 0 && (
                            <div className="text-blue-400">ℹ️ {server.alerts.info}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              Last updated: {servers[0]?.lastUpdate.toLocaleTimeString()}
            </div>
          </section>
        )}

        {/* API Endpoints Table */}
        {selectedTable === "api" && (
          <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">
              API Endpoints Documentation
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead className="border-b border-white/20">
                  <tr>
                    <th className="px-4 py-3 text-left">Method</th>
                    <th className="px-4 py-3 text-left">Path</th>
                    <th className="px-4 py-3 text-left">Component</th>
                    <th className="px-4 py-3 text-right">Latency</th>
                    <th className="px-4 py-3 text-left">Auth</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {apiEndpoints.map((endpoint, index) => (
                    <tr
                      key={index}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getMethodColor(endpoint.method)}`}
                        >
                          {endpoint.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {endpoint.path}
                      </td>
                      <td className="px-4 py-3">{endpoint.component}</td>
                      <td className="px-4 py-3 text-right">
                        {endpoint.latency}ms
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            endpoint.auth === "required"
                              ? "bg-red-100 text-red-600"
                              : endpoint.auth === "optional"
                                ? "bg-yellow-100 text-yellow-600"
                                : "bg-green-100 text-green-600"
                          }`}
                        >
                          {endpoint.auth}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(endpoint.status)}`}
                        >
                          {endpoint.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {endpoint.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Performance Metrics Table */}
        {selectedTable === "performance" && (
          <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Performance Metrics Dashboard
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead className="border-b border-white/20">
                  <tr>
                    <th className="px-4 py-3 text-left">Metric</th>
                    <th className="px-4 py-3 text-right">Value</th>
                    <th className="px-4 py-3 text-left">Unit</th>
                    <th className="px-4 py-3 text-left">Trend</th>
                    <th className="px-4 py-3 text-right">Threshold</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {performanceMetrics.map((metric, index) => (
                    <tr
                      key={index}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{metric.metric}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {metric.value.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{metric.unit}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`flex items-center gap-1 ${
                            metric.trend === "up"
                              ? "text-green-400"
                              : metric.trend === "down"
                                ? "text-red-400"
                                : "text-gray-400"
                          }`}
                        >
                          {getTrendIcon(metric.trend)} {metric.trend}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {metric.threshold.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(metric.status)}`}
                        >
                          {metric.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Headers Documentation Table */}
        {selectedTable === "headers" && (
          <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">
              📋 Headers API Documentation
            </h2>
            <div className="mb-6 p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
              <p className="text-blue-300 text-sm mb-3">
                <strong>__internal.BunHeadersOverride.toJSON()</strong> - Convert Headers to plain JavaScript object ~10x faster than Object.fromEntries(headers.entries())
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                  <h4 className="text-white font-semibold mb-2 text-sm">🚀 Performance Advantage</h4>
                  <p className="text-blue-300 text-xs">
                    Highly optimized for performance-critical applications like server-side rendering or API servers handling high request volumes
                  </p>
                </div>

                <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                  <h4 className="text-white font-semibold mb-2 text-sm">🔍 Key Behaviors</h4>
                  <ul className="text-blue-300 text-xs space-y-1">
                    <li>• Well-known headers auto-lowercased</li>
                    <li>• Custom headers preserve original case</li>
                    <li>• Insertion order NOT preserved</li>
                    <li>• set-cookie always string array</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mb-6 p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
              <h4 className="text-purple-300 font-semibold mb-3 text-sm">📝 Practical Usage Example</h4>
              <pre className="text-xs text-green-400 overflow-x-auto bg-black/40 p-3 rounded">
{`const headers = new Headers();
headers.append('Content-Type', 'application/json');
headers.append('X-Custom-Header', 'MyValue');
headers.append('Set-Cookie', 'sessionId=abc123');
headers.append('Set-Cookie', 'theme=dark');

// toJSON() called automatically by JSON.stringify()
const jsonString = JSON.stringify(headers);
const headersObject = JSON.parse(jsonString);

console.log(headersObject);
// Output:
// {
//   "content-type": "application/json", // Well-known header lowercased
//   "X-Custom-Header": "MyValue",       // Custom header case preserved
//   "set-cookie": ["sessionId=abc123", "theme=dark"] // Always an array
// }`}
              </pre>
            </div>

            <div className="mb-6 p-4 bg-orange-900/30 rounded-lg border border-orange-500/30">
              <h4 className="text-orange-300 font-semibold mb-3 text-sm">⚖️ Standard vs. Bun's toJSON() Comparison</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-white text-xs">
                  <thead className="border-b border-orange-500/30">
                    <tr>
                      <th className="px-3 py-2 text-left">Aspect</th>
                      <th className="px-3 py-2 text-left">Standard Approach</th>
                      <th className="px-3 py-2 text-left">Bun's toJSON()</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-500/20">
                    <tr className="hover:bg-white/5">
                      <td className="px-3 py-2 font-semibold">Performance</td>
                      <td className="px-3 py-2 text-gray-300">Baseline (slower)</td>
                      <td className="px-3 py-2 text-green-400">~10x faster</td>
                    </tr>
                    <tr className="hover:bg-white/5">
                      <td className="px-3 py-2 font-semibold">set-cookie Key</td>
                      <td className="px-3 py-2 text-gray-300">"set-cookie" (string)</td>
                      <td className="px-3 py-2 text-yellow-400">"set-cookie" (string array)</td>
                    </tr>
                    <tr className="hover:bg-white/5">
                      <td className="px-3 py-2 font-semibold">Header Name Casing</td>
                      <td className="px-3 py-2 text-gray-300">Preserves original case</td>
                      <td className="px-3 py-2 text-yellow-400">Lowercases well-known headers</td>
                    </tr>
                    <tr className="hover:bg-white/5">
                      <td className="px-3 py-2 font-semibold">Insertion Order</td>
                      <td className="px-3 py-2 text-gray-300">Preserved</td>
                      <td className="px-3 py-2 text-yellow-400">Not preserved</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-6 p-4 bg-green-900/30 rounded-lg border border-green-500/30">
              <h4 className="text-green-300 font-semibold mb-3 text-sm">💡 When to Use It</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-green-200 font-medium mb-2 text-xs">✅ Ideal Use Cases:</h5>
                  <ul className="text-green-300 text-xs space-y-1">
                    <li>• Fast, plain object snapshot of headers</li>
                    <li>• Logging and debugging</li>
                    <li>• Serialization for client responses</li>
                    <li>• Passing header data to other systems</li>
                    <li>• Performance-critical applications</li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-yellow-200 font-medium mb-2 text-xs">⚠️ Use Alternatives When:</h5>
                  <ul className="text-yellow-300 text-xs space-y-1">
                    <li>• Need to preserve iteration order</li>
                    <li>• Need exact original casing of all headers</li>
                    <li>• Cross-platform compatibility required</li>
                    <li>• Use headers.entries() or forEach() instead</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-white text-sm">
                <thead className="border-b border-white/20">
                  <tr>
                    <th className="px-4 py-3 text-left">Method</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-left">Performance</th>
                    <th className="px-4 py-3 text-left">Use Case</th>
                    <th className="px-4 py-3 text-left">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-green-400">headers.toJSON()</td>
                    <td className="px-4 py-3">Bun's optimized Headers serialization</td>
                    <td className="px-4 py-3 text-green-400">🚀 Fastest (3x faster)</td>
                    <td className="px-4 py-3">JSON serialization, API responses</td>
                    <td className="px-4 py-3 font-mono text-xs">const obj = headers.toJSON();</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-blue-400">headers.entries()</td>
                    <td className="px-4 py-3">Standard Web API iterator</td>
                    <td className="px-4 py-3 text-yellow-400">⚡ Fast iteration</td>
                    <td className="px-4 py-3">Filtering, transformation</td>
                    <td className="px-4 py-3 font-mono text-xs">for (const [k,v] of headers.entries()) {}</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-gray-400">Object.fromEntries()</td>
                    <td className="px-4 py-3">Standard conversion method</td>
                    <td className="px-4 py-3 text-red-400">🐢 Slower (3x slower)</td>
                    <td className="px-4 py-3">Cross-platform compatibility</td>
                    <td className="px-4 py-3 font-mono text-xs">Object.fromEntries(headers.entries())</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-purple-400">headers.get()</td>
                    <td className="px-4 py-3">Single header value lookup</td>
                    <td className="px-4 py-3 text-green-400">🚀 Fastest lookup</td>
                    <td className="px-4 py-3">Individual header access</td>
                    <td className="px-4 py-3 font-mono text-xs">headers.get('content-type')</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-orange-400">JSON.stringify()</td>
                    <td className="px-4 py-3">Automatic JSON serialization</td>
                    <td className="px-4 py-3 text-green-400">🚀 Fast (uses toJSON)</td>
                    <td className="px-4 py-3">JSON output, API responses</td>
                    <td className="px-4 py-3 font-mono text-xs">JSON.stringify(headers)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                <h3 className="text-white font-semibold mb-2">🎯 Use Case Examples</h3>
                <div className="space-y-2 text-xs">
                  <div className="p-2 bg-green-900/20 rounded border border-green-500/30">
                    <strong className="text-green-400">JSON Serialization:</strong>
                    <pre className="text-green-300 mt-1">headers.toJSON() // Fastest</pre>
                  </div>
                  <div className="p-2 bg-blue-900/20 rounded border border-blue-500/30">
                    <strong className="text-blue-400">Header Filtering:</strong>
                    <pre className="text-blue-300 mt-1">Array.from(headers.entries()).filter(...)</pre>
                  </div>
                  <div className="p-2 bg-purple-900/20 rounded border border-purple-500/30">
                    <strong className="text-purple-400">Single Lookup:</strong>
                    <pre className="text-purple-300 mt-1">headers.get('authorization')</pre>
                  </div>
                </div>
              </div>

              <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                <h3 className="text-white font-semibold mb-2">📊 Performance Results</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 bg-gray-800/50 rounded">
                    <span>headers.toJSON()</span>
                    <span className="text-green-400 font-mono">~40ms</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-800/50 rounded">
                    <span>headers.entries() iteration</span>
                    <span className="text-yellow-400 font-mono">~16ms</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-800/50 rounded">
                    <span>Object.fromEntries()</span>
                    <span className="text-red-400 font-mono">~123ms</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-800/50 rounded">
                    <span>headers.get() lookup</span>
                    <span className="text-green-400 font-mono">~0.5ms</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Bun APIs Matrix Table */}
        {selectedTable === "bun-apis" && (
          <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">
              🔧 Comprehensive Bun APIs Matrix
            </h2>

            {/* Transpilation Configuration */}
            <div className="mb-6 p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
              <h3 className="text-blue-300 font-semibold mb-3">⚙️ Transpilation Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-blue-200 font-medium mb-2">Current Settings:</h4>
                  <pre className="text-blue-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify(transpilationConfig, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-blue-200 font-medium mb-2">CLI Equivalent:</h4>
                  <code className="text-blue-300 text-xs bg-black/30 p-2 rounded block">
bun run --define process.env.NODE_ENV:"development" --drop=console --loader .ts:tsx -l bun
                  </code>
                </div>
              </div>
            </div>

            {/* Networking Configuration */}
            <div className="mb-6 p-4 bg-green-900/30 rounded-lg border border-green-500/30">
              <h3 className="text-green-300 font-semibold mb-3">🌐 Networking & Security</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-green-200 font-medium mb-2">Current Settings:</h4>
                  <pre className="text-green-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify(networkingConfig, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-green-200 font-medium mb-2">Features:</h4>
                  <ul className="text-green-300 text-xs space-y-1">
                    <li>• DNS Resolution: {networkingConfig.dnsResolution}</li>
                    <li>• Built-in HTTP Server: Bun.serve()</li>
                    <li>• Environment Variables: {Object.keys(networkingConfig.environmentVars || {}).join(', ')}</li>
                    <li>• WebSocket Support: {networkingConfig.serveOptions?.websocket ? 'Enabled' : 'Disabled'}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Global Configuration */}
            <div className="mb-6 p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
              <h3 className="text-purple-300 font-semibold mb-3">🌍 Global Configuration & Context</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-purple-200 font-medium mb-2">Current Settings:</h4>
                  <pre className="text-purple-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify(globalConfig, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-purple-200 font-medium mb-2">Configuration File:</h4>
                  <pre className="text-purple-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
# {globalConfig.configFile}
[install]
cache = "{globalConfig.cache}"

[workspace]
workspaces = {JSON.stringify(globalConfig.workspaces)}

[lockfile]
lockfile = {globalConfig.lockfile}
                  </pre>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-white text-sm">
                <thead className="border-b border-white/20">
                  <tr>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">API</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-left">Performance</th>
                    <th className="px-4 py-3 text-left">Use Case</th>
                    <th className="px-4 py-3 text-left">Compatibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-blue-400">File System</td>
                    <td className="px-4 py-3 font-mono text-green-400">Bun.write()/Bun.read()</td>
                    <td className="px-4 py-3">High-performance file I/O</td>
                    <td className="px-4 py-3 text-green-400">🚀 3x faster</td>
                    <td className="px-4 py-3">File operations, logging</td>
                    <td className="px-4 py-3 text-xs">Bun only</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-green-400">Server</td>
                    <td className="px-4 py-3 font-mono text-green-400">Bun.serve()</td>
                    <td className="px-4 py-3">HTTP/WebSocket server</td>
                    <td className="px-4 py-3 text-green-400">🚀 Fastest</td>
                    <td className="px-4 py-3">Web servers, APIs</td>
                    <td className="px-4 py-3 text-xs">Bun only</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-purple-400">HTTP Client</td>
                    <td className="px-4 py-3 font-mono text-green-400">Bun.fetch()</td>
                    <td className="px-4 py-3">Enhanced fetch implementation</td>
                    <td className="px-4 py-3 text-green-400">🚀 Fastest</td>
                    <td className="px-4 py-3">API calls, web requests</td>
                    <td className="px-4 py-3 text-xs">Web standard + Bun features</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-purple-400">Content-Type Auto</td>
                    <td className="px-4 py-3 font-mono text-green-400">Auto Content-Type</td>
                    <td className="px-4 py-3">Automatic Content-Type detection</td>
                    <td className="px-4 py-3 text-green-400">🚀 Automatic</td>
                    <td className="px-4 py-3">Request bodies, Blob, FormData</td>
                    <td className="px-4 py-3 text-xs">Bun enhancement</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-purple-400">Debug Fetch</td>
                    <td className="px-4 py-3 font-mono text-green-400">verbose: true</td>
                    <td className="px-4 py-3">Request/response debugging</td>
                    <td className="px-4 py-3 text-yellow-400">⚡ Development</td>
                    <td className="px-4 py-3">Debugging HTTP calls</td>
                    <td className="px-4 py-3 text-xs">Bun-specific</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-purple-400">S3 URLs</td>
                    <td className="px-4 py-3 font-mono text-green-400">s3://</td>
                    <td className="px-4 py-3">Direct S3 bucket fetching</td>
                    <td className="px-4 py-3 text-green-400">🚀 Native</td>
                    <td className="px-4 py-3">Cloud storage access</td>
                    <td className="px-4 py-3 text-xs">Bun enhancement</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-purple-400">File URLs</td>
                    <td className="px-4 py-3 font-mono text-green-400">file://</td>
                    <td className="px-4 py-3">Local file system access</td>
                    <td className="px-4 py-3 text-green-400">🚀 Native</td>
                    <td className="px-4 py-3">Local file reading</td>
                    <td className="px-4 py-3 text-xs">Bun enhancement</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-purple-400">Data URLs</td>
                    <td className="px-4 py-3 font-mono text-green-400">data:</td>
                    <td className="px-4 py-3">Inline data URLs</td>
                    <td className="px-4 py-3 text-green-400">🚀 Native</td>
                    <td className="px-4 py-3">Embedded data access</td>
                    <td className="px-4 py-3 text-xs">Web standard</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-purple-400">Blob URLs</td>
                    <td className="px-4 py-3 font-mono text-green-400">blob:</td>
                    <td className="px-4 py-3">Blob object URLs</td>
                    <td className="px-4 py-3 text-green-400">🚀 Native</td>
                    <td className="px-4 py-3">In-memory data access</td>
                    <td className="px-4 py-3 text-xs">Web standard</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-orange-400">Database</td>
                    <td className="px-4 py-3 font-mono text-green-400">Bun.sqlite()</td>
                    <td className="px-4 py-3">Built-in SQLite database</td>
                    <td className="px-4 py-3 text-green-400">🚀 Fastest</td>
                    <td className="px-4 py-3">Local storage, caching</td>
                    <td className="px-4 py-3 text-xs">Bun only</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-red-400">Testing</td>
                    <td className="px-4 py-3 font-mono text-green-400">Bun.test()</td>
                    <td className="px-4 py-3">Built-in test runner</td>
                    <td className="px-4 py-3 text-green-400">🚀 Fastest</td>
                    <td className="px-4 py-3">Unit testing, integration</td>
                    <td className="px-4 py-3 text-xs">Bun only</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-yellow-400">Process</td>
                    <td className="px-4 py-3 font-mono text-green-400">Bun.spawn()/Bun.$</td>
                    <td className="px-4 py-3">Process spawning utilities</td>
                    <td className="px-4 py-3 text-green-400">🚀 Fastest</td>
                    <td className="px-4 py-3">Command execution, automation</td>
                    <td className="px-4 py-3 text-xs">Bun only</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-cyan-400">Crypto</td>
                    <td className="px-4 py-3 font-mono text-green-400">Bun.CryptoHasher</td>
                    <td className="px-4 py-3">Fast cryptographic hashing</td>
                    <td className="px-4 py-3 text-green-400">🚀 Fastest</td>
                    <td className="px-4 py-3">Security, validation</td>
                    <td className="px-4 py-3 text-xs">Bun only</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-pink-400">WebSocket</td>
                    <td className="px-4 py-3 font-mono text-green-400">Bun.serve() WS</td>
                    <td className="px-4 py-3">Integrated WebSocket support</td>
                    <td className="px-4 py-3 text-green-400">🚀 Fastest</td>
                    <td className="px-4 py-3">Real-time communication</td>
                    <td className="px-4 py-3 text-xs">Bun only</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                <h3 className="text-white font-semibold mb-2">🔄 Migration Guide (Node.js → Bun)</h3>
                <div className="space-y-2 text-xs">
                  <div className="p-2 bg-green-900/20 rounded border border-green-500/30">
                    <strong className="text-green-400">fs/promises →</strong>
                    <pre className="text-green-300 mt-1">Bun.write() / Bun.read() / Bun.file()</pre>
                  </div>
                  <div className="p-2 bg-blue-900/20 rounded border border-blue-500/30">
                    <strong className="text-blue-400">express →</strong>
                    <pre className="text-blue-300 mt-1">Bun.serve() (built-in WebSocket)</pre>
                  </div>
                  <div className="p-2 bg-purple-900/20 rounded border border-purple-500/30">
                    <strong className="text-purple-400">node-fetch →</strong>
                    <pre className="text-purple-300 mt-1">Bun.fetch() (built-in, faster)</pre>
                  </div>
                  <div className="p-2 bg-orange-900/20 rounded border border-orange-500/30">
                    <strong className="text-orange-400">sqlite3 →</strong>
                    <pre className="text-orange-300 mt-1">Bun.sqlite() (no dependencies)</pre>
                  </div>
                </div>
              </div>

              <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                <h3 className="text-white font-semibold mb-2">💡 Key Benefits</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 p-2 bg-gray-800/50 rounded">
                    <span className="text-green-400">🚀</span>
                    <div>
                      <strong>3x Faster Performance</strong>
                      <p className="text-gray-400">Across all API categories</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-gray-800/50 rounded">
                    <span className="text-blue-400">📦</span>
                    <div>
                      <strong>No External Dependencies</strong>
                      <p className="text-gray-400">Built-in modules for common tasks</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-gray-800/50 rounded">
                    <span className="text-purple-400">🔗</span>
                    <div>
                      <strong>Web API Compatible</strong>
                      <p className="text-gray-400">fetch, Headers, WebSocket support</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-gray-800/50 rounded">
                    <span className="text-orange-400">⚡</span>
                    <div>
                      <strong>All-in-One Runtime</strong>
                      <p className="text-gray-400">Runtime, package manager, bundler</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-cyan-900/30 rounded-lg border border-cyan-500/30">
              <h3 className="text-cyan-300 font-semibold mb-3 text-sm">🌐 Enhanced Bun.fetch() Features</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                  <h4 className="text-cyan-200 font-semibold mb-2 text-xs">🤖 Automatic Content-Type</h4>
                  <p className="text-cyan-300 text-xs mb-2">
                    Bun automatically sets Content-Type for request bodies:
                  </p>
                  <ul className="text-cyan-400 text-xs space-y-1">
                    <li>• <strong>Blob objects:</strong> Uses blob's type property</li>
                    <li>• <strong>FormData:</strong> Sets appropriate multipart boundary</li>
                    <li>• <strong>JSON objects:</strong> Sets application/json</li>
                    <li>• <strong>Strings:</strong> Sets text/plain</li>
                  </ul>
                </div>

                <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                  <h4 className="text-cyan-200 font-semibold mb-2 text-xs">🐛 Debugging with verbose: true</h4>
                  <p className="text-cyan-300 text-xs mb-2">
                    Pass verbose: true to fetch for debugging:
                  </p>
                  <pre className="text-xs text-green-400 bg-black/40 p-2 rounded">
{`const response = await fetch("http://example.com", {
  verbose: true,
});`}</pre>
                  <p className="text-cyan-400 text-xs mt-2">
                    Prints request/response headers to terminal
                  </p>
                </div>
              </div>

              <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                <h4 className="text-cyan-200 font-semibold mb-2 text-xs">📋 verbose: true Output Example</h4>
                <pre className="text-xs text-green-400 bg-black/40 p-3 rounded overflow-x-auto">
{`[fetch] > HTTP/1.1 GET http://example.com/
[fetch] > Connection: keep-alive
[fetch] > User-Agent: Bun/1.3.3
[fetch] > Accept: */*
[fetch] > Host: example.com
[fetch] > Accept-Encoding: gzip, deflate, br, zstd

[fetch] < 200 OK
[fetch] < Content-Encoding: gzip
[fetch] < Age: 201555
[fetch] < Cache-Control: max-age=604800
[fetch] < Content-Type: text/html; charset=UTF-8
[fetch] < Date: Sun, 21 Jul 2024 02:41:14 GMT
[fetch] < Etag: "3147526947+gzip"
[fetch] < Expires: Sun, 28 Jul 2024 02:41:14 GMT
[fetch] < Last-Modified: Thu, 17 Oct 2019 07:18:26 GMT
[fetch] < Server: ECAcc (sac/254F)
[fetch] < Vary: Accept-Encoding
[fetch] < X-Cache: HIT
[fetch] < Content-Length: 648`}</pre>
                <div className="mt-2 p-2 bg-yellow-900/20 rounded border border-yellow-500/30">
                  <p className="text-yellow-300 text-xs">
                    <strong>⚠️ Note:</strong> verbose: boolean is not part of the Web standard fetch API and is specific to Bun.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-indigo-900/30 rounded-lg border border-indigo-500/30">
              <h3 className="text-indigo-300 font-semibold mb-3 text-sm">🌐 Enhanced URL Protocol Support</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                  <h4 className="text-indigo-200 font-semibold mb-2 text-xs">☁️ S3 URLs - s3://</h4>
                  <p className="text-indigo-300 text-xs mb-2">
                    Direct S3 bucket fetching with authentication:
                  </p>
                  <pre className="text-xs text-green-400 bg-black/40 p-2 rounded">
{`// Environment variables
const response = await fetch("s3://my-bucket/path/to/object");

// Explicit credentials
const response = await fetch("s3://my-bucket/path/to/object", {
  s3: {
    accessKeyId: "YOUR_ACCESS_KEY",
    secretAccessKey: "YOUR_SECRET_KEY",
    region: "us-east-1",
  },
});`}</pre>
                  <div className="mt-2 p-2 bg-blue-900/20 rounded border border-blue-500/30">
                    <p className="text-blue-300 text-xs">
                      <strong>💡 Note:</strong> Only PUT/POST support request bodies. Bun uses multipart upload for streaming.
                    </p>
                  </div>
                </div>

                <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                  <h4 className="text-indigo-200 font-semibold mb-2 text-xs">📎 Content-Disposition Control</h4>
                  <p className="text-indigo-300 text-xs mb-2">
                    Control how browsers handle downloaded files:
                  </p>
                  <pre className="text-xs text-green-400 bg-black/40 p-2 rounded">
{`// Force download with custom filename
await s3.write("data.csv", csvData, {
  contentDisposition: 'attachment; filename="report-2024.csv"'
});

// Show inline in browser
await s3.write("image.png", imageData, {
  contentDisposition: "inline"
});

// Dynamic filenames
await s3.write(user.id + ".pdf", pdfData, {
  contentDisposition: \`attachment; filename="\${user.name}-invoice.pdf"\`
});`}</pre>
                  <div className="mt-2 p-2 bg-green-900/20 rounded border border-green-500/30">
                    <p className="text-green-300 text-xs">
                      <strong>🎯 Use Cases:</strong> CSV reports (download), images (inline), PDFs (download), dynamic naming
                    </p>
                  </div>
                </div>

                <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                  <h4 className="text-indigo-200 font-semibold mb-2 text-xs">📁 File URLs - file://</h4>
                  <p className="text-indigo-300 text-xs mb-2">
                    Local file system access:
                  </p>
                  <pre className="text-xs text-green-400 bg-black/40 p-2 rounded">
{`const response = await fetch("file:///path/to/file.txt");
const text = await response.text();

// Windows path normalization
const response = await fetch("file:///C:/path/to/file.txt");
const response2 = await fetch("file:///c:/path\\to/file.txt");`}</pre>
                  <p className="text-indigo-400 text-xs mt-2">
                    Windows paths automatically normalized
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                  <h4 className="text-indigo-200 font-semibold mb-2 text-xs">📊 Data URLs - data:</h4>
                  <p className="text-indigo-300 text-xs mb-2">
                    Inline data URL support:
                  </p>
                  <pre className="text-xs text-green-400 bg-black/40 p-2 rounded">
{`const response = await fetch("data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==");
const text = await response.text(); // "Hello, World!"`}</pre>
                  <p className="text-indigo-400 text-xs mt-2">
                    Perfect for embedded data and testing
                  </p>
                </div>

                <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                  <h4 className="text-indigo-200 font-semibold mb-2 text-xs">🫧 Blob URLs - blob:</h4>
                  <p className="text-indigo-300 text-xs mb-2">
                    Blob object URL fetching:
                  </p>
                  <pre className="text-xs text-green-400 bg-black/40 p-2 rounded">
{`const blob = new Blob(["Hello, World!"], { type: "text/plain" });
const url = URL.createObjectURL(blob);
const response = await fetch(url);`}</pre>
                  <p className="text-indigo-400 text-xs mt-2">
                    In-memory data access with object URLs
                  </p>
                </div>
              </div>

              <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                <h4 className="text-indigo-200 font-semibold mb-2 text-xs">⚠️ Error Handling</h4>
                <p className="text-indigo-300 text-xs mb-2">
                  Bun's fetch includes specific error cases:
                </p>
                <ul className="text-indigo-400 text-xs space-y-1">
                  <li>• <strong>GET/HEAD with body:</strong> Throws error (expected behavior)</li>
                  <li>• <strong>Proxy + Unix options:</strong> Cannot be used together</li>
                  <li>• <strong>TLS validation:</strong> Failures when rejectUnauthorized is true</li>
                  <li>• <strong>S3 operations:</strong> Authentication and permission errors</li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* Development Workflow Configuration */}
        {selectedTable === "development-workflow" && (
          <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">
              ⚡ Development Workflow Configuration
            </h2>

            {/* Watch Mode Configuration */}
            <div className="mb-6 p-4 bg-yellow-900/30 rounded-lg border border-yellow-500/30">
              <h3 className="text-yellow-300 font-semibold mb-3">👀 Watch Mode Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-yellow-200 font-medium mb-2">Current Settings:</h4>
                  <pre className="text-yellow-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  watchMode: developmentWorkflow.watchMode,
  hotMode: developmentWorkflow.hotMode,
  noClearScreen: developmentWorkflow.noClearScreen,
  preserveWatchOutput: developmentWorkflow.preserveWatchOutput,
  saveOnKeypress: developmentWorkflow.saveOnKeypress
}, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-yellow-200 font-medium mb-2">CLI Commands:</h4>
                  <div className="space-y-2">
                    <code className="text-yellow-300 text-xs bg-black/30 p-2 rounded block">
                      {developmentWorkflow.watchMode ? 'bun --watch index.tsx' : 'bun index.tsx'}
                    </code>
                    <code className="text-yellow-300 text-xs bg-black/30 p-2 rounded block">
                      {developmentWorkflow.hotMode ? 'bun --hot server.ts' : '# Hot mode disabled'}
                    </code>
                    <code className="text-yellow-300 text-xs bg-black/30 p-2 rounded block">
                      {developmentWorkflow.noClearScreen ? 'bun --watch --no-clear-screen' : '# Clear screen enabled'}
                    </code>
                    <code className="text-yellow-300 text-xs bg-black/30 p-2 rounded block">
                      {developmentWorkflow.preserveWatchOutput ? 'bun --watch --preserveWatchOutput' : '# Output preservation disabled'}
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* Console Configuration */}
            <div className="mb-6 p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
              <h3 className="text-blue-300 font-semibold mb-3">📊 Console & Output Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-blue-200 font-medium mb-2">Console Configuration:</h4>
                  <pre className="text-blue-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  consoleDepth: developmentWorkflow.consoleDepth,
  smolMode: developmentWorkflow.smolMode
}, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-blue-200 font-medium mb-2">CLI Commands:</h4>
                  <div className="space-y-2">
                    <code className="text-blue-300 text-xs bg-black/30 p-2 rounded block">
                      bun run --console-depth {developmentWorkflow.consoleDepth}
                    </code>
                    <code className="text-blue-300 text-xs bg-black/30 p-2 rounded block">
                      {developmentWorkflow.smolMode ? 'bun run --smol' : '# Smol mode disabled'}
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* Hot Reload Example */}
            <div className="mb-6 p-4 bg-green-900/30 rounded-lg border border-green-500/30">
              <h3 className="text-green-300 font-semibold mb-3">🔥 Hot Reload Example</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-green-200 font-medium mb-2">Server Code:</h4>
                  <pre className="text-green-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{`// server.ts - Hot reload example
declare global {
  var reloadCount: number;
}

globalThis.reloadCount ??= 0;
console.log(\`🔥 Reloaded \${globalThis.reloadCount} times\`);
globalThis.reloadCount++;

import { serve } from "bun";
serve({
  port: 3000,
  fetch(req) {
    return new Response(\`Hot reloaded \${globalThis.reloadCount} times\`);
  }
});

// Keep process alive
setInterval(() => {}, 1000000);`}
                  </pre>
                </div>
                <div>
                  <h4 className="text-green-200 font-medium mb-2">Features:</h4>
                  <ul className="text-green-300 text-xs space-y-1">
                    <li>• <strong>Watch Mode:</strong> {developmentWorkflow.watchMode ? 'Enabled' : 'Disabled'}</li>
                    <li>• <strong>Hot Mode:</strong> {developmentWorkflow.hotMode ? 'Enabled - Preserves state' : 'Disabled'}</li>
                    <li>• <strong>Save on Keypress:</strong> {developmentWorkflow.saveOnKeypress ? 'Enabled' : 'Disabled'}</li>
                    <li>• <strong>Console Depth:</strong> {developmentWorkflow.consoleDepth} levels</li>
                    <li>• <strong>Screen Clear:</strong> {developmentWorkflow.noClearScreen ? 'Disabled' : 'Enabled'}</li>
                    <li>• <strong>Output Preservation:</strong> {developmentWorkflow.preserveWatchOutput ? 'Enabled' : 'Disabled'}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Development Workflow Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full text-white text-sm">
                <thead className="border-b border-white/20">
                  <tr>
                    <th className="px-4 py-3 text-left">Feature</th>
                    <th className="px-4 py-3 text-left">CLI Flag</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Use Case</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-yellow-400">Watch Mode</td>
                    <td className="px-4 py-3 font-mono text-green-400">--watch</td>
                    <td className="px-4 py-3">File watching with auto-restart</td>
                    <td className="px-4 py-3">{developmentWorkflow.watchMode ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Development, testing</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-orange-400">Hot Mode</td>
                    <td className="px-4 py-3 font-mono text-green-400">--hot</td>
                    <td className="px-4 py-3">Stateful hot reloading</td>
                    <td className="px-4 py-3">{developmentWorkflow.hotMode ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">State preservation, fast iterations</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-blue-400">No Clear Screen</td>
                    <td className="px-4 py-3 font-mono text-green-400">--no-clear-screen</td>
                    <td className="px-4 py-3">Preserve terminal output</td>
                    <td className="px-4 py-3">{developmentWorkflow.noClearScreen ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Debugging, log analysis</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-purple-400">Console Depth</td>
                    <td className="px-4 py-3 font-mono text-green-400">--console-depth</td>
                    <td className="px-4 py-3">Console logging depth limit</td>
                    <td className="px-4 py-3">📊 {developmentWorkflow.consoleDepth} levels</td>
                    <td className="px-4 py-3">Debugging complex objects</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-cyan-400">Smol Mode</td>
                    <td className="px-4 py-3 font-mono text-green-400">--smol</td>
                    <td className="px-4 py-3">Reduced memory footprint</td>
                    <td className="px-4 py-3">{developmentWorkflow.smolMode ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Resource-constrained environments</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Advanced Build Configuration */}
            <div className="mb-6 p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
              <h3 className="text-purple-300 font-semibold mb-3">🔧 Advanced Build Configuration</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-purple-200 font-medium mb-2">Environment Variable Injection:</h4>
                  <div className="space-y-2">
                    <div className="bg-black/30 p-2 rounded">
                      <code className="text-purple-300 text-xs">env: "inline"</code>
                      <p className="text-purple-400 text-xs mt-1">Inject ALL env vars as string literals</p>
                    </div>
                    <div className="bg-black/30 p-2 rounded">
                      <code className="text-purple-300 text-xs">env: "PUBLIC_*"</code>
                      <p className="text-purple-400 text-xs mt-1">Only vars starting with PUBLIC_</p>
                    </div>
                    <div className="bg-black/30 p-2 rounded">

                      <code className="text-purple-300 text-xs">env: "disable"</code>
                      <p className="text-purple-400 text-xs mt-1">Keep process.env references</p>
                    </div>
                  </div>
                </div>
                <div>
                  <4 className="text-purple-200 font-medium mb-2">Source Map Options:</h4>
                  <div className="space-y-2">
                    <div className="bg-black/30 p-2 rounded">
                      <code className="text-purple-300 text-xs">sourcemap: "none"</code>
                      <p className="text-purple-400 text-xs mt-1">Default: No sourcemap generated</p>
                    </div>
                    <div className="bg-black/30 p-2 rounded">
                      <code className="text-purple-300 text-xs">sourcemap: "linked"</code>
                      <p className="text-purple-400 text-xs mt-1">Separate .js.map files with sourceMappingURL</p>
                    </div>
                    <div className="bg-black/30 p-2 rounded">
                      <code className="text-purple-300 text-xs">sourcemap: "external"</code>
                      <p className="text-purple-400 text-xs mt-1">Separate .js.map files without comments</p>
                    </div>
                    <div className="bg-black/30 p-2 rounded">
                      <code className="text-purple-300 text-xs">sourcemap: "inline"</code>
                      <p className="text-purple-400 text-xs mt-1">Base64-encoded sourcemap in bundle</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-purple-200 font-medium mb-2">Production Build Example:</h4>
                <pre className="text-purple-300 text-xs bg-black/40 p-3 rounded overflow-x-auto">
{`await Bun.build({
  entrypoints: ['./src/index.tsx'],
  outdir: './dist',
  env: 'PUBLIC_*',           // Only public env vars
  sourcemap: 'linked',        // For debugging
  minify: true,              // Minify output
  target: 'browser',         // Browser compatibility
  splitting: true,           // Code splitting
  treeShaking: true,         // Remove dead code
});`}</pre>
              </div>
            </div>
          </section>
        )}

        {/* Runtime & Process Control */}
        {selectedTable === "runtime-control" && (
          <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">
              ⚙️ Runtime & Process Control
            </h2>

            {/* Runtime Configuration */}
            <div className="mb-6 p-4 bg-red-900/30 rounded-lg border border-red-500/30">
              <h3 className="text-red-300 font-semibold mb-3">🔧 Runtime Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-red-200 font-medium mb-2">Current Settings:</h4>
                  <pre className="text-red-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  useBunRuntime: runtimeControl.useBunRuntime,
  shell: runtimeControl.shell,
  exposeGC: runtimeControl.exposeGC,
  garbageCollectionForce: runtimeControl.garbageCollectionForce,
  zeroFillBuffers: runtimeControl.zeroFillBuffers
}, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-red-200 font-medium mb-2">CLI Commands:</h4>
                  <div className="space-y-2">
                    <code className="text-red-300 text-xs bg-black/30 p-2 rounded block">
                      {runtimeControl.useBunRuntime ? 'bun -b script.js' : 'node script.js'}
                    </code>
                    <code className="text-red-300 text-xs bg-black/30 p-2 rounded block">
                      {runtimeControl.exposeGC ? 'bun --expose-gc script.js' : '# GC not exposed'}
                    </code>
                    <code className="text-red-300 text-xs bg-black/30 p-2 rounded block">
                      {runtimeControl.zeroFillBuffers ? 'bun --zero-fill-buffers script.js' : '# Zero-fill disabled'}
                    </code>
                    <code className="text-red-300 text-xs bg-black/30 p-2 rounded block">
                      Shell: {runtimeControl.shell}
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* Garbage Collection */}
            <div className="mb-6 p-4 bg-green-900/30 rounded-lg border border-green-500/30">
              <h3 className="text-green-300 font-semibold mb-3">🗑️ Garbage Collection</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-green-200 font-medium mb-2">GC Configuration:</h4>
                  <pre className="text-green-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  exposeGC: runtimeControl.exposeGC,
  garbageCollectionForce: runtimeControl.garbageCollectionForce
}, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-green-200 font-medium mb-2">GC Examples:</h4>
                  <pre className="text-green-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{`// Manual garbage collection
Bun.gc(); // Standard GC
Bun.gc(true); // Force GC (performance impact)

// Automatic heap adjustment
// Bun adjusts GC heap size based on available memory`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Buffer Security */}
            <div className="mb-6 p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
              <h3 className="text-blue-300 font-semibold mb-3">🔒 Buffer Security</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-blue-200 font-medium mb-2">Security Settings:</h4>
                  <pre className="text-blue-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  zeroFillBuffers: runtimeControl.zeroFillBuffers
}, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-blue-200 font-medium mb-2">Buffer Examples:</h4>
                  <pre className="text-blue-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{`// Safe buffer allocation
const safeBuffer = Buffer.alloc(1024); // Zero-filled

// Unsafe but faster allocation
const unsafeBuffer = Buffer.allocUnsafe(1024); // Uninitialized

// With --zero-fill-buffers flag
// Buffer.allocUnsafe() becomes zero-filled`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Node.js Addons */}
            <div className="mb-6 p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
              <h3 className="text-purple-300 font-semibold mb-3">🔌 Node.js Addons</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-purple-200 font-medium mb-2">Addon Policy:</h4>
                  <pre className="text-purple-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  nodeAddons: runtimeControl.nodeAddons
}, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-purple-200 font-medium mb-2">Policy Behaviors:</h4>
                  <ul className="text-purple-300 text-xs space-y-1">
                    <li>• <strong>strict:</strong> Strict addon validation</li>
                    <li>• <strong>throw:</strong> Throw error on addon load</li>
                    <li>• <strong>warn:</strong> Show warning (current)</li>
                    <li>• <strong>none:</strong> No addon support</li>
                    <li>• <strong>warn-with-error-code:</strong> Warning with exit code</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Runtime Control Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full text-white text-sm">
                <thead className="border-b border-white/20">
                  <tr>
                    <th className="px-4 py-3 text-left">Feature</th>
                    <th className="px-4 py-3 text-left">CLI Flag</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Use Case</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-red-400">Bun Runtime</td>
                    <td className="px-4 py-3 font-mono text-green-400">-b</td>
                    <td className="px-4 py-3">Force Bun runtime instead of Node.js</td>
                    <td className="px-4 py-3">{runtimeControl.useBunRuntime ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Performance, Bun features</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-green-400">Expose GC</td>
                    <td className="px-4 py-3 font-mono text-green-400">--expose-gc</td>
                    <td className="px-4 py-3">Expose gc() on global object</td>
                    <td className="px-4 py-3">{runtimeControl.exposeGC ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Memory management, debugging</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-blue-400">Zero Fill Buffers</td>
                    <td className="px-4 py-3 font-mono text-green-400">--zero-fill-buffers</td>
                    <td className="px-4 py-3">Force zero-filled buffer allocation</td>
                    <td className="px-4 py-3">{runtimeControl.zeroFillBuffers ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Security, sensitive data</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-purple-400">Shell Control</td>
                    <td className="px-4 py-3 font-mono text-green-400">package.json</td>
                    <td className="px-4 py-3">Control shell for package.json scripts</td>
                    <td className="px-4 py-3">🐚 {runtimeControl.shell}</td>
                    <td className="px-4 py-3">Script execution, compatibility</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-yellow-400">Node Addons</td>
                    <td className="px-4 py-3 font-mono text-green-400">--node-addons</td>
                    <td className="px-4 py-3">Control Node.js addon behavior</td>
                    <td className="px-4 py-3">⚠️ {runtimeControl.nodeAddons}</td>
                    <td className="px-4 py-3">Native modules, compatibility</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-cyan-400">Force GC</td>
                    <td className="px-4 py-3 font-mono text-green-400">Bun.gc(true)</td>
                    <td className="px-4 py-3">Force garbage collection execution</td>
                    <td className="px-4 py-3">{runtimeControl.garbageCollectionForce ? '🗑️ Forced' : '🔄 Auto'}</td>
                    <td className="px-4 py-3">Memory cleanup, debugging</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Enhanced Table Configuration */}
        {selectedTable === "table-config" && (
          <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">
              📋 Enhanced Table Configuration
            </h2>

            {/* Table Configuration Display */}
            <div className="mb-6 p-4 bg-indigo-900/30 rounded-lg border border-indigo-500/30">
              <h3 className="text-indigo-300 font-semibold mb-3">🔧 Current Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-indigo-200 font-medium mb-2">Table Metadata:</h4>
                  <pre className="text-indigo-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  title: tableConfig.title,
  description: tableConfig.description,
  totalRows: tableConfig.metadata?.totalRows,
  source: tableConfig.metadata?.source,
  version: tableConfig.metadata?.version,
  refreshInterval: tableConfig.metadata?.refreshInterval
}, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-indigo-200 font-medium mb-2">Active Features:</h4>
                  <ul className="text-indigo-300 text-xs space-y-1">
                    <li>• <strong>Sorting:</strong> {sortColumn} ({sortDirection})</li>
                    <li>• <strong>Pagination:</strong> Page {currentPage} of {pageSize}</li>
                    <li>• <strong>Filters:</strong> {Object.keys(filters).length} active</li>
                    <li>• <strong>Export Formats:</strong> {tableConfig.export?.formats.join(", ")}</li>
                    <li>• <strong>Actions:</strong> {tableConfig.actions?.length} configured</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Column Configuration */}
            <div className="mb-6 p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
              <h3 className="text-purple-300 font-semibold mb-3">📊 Column Configuration Schema</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-purple-200 font-medium mb-2">Available Column Types:</h4>
                  <pre className="text-purple-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{`string | number | percentage
duration | bytes | timestamp
badge | status | icon | code
boolean | array | object`}
                  </pre>
                </div>
                <div>
                  <h4 className="text-purple-200 font-medium mb-2">Column Features:</h4>
                  <ul className="text-purple-300 text-xs space-y-1">
                    <li>• <strong>Data Types:</strong> 12 specialized types</li>
                    <li>• <strong>Formatting:</strong> Custom formatters & precision</li>
                    <li>• <strong>Coloring:</strong> Dynamic color mapping</li>
                    <li>• <strong>Icons:</strong> Visual icon mapping</li>
                    <li>• <strong>Aggregation:</strong> Sum, avg, min, max, count</li>
                    <li>• <strong>Transform:</strong> Custom value transformation</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Data Operations */}
            <div className="mb-6 p-4 bg-green-900/30 rounded-lg border border-green-500/30">
              <h3 className="text-green-300 font-semibold mb-3">⚡ Data Operations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-green-200 font-medium mb-2">Real-time Operations:</h4>
                  <pre className="text-green-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{`// Sorting
sortData(data, "cpu", "desc")

// Filtering
filterData(data, { status: "healthy" })

// Pagination
paginateData(data, 2, 10)

// Export
exportData(data, "csv", "servers")`}
                  </pre>
                </div>
                <div>
                  <h4 className="text-green-200 font-medium mb-2">Advanced Features:</h4>
                  <ul className="text-green-300 text-xs space-y-1">
                    <li>• <strong>Real-time Sorting:</strong> Multi-column support</li>
                    <li>• <strong>Dynamic Filtering:</strong> Text & value filters</li>
                    <li>• <strong>Smart Pagination:</strong> Performance optimized</li>
                    <li>• <strong>Multi-format Export:</strong> CSV, JSON, XLSX, PDF</li>
                    <li>• <strong>Conditional Actions:</strong> Row-specific actions</li>
                    <li>• <strong>Live Updates:</strong> Auto-refresh capability</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Configuration Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full text-white text-sm">
                <thead className="border-b border-white/20">
                  <tr>
                    <th className="px-4 py-3 text-left">Feature</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Options</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Use Case</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-indigo-400">Column Types</td>
                    <td className="px-4 py-3 font-mono text-green-400">Schema</td>
                    <td className="px-4 py-3">12 specialized types</td>
                    <td className="px-4 py-3">✅ Active</td>
                    <td className="px-4 py-3">Data formatting & display</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-purple-400">Sorting</td>
                    <td className="px-4 py-3 font-mono text-green-400">Operation</td>
                    <td className="px-4 py-3">asc/desc, multi-column</td>
                    <td className="px-4 py-3">✅ Active</td>
                    <td className="px-4 py-3">Data organization</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-green-400">Filtering</td>
                    <td className="px-4 py-3 font-mono text-green-400">Operation</td>
                    <td className="px-4 py-3">text, value, multi-filter</td>
                    <td className="px-4 py-3">✅ Active</td>
                    <td className="px-4 py-3">Data search & refinement</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-blue-400">Pagination</td>
                    <td className="px-4 py-3 font-mono text-green-400">Operation</td>
                    <td className="px-4 py-3">page, pageSize, navigation</td>
                    <td className="px-4 py-3">✅ Active</td>
                    <td className="px-4 py-3">Performance optimization</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-yellow-400">Export</td>
                    <td className="px-4 py-3 font-mono text-green-400">Operation</td>
                    <td className="px-4 py-3">CSV, JSON, XLSX, PDF</td>
                    <td className="px-4 py-3">✅ Active</td>
                    <td className="px-4 py-3">Data export & sharing</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-red-400">Actions</td>
                    <td className="px-4 py-3 font-mono text-green-400">UI</td>
                    <td className="px-4 py-3">Conditional, icon-based</td>
                    <td className="px-4 py-3">✅ Active</td>
                    <td className="px-4 py-3">Row-specific operations</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-cyan-400">Metadata</td>
                    <td className="px-4 py-3 font-mono text-green-400">Schema</td>
                    <td className="px-4 py-3">source, version, timestamps</td>
                    <td className="px-4 py-3">✅ Active</td>
                    <td className="px-4 py-3">Data provenance & tracking</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Networking & Security */}
        {selectedTable === "networking-security" && (
          <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">
              🔒 Networking & Security
            </h2>

            {/* Network Configuration */}
            <div className="mb-6 p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
              <h3 className="text-blue-300 font-semibold mb-3">🌐 Network Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-blue-200 font-medium mb-2">Current Settings:</h4>
                  <pre className="text-blue-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  dnsResolution: networkingSecurity.dnsResolution,
  tlsVersion: networkingSecurity.tlsVersion,
  certificateValidation: networkingSecurity.certificateValidation,
  compression: networkingSecurity.compression,
  keepAlive: networkingSecurity.keepAlive,
  maxRedirects: networkingSecurity.maxRedirects
}, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-blue-200 font-medium mb-2">Connection Options:</h4>
                  <div className="space-y-2">
                    <div className="text-blue-300 text-xs bg-black/30 p-2 rounded">
                      DNS: {networkingSecurity.dnsResolution}
                    </div>
                    <div className="text-blue-300 text-xs bg-black/30 p-2 rounded">
                      TLS: {networkingSecurity.tlsVersion}
                    </div>
                    <div className="text-blue-300 text-xs bg-black/30 p-2 rounded">
                      Compression: {networkingSecurity.compression ? '✅ Enabled' : '❌ Disabled'}
                    </div>
                    <div className="text-blue-300 text-xs bg-black/30 p-2 rounded">
                      Keep-Alive: {networkingSecurity.keepAlive ? '✅ Enabled' : '❌ Disabled'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Configuration */}
            <div className="mb-6 p-4 bg-red-900/30 rounded-lg border border-red-500/30">
              <h3 className="text-red-300 font-semibold mb-3">🛡️ Security Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-red-200 font-medium mb-2">Security Headers:</h4>
                  <pre className="text-red-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  hsts: networkingSecurity.security?.hsts,
  csp: networkingSecurity.security?.csp,
  cors: {
    enabled: networkingSecurity.security?.cors?.enabled,
    origins: networkingSecurity.security?.cors?.origins.length,
    methods: networkingSecurity.security?.cors?.methods.length
  },
  rateLimit: networkingSecurity.security?.rateLimit
}, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-red-200 font-medium mb-2">Protection Status:</h4>
                  <div className="space-y-2">
                    <div className="text-red-300 text-xs bg-black/30 p-2 rounded">
                      HSTS: {networkingSecurity.security?.hsts ? '✅ Active' : '❌ Disabled'}
                    </div>
                    <div className="text-red-300 text-xs bg-black/30 p-2 rounded">
                      CSP: {networkingSecurity.security?.csp ? '✅ Active' : '❌ Disabled'}
                    </div>
                    <div className="text-red-300 text-xs bg-black/30 p-2 rounded">
                      CORS: {networkingSecurity.security?.cors?.enabled ? '✅ Active' : '❌ Disabled'}
                    </div>
                    <div className="text-red-300 text-xs bg-black/30 p-2 rounded">
                      Rate Limit: {networkingSecurity.security?.rateLimit?.enabled ? '✅ Active' : '❌ Disabled'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeout & Retry Configuration */}
            <div className="mb-6 p-4 bg-green-900/30 rounded-lg border border-green-500/30">
              <h3 className="text-green-300 font-semibold mb-3">⏱️ Timeout & Retry Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-green-200 font-medium mb-2">Timeouts (ms):</h4>
                  <pre className="text-green-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify(networkingSecurity.timeout, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-green-200 font-medium mb-2">Retry Strategy:</h4>
                  <pre className="text-green-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify(networkingSecurity.retries, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Proxy Configuration */}
            <div className="mb-6 p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
              <h3 className="text-purple-300 font-semibold mb-3">🔌 Proxy Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-purple-200 font-medium mb-2">Proxy Settings:</h4>
                  <pre className="text-purple-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  enabled: networkingSecurity.proxy?.enabled,
  host: networkingSecurity.proxy?.enabled ? networkingSecurity.proxy?.host : 'N/A',
  port: networkingSecurity.proxy?.enabled ? networkingSecurity.proxy?.port : 'N/A',
  hasAuth: !!(networkingSecurity.proxy?.username && networkingSecurity.proxy?.password)
}, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-purple-200 font-medium mb-2">Usage Examples:</h4>
                  <pre className="text-purple-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{`// Proxy Agent Example
${networkingSecurity.proxy?.enabled ? `const proxyAgent = new ProxyAgent("http://${networkingSecurity.proxy.host}:${networkingSecurity.proxy.port}");` : '// Proxy disabled'}

// Fetch with Proxy
const response = await fetch(url, {
  agent: proxyAgent
});`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Network Security Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full text-white text-sm">
                <thead className="border-b border-white/20">
                  <tr>
                    <th className="px-4 py-3 text-left">Feature</th>
                    <th className="px-4 py-3 text-left">Configuration</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Security Level</th>
                    <th className="px-4 py-3 text-left">Use Case</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-blue-400">DNS Resolution</td>
                    <td className="px-4 py-3 font-mono text-green-400">{networkingSecurity.dnsResolution}</td>
                    <td className="px-4 py-3">✅ Active</td>
                    <td className="px-4 py-3">Standard</td>
                    <td className="px-4 py-3">Network connectivity</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-green-400">TLS Version</td>
                    <td className="px-4 py-3 font-mono text-green-400">{networkingSecurity.tlsVersion}</td>
                    <td className="px-4 py-3">✅ Active</td>
                    <td className="px-4 py-3">High</td>
                    <td className="px-4 py-3">Secure communications</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-red-400">Certificate Validation</td>
                    <td className="px-4 py-3 font-mono text-green-400">{networkingSecurity.certificateValidation}</td>
                    <td className="px-4 py-3">✅ Active</td>
                    <td className="px-4 py-3">{networkingSecurity.certificateValidation === 'strict' ? 'High' : networkingSecurity.certificateValidation === 'lenient' ? 'Medium' : 'Low'}</td>
                    <td className="px-4 py-3">Identity verification</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-purple-400">Compression</td>
                    <td className="px-4 py-3 font-mono text-green-400">{networkingSecurity.compression ? 'gzip' : 'none'}</td>
                    <td className="px-4 py-3">{networkingSecurity.compression ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Performance</td>
                    <td className="px-4 py-3">Bandwidth optimization</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-yellow-400">HSTS</td>
                    <td className="px-4 py-3 font-mono text-green-400">{networkingSecurity.security?.hsts ? 'max-age=31536000' : 'disabled'}</td>
                    <td className="px-4 py-3">{networkingSecurity.security?.hsts ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">High</td>
                    <td className="px-4 py-3">HTTPS enforcement</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-cyan-400">CORS</td>
                    <td className="px-4 py-3 font-mono text-green-400">{networkingSecurity.security?.cors?.enabled ? `${networkingSecurity.security.cors.origins.length} origins` : 'disabled'}</td>
                    <td className="px-4 py-3">{networkingSecurity.security?.cors?.enabled ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Medium</td>
                    <td className="px-4 py-3">Cross-origin requests</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-indigo-400">Rate Limiting</td>
                    <td className="px-4 py-3 font-mono text-green-400">{networkingSecurity.security?.rateLimit?.enabled ? `${networkingSecurity.security.rateLimit.requests}/${networkingSecurity.security.rateLimit.window}ms` : 'disabled'}</td>
                    <td className="px-4 py-3">{networkingSecurity.security?.rateLimit?.enabled ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">High</td>
                    <td className="px-4 py-3">DDoS protection</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-orange-400">Proxy</td>
                    <td className="px-4 py-3 font-mono text-green-400">{networkingSecurity.proxy?.enabled ? `${networkingSecurity.proxy.host}:${networkingSecurity.proxy.port}` : 'disabled'}</td>
                    <td className="px-4 py-3">{networkingSecurity.proxy?.enabled ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Network</td>
                    <td className="px-4 py-3">Traffic routing</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Command Line Interface */}
        {selectedTable === "command-line" && (
          <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-4">
              ⌨️ Command Line Interface
            </h2>

            {/* Interactive Configuration Controls */}
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-500/30">
              <h3 className="text-purple-300 font-semibold mb-3">🎛️ Interactive Configuration</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                {/* Console Configuration */}
                <div className="p-3 bg-black/30 rounded-lg">
                  <h4 className="text-indigo-300 font-medium mb-2">🔧 Console Settings</h4>
                  <div className="space-y-2">
  <div className="flex items-center justify-between">
    <span className="text-indigo-200 text-xs">Depth</span>
    <input
      type="range"
      min="1"
      max="20"
      value={commandLine.console?.depth || 10}
      onChange={(e) => setCommandLine({
        ...commandLine,
        console: { ...commandLine.console, depth: parseInt(e.target.value) }
      })}
      className="w-20 h-4 bg-indigo-900/50 rounded-lg appearance-none cursor-pointer"
    />
    <span className="text-indigo-300 text-xs w-8">{commandLine.console?.depth || 10}</span>
  </div>
  <div className="flex items-center justify-between">
    <span className="text-indigo-200 text-xs">Max String</span>
    <input
      type="range"
      min="1000"
      max="50000"
      step="1000"
      value={commandLine.console?.maxStringLength || 10000}
      onChange={(e) => setCommandLine({
        ...commandLine,
        console: { ...commandLine.console, maxStringLength: parseInt(e.target.value) }
      })}
      className="w-20 h-4 bg-indigo-900/50 rounded-lg appearance-none cursor-pointer"
    />
    <span className="text-indigo-300 text-xs w-12">{(commandLine.console?.maxStringLength || 10000) / 1000}k</span>
  </div>
  <div className="flex items-center justify-between">
  <span className="text-indigo-200 text-xs">Colors</span>
  <button
    onClick={() => setCommandLine({
      ...commandLine,
      console: { ...commandLine.console, colors: !commandLine.console?.colors }
    })}
    className={`px-2 py-1 text-xs rounded ${commandLine.console?.colors ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}
  >
    {commandLine.console?.colors ? 'ON' : 'OFF'}
  </button>
</div>
                  </div>
                </div>

                {/* Optimization Configuration */}
                <div className="p-3 bg-black/30 rounded-lg">
                  <h4 className="text-pink-300 font-medium mb-2">⚡ Optimization</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-pink-200 text-xs">Smol Mode</span>
                      <button
                        onClick={() => setCommandLine({
                          ...commandLine,
                          optimization: { ...commandLine.optimization, smol: !commandLine.optimization?.smol }
                        })}
                        className={`px-2 py-1 text-xs rounded ${commandLine.optimization?.smol ? 'bg-pink-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                      >
                        {commandLine.optimization?.smol ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-pink-200 text-xs">Minify</span>
                      <button
                        onClick={() => setCommandLine({
                          ...commandLine,
                          optimization: { ...commandLine.optimization, minify: !commandLine.optimization?.minify }
                        })}
                        className={`px-2 py-1 text-xs rounded ${commandLine.optimization?.minify ? 'bg-pink-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                      >
                        {commandLine.optimization?.minify ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-pink-200 text-xs">Bundle Size</span>
                      <select
                        value={commandLine.optimization?.bundleSize || 'default'}
                        onChange={(e) => setCommandLine({
                          ...commandLine,
                          optimization: { ...commandLine.optimization, bundleSize: e.target.value as "default" | "smol" | "tiny" | "minified" }
                        })}
                        className="bg-pink-900/50 text-pink-300 text-xs px-2 py-1 rounded border border-pink-600/30"
                      >
                        <option value="smol">Smol</option>
                        <option value="tiny">Tiny</option>
                        <option value="minified">Minified</option>
                        <option value="default">Default</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Networking Configuration */}
                <div className="p-3 bg-black/30 rounded-lg">
                  <h4 className="text-blue-300 font-medium mb-2">🌐 Networking</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-200 text-xs">Port</span>
                      <input
                        type="number"
                        min="1000"
                        max="9999"
                        value={commandLine.networking?.port || 3000}
                        onChange={(e) => setCommandLine({
                          ...commandLine,
                          networking: { ...commandLine.networking, port: parseInt(e.target.value) }
                        })}
                        className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded border border-blue-600/30 w-16"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-200 text-xs">Header Size</span>
                      <input
                        type="number"
                        min="1024"
                        max="65536"
                        step="1024"
                        value={commandLine.networking?.maxHttpHeaderSize || 16384}
                        onChange={(e) => setCommandLine({
                          ...commandLine,
                          networking: { ...commandLine.networking, maxHttpHeaderSize: parseInt(e.target.value) }
                        })}
                        className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded border border-blue-600/30 w-16"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-200 text-xs">DNS Order</span>
                      <select
                        value={commandLine.networking?.dnsResultOrder || 'verbatim'}
                        onChange={(e) => setCommandLine({
                          ...commandLine,
                          networking: { ...commandLine.networking, dnsResultOrder: e.target.value as "verbatim" | "ipv4first" | "ipv6first" }
                        })}
                        className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded border border-blue-600/30"
                      >
                        <option value="verbatim">Verbatim</option>
                        <option value="ipv4first">IPv4 First</option>
                        <option value="ipv6first">IPv6 First</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Stdin Configuration */}
                <div className="p-3 bg-black/30 rounded-lg">
                  <h4 className="text-green-300 font-medium mb-2">📡 Stdin</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-green-200 text-xs">TypeScript</span>
                      <button
                        onClick={() => setCommandLine({
                          ...commandLine,
                          stdin: { ...commandLine.stdin, treatAsTypeScript: !commandLine.stdin?.treatAsTypeScript, enabled: commandLine.stdin?.enabled || true }
                        })}
                        className={`px-2 py-1 text-xs rounded ${commandLine.stdin?.treatAsTypeScript ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                      >
                        {commandLine.stdin?.treatAsTypeScript ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-green-200 text-xs">JSX Support</span>
                      <button
                        onClick={() => setCommandLine({
                          ...commandLine,
                          stdin: { ...commandLine.stdin, jsxSupport: !commandLine.stdin?.jsxSupport, enabled: commandLine.stdin?.enabled || true }
                        })}
                        className={`px-2 py-1 text-xs rounded ${commandLine.stdin?.jsxSupport ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                      >
                        {commandLine.stdin?.jsxSupport ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-green-200 text-xs">Transform</span>
                      <button
                        onClick={() => setCommandLine({
                          ...commandLine,
                          stdin: { ...commandLine.stdin, transform: !commandLine.stdin?.transform, enabled: commandLine.stdin?.enabled || true }
                        })}
                        className={`px-2 py-1 text-xs rounded ${commandLine.stdin?.transform ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                      >
                        {commandLine.stdin?.transform ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Installation Configuration */}
                <div className="p-3 bg-black/30 rounded-lg">
                  <h4 className="text-yellow-300 font-medium mb-2">📦 Installation</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-200 text-xs">Auto Install</span>
                      <select
                        value={commandLine.installation?.autoInstall || 'auto'}
                        onChange={(e) => setCommandLine({
                          ...commandLine,
                          installation: { ...commandLine.installation, autoInstall: e.target.value as "auto" | "fallback" | "force" }
                        })}
                        className="bg-yellow-900/50 text-yellow-300 text-xs px-2 py-1 rounded border border-yellow-600/30"
                      >
                        <option value="auto">Auto</option>
                        <option value="fallback">Fallback</option>
                        <option value="force">Force</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-200 text-xs">Prefer Offline</span>
                      <button
                        onClick={() => setCommandLine({
                          ...commandLine,
                          installation: { ...commandLine.installation, preferOffline: !commandLine.installation?.preferOffline }
                        })}
                        className={`px-2 py-1 text-xs rounded ${commandLine.installation?.preferOffline ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                      >
                        {commandLine.installation?.preferOffline ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-200 text-xs">Prefer Latest</span>
                      <button
                        onClick={() => setCommandLine({
                          ...commandLine,
                          installation: { ...commandLine.installation, preferLatest: !commandLine.installation?.preferLatest }
                        })}
                        className={`px-2 py-1 text-xs rounded ${commandLine.installation?.preferLatest ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                      >
                        {commandLine.installation?.preferLatest ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Flags Configuration */}
                <div className="p-3 bg-black/30 rounded-lg">
                  <h4 className="text-orange-300 font-medium mb-2">🚩 Flags</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-orange-200 text-xs">Hot Reload</span>
                      <button
                        onClick={() => setCommandLine({
                          ...commandLine,
                          flags: { ...commandLine.flags, hot: !commandLine.flags?.hot }
                        })}
                        className={`px-2 py-1 text-xs rounded ${commandLine.flags?.hot ? 'bg-orange-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                      >
                        {commandLine.flags?.hot ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-orange-200 text-xs">Watch Mode</span>
                      <button
                        onClick={() => setCommandLine({
                          ...commandLine,
                          flags: { ...commandLine.flags, watch: !commandLine.flags?.watch }
                        })}
                        className={`px-2 py-1 text-xs rounded ${commandLine.flags?.watch ? 'bg-orange-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                      >
                        {commandLine.flags?.watch ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-orange-200 text-xs">Bun Runtime</span>
                      <button
                        onClick={() => setCommandLine({
                          ...commandLine,
                          flags: { ...commandLine.flags, bun: !commandLine.flags?.bun }
                        })}
                        className={`px-2 py-1 text-xs rounded ${commandLine.flags?.bun ? 'bg-orange-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                      >
                        {commandLine.flags?.bun ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const defaultConfig: BunCommandLine = {
                      stdin: { enabled: true, treatAsTypeScript: true, jsxSupport: true, pipeFrom: "process.stdin", encoding: "utf8" as const, transform: true, filter: "", fileRedirect: true, temporaryFile: false, directExecution: true },
                      console: { depth: 10, colors: true, maxStringLength: 10000, showHidden: false, compact: false, breakLength: 80, getters: true, proxy: true, iterableLimit: 100, maxArrayLength: 100, maxBufferLength: 1000 },
                      optimization: { smol: false, minify: false, compress: true, treeShaking: true, deadCodeElimination: true, inlineFunctions: false, constantFolding: true, bundleSize: "default", target: "bun", platform: "neutral" },
                      networking: { port: 3000, maxHttpHeaderSize: 16384, dnsResultOrder: "verbatim", fetchPreconnect: [], useSystemCa: false, useOpensslCa: false, useBundledCa: true, redisPreconnect: false, sqlPreconnect: false, userAgent: "Bun/SystemsDashboard" },
                      flags: { hot: false, watch: false, smol: false, bun: true, version: false, help: false, eval: "", print: "", preload: [], import: [], external: [], env: {} }
                    };
                    setCommandLine({ ...commandLine, ...defaultConfig });
                  }}
                  className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
                >
                  🔄 Reset to Defaults
                </button>
                <button
                  onClick={() => {
                    const performanceConfig = {
                      optimization: { smol: true, minify: true, compress: true, treeShaking: true, deadCodeElimination: true, inlineFunctions: true, constantFolding: true, bundleSize: "smol" as const, target: "bun" as const, platform: "neutral" as const },
                      networking: { maxHttpHeaderSize: 32768, dnsResultOrder: "ipv4first" as const, port: 3000, fetchPreconnect: [], useSystemCa: false, useOpensslCa: false, useBundledCa: true, redisPreconnect: true, sqlPreconnect: true, userAgent: "Bun/Performance" },
                      flags: { hot: true, watch: true, smol: true, bun: true, version: false, help: false, eval: "", print: "", preload: [], import: [], external: [], env: {} }
                    };
                    setCommandLine({
                      ...commandLine,
                      optimization: { ...commandLine.optimization, ...performanceConfig.optimization },
                      networking: { ...commandLine.networking, ...performanceConfig.networking },
                      flags: { ...commandLine.flags, ...performanceConfig.flags }
                    });
                  }}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                >
                  ⚡ Performance Mode
                </button>
                <button
                  onClick={() => {
                    const developmentConfig = {
                      console: { depth: 15, colors: true, maxStringLength: 50000, showHidden: true, compact: false, breakLength: 120, getters: true, proxy: true, iterableLimit: 200, maxArrayLength: 200, maxBufferLength: 2000 },
                      flags: { hot: true, watch: true, smol: false, bun: true, version: false, help: false, eval: "", print: "", preload: [], import: [], external: [], env: {} },
                      stdin: { treatAsTypeScript: true, jsxSupport: true, enabled: true, pipeFrom: "process.stdin", encoding: "utf8" as const, transform: true, filter: "", fileRedirect: true, temporaryFile: false, directExecution: true }
                    };
                    setCommandLine({
                      ...commandLine,
                      console: { ...commandLine.console, ...developmentConfig.console },
                      flags: { ...commandLine.flags, ...developmentConfig.flags },
                      stdin: { ...commandLine.stdin, ...developmentConfig.stdin }
                    });
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                  🛠️ Development Mode
                </button>
              </div>
            </div>

            {/* STDIN/STDOUT Configuration */}
            <div className="mb-6 p-4 bg-cyan-900/30 rounded-lg border border-cyan-500/30">
              <h3 className="text-cyan-300 font-semibold mb-3">📡 STDIN/STDOUT Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-cyan-200 font-medium mb-2">Stream Settings:</h4>
                  <pre className="text-cyan-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  stdin: {
    enabled: commandLine.stdin?.enabled,
    pipeFrom: commandLine.stdin?.pipeFrom,
    encoding: commandLine.stdin?.encoding,
    transform: commandLine.stdin?.transform,
    filter: commandLine.stdin?.filter
  },
  stdout: {
    encoding: commandLine.stdout?.encoding,
    pipeTo: commandLine.stdout?.pipeTo,
    append: commandLine.stdout?.append
  },
  stderr: {
    encoding: commandLine.stderr?.encoding,
    pipeTo: commandLine.stderr?.pipeTo,
    append: commandLine.stderr?.append
  }
}, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-cyan-200 font-medium mb-2">Stream Status:</h4>
                  <div className="space-y-2">
                    <div className="text-cyan-300 text-xs bg-black/30 p-2 rounded">
                      STDIN: {commandLine.stdin?.enabled ? '✅ Active' : '❌ Disabled'}
                    </div>
                    <div className="text-cyan-300 text-xs bg-black/30 p-2 rounded">
                      STDOUT: {commandLine.stdout?.pipeTo ? `Piped to ${commandLine.stdout.pipeTo}` : 'Console output'}
                    </div>
                    <div className="text-cyan-300 text-xs bg-black/30 p-2 rounded">
                      STDERR: {commandLine.stderr?.pipeTo ? `Piped to ${commandLine.stderr.pipeTo}` : 'Console errors'}
                    </div>
                    <div className="text-cyan-300 text-xs bg-black/30 p-2 rounded">
                      Encoding: {commandLine.stdin?.encoding}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Console Configuration */}
            <div className="mb-6 p-4 bg-indigo-900/30 rounded-lg border border-indigo-500/30">
              <h3 className="text-indigo-300 font-semibold mb-3">🖥️ Console Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-indigo-200 font-medium mb-2">Console Settings:</h4>
                  <pre className="text-indigo-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  depth: commandLine.console?.depth,
  maxStringLength: commandLine.console?.maxStringLength,
  showHidden: commandLine.console?.showHidden,
  colors: commandLine.console?.colors,
  compact: commandLine.console?.compact,
  breakLength: commandLine.console?.breakLength,
  getters: commandLine.console?.getters,
  proxy: commandLine.console?.proxy
}, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-indigo-200 font-medium mb-2">Display Limits:</h4>
                  <pre className="text-indigo-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  iterableLimit: commandLine.console?.iterableLimit,
  maxArrayLength: commandLine.console?.maxArrayLength,
  maxBufferLength: commandLine.console?.maxBufferLength
}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Optimization Configuration */}
            <div className="mb-6 p-4 bg-pink-900/30 rounded-lg border border-pink-500/30">
              <h3 className="text-pink-300 font-semibold mb-3">⚡ Optimization Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-pink-200 font-medium mb-2">Optimization Settings:</h4>
                  <pre className="text-pink-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  smol: commandLine.optimization?.smol,
  minify: commandLine.optimization?.minify,
  compress: commandLine.optimization?.compress,
  treeShaking: commandLine.optimization?.treeShaking,
  deadCodeElimination: commandLine.optimization?.deadCodeElimination,
  inlineFunctions: commandLine.optimization?.inlineFunctions,
  constantFolding: commandLine.optimization?.constantFolding
}, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-pink-200 font-medium mb-2">Bundle Configuration:</h4>
                  <pre className="text-pink-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  bundleSize: commandLine.optimization?.bundleSize,
  target: commandLine.optimization?.target,
  platform: commandLine.optimization?.platform
}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Networking & Security Configuration */}
            <div className="mb-6 p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
              <h3 className="text-blue-300 font-semibold mb-3">🌐 Networking & Security</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-blue-200 font-medium mb-2">Server Configuration:</h4>
                  <pre className="text-blue-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  port: commandLine.networking?.port,
  fetchPreconnect: commandLine.networking?.fetchPreconnect,
  maxHttpHeaderSize: commandLine.networking?.maxHttpHeaderSize,
  userAgent: commandLine.networking?.userAgent
}, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-blue-200 font-medium mb-2">DNS & Certificates:</h4>
                  <pre className="text-blue-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  dnsResultOrder: commandLine.networking?.dnsResultOrder,
  useSystemCa: commandLine.networking?.useSystemCa,
  useOpensslCa: commandLine.networking?.useOpensslCa,
  useBundledCa: commandLine.networking?.useBundledCa
}, null, 2)}
                  </pre>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-blue-200 font-medium mb-2">Database Preconnect:</h4>
                  <pre className="text-blue-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  redisPreconnect: commandLine.networking?.redisPreconnect,
  sqlPreconnect: commandLine.networking?.sqlPreconnect
}, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-blue-200 font-medium mb-2">Security Status:</h4>
                  <div className="space-y-2">
                    <div className="text-blue-300 text-xs bg-black/30 p-2 rounded">
                      CA Store: {commandLine.networking?.useSystemCa ? 'System' : commandLine.networking?.useOpensslCa ? 'OpenSSL' : 'Bundled'}
                    </div>
                    <div className="text-blue-300 text-xs bg-black/30 p-2 rounded">
                      DNS Order: {commandLine.networking?.dnsResultOrder}
                    </div>
                    <div className="text-blue-300 text-xs bg-black/30 p-2 rounded">
                      Header Limit: {commandLine.networking?.maxHttpHeaderSize} bytes
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Command Line Flags */}
            <div className="mb-6 p-4 bg-orange-900/30 rounded-lg border border-orange-500/30">
              <h3 className="text-orange-300 font-semibold mb-3">🚩 Command Line Flags</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-orange-200 font-medium mb-2">Active Flags:</h4>
                  <pre className="text-orange-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  hot: commandLine.flags?.hot,
  watch: commandLine.flags?.watch,
  smol: commandLine.flags?.smol,
  bun: commandLine.flags?.bun,
  version: commandLine.flags?.version,
  help: commandLine.flags?.help,
  eval: commandLine.flags?.eval || "none",
  print: commandLine.flags?.print || "none"
}, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-orange-200 font-medium mb-2">Build Options:</h4>
                  <pre className="text-orange-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  preload: commandLine.flags?.preload?.length || 0,
  imports: commandLine.flags?.import?.length || 0,
  defines: Object.keys(commandLine.flags?.define || {}).length,
  externals: commandLine.flags?.external?.length || 0,
  cwd: commandLine.flags?.cwd
}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Execution Configuration */}
            <div className="mb-6 p-4 bg-green-900/30 rounded-lg border border-green-500/30">
              <h3 className="text-green-300 font-semibold mb-3">⚙️ Execution Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-green-200 font-medium mb-2">Runtime Settings:</h4>
                  <pre className="text-green-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  entryPoint: commandLine.execution?.entryPoint,
  arguments: commandLine.execution?.arguments,
  workingDirectory: commandLine.execution?.workingDirectory,
  nodeOptions: commandLine.execution?.nodeOptions
}, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-green-200 font-medium mb-2">Memory Management:</h4>
                  <pre className="text-green-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify({
  maxHeap: commandLine.execution?.maxHeap,
  heapLimit: commandLine.execution?.heapLimit
}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Command Examples */}
            <div className="mb-6 p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
              <h3 className="text-purple-300 font-semibold mb-3">💻 Command Examples</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-purple-200 font-medium mb-2">File Redirection Examples:</h4>
                  <pre className="text-purple-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{`# Create a .js file with TypeScript code
echo "console.log!('This is TypeScript!' as any)" > secretly-typescript.js

# Run the .js file as TypeScript with JSX support
bun run - < secretly-typescript.js
# Output: This is TypeScript!

# Run different file types as TypeScript
bun run - < script.js          # .js as TypeScript
bun run - < config.json        # .json as TypeScript
bun run - < component.jsx      # .jsx as TypeScript+JSX
bun run - < data.tsx           # .tsx as TypeScript+JSX

# Process data through stdin
cat data.json | bun run -
curl api.data.com | bun run -
cat log.txt | bun run -`}
                  </pre>
                </div>
                <div>
                  <h4 className="text-purple-200 font-medium mb-2">Language Examples:</h4>
                  <pre className="text-purple-300 text-xs bg-black/30 p-2 rounded overflow-x-auto">
{`# JavaScript (auto-converted to TypeScript)
echo "console.log('Hello')" | bun run -

# TypeScript with types
echo "const x: number = 42; console.log(x);" | bun run -

# JSX components
echo "const jsx = <div>Hello JSX</div>;" | bun run -

# TSX with props
echo "const Component = (props: any) => <div>{props.name}</div>;" | bun run -`}
                  </pre>
                </div>
              </div>
            </div>

            {/* CLI Feature Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full text-white text-sm">
                <thead className="border-b border-white/20">
                  <tr>
                    <th className="px-4 py-3 text-left">Feature</th>
                    <th className="px-4 py-3 text-left">Configuration</th>
                    <th className="px-4 py-3 text-left">Status</th>
    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Use Case</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-cyan-400">STDIN</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.stdin?.encoding || 'utf8'}</td>
                    <td className="px-4 py-3">{commandLine.stdin?.enabled ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Input Stream</td>
                    <td className="px-4 py-3">Data piped from stdin</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-cyan-400">STDOUT</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.stdout?.pipeTo || 'console'}</td>
                    <td className="px-4 py-3">✅ Active</td>
                    <td className="px-4 py-3">Output Stream</td>
                    <td className="px-4 py-3">Console or file output</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-cyan-400">STDERR</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.stderr?.pipeTo || 'console'}</td>
                    <td className="px-4 py-3">✅ Active</td>
                    <td className="px-4 py-3">Error Stream</td>
                    <td className="px-4 py-3">Error logging</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-orange-400">Hot Reload</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.flags?.hot ? '--hot' : 'disabled'}</td>
                    <td className="px-4 py-3">{commandLine.flags?.hot ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Development</td>
                    <td className="px-4 py-3">Auto-reload on changes</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-orange-400">Watch Mode</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.flags?.watch ? '--watch' : 'disabled'}</td>
                    <td className="px-4 py-3">{commandLine.flags?.watch ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Development</td>
                    <td className="px-4 py-3">File watching</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-orange-400">Eval Mode</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.flags?.eval || 'none'}</td>
                    <td className="px-4 py-3">{commandLine.flags?.eval ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Execution</td>
                    <td className="px-4 py-3">Inline code execution</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-blue-400">Server Port</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.networking?.port || 3000}</td>
                    <td className="px-4 py-3">✅ Configured</td>
                    <td className="px-4 py-3">Networking</td>
                    <td className="px-4 py-3">Bun.serve default port</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-blue-400">Header Size</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.networking?.maxHttpHeaderSize || 16384} bytes</td>
                    <td className="px-4 py-3">✅ Limited</td>
                    <td className="px-4 py-3">Security</td>
                    <td className="px-4 py-3">HTTP header size limit</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-blue-400">DNS Order</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.networking?.dnsResultOrder || 'verbatim'}</td>
                    <td className="px-4 py-3">✅ Configured</td>
                    <td className="px-4 py-3">Networking</td>
                    <td className="px-4 py-3">DNS lookup result order</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-blue-400">CA Store</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.networking?.useSystemCa ? 'System' : commandLine.networking?.useOpensslCa ? 'OpenSSL' : 'Bundled'}</td>
                    <td className="px-4 py-3">✅ Active</td>
                    <td className="px-4 py-3">Security</td>
                    <td className="px-4 py-3">Certificate authority store</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-blue-400">Redis Preconnect</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.networking?.redisPreconnect ? 'enabled' : 'disabled'}</td>
                    <td className="px-4 py-3">{commandLine.networking?.redisPreconnect ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Database</td>
                    <td className="px-4 py-3">Redis connection preconnect</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-blue-400">SQL Preconnect</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.networking?.sqlPreconnect ? 'enabled' : 'disabled'}</td>
                    <td className="px-4 py-3">{commandLine.networking?.sqlPreconnect ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Database</td>
                    <td className="px-4 py-3">PostgreSQL preconnect</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-blue-400">User Agent</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.networking?.userAgent || 'Bun/Default'}</td>
                    <td className="px-4 py-3">✅ Configured</td>
                    <td className="px-4 py-3">HTTP</td>
                    <td className="px-4 py-3">Default User-Agent header</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-pink-400">Smol Mode</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.optimization?.smol ? '--smol' : 'disabled'}</td>
                    <td className="px-4 py-3">{commandLine.optimization?.smol ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Performance</td>
                    <td className="px-4 py-3">Maximum optimization</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-pink-400">Minification</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.optimization?.minify ? '--minify' : 'disabled'}</td>
                    <td className="px-4 py-3">{commandLine.optimization?.minify ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Bundle</td>
                    <td className="px-4 py-3">Code size reduction</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-pink-400">Tree Shaking</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.optimization?.treeShaking ? 'enabled' : 'disabled'}</td>
                    <td className="px-4 py-3">{commandLine.optimization?.treeShaking ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Bundle</td>
                    <td className="px-4 py-3">Dead code elimination</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-pink-400">Bundle Size</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.optimization?.bundleSize || 'default'}</td>
                    <td className="px-4 py-3">✅ Configured</td>
                    <td className="px-4 py-3">Bundle</td>
                    <td className="px-4 py-3">Output size optimization</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-indigo-400">Console Depth</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.console?.depth || 10}</td>
                    <td className="px-4 py-3">✅ Configured</td>
                    <td className="px-4 py-3">Display</td>
                    <td className="px-4 py-3">Object inspection depth</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-indigo-400">String Length</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.console?.maxStringLength || 10000}</td>
                    <td className="px-4 py-3">✅ Limited</td>
                    <td className="px-4 py-3">Display</td>
                    <td className="px-4 py-3">Max string display length</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-indigo-400">Console Colors</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.console?.colors ? 'enabled' : 'disabled'}</td>
                    <td className="px-4 py-3">{commandLine.console?.colors ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Display</td>
                    <td className="px-4 py-3">Colored console output</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-indigo-400">Array Limit</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.console?.maxArrayLength || 100}</td>
                    <td className="px-4 py-3">✅ Limited</td>
                    <td className="px-4 py-3">Display</td>
                    <td className="px-4 py-3">Max array items displayed</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-green-400">Memory Limit</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.execution?.heapLimit || 'default'}</td>
                    <td className="px-4 py-3">✅ Configured</td>
                    <td className="px-4 py-3">Performance</td>
                    <td className="px-4 py-3">Memory management</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-purple-400">Preload</td>
                    <td className="px-4 py-3 font-mono text-green-400">{commandLine.flags?.preload?.length || 0} modules</td>
                    <td className="px-4 py-3">{commandLine.flags?.preload?.length ? '✅ Active' : '❌ Inactive'}</td>
                    <td className="px-4 py-3">Build</td>
                    <td className="px-4 py-3">Module preloading</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Bun inspect.table() Code Examples */}
        <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Quick Reference
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-black/30 rounded-lg p-4 border border-white/10">
              <h3 className="text-white font-semibold mb-2">Basic Usage</h3>
              <pre className="text-xs text-green-400 overflow-x-auto">
                {`import { inspect } from "bun";
console.log(inspect.table(data));`}
              </pre>
            </div>
            <div className="bg-black/30 rounded-lg p-4 border border-white/10">
              <h3 className="text-white font-semibold mb-2">With Options</h3>
              <pre className="text-xs text-green-400 overflow-x-auto">
                {`inspect.table(data, {
  theme: "dark",
  showBorder: true,
  zebra: true
});`}
              </pre>
            </div>
            <div className="bg-black/30 rounded-lg p-4 border border-white/10">
              <h3 className="text-white font-semibold mb-2">Export Formats</h3>
              <pre className="text-xs text-green-400 overflow-x-auto">
                {`// HTML, JSON, CSV, Markdown
inspect.table(data, {
  output: "html"
});`}
              </pre>
            </div>
          </div>
        </section>
      </div>

      {/* Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">
                Generated Bun inspect.table() Code
              </h3>
              <button
                onClick={() => setShowCodeModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="bg-black rounded-lg p-4 overflow-x-auto max-h-[60vh]">
              <pre className="text-sm text-green-400 font-mono">
                {tableCode}
              </pre>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={(event) => {
                    navigator.clipboard.writeText(tableCode);
                    // Show success feedback
                    const button = event.currentTarget;
                    const originalText = button.textContent;
                    button.textContent = "✅ Copied!";
                    button.classList.add("bg-green-600");
                    setTimeout(() => {
                      button.textContent = originalText;
                      button.classList.remove("bg-green-600");
                    }, 2000);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2"
                >
                  📋 Copy Code
                </button>
                <button
                  onClick={() => {
                    // Download as file
                    const blob = new Blob([tableCode], { type: 'text/javascript' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `bun-table-${selectedTable}-${Date.now()}.js`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center gap-2"
                >
                  💾 Download
                </button>
                <button
                  onClick={() => {
                    // Run code in browser console with enhanced features
                    const newWindow = window.open('', '_blank', 'width=800,height=600');
                    if (newWindow) {
                      newWindow.document.write(`
                        <html>
                          <head>
                            <title>Bun Code Runner</title>
                            <style>
                              body { font-family: 'Courier New', monospace; padding: 20px; background: #1a1a1a; color: #fff; margin: 0; }
                              .header { color: #4CAF50; margin-bottom: 20px; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
                              .code-block { background: #000; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #4CAF50; position: relative; }
                              .output { background: #2d2d2d; padding: 15px; border-radius: 5px; margin: 10px 0; border: 1px solid #444; }
                              .error { background: #8d0000; color: #ff6b6b; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #ff4444; }
                              .success { background: #1a5f1a; color: #4CAF50; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #4CAF50; }
                              .warning { background: #8d6500; color: #ffa726; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #ffa726; }
                              .timestamp { color: #888; font-size: 12px; }
                              button { background: #4CAF50; color: white; border: none; padding: 10px 20px; margin: 5px; border-radius: 3px; cursor: pointer; transition: all 0.3s ease; }
                              button:hover { background: #45a049; transform: translateY(-1px); box-shadow: 0 2px 5px rgba(0,0,0,0.3); }
                              button:active { transform: translateY(0); }
                              button.secondary { background: #2196F3; }
                              button.secondary:hover { background: #1976D2; }
                              button.danger { background: #f44336; }
                              button.danger:hover { background: #d32f2f; }
                              pre { white-space: pre-wrap; word-wrap: break-word; margin: 0; line-height: 1.4; }
                              .controls { background: #2d2d2d; padding: 15px; border-radius: 5px; margin: 10px 0; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
                              .stats { display: flex; gap: 20px; margin: 10px 0; font-size: 14px; }
                              .stat { background: #333; padding: 8px 12px; border-radius: 3px; }
                              .execution-time { color: #4CAF50; font-weight: bold; }
                              .line-numbers { counter-reset: line; }
                              .line-numbers pre { padding-left: 3em; position: relative; }
                              .line-numbers pre::before { content: counter(line); counter-increment: line; position: absolute; left: 0; color: #666; text-align: right; width: 2.5em; }
                              .copy-btn { position: absolute; top: 10px; right: 10px; background: #555; padding: 5px 10px; font-size: 12px; }
                              .copy-btn:hover { background: #666; }
                              .performance-bar { width: 100%; height: 20px; background: #333; border-radius: 10px; overflow: hidden; margin: 5px 0; }
                              .performance-fill { height: 100%; background: linear-gradient(90deg, #4CAF50, #8BC34A); transition: width 0.3s ease; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h2>🚀 Bun Code Runner</h2>
                              <div class="timestamp">Started: ${new Date().toLocaleString()}</div>
                            </div>

                            <div class="stats">
                              <div class="stat">📊 Lines: <span id="line-count">0</span></div>
                              <div class="stat">⚡ Executions: <span id="exec-count">0</span></div>
                              <div class="stat">⏱️ Last Runtime: <span id="last-runtime" class="execution-time">0ms</span></div>
                              <div class="stat">🎯 Status: <span id="status">Ready</span></div>
                            </div>

                            <div class="code-block line-numbers">
                              <h3>📝 Code to Execute:</h3>
                              <button class="copy-btn" onclick="copyCode()">📋 Copy</button>
                              <pre>${tableCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                            </div>

                            <div class="controls">
                              <button onclick="runCode()">▶️ Run Code</button>
                              <button onclick="runCodeWithDebug()">🐛 Debug Mode</button>
                              <button onclick="clearOutput()" class="secondary">🗑️ Clear Output</button>
                              <button onclick="toggleLineNumbers()" class="secondary">📝 Toggle Lines</button>
                              <button onclick="toggleTranspilation()" class="secondary">🔧 Toggle Transpile</button>
                              <button onclick="formatCode()" class="secondary">✨ Format</button>
                              <button onclick="resetAll()" class="danger">🔄 Reset All</button>
                            </div>

                            <div class="performance-bar">
                              <div id="performance-fill" class="performance-fill" style="width: 0%"></div>
                            </div>

                            <div id="output" class="output">
                              <h3>📊 Console Output:</h3>
                              <div id="console-output" class="timestamp">Click "Run Code" to execute...</div>
                            </div>

                            <script>
                              const originalCode = \`${tableCode.replace(/`/g, '\\`').replace(/\\n/g, '\\\\n').replace(/</g, '\\x3C').replace(/>/g, '\\x3E')}\`;
                              let outputDiv = document.getElementById('console-output');
                              let executionCount = 0;
                              let lineNumbersVisible = true;
                              let transpilationEnabled = true;
                              let currentLanguage = 'javascript';

                              // Initialize stats
                              document.getElementById('line-count').textContent = originalCode.split('\\n').length;

                              // Bun transpilation features
                              const bunFeatures = {
                                typescript: true,
                                jsx: true,
                'import.meta': true,
                'node_modules': true,
                'web-globals': true,
                'decorators': true,
                'class-fields': true,
                'optional-chaining': true,
                'nullish-coalescing': true,
                'dynamic-import': true,
                'top-level-await': true
                              };

                              // Override console methods
                              const originalLog = console.log;
                              const originalError = console.error;
                              const originalWarn = console.warn;

                              console.log = function(...args) {
                                originalLog.apply(console, args);
                                const message = args.map(arg =>
                                  typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                                ).join(' ');
                                addOutput('📋 ' + message, 'log');
                              };

                              console.error = function(...args) {
                                originalError.apply(console, args);
                                const message = args.map(arg =>
                                  typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                                ).join(' ');
                                addOutput('❌ ' + message, 'error');
                              };

                              console.warn = function(...args) {
                                originalWarn.apply(console, args);
                                const message = args.map(arg =>
                                  typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                                ).join(' ');
                                addOutput('⚠️ ' + message, 'warning');
                              };

                              // Bun transpilation simulation
                              function transpileCode(code, language) {
                                if (!transpilationEnabled) return code;

                                try {
                                  switch(language) {
                                    case 'typescript':
                                      return transpileTypeScript(code);
                                    case 'jsx':
                                      return transpileJSX(code);
                                    case 'bun':
                                      return transpileBunFeatures(code);
                                    default:
                                      return code;
                                  }
                                } catch (e) {
                                  console.warn('⚠️ Transpilation failed: ' + e.message);
                                  return code;
                                }
                              }

                              function transpileTypeScript(code) {
                                // Simulate TypeScript transpilation
                                let transpiled = code;

                                // Remove type annotations
                                transpiled = transpiled.replace(/:\\s*[\\w\\[\\]|]+/g, '');
                                transpiled = transpiled.replace(/interface\\s+\\w+\\s*{[^}]*}/g, '');
                                transpiled = transpiled.replace(/type\\s+\\w+\\s*=\\s*[^;]+;/g, '');

                                // Handle generics (basic)
                                transpiled = transpiled.replace(/<\\w+>/g, '');

                                console.log('🔧 TypeScript transpilation applied');
                                return transpiled;
                              }

                              function transpileJSX(code) {
                                // Simulate JSX transpilation
                                let transpiled = code;

                                // Convert JSX to React.createElement calls
                                transpiled = transpiled.replace(/<([A-Z][\\w]*)\\s*([^>]*)\\s*\\/?>/g,
                                  'React.createElement($1, {$2})');
                                transpiled = transpiled.replace(/<\\/([A-Z][\\w]*)>/g, ')');

                                if (transpiled !== code) {
                                  console.log('⚛️ JSX transpilation applied');
                                  // Add React import if needed
                                  if (!transpiled.includes('import React')) {
                                    transpiled = 'const React = { createElement: (type, props, ...children) => ({ type, props, children }) };\\n' + transpiled;
                                  }
                                }

                                return transpiled;
                              }

                              function transpileBunFeatures(code) {
                                let transpiled = code;

                                // Handle import.meta
                                transpiled = transpiled.replace(/import\\.meta\\.url/g, '"file://" + __filename');
                                transpiled = transpiled.replace(/import\\.meta\\.main/g, '__filename === require.main.filename');

                                // Handle top-level await (wrap in async IIFE)
                                if (transpiled.includes('await ') && !transpiled.includes('async')) {
                                  transpiled = '(async () => {\\n' + transpiled + '\\n})();';
                                  console.log('⏳ Top-level await wrapped in async IIFE');
                                }

                                // Handle class fields (basic)
                                transpiled = transpiled.replace(/class\\s+(\\w+)\\s*{([^}]*)}/g,
                                  'class $1 { constructor() {$2}}');

                                console.log('🍞 Bun-specific features transpiled');
                                return transpiled;
                              }

                              function detectLanguage(code) {
                                if (code.includes('interface ') || code.includes('type ') || code.includes(': string') || code.includes(': number')) {
                                  return 'typescript';
                                }
                                if (code.includes('<') && code.includes('>') && code.includes('React.createElement') || /<[A-Z][\\w]*/.test(code)) {
                                  return 'jsx';
                                }
                                if (code.includes('import.meta') || code.includes('await ') || code.includes('class ')) {
                                  return 'bun';
                                }
                                return 'javascript';
                              }

                              function addOutput(message, type = 'log') {
                                const className = type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'timestamp';
                                outputDiv.innerHTML += \`<div class="\${className}">\${message}</div>\`;
                                outputDiv.scrollTop = outputDiv.scrollHeight;
                              }

                              function runCode() {
                                const startTime = performance.now();
                                executionCount++;
                                document.getElementById('exec-count').textContent = executionCount;

                                outputDiv.innerHTML = '<div class="timestamp">🚀 Executing code...</div>';
                                updateStatus('Running');
                                updatePerformanceBar(10);

                                try {
                                  // Detect language and transpile
                                  currentLanguage = detectLanguage(originalCode);
                                  console.log('🔍 Detected language: ' + currentLanguage);

                                  updatePerformanceBar(30);
                                  let codeToRun = transpileCode(originalCode, currentLanguage);

                                  updatePerformanceBar(50);
                                  console.log('🕐 Execution started at: ' + new Date().toLocaleTimeString());
                                  console.log('🔧 Transpilation: ' + (transpilationEnabled ? 'Enabled' : 'Disabled'));
                                  console.log('📝 Language: ' + currentLanguage);

                                  eval(codeToRun);
                                  updatePerformanceBar(100);
                                  console.log('✅ Code executed successfully!');
                                  updateStatus('Success');

                                } catch (error) {
                                  updatePerformanceBar(0);
                                  console.error('💥 Error: ' + error.message);
                                  console.error('📍 Stack trace: ' + error.stack);
                                  updateStatus('Error');
                                }

                                const endTime = performance.now();
                                const executionTime = (endTime - startTime).toFixed(2);
                                document.getElementById('last-runtime').textContent = executionTime + 'ms';
                                console.log('🏁 Execution finished at: ' + new Date().toLocaleTimeString());

                                setTimeout(() => {
                                  updateStatus('Ready');
                                  updatePerformanceBar(0);
                                }, 2000);
                              }

                              function runCodeWithDebug() {
                                console.log('🐛 Debug mode enabled');
                                console.log('📊 Code length: ' + originalCode.length + ' characters');
                                console.log('📝 Code lines: ' + originalCode.split('\\n').length);
                                console.log('🔍 Detected language: ' + detectLanguage(originalCode));
                                console.log('⏰ Current time: ' + new Date().toISOString());
                                console.log('🔧 Available Bun features:');
                                Object.entries(bunFeatures).forEach(([feature, enabled]) => {
                                  console.log('  ' + (enabled ? '✅' : '❌') + ' ' + feature);
                                });
                                runCode();
                              }

                              function clearOutput() {
                                outputDiv.innerHTML = '<div class="timestamp">📋 Output cleared. Ready for new execution...</div>';
                                updateStatus('Cleared');
                                setTimeout(() => updateStatus('Ready'), 1000);
                              }

                              function toggleLineNumbers() {
                                const codeBlock = document.querySelector('.code-block');
                                lineNumbersVisible = !lineNumbersVisible;
                                codeBlock.classList.toggle('line-numbers');
                                console.log('📝 Line numbers ' + (lineNumbersVisible ? 'enabled' : 'disabled'));
                              }

                              function toggleTranspilation() {
                                transpilationEnabled = !transpilationEnabled;
                                console.log('🔧 Transpilation ' + (transpilationEnabled ? 'enabled' : 'disabled'));
                              }

                              function formatCode() {
                                try {
                                  // Enhanced code formatting based on language
                                  let formatted = originalCode;

                                  if (currentLanguage === 'typescript') {
                                    // TypeScript formatting
                                    formatted = formatted.replace(/;/g, ';\\n');
                                    formatted = formatted.replace(/{/g, '{\\n  ');
                                    formatted = formatted.replace(/}/g, '\\n}');
                                    console.log('✨ TypeScript code formatted');
                                  } else if (currentLanguage === 'jsx') {
                                    // JSX formatting
                                    formatted = formatted.replace(/(<[^>]+>)/g, '\\n$1\\n');
                                    console.log('✨ JSX code formatted');
                                  } else {
                                    // JavaScript formatting
                                    formatted = formatted.replace(/;/g, ';\\n');
                                    formatted = formatted.replace(/{/g, '{\\n');
                                    formatted = formatted.replace(/}/g, '\\n}');
                                    console.log('✨ JavaScript code formatted');
                                  }

                                } catch (e) {
                                  console.warn('⚠️ Code formatting failed: ' + e.message);
                                }
                              }

                              function resetAll() {
                                executionCount = 0;
                                document.getElementById('exec-count').textContent = '0';
                                document.getElementById('last-runtime').textContent = '0ms';
                                clearOutput();
                                updatePerformanceBar(0);
                                transpilationEnabled = true;
                                console.log('🔄 All stats reset');
                              }

                              function copyCode() {
                                navigator.clipboard.writeText(originalCode);
                                const btn = event.target;
                                const originalText = btn.textContent;
                                btn.textContent = '✅ Copied!';
                                setTimeout(() => {
                                  btn.textContent = originalText;
                                }, 1500);
                              }

                              // Auto-run on load
                              setTimeout(() => {
                                console.log('🎯 Bun Code Runner ready!');
                                console.log('📝 Code loaded: ' + originalCode.split('\\n').length + ' lines');
                                console.log('🔍 Detected language: ' + detectLanguage(originalCode));
                                console.log('🔧 Transpilation features enabled');
                                console.log('🍞 Supporting Bun runtime features');
                              }, 500);
                            </script>
                          </body>
                        </html>
                      `);
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 flex items-center gap-2"
                >
                  ▶️ Run Code
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Enhanced sharing with multiple options
                    const shareOptions = {
                      title: 'Bun Table Code - ' + selectedTable.charAt(0).toUpperCase() + selectedTable.slice(1),
                      text: 'Check out this Bun table configuration code from the Systems Dashboard!\n\n' +
                            'Table: ' + selectedTable + '\n' +
                            'Generated: ' + new Date().toLocaleString() + '\n\n' +
                            'Code:\n' + tableCode,
                      url: window.location.href + '#table=' + selectedTable
                    };

                    // Try native share first
                    if (navigator.share && navigator.canShare && navigator.canShare(shareOptions)) {
                      navigator.share(shareOptions)
                        .then(() => console.log('✅ Code shared successfully'))
                        .catch((error) => {
                          console.log('❌ Share cancelled or failed:', error);
                          // Fallback to clipboard
                          fallbackShare();
                        });
                    } else {
                      fallbackShare();
                    }

                    function fallbackShare() {
                      // Create enhanced clipboard content
                      const enhancedContent = `// Bun Table Code - ${selectedTable.charAt(0).toUpperCase() + selectedTable.slice(1)}
// Generated: ${new Date().toLocaleString()}
// From: ${window.location.href}

${tableCode}

---
// Generated by Systems Dashboard with Bun inspect.table()
// Learn more: https://bun.com/docs/runtime/bun-inspect#bun-inspect-table`;

                      navigator.clipboard.writeText(enhancedContent).then(() => {
                        // Show success notification
                        const notification = document.createElement('div');
                        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
                        notification.innerHTML = '✅ Code copied to clipboard! Ready to share.';
                        document.body.appendChild(notification);

                        // Remove notification after 3 seconds
                        setTimeout(() => {
                          notification.style.opacity = '0';
                          notification.style.transition = 'opacity 0.5s ease';
                          setTimeout(() => document.body.removeChild(notification), 500);
                        }, 3000);
                      }).catch(err => {
                        console.error('❌ Failed to copy:', err);
                        alert('Failed to copy code to clipboard. Please try again.');
                      });
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 flex items-center gap-2 relative group"
                >
                  📤 Share
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Share via Web Share API or copy to clipboard
                  </span>
                </button>
                <button
                  onClick={() => {
                    // Enhanced close with confirmation if there are unsaved changes
                    if (tableCode && tableCode.length > 0) {
                      // Add smooth closing animation
                      const modal = document.querySelector('.fixed.inset-0');
                      if (modal) {
                        (modal as HTMLElement).style.opacity = '0';
                        (modal as HTMLElement).style.transition = 'opacity 0.3s ease';
                        setTimeout(() => {
                          setShowCodeModal(false);
                        }, 300);
                      } else {
                        setShowCodeModal(false);
                      }
                    } else {
                      setShowCodeModal(false);
                    }
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 flex items-center gap-2 relative group"
                >
                  ✕ Close
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Close modal (ESC key also works)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>)}

        {/* Health Monitoring */}
        {selectedTable === "health" && (
          <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-white mb-2">
                🏥 System Health Monitoring
              </h2>
              <p className="text-gray-300">
                Real-time health checks, error tracking, and system diagnostics
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Health API Server</span>
                <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                  Port 3001
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Comprehensive health monitoring with error tracking and system diagnostics
              </p>
            </div>

            <HealthMonitor />
          </section>
        )}
      )}
    </div>
  );
}
