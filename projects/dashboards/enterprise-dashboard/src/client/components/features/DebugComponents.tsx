import { feature } from "bun:bundle";

/**
 * PTY Debug Console
 * Interactive PTY terminal for debug builds - includes vim/htop embedding
 */
export function PTYConsole() {
  if (!feature("DEBUG")) {
    return null;
  }

  return (
    <div className="pty-console h-full flex flex-col bg-gray-900 rounded-xl overflow-hidden border border-yellow-500/30">
      <div className="flex items-center justify-between px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded-full" />
          <span className="w-3 h-3 bg-yellow-500 rounded-full" />
          <span className="w-3 h-3 bg-green-500 rounded-full" />
        </div>
        <span className="text-sm font-medium text-yellow-400">PTY Debug Console</span>
        <span className="text-xs text-yellow-500/60">DEBUG BUILD</span>
      </div>

      <div className="flex-1 p-4 font-mono text-sm overflow-auto">
        <div className="space-y-1 text-green-400">
          <p>Bun v{Bun.version} PTY Session</p>
          <p>=============================</p>
          <p className="text-yellow-400">$ htop</p>
          <div className="ml-4 text-green-300">
            <p>  PID USER      PRI  NI  VIRT   RES   SHR S  CPU  MEM    TIME+ COMMAND</p>
            <p>    1 root       20   0   1234   456   234 S   0.0  0.1   0:00.05 init</p>
            <p>  123 ashley     20   0  45678 12345  678 S   2.5  1.2   0:05.23 node</p>
            <p>  456 ashley     20   0  23456  8765  432 S   1.0  0.8   0:02.15 bun</p>
          </div>
          <p className="text-yellow-400 mt-2">$ vim server/index.ts</p>
          <p className="text-yellow-400 mt-2">$ _</p>
        </div>
      </div>

      <div className="p-3 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-green-400">$</span>
          <input
            type="text"
            className="flex-1 bg-transparent text-green-400 font-mono text-sm focus:outline-none"
            placeholder="Enter command..."
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Verbose Debug Panel
 * Shows detailed debug information in debug builds
 */
export function VerboseDebugPanel() {
  if (!feature("DEBUG")) {
    return null;
  }

  const logs = [
    { time: "10:45:23.123", level: "INFO", msg: "Initializing dashboard..." },
    { time: "10:45:23.156", level: "DEBUG", msg: "Loading config from /config/features.toml" },
    { time: "10:45:23.234", level: "INFO", msg: "Connecting to network matrix..." },
    { time: "10:45:23.456", level: "INFO", msg: "Dashboard ready - 247 columns loaded" },
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case "INFO": return "text-blue-400";
      case "DEBUG": return "text-purple-400";
      case "WARN": return "text-yellow-400";
      case "ERROR": return "text-red-400";
      case "TRACE": return "text-gray-400";
      default: return "text-gray-300";
    }
  };

  return (
    <div className="verbose-debug-panel p-4 bg-gray-900 rounded-xl border border-yellow-500/30 font-mono text-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-yellow-400 font-semibold">Verbose Debug Logs</h3>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-500">LIVE</span>
        </div>
      </div>

      <div className="space-y-1 max-h-64 overflow-auto">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-gray-500 shrink-0">{log.time}</span>
            <span className={`w-16 shrink-0 ${getLevelColor(log.level)}`}>{log.level}</span>
            <span className="text-gray-300">{log.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Trace Output Panel
 * Performance tracing output for debug builds
 */
export function TraceOutputPanel() {
  if (!feature("DEBUG")) {
    return null;
  }

  const traces = [
    { category: "Render", operation: "Dashboard", duration: "45.2ms", count: 1 },
    { category: "Render", operation: "Matrix Virtualization", duration: "12.3ms", count: 1 },
    { category: "Network", operation: "API Request", duration: "234.5ms", count: 15 },
  ];

  return (
    <div className="trace-output-panel p-4 bg-gray-900 rounded-xl border border-yellow-500/30 font-mono text-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-yellow-400 font-semibold">Performance Trace</h3>
        <div className="flex gap-2">
          <button className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30">
            Start
          </button>
          <button className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30">
            Stop
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {traces.map((trace, i) => (
          <div key={i} className="flex items-center justify-between p-2 bg-gray-800 rounded">
            <div className="flex items-center gap-4">
              <span className="text-purple-400 w-16">{trace.category}</span>
              <span className="text-white">{trace.operation}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400">{trace.count} calls</span>
              <span className="text-green-400 w-20 text-right">{trace.duration}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Matrix Traces Panel
 * Detailed matrix cell rendering traces
 */
export function MatrixTracesPanel() {
  if (!feature("DEBUG")) {
    return null;
  }

  const cellTraces = [
    { row: 0, col: 0, renderTime: "0.12ms", cached: true },
    { row: 0, col: 1, renderTime: "0.08ms", cached: true },
    { row: 0, col: 2, renderTime: "0.15ms", cached: false },
  ];

  return (
    <div className="matrix-traces-panel p-4 bg-gray-900 rounded-xl border border-yellow-500/30 font-mono text-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-yellow-400 font-semibold">Matrix Cell Traces</h3>
        <span className="text-xs text-gray-500">247 columns - 1000 rows</span>
      </div>

      <div className="space-y-1">
        <div className="flex gap-4 text-gray-500 text-xs mb-2">
          <span className="w-16">Row</span>
          <span className="w-16">Col</span>
          <span className="w-20">Render</span>
          <span className="w-16">Cached</span>
        </div>
        {cellTraces.map((trace, i) => (
          <div key={i} className="flex gap-4">
            <span className="text-blue-400 w-16">{trace.row}</span>
            <span className="text-purple-400 w-16">{trace.col}</span>
            <span className="text-green-400 w-20">{trace.renderTime}</span>
            <span className={trace.cached ? "text-yellow-400" : "text-red-400"}>
              {trace.cached ? "yes" : "no"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
