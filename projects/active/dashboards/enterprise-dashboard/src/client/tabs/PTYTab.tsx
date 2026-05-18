/**
 * PTYTab - Interactive Terminal Session Management
 *
 * Provides a UI for:
 * - Creating new PTY sessions (bash, sh, etc.)
 * - Viewing session output in a terminal-like display
 * - Writing input to sessions
 * - Quick command execution
 * - Session statistics
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { showGlobalToast } from "../hooks/useToast";
import type { ApiResponse, PTYSession, PTYStats } from "../../types";

export function PTYTab() {
  const [sessions, setSessions] = useState<PTYSession[]>([]);
  const [stats, setStats] = useState<PTYStats | null>(null);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [sessionOutput, setSessionOutput] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [command, setCommand] = useState("bash");
  const [input, setInput] = useState("");
  const [quickCommand, setQuickCommand] = useState("");
  const [quickResult, setQuickResult] = useState<{ output: string; exitCode: number; durationMs: number } | null>(null);

  const outputRef = useRef<HTMLDivElement>(null);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch sessions list
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/pty/sessions");
      const data: ApiResponse<{ sessions: PTYSession[] }> = await res.json();
      if (data.data) {
        setSessions(data.data.sessions);
      }
    } catch (error: any) {
      console.error("Failed to fetch sessions:", error);
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/pty/stats");
      const data: ApiResponse<PTYStats> = await res.json();
      if (data.data) {
        setStats(data.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  // Fetch session output
  const fetchOutput = useCallback(async (sessionId: string, fromLine = 0) => {
    try {
      const res = await fetch(`/api/pty/session/${sessionId}/output?from=${fromLine}`);
      const data: ApiResponse<{ output: string[]; fromLine: number; lineCount: number }> = await res.json();
      if (data.data) {
        setSessionOutput(prev => fromLine === 0 ? data.data!.output : [...prev, ...data.data!.output]);
      }
    } catch (error: any) {
      console.error("Failed to fetch output:", error);
    }
  }, []);

  // Create new session
  const createSession = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pty/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, args: [], cols: 120, rows: 40 }),
      });
      const data: ApiResponse<PTYSession> = await res.json();
      if (data.data) {
        showGlobalToast(`Session created: ${data.data.id.slice(0, 8)}...`, "success");
        setActiveSession(data.data.id);
        setSessionOutput([]);
        fetchSessions();
        fetchStats();
      } else if (data.error) {
        showGlobalToast(data.error, "error");
      }
    } catch (error: any) {
      showGlobalToast(`Failed to create session: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Write to session
  const writeToSession = async () => {
    if (!activeSession || !input) return;
    try {
      await fetch(`/api/pty/session/${activeSession}/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: input + "\n" }),
      });
      setInput("");
      // Fetch output after small delay
      setTimeout(() => fetchOutput(activeSession, sessionOutput.length), 100);
    } catch (error: any) {
      showGlobalToast(`Failed to write: ${error.message}`, "error");
    }
  };

  // Kill session
  const killSession = async (sessionId: string) => {
    try {
      await fetch(`/api/pty/session/${sessionId}/kill`, { method: "POST" });
      showGlobalToast("Session killed", "info");
      fetchSessions();
      fetchStats();
      if (activeSession === sessionId) {
        setActiveSession(null);
        setSessionOutput([]);
      }
    } catch (error: any) {
      showGlobalToast(`Failed to kill session: ${error.message}`, "error");
    }
  };

  // Remove session
  const removeSession = async (sessionId: string) => {
    try {
      await fetch(`/api/pty/session/${sessionId}`, { method: "DELETE" });
      showGlobalToast("Session removed", "info");
      fetchSessions();
      fetchStats();
      if (activeSession === sessionId) {
        setActiveSession(null);
        setSessionOutput([]);
      }
    } catch (error: any) {
      showGlobalToast(`Failed to remove session: ${error.message}`, "error");
    }
  };

  // Quick exec
  const execQuickCommand = async () => {
    if (!quickCommand.trim()) return;
    setLoading(true);
    setQuickResult(null);
    try {
      const [cmd, ...args] = quickCommand.trim().split(/\s+/);
      const res = await fetch("/api/pty/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd, args, timeout: 30000 }),
      });
      const data: ApiResponse<{ output: string; exitCode: number; durationMs: number }> = await res.json();
      if (data.data) {
        setQuickResult(data.data);
      } else if (data.error) {
        showGlobalToast(data.error, "error");
      }
    } catch (error: any) {
      showGlobalToast(`Exec failed: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Poll output for active session
  useEffect(() => {
    if (activeSession) {
      fetchOutput(activeSession, 0);
      pollInterval.current = setInterval(() => {
        fetchOutput(activeSession, sessionOutput.length);
      }, 1000);
    }
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
    };
  }, [activeSession]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [sessionOutput]);

  // Initial fetch
  useEffect(() => {
    fetchSessions();
    fetchStats();
    const interval = setInterval(() => {
      fetchSessions();
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchSessions, fetchStats]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <section className="tab-content space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">PTY Terminal Sessions</h2>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-mono rounded bg-purple-500/20 text-purple-400">
            Bun.Terminal
          </span>
          <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400">
            {stats?.activeSessions ?? 0} active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Sessions List */}
        <div className="space-y-4">
          {/* Create Session */}
          <div className="bg-theme-secondary rounded-xl p-4 border border-theme">
            <h3 className="font-medium mb-3">New Session</h3>
            <div className="flex gap-2">
              <select
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-theme-tertiary border border-theme text-sm"
              >
                <option value="bash">bash</option>
                <option value="sh">sh</option>
                <option value="zsh">zsh</option>
              </select>
              <button
                onClick={createSession}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>

          {/* Sessions List */}
          <div className="bg-theme-secondary rounded-xl p-4 border border-theme">
            <h3 className="font-medium mb-3">Sessions ({sessions.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sessions.length === 0 ? (
                <p className="text-sm text-theme-muted text-center py-4">No sessions</p>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      activeSession === session.id
                        ? "bg-purple-500/20 border border-purple-500/50"
                        : "bg-theme-tertiary hover:bg-theme-tertiary/80"
                    }`}
                    onClick={() => {
                      setActiveSession(session.id);
                      setSessionOutput([]);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-xs font-mono text-theme-secondary">
                        {session.id.slice(0, 8)}...
                      </code>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] rounded ${
                          session.status === "running"
                            ? "bg-green-500/20 text-green-400"
                            : session.status === "exited"
                            ? "bg-gray-500/20 text-gray-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {session.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-theme-muted">
                      <span>{session.command}</span>
                      <span>{session.outputLines} lines</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {session.status === "running" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            killSession(session.id);
                          }}
                          className="px-2 py-1 text-[10px] bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                        >
                          Kill
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSession(session.id);
                        }}
                        className="px-2 py-1 text-[10px] bg-gray-500/20 text-gray-400 rounded hover:bg-gray-500/30"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="bg-theme-secondary rounded-xl p-4 border border-theme">
              <h3 className="font-medium mb-3">Stats</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-theme-tertiary rounded">
                  <div className="text-theme-muted text-xs">Total Created</div>
                  <div className="font-mono">{stats.totalCreated}</div>
                </div>
                <div className="p-2 bg-theme-tertiary rounded">
                  <div className="text-theme-muted text-xs">Peak Concurrent</div>
                  <div className="font-mono">{stats.peakConcurrent}</div>
                </div>
                <div className="p-2 bg-theme-tertiary rounded">
                  <div className="text-theme-muted text-xs">Total Output</div>
                  <div className="font-mono">{formatBytes(stats.totalBytes)}</div>
                </div>
                <div className="p-2 bg-theme-tertiary rounded">
                  <div className="text-theme-muted text-xs">Avg Duration</div>
                  <div className="font-mono">{formatDuration(stats.avgSessionDurationMs)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Middle Column - Terminal Output */}
        <div className="lg:col-span-2 space-y-4">
          {/* Terminal Output */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-sm text-gray-400 font-mono">
                  {activeSession ? `Session: ${activeSession.slice(0, 8)}...` : "No session selected"}
                </span>
              </div>
              {activeSession && (
                <span className="text-xs text-gray-500">{sessionOutput.length} lines</span>
              )}
            </div>
            <div
              ref={outputRef}
              className="p-4 h-80 overflow-y-auto font-mono text-sm text-green-400 bg-gray-950"
            >
              {activeSession ? (
                sessionOutput.length > 0 ? (
                  sessionOutput.map((line, i) => (
                    <div key={i} className="whitespace-pre-wrap break-all">
                      {line}
                    </div>
                  ))
                ) : (
                  <span className="text-gray-500">Waiting for output...</span>
                )
              ) : (
                <span className="text-gray-500">Select or create a session to view output</span>
              )}
            </div>
            {activeSession && (
              <div className="flex gap-2 p-2 bg-gray-800 border-t border-gray-700">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && writeToSession()}
                  placeholder="Type command and press Enter..."
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={writeToSession}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors"
                >
                  Send
                </button>
              </div>
            )}
          </div>

          {/* Quick Exec */}
          <div className="bg-theme-secondary rounded-xl p-4 border border-theme">
            <h3 className="font-medium mb-3">Quick Execute</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={quickCommand}
                onChange={(e) => setQuickCommand(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && execQuickCommand()}
                placeholder="ls -la, ps aux, df -h..."
                className="flex-1 px-3 py-2 bg-theme-tertiary border border-theme rounded-lg text-sm font-mono focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={execQuickCommand}
                disabled={loading || !quickCommand.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Run
              </button>
            </div>
            {quickResult && (
              <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm">
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className={quickResult.exitCode === 0 ? "text-green-400" : "text-red-400"}>
                    Exit: {quickResult.exitCode}
                  </span>
                  <span className="text-gray-500">{quickResult.durationMs.toFixed(1)}ms</span>
                </div>
                <pre className="text-green-400 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                  {quickResult.output || "(no output)"}
                </pre>
              </div>
            )}
          </div>

          {/* Preset Commands */}
          <div className="bg-theme-secondary rounded-xl p-4 border border-theme">
            <h3 className="font-medium mb-3">Quick Commands</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "ls -la", cmd: "ls -la" },
                { label: "ps aux", cmd: "ps aux" },
                { label: "df -h", cmd: "df -h" },
                { label: "uptime", cmd: "uptime" },
                { label: "whoami", cmd: "whoami" },
                { label: "pwd", cmd: "pwd" },
                { label: "free -m", cmd: "free -m" },
                { label: "uname -a", cmd: "uname -a" },
              ].map(({ label, cmd }) => (
                <button
                  key={cmd}
                  onClick={() => {
                    setQuickCommand(cmd);
                    setTimeout(execQuickCommand, 0);
                  }}
                  className="px-3 py-1.5 text-xs bg-theme-tertiary hover:bg-theme-tertiary/80 rounded-lg font-mono transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PTYTab;
