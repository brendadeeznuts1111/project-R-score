import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { StatCard, ProjectCard, RealTimeChart, AlertsPanel, TerminalPanel, KeyboardShortcutsModal, LiveActivityFeed } from "./components";
import { ToastContainer } from "./components/ToastContainer";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy load tab components for code splitting
const NetworkTab = lazy(() => import("./tabs/NetworkTab").then(module => ({ default: module.NetworkTab })));
const ConfigTab = lazy(() => import("./tabs/ConfigTab").then(module => ({ default: module.ConfigTab })));
const AnalyticsTab = lazy(() => import("./tabs/AnalyticsTab").then(module => ({ default: module.AnalyticsTab })));
const SettingsTab = lazy(() => import("./tabs/SettingsTab").then(module => ({ default: module.SettingsTab })));
const CLIToolsTab = lazy(() => import("./tabs/CLIToolsTab").then(module => ({ default: module.CLIToolsTab })));
const URLPatternTab = lazy(() => import("./tabs/URLPatternTab").then(module => ({ default: module.URLPatternTab })));
const PTYTab = lazy(() => import("./tabs/PTYTab").then(module => ({ default: module.PTYTab })));
const ResourceMonitorTab = lazy(() => import("./tabs/ResourceMonitorTab").then(module => ({ default: module.ResourceMonitorTab })));
const TopologyTab = lazy(() => import("./tabs/TopologyTab").then(module => ({ default: module.TopologyTab })));
const KYCReviewTab = lazy(() => import("./tabs/KYCReviewTab").then(module => ({ default: module.KYCReviewTab })));
const DiagnoseHealthTab = lazy(() => import("./tabs/DiagnoseHealthTab").then(module => ({ default: module.DiagnoseHealthTab })));
const BenchmarkTab = lazy(() => import("./tabs/BenchmarkTab").then(module => ({ default: module.BenchmarkTab })));
const TestRunnerTab = lazy(() => import("./tabs/TestRunnerTab").then(module => ({ default: module.TestRunnerTab })));
// NetworkMatrix is lazy loaded above
import { NetworkMatrix } from "./components/NetworkMatrix";
import { getConfigIntegrity, getConfigStatus, getThemeNames } from "./config";
import { useGlobalShortcuts, useConfigStatusPoll } from "./hooks";
import { showGlobalToast } from "./hooks/useToast";
import { formatBytes, formatUptime } from "./utils/formatters";
import type { Project, DashboardStats, DashboardData, ApiResponse, SystemMetrics } from "../types";
import { mapApiSnapshots, type TabView, type Snapshot, type StorageConfig } from "./types";

// Declare global theme functions from index.html
declare global {
  interface Window {
    toggleTheme: () => string;
    getTheme: () => string;
  }
}

export default function EnterpriseDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalRequests: 0,
    successRate: 0,
    avgLatency: 0,
    uptime: 0,
    timeline: [],
    alerts: [],
  });
  const [connected, setConnected] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>("dashboard");
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "health" | "activity">("activity");
  const [statusFilter, setStatusFilter] = useState<"all" | "clean" | "modified" | "staged" | "conflict">("all");
  const [healthFilter, setHealthFilter] = useState<"all" | "healthy" | "warning" | "critical">("all");
  const [selectedProjectIdx, setSelectedProjectIdx] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [storageConfig, setStorageConfig] = useState<StorageConfig>({ configured: false });
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [bunVersion, setBunVersion] = useState<string>("Loading...");
  const [bunFeatures, setBunFeatures] = useState<string[]>([]);
  const [configIntegrity, setConfigIntegrity] = useState<{ combined: string; valid: boolean }>({ combined: "--------", valid: true });
  const [configCopied, setConfigCopied] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [serverInfo, setServerInfo] = useState<{
    // Server identity
    serverId: string;
    // Bun runtime
    bun: {
      version: string;
      revision: string;
      env: string;
    };
    // Network
    network: {
      hostname: string;
      displayHost: string;
      port: number;
      protocol: string;
      baseUrl: string;
      wsUrl: string;
    };
    // Config
    config: {
      development: boolean;
      maxRequestBodySize: number;
      tlsEnabled: boolean;
      projectsDir: string;
    };
    // Connections
    connections: {
      pendingRequests: number;
      pendingWebSockets: number;
      dashboardSubscribers: number;
    };
    // Throughput
    throughput: {
      totalRequests: number;
      avgLatency: number;
      successRate: number;
      uptime: number;
      requestsPerSecond: number;
    };
    // System
    system: {
      platform: string;
      arch: string;
      pid: number;
      memoryUsage: number;
    };
  } | null>(null);
  const [endpointAnalytics, setEndpointAnalytics] = useState<{
    path: string;
    requests: number;
    errors: number;
    successRate: number;
    avgLatency: number;
  }[]>([]);

  // Bind global shortcuts from TOML config (toasts via showGlobalToast)
  const { result: shortcutResult } = useGlobalShortcuts({
    toastEnabled: true,
    soundEnabled: localStorage.getItem('shortcut-sound-enabled') === 'true',
    animationEnabled: localStorage.getItem('shortcut-animation-enabled') !== 'false',
    showConflictToast: true,
    onToast: (msg, type) => showGlobalToast(msg, type ?? "info"),
    handlers: {
      // Custom handlers for dashboard-specific actions
      "focus-search-bar": () => {
        setActiveTab("projects");
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
          input?.focus();
        }, 100);
      },
      "open-settings": () => setActiveTab("settings"),
      "toggle-command-palette": () => showGlobalToast("Command palette coming soon!", "info"),
      "command-palette": () => showGlobalToast("Press ? for keyboard shortcuts", "info"),
      "global-search": () => {
        setActiveTab("projects");
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
          input?.focus();
        }, 100);
      },
      // Terminal toggle (Ctrl+` or Cmd+`)
      "toggle-terminal": () => setShowTerminal(prev => !prev),
    },
  });

  useConfigStatusPoll();

  // Filter and sort projects (must be before useEffect that uses it)
  const filteredProjects = projects
    .filter(p => {
      // Text search
      if (filter && !p.name.toLowerCase().includes(filter.toLowerCase())) return false;
      // Status filter
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      // Health filter
      if (healthFilter === "healthy" && p.health < 80) return false;
      if (healthFilter === "warning" && (p.health < 60 || p.health >= 80)) return false;
      if (healthFilter === "critical" && p.health >= 60) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "health") return b.health - a.health;
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });

  // Count projects by status
  const statusCounts = {
    all: projects.length,
    clean: projects.filter(p => p.status === "clean").length,
    modified: projects.filter(p => p.status === "modified").length,
    staged: projects.filter(p => p.status === "staged").length,
    conflict: projects.filter(p => p.status === "conflict").length,
  };

  // Count projects by health
  const healthCounts = {
    all: projects.length,
    healthy: projects.filter(p => p.health >= 80).length,
    warning: projects.filter(p => p.health >= 60 && p.health < 80).length,
    critical: projects.filter(p => p.health < 60).length,
  };

  // Clear all filters
  const clearFilters = () => {
    setFilter("");
    setStatusFilter("all");
    setHealthFilter("all");
  };

  const hasActiveFilters = filter || statusFilter !== "all" || healthFilter !== "all";

  // Safe percentage calculation (handles division by zero)
  const safePercent = (value: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  // Listen for navigation events from shortcuts
  useEffect(() => {
    const handleNavigateTab = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail as TabView);
      }
    };

    const handleNavigateToTopology = (e: Event) => {
      const customEvent = e as CustomEvent<{ route?: string }>;
      setActiveTab("topology");
      // TODO: Highlight route in topology view
    };

    window.addEventListener("navigate-tab", handleNavigateTab);
    window.addEventListener("navigate-to-topology", handleNavigateToTopology);
    return () => {
      window.removeEventListener("navigate-tab", handleNavigateTab);
      window.removeEventListener("navigate-to-topology", handleNavigateToTopology);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Tab navigation with number keys
      if (e.key === "1") setActiveTab("dashboard");
      if (e.key === "2") setActiveTab("projects");
      if (e.key === "3") setActiveTab("analytics");
      if (e.key === "4") setActiveTab("network");
      if (e.key === "5") setActiveTab("config");
      if (e.key === "6") setActiveTab("settings");
      if (e.key === "7") setActiveTab("clitools");
      if (e.key === "8") setActiveTab("diagnose");
      if (e.key === "9") setActiveTab("kyc");
      if (e.key === "0") setActiveTab("benchmarks");
      if (e.key === "T" && e.shiftKey) setActiveTab("tests");

      // KYC shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === "k" && !e.shiftKey) {
        e.preventDefault();
        // Trigger KYC validation
        window.dispatchEvent(new CustomEvent("kyc:validate:requested"));
        showGlobalToast("KYC validation requested", "info");
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "K") {
        e.preventDefault();
        setActiveTab("kyc");
        showGlobalToast("Opening KYC failsafe", "info");
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "R") {
        e.preventDefault();
        setActiveTab("kyc");
        showGlobalToast("Opening KYC review queue", "info");
      }

      // CLI Tools shortcuts
      if (e.ctrlKey && e.shiftKey && e.key === "A") {
        e.preventDefault();
        setActiveTab("clitools");
      }
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setActiveTab("clitools");
      }
      if (e.ctrlKey && e.shiftKey && e.key === "!") {
        e.preventDefault();
        setActiveTab("clitools");
      }
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        e.preventDefault();
        setActiveTab("clitools");
      }

      // Quick actions
      if (e.key === "r" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleRescan();
      }
      if (e.key === "t" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleTheme();
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setActiveTab("projects");
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder="Search projects..."]') as HTMLInputElement;
          searchInput?.focus();
        }, 100);
      }
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }

      // Projects view navigation (only when on projects tab)
      if (activeTab === "projects") {
        const cols = 4; // Grid columns on large screens

        if (e.key === "ArrowDown" || e.key === "j") {
          e.preventDefault();
          setSelectedProjectIdx(i => Math.min(i + cols, filteredProjects.length - 1));
        }
        if (e.key === "ArrowUp" || e.key === "k") {
          e.preventDefault();
          setSelectedProjectIdx(i => Math.max(i - cols, 0));
        }
        if (e.key === "ArrowRight" || e.key === "l") {
          e.preventDefault();
          setSelectedProjectIdx(i => Math.min(i + 1, filteredProjects.length - 1));
        }
        if (e.key === "ArrowLeft" || e.key === "h") {
          e.preventDefault();
          setSelectedProjectIdx(i => Math.max(i - 1, 0));
        }
        if (e.key === "Enter") {
          e.preventDefault();
          const selected = filteredProjects[selectedProjectIdx];
          if (selected) {
            showGlobalToast(`Selected: ${selected.name} (${selected.branch})`, "info");
          }
        }
        if (e.key === "s" && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          // Cycle sort
          setSortBy(s => s === "activity" ? "name" : s === "name" ? "health" : "activity");
        }
        if (e.key === "f" && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          // Cycle status filter
          const filters: Array<typeof statusFilter> = ["all", "clean", "modified", "staged", "conflict"];
          setStatusFilter(f => filters[(filters.indexOf(f) + 1) % filters.length]);
        }
        if (e.key === "Escape") {
          clearFilters();
          setSelectedProjectIdx(0);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, filteredProjects.length, selectedProjectIdx]);

  // Load config integrity on mount
  useEffect(() => {
    try {
      const integrity = getConfigIntegrity();
      setConfigIntegrity({ combined: integrity.combined, valid: true });
    } catch {
      setConfigIntegrity({ combined: "ERROR", valid: false });
    }
  }, []);

  // Copy config status to clipboard
  const copyConfigStatus = async () => {
    try {
      const status = getConfigStatus();
      const tableData = [
        { Config: "UI Themes", Version: status.versions.themes, Hash: status.integrity.themes, Items: status.themeCount },
        { Config: "Shortcuts", Version: status.versions.shortcuts, Hash: status.integrity.shortcuts, Items: status.shortcutCount },
        { Config: "Syntax Colors", Version: status.versions.syntax, Hash: status.integrity.syntax, Items: status.syntaxColorCount },
      ];
      const text = `🌌 COSMIC CONFIG MULTIVERSE
${"═".repeat(50)}
Config          Version  Hash      Items
────────────────────────────────────────────────────
${tableData.map(r => `${r.Config.padEnd(15)} ${r.Version.padEnd(8)} ${r.Hash}  ${r.Items}`).join("\n")}
────────────────────────────────────────────────────
Combined Integrity: ${status.integrity.combined}
Generated: ${new Date().toISOString()}`;
      await navigator.clipboard.writeText(text);
      setConfigCopied(true);
      setTimeout(() => setConfigCopied(false), 2000);
      showGlobalToast("Config status copied to clipboard!", "success");
    } catch {
      showGlobalToast("Failed to copy config status", "error");
    }
  };

  // Rescan handler with feedback
  const handleRescan = async () => {
    setIsRescanning(true);
    showGlobalToast("Rescanning repositories...", "info");
    try {
      await fetch("/api/rescan", { method: "POST" });
      showGlobalToast("Rescan complete!", "success");
    } catch {
      showGlobalToast("Rescan failed", "error");
    } finally {
      setIsRescanning(false);
    }
  };

  // Open project in Finder/Explorer
  const handleOpenProject = async (project: Project) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/open`, { method: "POST" });
      const data = await res.json();
      if (data.error) {
        showGlobalToast(`Failed to open: ${data.error}`, "error");
      } else {
        showGlobalToast(`Opened ${project.name} in Finder`, "success");
      }
    } catch {
      showGlobalToast("Failed to open project", "error");
    }
  };

  // Execute git action on project
  const handleGitAction = async (project: Project, action: string) => {
    showGlobalToast(`Running git ${action}...`, "info");
    try {
      const res = await fetch(`/api/projects/${project.id}/git`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.error) {
        showGlobalToast(`Git ${action} failed: ${data.error}`, "error");
      } else {
        // Show output in a modal or toast
        const output = data.data.output || "(no output)";
        const lines = output.split("\n").slice(0, 5).join("\n");
        showGlobalToast(`${project.name} - git ${action}:\n${lines}`, "success");
        // Log full output for debugging (only in development)
        if (import.meta.env.DEV) {
          console.log(`[${project.name}] git ${action}:\n${output}`);
        }
      }
    } catch {
      showGlobalToast(`Git ${action} failed`, "error");
    }
  };

  // Rescan single project
  const handleRescanProject = async (project: Project) => {
    showGlobalToast(`Rescanning ${project.name}...`, "info");
    try {
      // Note: Currently uses global rescan endpoint
      // TODO: Implement project-specific rescan endpoint
      const res = await fetch("/api/rescan", { method: "POST" });
      if (!res.ok) {
        throw new Error(`Rescan failed: ${res.statusText}`);
      }
      showGlobalToast(`Rescanned ${project.name}`, "success");
    } catch (error) {
      showGlobalToast(`Rescan failed: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    }
  };

  // Load snapshots from R2
  const loadSnapshots = useCallback(async () => {
    setIsLoadingSnapshots(true);
    try {
      const res = await fetch("/api/snapshots");
      const data = await res.json();
      if (data.error) {
        // R2 not configured
        setStorageConfig({ configured: false });
        setSnapshots([]);
      } else if (data.data?.snapshots) {
        setSnapshots(mapApiSnapshots(data.data.snapshots));
        setStorageConfig({
          configured: true,
          bucket: data.data.bucket,
          endpoint: data.data.endpoint,
          snapshotCount: data.data.snapshots.length,
        });
      } else {
        setStorageConfig({ configured: false });
        setSnapshots([]);
      }
    } catch {
      setStorageConfig({ configured: false });
    } finally {
      setIsLoadingSnapshots(false);
    }
  }, []);

  // Create and store snapshot
  const handleCreateSnapshot = async () => {
    setIsCreatingSnapshot(true);
    showGlobalToast("Creating snapshot...", "info");
    try {
      const res = await fetch("/api/snapshot", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        showGlobalToast(`Snapshot failed: ${data.error}`, "error");
      } else {
        showGlobalToast(`Snapshot created: ${data.data.filename}`, "success");
        loadSnapshots();
      }
    } catch {
      showGlobalToast("Failed to create snapshot", "error");
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // Download snapshot archive
  const handleDownloadSnapshot = async (filename?: string) => {
    const url = filename ? `/api/snapshots/${filename}?download=true` : "/api/snapshot";
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `dashboard-snapshot-${Date.now()}.tar.gz`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showGlobalToast("Download started", "success");
  };

  // Preview snapshot JSON
  const handlePreviewSnapshot = async (filename: string) => {
    try {
      const res = await fetch(`/api/snapshots/${filename}`);
      const data = await res.json();
      // Log snapshot data for debugging (only in development)
      if (import.meta.env.DEV) {
        console.log("Snapshot preview:", data);
      }
      showGlobalToast(`Snapshot has ${data.data?.projectCount || 0} projects`, "info");
    } catch {
      showGlobalToast("Failed to preview snapshot", "error");
    }
  };

  // Load Bun runtime info
  const loadBunInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/runtime");
      const data = await res.json();
      if (data.data) {
        setBunVersion(data.data.version || "Unknown");
        // Features is an object like { simd: true, threads: true, ... }
        const features = data.data.features || {};
        const activeFeatures = Object.entries(features)
          .filter(([, v]) => v === true)
          .map(([k]) => k);
        setBunFeatures(activeFeatures);
      }
    } catch {
      setBunVersion("Unknown");
    }
  }, []);

  // Theme toggle - uses global function from index.html
  // This handles: DOM class, localStorage, and cookie all at once
  const toggleTheme = () => {
    if (typeof window !== "undefined" && window.toggleTheme) {
      window.toggleTheme();
    }
  };

  useEffect(() => {
    // Fetch initial data
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((response: ApiResponse<DashboardData>) => {
        if (response.data) {
          setProjects(response.data.projects);
          setStats(response.data.stats);
          if (response.data.system) {
            setSystemMetrics(response.data.system);
          }
        }
      })
      .catch(console.error);

    // WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/dashboard`);
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const data: DashboardData = JSON.parse(event.data);
      setProjects(data.projects);
      setStats(data.stats);
      if (data.system) {
        setSystemMetrics(data.system);
      }
    };

    return () => ws.close();
  }, []);

  // Load settings data when settings tab is active
  useEffect(() => {
    if (activeTab === "settings") {
      loadSnapshots();
      loadBunInfo();
    }
  }, [activeTab, loadSnapshots, loadBunInfo]);

  // Load analytics data when analytics tab is active
  useEffect(() => {
    if (activeTab === "analytics") {
      // Fetch server metrics
      fetch("/api/server/metrics")
        .then((res) => res.json())
        .then((response) => {
          if (response.data) {
            setServerInfo({
              serverId: response.data.serverId,
              bun: response.data.bun,
              network: response.data.network,
              config: response.data.config,
              connections: response.data.connections,
              throughput: response.data.throughput,
              system: response.data.system,
            });
          }
        })
        .catch(console.error);

      // Fetch endpoint analytics
      fetch("/api/analytics/matrix?limit=10")
        .then((res) => res.json())
        .then((response) => {
          if (response.data?.endpoints) {
            setEndpointAnalytics(response.data.endpoints);
          }
        })
        .catch(console.error);
    }
  }, [activeTab]);

  return (
    <div className="dashboard min-h-screen transition-colors duration-300 bg-theme text-theme">
      {/* Header */}
      <header className="sticky top-0 z-50 header-theme shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-theme-secondary btn-theme"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-theme">Enterprise Dashboard</h1>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gradient-to-r from-blue-500 to-purple-500 text-white">PRO</span>
                  <button
                    onClick={copyConfigStatus}
                    className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono rounded transition-all cursor-pointer hover:scale-105 ${
                      configIntegrity.valid
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                        : "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                    }`}
                    title="Click to copy config status"
                  >
                    {configCopied ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    )}
                    <span>{configCopied ? "Copied!" : `CFG ${configIntegrity.combined.slice(0, 8)}`}</span>
                  </button>
                  {shortcutResult && (
                    <span
                      className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono rounded ${
                        shortcutResult.conflicts === 0
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                      title={`${shortcutResult.bound}/${shortcutResult.total} shortcuts bound in ${shortcutResult.bindTimeMs}ms (${shortcutResult.platform})`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span>{shortcutResult.bound} keys</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-theme-muted">
                  <span>{projects.length} projects</span>
                  <span>•</span>
                  <span>{stats.successRate}% success</span>
                  <span>•</span>
                  <span className={stats.avgLatency < 50 ? "text-green-500" : stats.avgLatency < 200 ? "text-yellow-500" : "text-red-500"}>
                    {stats.avgLatency}ms
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
            {(["dashboard", "projects", "analytics", "network", "config", "settings", "clitools", "diagnose", "urlpattern", "pty", "resources", "topology", "kyc", "benchmarks", "tests"] as TabView[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab
                      ? "bg-blue-50 text-blue-600 bg-blue-900/30 text-blue-400"
                      : "text-gray-600 hover:bg-gray-100 text-theme-secondary hover:bg-theme-tertiary"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Connection Status */}
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full ${
                connected
                  ? "bg-green-500/10 border border-green-500/30"
                  : "bg-red-500/10 border border-red-500/30"
              }`}>
                <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 connection-live" : "bg-red-500"}`} />
                <span className={`text-xs font-medium ${connected ? "text-green-500" : "text-red-500"}`}>
                  {connected ? "Live" : "Offline"}
                </span>
              </div>

              {/* Alerts Badge */}
              <button
                className="relative p-2 rounded-lg transition-colors btn-theme"
                title={`${stats.alerts?.length || 0} alerts`}
                onClick={() => setActiveTab("analytics")}
              >
                <svg className="w-5 h-5 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {(stats.alerts?.length || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full bg-red-500 text-white">
                    {stats.alerts.length > 9 ? "9+" : stats.alerts.length}
                  </span>
                )}
              </button>

              {/* Rescan Button */}
              <button
                onClick={handleRescan}
                disabled={isRescanning}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors btn-theme disabled:opacity-50"
                title="Rescan projects (R)"
              >
                <svg className={`w-4 h-4 ${isRescanning ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-xs font-medium text-theme-secondary">{isRescanning ? "Scanning..." : "Refresh"}</span>
              </button>

              {/* Terminal Toggle */}
              <button
                onClick={() => setShowTerminal(!showTerminal)}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  showTerminal
                    ? "bg-green-500/10 border border-green-500/30 text-green-500"
                    : "btn-theme"
                }`}
                title="Toggle Terminal (Ctrl+`)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-medium">{showTerminal ? "Close" : "Terminal"}</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg transition-colors btn-theme"
                title="Toggle theme (T)"
              >
                <svg className="w-5 h-5 hidden dark:block text-theme-secondary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
                <svg className="w-5 h-5 block dark:hidden text-theme-secondary" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              </button>

              {/* User Menu */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold shadow-lg shadow-purple-500/25 cursor-pointer hover:scale-105 transition-transform">
                NR
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white bg-theme-secondary border-b border-gray-200 border-theme animate-slide-down">
          <nav className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            {(["dashboard", "projects", "analytics", "network", "config", "settings", "diagnose", "urlpattern", "pty", "resources", "topology", "kyc", "benchmarks"] as TabView[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === tab
                    ? "bg-blue-50 text-blue-600 bg-blue-900/30 text-blue-400"
                    : "text-gray-600 hover:bg-gray-100 text-theme-secondary hover:bg-theme-tertiary"
                }`}
              >
                {tab === "dashboard" && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                )}
                {tab === "projects" && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                )}
                {tab === "analytics" && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                )}
                {tab === "network" && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                )}
                {tab === "config" && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                {tab === "settings" && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                {tab === "benchmarks" && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                )}
                <span className="font-medium">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                {activeTab === tab && (
                  <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
            <div className="pt-3 mt-3 border-t border-gray-200 border-theme">
              <button
                onClick={() => {
                  handleRescan();
                  setMobileMenuOpen(false);
                }}
                disabled={isRescanning}
                className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg text-gray-600 hover:bg-gray-100 text-theme-secondary hover:bg-theme-tertiary disabled:opacity-50"
              >
                <svg className={`w-5 h-5 ${isRescanning ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="font-medium">{isRescanning ? "Rescanning..." : "Rescan Projects"}</span>
              </button>
              <div className="px-4 py-2 text-xs text-gray-500 text-theme-muted">
                Shortcuts: 1-9 tabs, 0 benchmarks, R rescan, T theme, / search
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard View */}
        {activeTab === "dashboard" && (
          <ErrorBoundary>
            <div key="dashboard" className="tab-content">
            {/* Stats Grid */}
            <div className="stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Active Projects"
                value={projects.length}
                icon="projects"
                subtitle="Tracked repositories"
              />
              <StatCard
                title="Total Requests"
                value={stats.totalRequests.toLocaleString()}
                trend="up"
                icon="requests"
                subtitle="API calls this session"
              />
              <StatCard
                title="Success Rate"
                value={`${stats.successRate}%`}
                trend={stats.successRate >= 95 ? "up" : "down"}
                icon="success"
                subtitle={stats.successRate >= 95 ? "Excellent" : "Needs attention"}
              />
              <StatCard
                title="Avg Latency"
                value={`${stats.avgLatency}ms`}
                trend={stats.avgLatency < 50 ? "up" : "down"}
                icon="latency"
                subtitle={stats.avgLatency < 50 ? "Fast response" : "Moderate"}
              />
            </div>

            {/* System Metrics Mini Cards */}
            {systemMetrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="stat-card p-4 flex items-center gap-4">
                  <div className="icon-wrapper icon-info">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-theme-muted">CPU Usage</div>
                    <div className={`text-xl font-bold ${systemMetrics.cpu.usage > 80 ? "text-red-500" : systemMetrics.cpu.usage > 50 ? "text-yellow-500" : "text-green-500"}`}>
                      {systemMetrics.cpu.usage}%
                    </div>
                    <div className="h-1.5 bg-theme-tertiary rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full transition-all duration-300 ${systemMetrics.cpu.usage > 80 ? "bg-red-500" : systemMetrics.cpu.usage > 50 ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${systemMetrics.cpu.usage}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="stat-card p-4 flex items-center gap-4">
                  <div className="icon-wrapper icon-success">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-theme-muted">Memory</div>
                    <div className={`text-xl font-bold ${systemMetrics.memory.usagePercent > 85 ? "text-red-500" : systemMetrics.memory.usagePercent > 70 ? "text-yellow-500" : "text-green-500"}`}>
                      {systemMetrics.memory.usagePercent}%
                    </div>
                    <div className="h-1.5 bg-theme-tertiary rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full transition-all duration-300 ${systemMetrics.memory.usagePercent > 85 ? "bg-red-500" : systemMetrics.memory.usagePercent > 70 ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${systemMetrics.memory.usagePercent}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="stat-card p-4 flex items-center gap-4">
                  <div className="icon-wrapper icon-brand">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-theme-muted">Heap</div>
                    <div className="text-xl font-bold text-purple-500">{formatBytes(systemMetrics.memory.heapUsed)}</div>
                    <div className="text-xs text-theme-muted">of {formatBytes(systemMetrics.memory.heapTotal)}</div>
                  </div>
                </div>
                <div className="stat-card p-4 flex items-center gap-4">
                  <div className="icon-wrapper icon-warning">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-theme-muted">System Uptime</div>
                    <div className="text-xl font-bold text-cyan-500">{formatUptime(systemMetrics.uptime)}</div>
                    <div className="text-xs text-theme-muted">Load: {systemMetrics.cpu.loadAvg[0]}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Charts & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RealTimeChart data={stats.timeline} />
              </div>
              <div>
                <AlertsPanel alerts={stats.alerts} />
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="mt-6">
              <LiveActivityFeed maxItems={15} showConnectionStatus={true} />
            </div>
          </div>
          </ErrorBoundary>
        )}

        {/* Projects View */}
        {activeTab === "projects" && (
          <ErrorBoundary>
            <section key="projects" className="tab-content">
            {/* Header with Search and Sort */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">All Projects</h2>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-theme-tertiary text-theme-muted">
                  {filteredProjects.length} of {projects.length}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {/* Search */}
                <div className="relative flex-1 lg:flex-none">
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full lg:w-72 px-4 py-2 pl-10 pr-10 rounded-lg border border-theme bg-theme-secondary text-theme focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <svg className="absolute left-3 top-2.5 w-5 h-5 text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {filter && (
                    <button onClick={() => setFilter("")} className="absolute right-3 top-2.5 text-theme-muted hover:text-theme">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "name" | "health" | "activity")}
                  className="px-3 py-2 rounded-lg border border-theme bg-theme-secondary text-theme"
                >
                  <option value="activity">Recent Activity</option>
                  <option value="name">Name A-Z</option>
                  <option value="health">Health</option>
                </select>
              </div>
            </div>

            {/* Summary Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-theme-secondary border border-theme">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <span className="text-green-500 text-lg">●</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-theme">{healthCounts.healthy}</div>
                  <div className="text-xs text-theme-muted">Healthy ({safePercent(healthCounts.healthy, projects.length)}%)</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-theme-secondary border border-theme">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <span className="text-yellow-500 text-lg">◐</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-theme">{healthCounts.warning}</div>
                  <div className="text-xs text-theme-muted">Warning ({safePercent(healthCounts.warning, projects.length)}%)</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-theme-secondary border border-theme">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <span className="text-red-500 text-lg">○</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-theme">{healthCounts.critical}</div>
                  <div className="text-xs text-theme-muted">Critical ({safePercent(healthCounts.critical, projects.length)}%)</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-theme-secondary border border-theme">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-theme-muted">Overall Health</span>
                    <span className="text-xs font-mono text-theme">{safePercent(projects.reduce((a, p) => a + p.health, 0), projects.length)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-theme-tertiary overflow-hidden flex">
                    <div className="bg-green-500 transition-all" style={{ width: `${safePercent(healthCounts.healthy, projects.length)}%` }} />
                    <div className="bg-yellow-500 transition-all" style={{ width: `${safePercent(healthCounts.warning, projects.length)}%` }} />
                    <div className="bg-red-500 transition-all" style={{ width: `${safePercent(healthCounts.critical, projects.length)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Chips - Compact */}
            <div className="flex flex-wrap items-center gap-3 mb-6 p-3 rounded-xl bg-theme-secondary border border-theme">
              {/* Status Filter with Icons */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider mr-1">Status</span>
                {([
                  { key: "all", icon: "◈", label: "All" },
                  { key: "clean", icon: "●", label: "Clean" },
                  { key: "modified", icon: "◐", label: "Mod" },
                  { key: "staged", icon: "◉", label: "Staged" },
                  { key: "conflict", icon: "✕", label: "Conflict" },
                ] as const).map(({ key, icon, label }) => (
                  <button
                    key={key}
                    onClick={() => { setStatusFilter(key); setSelectedProjectIdx(0); }}
                    className={`px-2 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 ${
                      statusFilter === key
                        ? key === "clean" ? "bg-green-500/20 text-green-500"
                        : key === "modified" ? "bg-yellow-500/20 text-yellow-500"
                        : key === "staged" ? "bg-blue-500/20 text-blue-500"
                        : key === "conflict" ? "bg-red-500/20 text-red-500"
                        : "bg-theme-tertiary text-theme"
                        : "text-theme-muted hover:text-theme hover:bg-theme-tertiary"
                    }`}
                    title={`${label} (${statusCounts[key]})`}
                  >
                    <span>{icon}</span>
                    <span className="hidden sm:inline">{statusCounts[key]}</span>
                  </button>
                ))}
              </div>

              <div className="w-px h-5 bg-theme-tertiary" />

              {/* Health Filter with Icons */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider mr-1">Health</span>
                {([
                  { key: "all", icon: "◈", label: "All" },
                  { key: "healthy", icon: "█", label: "80%+" },
                  { key: "warning", icon: "▓", label: "60%" },
                  { key: "critical", icon: "░", label: "<60%" },
                ] as const).map(({ key, icon, label }) => (
                  <button
                    key={key}
                    onClick={() => { setHealthFilter(key); setSelectedProjectIdx(0); }}
                    className={`px-2 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 ${
                      healthFilter === key
                        ? key === "healthy" ? "bg-green-500/20 text-green-500"
                        : key === "warning" ? "bg-yellow-500/20 text-yellow-500"
                        : key === "critical" ? "bg-red-500/20 text-red-500"
                        : "bg-theme-tertiary text-theme"
                        : "text-theme-muted hover:text-theme hover:bg-theme-tertiary"
                    }`}
                    title={`${label} (${healthCounts[key]})`}
                  >
                    <span className="font-mono">{icon}</span>
                    <span className="hidden sm:inline">{healthCounts[key]}</span>
                  </button>
                ))}
              </div>

              {/* Keyboard Hints */}
              <div className="hidden lg:flex items-center gap-2 ml-auto text-[10px] text-theme-muted">
                <kbd className="px-1.5 py-0.5 rounded bg-theme-tertiary font-mono">↑↓←→</kbd>
                <span>nav</span>
                <kbd className="px-1.5 py-0.5 rounded bg-theme-tertiary font-mono">S</kbd>
                <span>sort</span>
                <kbd className="px-1.5 py-0.5 rounded bg-theme-tertiary font-mono">F</kbd>
                <span>filter</span>
                <kbd className="px-1.5 py-0.5 rounded bg-theme-tertiary font-mono">Esc</kbd>
                <span>clear</span>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={() => { clearFilters(); setSelectedProjectIdx(0); }}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <span>✕</span>
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>

            {/* Projects Grid */}
            <div className="projects-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProjects.map((project, idx) => (
                <div
                  key={project.id}
                  onClick={() => setSelectedProjectIdx(idx)}
                  className={`cursor-pointer transition-all ${idx === selectedProjectIdx ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent" : ""}`}
                >
                  <ProjectCard
                    project={project}
                    isSelected={idx === selectedProjectIdx}
                    onOpenProject={handleOpenProject}
                    onGitAction={handleGitAction}
                    onRescan={handleRescanProject}
                  />
                </div>
              ))}
            </div>

            {/* Empty State */}
            {filteredProjects.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-theme-tertiary flex items-center justify-center">
                  <svg className="w-8 h-8 text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-theme mb-1">No projects found</h3>
                <p className="text-theme-muted mb-4">
                  {hasActiveFilters ? "Try adjusting your filters" : `No projects match "${filter}"`}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </section>
          </ErrorBoundary>
        )}

        {/* Analytics View */}
        {activeTab === "analytics" && (
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-gray-500 dark:text-gray-400">Loading Analytics...</div></div>}>
              <AnalyticsTab
              systemMetrics={systemMetrics}
              projects={projects}
              stats={stats}
            />
          </Suspense>
          </ErrorBoundary>
        )}

        {/* Network View */}
        {activeTab === "network" && (
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-gray-500 dark:text-gray-400">Loading Network...</div></div>}>
              <NetworkTab />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* Config View */}
        {activeTab === "config" && (
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-gray-500 dark:text-gray-400">Loading Config...</div></div>}>
              <ConfigTab />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* Settings View */}
        {activeTab === "clitools" && (
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-gray-500 dark:text-gray-400">Loading CLI Tools...</div></div>}>
              <CLIToolsTab />
            </Suspense>
          </ErrorBoundary>
        )}

        {activeTab === "settings" && (
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-gray-500 dark:text-gray-400">Loading Settings...</div></div>}>
              <SettingsTab
                connected={connected}
                onRescan={handleRescan}
                isRescanning={isRescanning}
                onToggleTheme={toggleTheme}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* URLPattern Observability View */}
        {activeTab === "urlpattern" && (
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-gray-500 dark:text-gray-400">Loading URL Pattern Analysis...</div></div>}>
              <URLPatternTab />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* PTY Terminal Sessions View */}
        {activeTab === "pty" && (
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-gray-500 dark:text-gray-400">Loading Terminal...</div></div>}>
              <PTYTab />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* Resource Monitor View */}
        {activeTab === "resources" && (
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-gray-500 dark:text-gray-400">Loading Resource Monitor...</div></div>}>
              <ResourceMonitorTab />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* Route Topology View */}
        {activeTab === "topology" && (
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-gray-500 dark:text-gray-400">Loading Topology...</div></div>}>
              <TopologyTab />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* KYC Review View */}
        {activeTab === "kyc" && (
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-gray-500 dark:text-gray-400">Loading KYC Review...</div></div>}>
              <KYCReviewTab />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* Diagnose Health View */}
        {activeTab === "diagnose" && (
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-gray-500 dark:text-gray-400">Loading Diagnostics...</div></div>}>
              <DiagnoseHealthTab />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* Benchmarks View */}
        {activeTab === "benchmarks" && (
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-gray-500 dark:text-gray-400">Loading Benchmarks...</div></div>}>
              <BenchmarkTab />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* Test Runner View */}
        {activeTab === "tests" && (
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-gray-500 dark:text-gray-400">Loading Test Runner...</div></div>}>
              <TestRunnerTab />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* Footer */}
        <footer className="mt-12 border-t border-theme">
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Stats Row */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 connection-live" />
                <span className="text-theme-secondary">Uptime: <span className="font-mono text-theme">{Math.floor(stats.uptime / 3600)}h {Math.floor((stats.uptime % 3600) / 60)}m</span></span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="text-theme-secondary"><span className="font-mono text-theme">{projects.length}</span> projects</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-theme-secondary"><span className="font-mono text-theme">{stats.successRate}%</span> success</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-theme-secondary"><span className="font-mono text-theme">{stats.avgLatency}ms</span> latency</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-theme-secondary"><span className="font-mono text-theme">{stats.alerts?.length || 0}</span> alerts</span>
              </div>
            </div>

            {/* Bun Documentation Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 rounded-xl bg-theme-secondary/50 border border-theme">
              {/* Runtime & APIs */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Runtime & APIs
                </h4>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <a href="https://bun.sh/docs/runtime/bun-apis" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-orange-400 transition-colors">Bun APIs</a>
                  <a href="https://bun.sh/docs/runtime/globals" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-orange-400 transition-colors">Globals</a>
                  <a href="https://bun.sh/docs/runtime/utils" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-orange-400 transition-colors">Utils</a>
                  <a href="https://bun.sh/docs/api/http" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-orange-400 transition-colors">HTTP</a>
                  <a href="https://bun.sh/docs/api/websockets" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-orange-400 transition-colors">WebSockets</a>
                  <a href="https://bun.sh/docs/api/sqlite" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-orange-400 transition-colors">SQLite</a>
                  <a href="https://bun.sh/docs/api/file-io" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-orange-400 transition-colors">File I/O</a>
                </div>
              </div>

              {/* CLI & Tools */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  CLI & Tools
                </h4>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <a href="https://bun.sh/docs/cli/install" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-blue-400 transition-colors">Package Manager</a>
                  <a href="https://bun.sh/docs/cli/test" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-blue-400 transition-colors">Test Runner</a>
                  <a href="https://bun.sh/docs/bundler" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-blue-400 transition-colors">Bundler</a>
                  <a href="https://bun.sh/docs/cli/run" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-blue-400 transition-colors">bun run</a>
                  <a href="https://bun.sh/docs/runtime/shell" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-blue-400 transition-colors">Shell</a>
                </div>
              </div>

              {/* Performance */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Performance
                </h4>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <a href="https://bun.sh/docs/project/benchmarking" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-purple-400 transition-colors">Benchmarking</a>
                  <a href="https://bun.sh/docs/project/benchmarking#cpu-profiling" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-purple-400 transition-colors">CPU Profiling</a>
                  <a href="https://bun.sh/docs/runtime/hot" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-purple-400 transition-colors">Hot Reloading</a>
                  <a href="https://bun.sh/docs/runtime/smol" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-purple-400 transition-colors">Memory (smol)</a>
                </div>
              </div>

              {/* Reference & Community */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-green-400 flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Reference
                </h4>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <a href="https://bun.sh/docs" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-green-400 transition-colors">Documentation</a>
                  <a href="https://bun.sh/guides" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-green-400 transition-colors">Guides</a>
                  <a href="https://bun.sh/blog" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-green-400 transition-colors">Blog</a>
                  <a href="https://github.com/brendadeeznuts1111/enterprise-dashboard" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-green-400 transition-colors">GitHub</a>
                  <a href="https://discord.gg/bun" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-green-400 transition-colors">Discord</a>
                </div>
              </div>
            </div>

            {/* Links & Brand Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-theme">
              {/* Navigation Links */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-theme-muted">
                <button onClick={() => setActiveTab("dashboard")} className="hover:text-theme transition-colors">Dashboard</button>
                <button onClick={() => setActiveTab("projects")} className="hover:text-theme transition-colors">Projects</button>
                <button onClick={() => setActiveTab("analytics")} className="hover:text-theme transition-colors">Analytics</button>
                <button onClick={() => setActiveTab("network")} className="hover:text-theme transition-colors">Network</button>
                <button onClick={() => setActiveTab("settings")} className="hover:text-theme transition-colors">Settings</button>
                <span className="hidden sm:inline text-theme-muted/30">|</span>
                <button
                  onClick={() => setShowShortcuts(true)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-theme-tertiary transition-colors group"
                >
                  <kbd className="px-1.5 py-0.5 rounded bg-theme-tertiary border border-theme font-mono text-[10px] group-hover:border-blue-500/50 transition-colors">?</kbd>
                  <span>Shortcuts</span>
                </button>
              </div>

              {/* Brand & Version */}
              <div className="flex items-center gap-3 text-xs">
                <span className="text-theme-muted">Powered by</span>
                <a
                  href="https://bun.sh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all group"
                >
                  <svg className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" viewBox="0 0 80 70" fill="currentColor">
                    <path d="M71.1 33.5c-2.5-2.7-6.3-4.3-11.4-4.9.5-1.8.8-3.7.8-5.7 0-11-8.9-20-20-20-6.3 0-11.9 2.9-15.6 7.5C22.6 8.9 19.8 8 16.7 8 8.4 8 1.7 14.7 1.7 23c0 3.1.9 5.9 2.5 8.3C1.5 34 0 37.8 0 42c0 11 8.9 20 20 20h40c11 0 20-9 20-20 0-3.4-.9-6.6-2.4-9.4-.3-.2-.5.5-.5.9z"/>
                  </svg>
                  <span className="font-semibold text-orange-400">Bun</span>
                  <span className="font-mono text-theme-muted">v1.3.6</span>
                </a>
                <span className="text-theme-muted/30">|</span>
                <span className="flex items-center gap-1.5 text-theme-muted">
                  <span>Dashboard</span>
                  <span className="font-mono px-1.5 py-0.5 rounded bg-theme-tertiary text-[10px]">v2.0.0</span>
                </span>
              </div>
            </div>

            {/* Copyright */}
            <div className="mt-4 pt-4 border-t border-theme/50 text-center text-[10px] text-theme-muted/60">
              <p>Enterprise Dashboard - Built with Bun, React, and Tailwind CSS</p>
            </div>
          </div>
        </footer>
      </div>

      {/* Floating Terminal Panel */}
      {showTerminal && (
        <div className="fixed bottom-0 left-0 right-0 z-40 shadow-2xl animate-slide-up">
          <TerminalPanel
            className="max-w-7xl mx-auto"
            onClose={() => setShowTerminal(false)}
          />
        </div>
      )}

      {/* Global Toast Container (useToast / showGlobalToast) */}
      <ToastContainer />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        platform={navigator.platform?.toLowerCase().includes("mac") ? "mac" : "windows"}
      />

      {/* Dev-only theme switcher */}
      {typeof process !== "undefined" && process.env?.NODE_ENV !== "production" && (
        <div
          className="fixed bottom-4 right-4 z-40 flex flex-wrap gap-1 p-2 rounded-lg bg-theme-secondary border border-theme shadow-lg"
          title="Dev theme switcher"
        >
          {getThemeNames().map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                document.documentElement.setAttribute("data-theme", name);
                localStorage.setItem("theme", name);
                document.documentElement.classList.toggle("dark", ["dark", "midnight", "high-contrast"].includes(name));
              }}
              className="px-2 py-1 text-xs font-medium rounded btn-theme hover:opacity-90"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
