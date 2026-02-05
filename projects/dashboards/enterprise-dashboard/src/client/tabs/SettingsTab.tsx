import { useState, useEffect, useCallback } from "react";
import { formatBytes } from "../utils/formatters";
import { ShortcutRebindUI } from "../components/ShortcutRebindUI";
import { showGlobalToast } from "../hooks/useToast";
import { mapApiSnapshots, type Snapshot, type StorageConfig } from "../types";

interface SettingsTabProps {
  connected: boolean;
  onRescan: () => Promise<void>;
  isRescanning: boolean;
  onToggleTheme: () => void;
}

interface SessionInfo {
  id: string;
  createdAt: string;
  lastActivity: string;
  userAgent: string;
  ip: string;
}

// Expandable code block component
function CodeExample({
  title,
  lang,
  code,
  description,
}: {
  title: string;
  lang: string;
  code: string;
  description?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-theme rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-theme-tertiary/50 hover:bg-theme-tertiary transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
            {lang}
          </span>
          <span className="text-sm font-medium">{title}</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="p-3 bg-gray-900 dark:bg-gray-950">
          {description && (
            <p className="text-xs text-gray-400 mb-2">{description}</p>
          )}
          <pre className="text-xs font-mono text-green-400 overflow-x-auto whitespace-pre-wrap">
            {code.trim()}
          </pre>
        </div>
      )}
    </div>
  );
}

// Bun API reference data
const BUN_API_EXAMPLES = {
  cookies: [
    {
      title: "Parse Cookies",
      lang: "TypeScript",
      description: "Parse cookie header string into object",
      code: `import { Cookie } from "bun";

// Parse cookie header
const cookies = Cookie.parse("session=abc123; theme=dark");
// { session: "abc123", theme: "dark" }

// Get specific cookie
const session = cookies.session;`,
    },
    {
      title: "Serialize Cookies",
      lang: "TypeScript",
      description: "Create Set-Cookie header with options",
      code: `import { Cookie } from "bun";

// Create secure cookie
const cookie = Cookie.serialize("session", "abc123", {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  maxAge: 60 * 60 * 24 * 7, // 1 week
  path: "/",
});
// "session=abc123; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/"`,
    },
  ],
  secrets: [
    {
      title: "Store Secret",
      lang: "TypeScript",
      description: "Store secret in OS keychain",
      code: `// Store in OS keychain (macOS Keychain, Windows Credential Manager)
await Bun.secrets.set({
  service: "enterprise-dashboard",
  name: "api-key",
  value: "sk_live_xxxxx",
});`,
    },
    {
      title: "Retrieve Secret",
      lang: "TypeScript",
      description: "Get secret from OS keychain",
      code: `// Retrieve from keychain
const apiKey = await Bun.secrets.get({
  service: "enterprise-dashboard",
  name: "api-key",
});

// Delete secret
await Bun.secrets.delete({
  service: "enterprise-dashboard",
  name: "api-key",
});`,
    },
  ],
  semver: [
    {
      title: "Version Comparison",
      lang: "TypeScript",
      description: "Compare semantic versions",
      code: `// Check if version satisfies range
Bun.semver.satisfies("1.2.3", "^1.0.0"); // true
Bun.semver.satisfies("2.0.0", "^1.0.0"); // false

// Compare versions
Bun.semver.order("1.0.0", "2.0.0"); // -1 (less than)
Bun.semver.order("2.0.0", "1.0.0"); // 1 (greater than)
Bun.semver.order("1.0.0", "1.0.0"); // 0 (equal)`,
    },
  ],
  password: [
    {
      title: "Hash & Verify Password",
      lang: "TypeScript",
      description: "Argon2id password hashing (default)",
      code: `// Hash password (argon2id by default)
const hash = await Bun.password.hash("mypassword");

// Verify password
const valid = await Bun.password.verify("mypassword", hash);

// With custom options
await Bun.password.hash("pwd", {
  algorithm: "argon2id", // or "bcrypt"
  memoryCost: 65536,
  timeCost: 3,
});`,
    },
  ],
  dns: [
    {
      title: "DNS Lookups",
      lang: "TypeScript",
      description: "Resolve hostnames and DNS records",
      code: `// Lookup hostname
const records = await Bun.dns.lookup("example.com");
// [{ address: "93.184.216.34", family: 4 }]

// Specific record types
await Bun.dns.resolve("example.com", "A");
await Bun.dns.resolve("example.com", "AAAA");
await Bun.dns.resolve("example.com", "MX");
await Bun.dns.resolve("example.com", "TXT");`,
    },
  ],
  serve: [
    {
      title: "HTTP Server",
      lang: "TypeScript",
      description: "Start server with Bun.serve()",
      code: `const server = Bun.serve({
  port: 8080,           // $BUN_PORT, $PORT, $NODE_PORT, or 3000
  hostname: "0.0.0.0",  // All interfaces
  fetch(req) {
    return Response.json({ ok: true });
  },
});

console.log(server.port);  // Actual bound port
console.log(server.url);   // URL object

// Hot-swap handler without restart
server.reload({
  fetch(req) {
    return new Response("New handler!");
  },
});`,
    },
  ],
};

// Configuration TOML files
const CONFIG_FILES = [
  {
    name: "network-matrix",
    path: "config/network-matrix.toml",
    description: "URLPattern matrix configuration",
  },
  {
    name: "fetch-preconnect",
    path: "config/fetch-preconnect.toml",
    description: "Fetch preconnect & pooling",
  },
  {
    name: "syntax-colors",
    path: "src/client/utils/syntax-colors.toml",
    description: "Syntax highlighting colors",
  },
];

export function SettingsTab({
  connected,
  onRescan,
  isRescanning,
  onToggleTheme,
}: SettingsTabProps) {
  // Snapshot state
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [storageConfig, setStorageConfig] = useState<StorageConfig>({ configured: false });
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  // Bun runtime info state
  const [bunVersion, setBunVersion] = useState("Unknown");
  const [bunFeatures, setBunFeatures] = useState<string[]>([]);

  // Session state
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

  // Config state
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [configContent, setConfigContent] = useState<string>("");
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // API examples section
  const [selectedApiCategory, setSelectedApiCategory] = useState<keyof typeof BUN_API_EXAMPLES>("cookies");

  // Keyboard shortcuts customization
  const [showShortcutCustomization, setShowShortcutCustomization] = useState(false);

  // Load snapshots from R2
  const loadSnapshots = useCallback(async () => {
    setIsLoadingSnapshots(true);
    try {
      const res = await fetch("/api/snapshots");
      const data = await res.json();
      if (data.error) {
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
      console.log("Snapshot preview:", data);
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

  // Load session info
  const loadSessionInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/session");
      const data = await res.json();
      if (data.data) {
        setSessionInfo(data.data);
      }
    } catch {
      // Session info not available
    }
  }, []);

  // Load config file content
  const loadConfigContent = async (path: string) => {
    setIsLoadingConfig(true);
    setSelectedConfig(path);
    try {
      const res = await fetch(`/api/configs?file=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.data?.content) {
        setConfigContent(data.data.content);
      } else {
        setConfigContent("# Unable to load config file");
      }
    } catch {
      setConfigContent("# Error loading config");
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadSnapshots();
    loadBunInfo();
    loadSessionInfo();
  }, [loadSnapshots, loadBunInfo, loadSessionInfo]);

  return (
    <section key="settings" className="tab-content">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Settings</h2>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-mono rounded bg-orange-500/20 text-orange-500">
            Bun {bunVersion}
          </span>
          <span
            className={`px-2 py-1 text-xs rounded ${
              connected ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
            }`}
          >
            {connected ? "Live" : "Offline"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Appearance Card */}
          <div className="bg-white bg-theme-secondary rounded-xl p-6 shadow-sm border border-gray-200 border-theme">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Appearance</h3>
                <p className="text-xs text-theme-muted">Customize the look and feel</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-theme-tertiary/50">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span className="text-sm">Dark Mode</span>
                </div>
                <button
                  onClick={onToggleTheme}
                  className="relative w-12 h-6 rounded-full bg-gray-300 dark:bg-blue-600 transition-colors"
                >
                  <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white dark:translate-x-6 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Server & Connection Card */}
          <div className="bg-white bg-theme-secondary rounded-xl p-6 shadow-sm border border-gray-200 border-theme">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Server</h3>
                <p className="text-xs text-theme-muted">Connection and scanning</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-theme-tertiary/50">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 connection-live" : "bg-red-500"}`} />
                  <span className="text-sm">WebSocket</span>
                </div>
                <span className={`text-sm font-medium ${connected ? "text-green-500" : "text-red-500"}`}>
                  {connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <button
                onClick={onRescan}
                disabled={isRescanning}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${isRescanning ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isRescanning ? "Scanning..." : "Rescan Projects"}
              </button>
            </div>
          </div>

          {/* Session Card - Enhanced */}
          <div className="bg-white bg-theme-secondary rounded-xl p-6 shadow-sm border border-gray-200 border-theme">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Session</h3>
                <p className="text-xs text-theme-muted">Manage your session & cookies</p>
              </div>
            </div>

            {sessionInfo && (
              <div className="space-y-2 mb-4 text-xs">
                <div className="flex justify-between p-2 rounded bg-theme-tertiary/50">
                  <span className="text-theme-muted">Session ID</span>
                  <code className="font-mono text-theme-secondary">{sessionInfo.id?.slice(0, 12) ?? "N/A"}...</code>
                </div>
                <div className="flex justify-between p-2 rounded bg-theme-tertiary/50">
                  <span className="text-theme-muted">Created</span>
                  <span className="text-theme-secondary">{sessionInfo.createdAt ? new Date(sessionInfo.createdAt).toLocaleString() : "N/A"}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-theme-tertiary/50">
                  <span className="text-theme-muted">Last Activity</span>
                  <span className="text-theme-secondary">{sessionInfo.lastActivity ? new Date(sessionInfo.lastActivity).toLocaleString() : "N/A"}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={() => {
                  fetch("/api/logout", { method: "POST" }).then(() => window.location.reload());
                }}
                className="w-full p-3 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-500 font-medium transition-colors border border-red-500/30"
              >
                Clear Session & Logout
              </button>
            </div>
          </div>

          {/* Snapshots Card */}
          <div className="bg-white bg-theme-secondary rounded-xl p-6 shadow-sm border border-gray-200 border-theme">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Snapshots</h3>
                  <p className="text-xs text-theme-muted">Backup & restore state</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded ${storageConfig.configured ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"}`}>
                {storageConfig.configured ? "R2 Connected" : "Local Only"}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={handleCreateSnapshot}
                  disabled={isCreatingSnapshot}
                  className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 ${isCreatingSnapshot ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {isCreatingSnapshot ? "Creating..." : "Create Snapshot"}
                </button>
                <button
                  onClick={() => handleDownloadSnapshot()}
                  className="p-3 rounded-lg bg-theme-tertiary hover:bg-theme-tertiary/80 transition-colors"
                  title="Download current state"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>

              {isLoadingSnapshots ? (
                <div className="p-4 text-center text-theme-muted text-sm">Loading snapshots...</div>
              ) : snapshots.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {snapshots.slice(0, 5).map((snap) => (
                    <div key={snap.filename} className="flex items-center justify-between p-2 rounded-lg bg-theme-tertiary/50 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <svg className="w-4 h-4 text-theme-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        <span className="truncate font-mono text-xs">{snap.filename}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-theme-muted">{formatBytes(snap.size)}</span>
                        <button onClick={() => handlePreviewSnapshot(snap.filename)} className="p-1 hover:bg-white/10 rounded" title="Preview">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDownloadSnapshot(snap.filename)} className="p-1 hover:bg-white/10 rounded" title="Download">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : storageConfig.configured ? (
                <div className="p-4 text-center text-theme-muted text-sm">No snapshots yet</div>
              ) : (
                <div className="p-4 text-center text-yellow-500 text-sm">Configure R2 storage for cloud snapshots</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Bun API Examples */}
          <div className="bg-white bg-theme-secondary rounded-xl p-6 shadow-sm border border-gray-200 border-theme">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 80 70" fill="currentColor">
                  <path d="M71.1 33.5c-2.5-2.7-6.3-4.3-11.4-4.9.5-1.8.8-3.7.8-5.7 0-11-8.9-20-20-20-6.3 0-11.9 2.9-15.6 7.5C22.6 8.9 19.8 8 16.7 8 8.4 8 1.7 14.7 1.7 23c0 3.1.9 5.9 2.5 8.3C1.5 34 0 37.8 0 42c0 11 8.9 20 20 20h40c11 0 20-9 20-20 0-3.4-.9-6.6-2.4-9.4-.3-.2-.5.5-.5.9z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Bun API Examples</h3>
                <p className="text-xs text-theme-muted">Click to expand code snippets</p>
              </div>
            </div>

            {/* API Category Tabs */}
            <div className="flex flex-wrap gap-1 mb-4">
              {(Object.keys(BUN_API_EXAMPLES) as Array<keyof typeof BUN_API_EXAMPLES>).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedApiCategory(category)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    selectedApiCategory === category
                      ? "bg-orange-500 text-white"
                      : "bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary/80"
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>

            {/* Code Examples */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {BUN_API_EXAMPLES[selectedApiCategory].map((example, idx) => (
                <CodeExample key={idx} {...example} />
              ))}
            </div>
          </div>

          {/* Configuration TOML */}
          <div className="bg-white bg-theme-secondary rounded-xl p-6 shadow-sm border border-gray-200 border-theme">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Configuration</h3>
                <p className="text-xs text-theme-muted">TOML config files</p>
              </div>
              <span className="ml-auto px-2 py-0.5 text-xs font-medium rounded bg-violet-500/20 text-violet-400">
                Bun Native
              </span>
            </div>

            {/* Config File Tabs */}
            <div className="flex flex-wrap gap-1 mb-4">
              {CONFIG_FILES.map((config) => (
                <button
                  key={config.path}
                  onClick={() => loadConfigContent(config.path)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    selectedConfig === config.path
                      ? "bg-violet-500 text-white"
                      : "bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary/80"
                  }`}
                >
                  {config.name}
                </button>
              ))}
            </div>

            {/* Config Content */}
            {selectedConfig ? (
              <div className="rounded-lg overflow-hidden border border-theme">
                <div className="flex items-center justify-between px-3 py-2 bg-theme-tertiary/50 border-b border-theme">
                  <code className="text-xs text-theme-muted">{selectedConfig}</code>
                  <a
                    href={`https://github.com/brendadeeznuts1111/enterprise-dashboard/blob/main/${selectedConfig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline"
                  >
                    View on GitHub
                  </a>
                </div>
                <div className="bg-gray-900 dark:bg-gray-950 p-3 max-h-64 overflow-auto">
                  {isLoadingConfig ? (
                    <div className="text-center text-gray-500 py-4">Loading...</div>
                  ) : (
                    <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">{configContent}</pre>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-theme-muted text-sm py-8">
                Select a config file to view
              </div>
            )}
          </div>

          {/* API Endpoints Quick Reference */}
          <div className="bg-white bg-theme-secondary rounded-xl p-6 shadow-sm border border-gray-200 border-theme">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">API Endpoints</h3>
                <p className="text-xs text-theme-muted">Quick reference</p>
              </div>
            </div>
            <div className="space-y-2 text-xs font-mono max-h-64 overflow-y-auto">
              {[
                { method: "GET", path: "/api/dashboard", desc: "Full state" },
                { method: "GET", path: "/api/projects", desc: "All projects" },
                { method: "GET", path: "/api/system", desc: "System info" },
                { method: "GET", path: "/api/network/stats", desc: "DNS & pool" },
                { method: "POST", path: "/api/network/prefetch", desc: "Warm DNS" },
                { method: "POST", path: "/api/rescan", desc: "Rescan repos" },
                { method: "GET", path: "/api/snapshot", desc: "Download tar.gz" },
                { method: "GET", path: "/api/anomalies/detect", desc: "Anomaly scan" },
                { method: "GET", path: "/api/metrics/enterprise", desc: "Metrics" },
                { method: "GET", path: "/api/analytics/matrix", desc: "URL matrix" },
                { method: "GET", path: "/api/db/stats", desc: "DB stats" },
                { method: "GET", path: "/api/health-check", desc: "Health" },
                { method: "WS", path: "/dashboard", desc: "Live updates" },
              ].map(({ method, path, desc }) => (
                <div key={path} className="flex items-center gap-2 p-2 rounded-lg bg-theme-tertiary/50">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    method === "GET" ? "bg-green-500/20 text-green-500" :
                    method === "POST" ? "bg-blue-500/20 text-blue-500" :
                    "bg-purple-500/20 text-purple-500"
                  }`}>
                    {method}
                  </span>
                  <code className="text-theme-secondary flex-1">{path}</code>
                  <span className="text-theme-muted">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="bg-white bg-theme-secondary rounded-xl p-6 shadow-sm border border-gray-200 border-theme">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Keyboard Shortcuts</h3>
                  <p className="text-xs text-theme-muted">Navigate like a pro</p>
                </div>
              </div>
              <button
                onClick={() => setShowShortcutCustomization(true)}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Customize
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { key: "1", action: "Dashboard" },
                { key: "2", action: "Projects" },
                { key: "3", action: "Analytics" },
                { key: "4", action: "Network" },
                { key: "5", action: "Settings" },
                { key: "R", action: "Rescan" },
                { key: "T", action: "Theme" },
                { key: "/", action: "Search" },
                { key: "?", action: "Help" },
                { key: "Esc", action: "Clear" },
              ].map(({ key, action }) => (
                <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-theme-tertiary/50">
                  <span className="text-theme-secondary">{action}</span>
                  <kbd className="px-2 py-0.5 rounded bg-theme-tertiary text-theme-secondary font-mono text-xs">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Customization Modal */}
      {showShortcutCustomization && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowShortcutCustomization(false)}>
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Customize Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowShortcutCustomization(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto">
              <ShortcutRebindUI />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
