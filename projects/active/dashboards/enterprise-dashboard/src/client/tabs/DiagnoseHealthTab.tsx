/**
 * DiagnoseHealthTab - Project Health Dashboard
 * Visual health scores, painpoints, grades, and benchmarks
 * January 23, 2026
 */

import React, { useState, useEffect, useCallback } from "react";
import { showGlobalToast } from "../hooks/useToast";

// ============================================
// Types
// ============================================

interface ProjectData {
  name: string;
  path: string;
  version?: string;
  branch?: string;
  diskSize?: string;
  git?: {
    totalCommits: number;
    lastCommit: string;
    commits30d: number;
    uncommitted: number;
    ahead: number;
    behind: number;
    contributors: number;
  };
  code?: {
    tsFiles: number;
    tsLines: number;
    testFiles: number;
    avgLinesPerFile: number;
  };
  deps?: {
    total: number;
    prod: number;
    dev: number;
  };
}

interface DiagnoseResult {
  project: string;
  scores: {
    git: number;
    code: number;
    perf: number;
    deps: number;
    overall: number;
  };
  grade: string;
  painpoints: Painpoint[];
  strengths: string[];
}

interface Painpoint {
  severity: "critical" | "high" | "medium" | "low";
  issue: string;
  recommendation: string;
  score: number;
}

interface BenchmarkResult {
  project: string;
  path: string;
  startup: { cold: number; warm: number; avg: number };
  build?: { time: number; outputSize: string };
  tests?: { time: number; passed: number; failed: number; skipped: number };
  bundle?: { size: string; gzipped: string; modules: number };
  memory: { heapUsed: string; heapTotal: string; rss: string };
  score: number;
}

// ============================================
// Component
// ============================================

export function DiagnoseHealthTab() {
  const [activeView, setActiveView] = useState<"health" | "grades" | "painpoints" | "benchmark">("health");
  const [loading, setLoading] = useState(false);
  const [projectPath, setProjectPath] = useState("~/Projects");

  // Data states
  const [healthData, setHealthData] = useState<{ projects: ProjectData[]; results: DiagnoseResult[] } | null>(null);
  const [gradesData, setGradesData] = useState<{ projects: ProjectData[]; results: DiagnoseResult[] } | null>(null);
  const [painpointsData, setPainpointsData] = useState<{ projects: ProjectData[]; results: DiagnoseResult[] } | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkResult[] | null>(null);

  // Listen for shortcut events
  useEffect(() => {
    const handleDiagnoseAction = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      switch (customEvent.detail) {
        case "diagnose-health":
          setActiveView("health");
          fetchHealth();
          break;
        case "diagnose-grade":
          setActiveView("grades");
          fetchGrades();
          break;
        case "diagnose-painpoints":
          setActiveView("painpoints");
          fetchPainpoints();
          break;
        case "diagnose-benchmark":
          setActiveView("benchmark");
          fetchBenchmark();
          break;
        case "diagnose-clear-cache":
          clearCache();
          break;
      }
    };

    window.addEventListener("diagnose-action", handleDiagnoseAction);
    return () => window.removeEventListener("diagnose-action", handleDiagnoseAction);
  }, [projectPath]);

  // Fetch functions
  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/diagnose/health?path=${encodeURIComponent(projectPath)}`);
      const json = await res.json();
      if (json.data?.success) {
        setHealthData(json.data.data);
        showGlobalToast("Health data loaded", "success");
      } else {
        showGlobalToast(`Failed: ${json.data?.error || "Unknown error"}`, "error");
      }
    } catch (error) {
      showGlobalToast(`Error: ${error instanceof Error ? error.message : "Unknown"}`, "error");
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  const fetchGrades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/diagnose/grade?path=${encodeURIComponent(projectPath)}`);
      const json = await res.json();
      if (json.data?.success) {
        setGradesData(json.data.data);
        showGlobalToast("Grades loaded", "success");
      } else {
        showGlobalToast(`Failed: ${json.data?.error || "Unknown error"}`, "error");
      }
    } catch (error) {
      showGlobalToast(`Error: ${error instanceof Error ? error.message : "Unknown"}`, "error");
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  const fetchPainpoints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/diagnose/painpoints?path=${encodeURIComponent(projectPath)}`);
      const json = await res.json();
      if (json.data?.success) {
        setPainpointsData(json.data.data);
        showGlobalToast("Painpoints loaded", "success");
      } else {
        showGlobalToast(`Failed: ${json.data?.error || "Unknown error"}`, "error");
      }
    } catch (error) {
      showGlobalToast(`Error: ${error instanceof Error ? error.message : "Unknown"}`, "error");
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  const fetchBenchmark = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/diagnose/benchmark?path=${encodeURIComponent(projectPath)}&quick=true`);
      const json = await res.json();
      if (json.data?.success) {
        setBenchmarkData(json.data.data);
        showGlobalToast("Benchmark complete", "success");
      } else {
        showGlobalToast(`Failed: ${json.data?.error || "Unknown error"}`, "error");
      }
    } catch (error) {
      showGlobalToast(`Error: ${error instanceof Error ? error.message : "Unknown"}`, "error");
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  const clearCache = useCallback(async () => {
    try {
      const res = await fetch("/api/diagnose/cache/clear", { method: "POST" });
      const json = await res.json();
      showGlobalToast(json.data?.message || "Cache cleared", "success");
    } catch (error) {
      showGlobalToast("Failed to clear cache", "error");
    }
  }, []);

  // Load initial data
  useEffect(() => {
    fetchHealth();
  }, []);

  // ============================================
  // Render Helpers
  // ============================================

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "text-green-500";
    if (grade.startsWith("B")) return "text-blue-500";
    if (grade.startsWith("C")) return "text-yellow-500";
    if (grade.startsWith("D")) return "text-orange-500";
    return "text-red-500";
  };

  const getSeverityColor = (severity: Painpoint["severity"]) => {
    switch (severity) {
      case "critical": return "bg-red-500/20 text-red-400 border-red-500/50";
      case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/50";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "low": return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    }
  };

  const getScoreBar = (score: number, max = 10) => {
    const pct = (score / max) * 100;
    const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500";
    return (
      <div className="w-24 h-2 bg-theme-border rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  // ============================================
  // Views
  // ============================================

  const renderHealthView = () => {
    if (!healthData?.results?.length) {
      return <div className="text-theme-muted text-center py-12">No health data. Click "Run Health Check" to start.</div>;
    }

    const result = healthData.results[0];
    const project = healthData.projects[0];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-theme">{project.name}</h3>
            <p className="text-theme-muted text-sm">{project.path}</p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${getGradeColor(result.grade)}`}>{result.grade}</div>
            <div className="text-theme-muted text-sm">{result.scores.overall.toFixed(1)}/10</div>
          </div>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-4 gap-4">
          {(["git", "code", "perf", "deps"] as const).map((key) => (
            <div key={key} className="bg-theme-surface rounded-lg p-4 border border-theme-border">
              <div className="text-theme-muted text-xs uppercase mb-2">
                {key === "git" ? "Git Health" : key === "code" ? "Code Quality" : key === "perf" ? "Performance" : "Dependencies"}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-theme">{result.scores[key].toFixed(1)}</span>
                {getScoreBar(result.scores[key])}
              </div>
            </div>
          ))}
        </div>

        {/* Project Info */}
        {project.git && (
          <div className="bg-theme-surface rounded-lg p-4 border border-theme-border">
            <h4 className="font-semibold text-theme mb-3">Project Metrics</h4>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div><span className="text-theme-muted">Branch:</span> <span className="text-theme">{project.branch}</span></div>
              <div><span className="text-theme-muted">Commits (30d):</span> <span className="text-theme">{project.git.commits30d}</span></div>
              <div><span className="text-theme-muted">Uncommitted:</span> <span className="text-theme">{project.git.uncommitted}</span></div>
              <div><span className="text-theme-muted">Contributors:</span> <span className="text-theme">{project.git.contributors}</span></div>
              {project.code && (
                <>
                  <div><span className="text-theme-muted">TS Files:</span> <span className="text-theme">{project.code.tsFiles}</span></div>
                  <div><span className="text-theme-muted">TS Lines:</span> <span className="text-theme">{project.code.tsLines.toLocaleString()}</span></div>
                  <div><span className="text-theme-muted">Test Files:</span> <span className="text-theme">{project.code.testFiles}</span></div>
                  <div><span className="text-theme-muted">Avg Lines/File:</span> <span className="text-theme">{project.code.avgLinesPerFile}</span></div>
                </>
              )}
              {project.deps && (
                <>
                  <div><span className="text-theme-muted">Dependencies:</span> <span className="text-theme">{project.deps.total}</span></div>
                  <div><span className="text-theme-muted">Prod Deps:</span> <span className="text-theme">{project.deps.prod}</span></div>
                  <div><span className="text-theme-muted">Dev Deps:</span> <span className="text-theme">{project.deps.dev}</span></div>
                  <div><span className="text-theme-muted">Disk Size:</span> <span className="text-theme">{project.diskSize}</span></div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Painpoints */}
        {result.painpoints.length > 0 && (
          <div className="bg-theme-surface rounded-lg p-4 border border-theme-border">
            <h4 className="font-semibold text-theme mb-3">Issues Found ({result.painpoints.length})</h4>
            <div className="space-y-2">
              {result.painpoints.slice(0, 5).map((p, i) => (
                <div key={i} className={`px-3 py-2 rounded border ${getSeverityColor(p.severity)}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.issue}</span>
                    <span className="text-xs uppercase">{p.severity}</span>
                  </div>
                  <div className="text-xs opacity-75 mt-1">{p.recommendation}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths */}
        {result.strengths.length > 0 && (
          <div className="bg-theme-surface rounded-lg p-4 border border-theme-border">
            <h4 className="font-semibold text-theme mb-3">Strengths</h4>
            <div className="flex flex-wrap gap-2">
              {result.strengths.map((s, i) => (
                <span key={i} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGradesView = () => {
    if (!gradesData?.results?.length) {
      return <div className="text-theme-muted text-center py-12">No grades data. Click "Load Grades" to start.</div>;
    }

    const sorted = [...gradesData.results].sort((a, b) => b.scores.overall - a.scores.overall);

    return (
      <div className="space-y-4">
        <div className="text-sm text-theme-muted mb-4">
          {sorted.length} projects | Avg: {(sorted.reduce((a, r) => a + r.scores.overall, 0) / sorted.length).toFixed(1)}/10
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-theme-border text-left">
                <th className="pb-2 text-theme-muted">#</th>
                <th className="pb-2 text-theme-muted">Project</th>
                <th className="pb-2 text-theme-muted">Grade</th>
                <th className="pb-2 text-theme-muted">Score</th>
                <th className="pb-2 text-theme-muted">Git</th>
                <th className="pb-2 text-theme-muted">Code</th>
                <th className="pb-2 text-theme-muted">Perf</th>
                <th className="pb-2 text-theme-muted">Deps</th>
                <th className="pb-2 text-theme-muted">Issues</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.project} className="border-b border-theme-border/50 hover:bg-theme-hover">
                  <td className="py-2 text-theme-muted">{i + 1}</td>
                  <td className="py-2 text-theme font-medium">{r.project}</td>
                  <td className={`py-2 font-bold ${getGradeColor(r.grade)}`}>{r.grade}</td>
                  <td className="py-2 text-theme">{r.scores.overall.toFixed(2)}</td>
                  <td className="py-2">{getScoreBar(r.scores.git)}</td>
                  <td className="py-2">{getScoreBar(r.scores.code)}</td>
                  <td className="py-2">{getScoreBar(r.scores.perf)}</td>
                  <td className="py-2">{getScoreBar(r.scores.deps)}</td>
                  <td className="py-2 text-theme-muted">{r.painpoints.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPainpointsView = () => {
    if (!painpointsData?.results?.length) {
      return <div className="text-theme-muted text-center py-12">No painpoints data. Click "Load Painpoints" to start.</div>;
    }

    // Collect all painpoints across projects
    const allPainpoints = painpointsData.results.flatMap((r) =>
      r.painpoints.map((p) => ({ ...p, project: r.project }))
    );

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = allPainpoints.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const counts = {
      critical: sorted.filter((p) => p.severity === "critical").length,
      high: sorted.filter((p) => p.severity === "high").length,
      medium: sorted.filter((p) => p.severity === "medium").length,
      low: sorted.filter((p) => p.severity === "low").length,
    };

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="flex gap-4 text-sm">
          <span className="text-red-400">{counts.critical} critical</span>
          <span className="text-orange-400">{counts.high} high</span>
          <span className="text-yellow-400">{counts.medium} medium</span>
          <span className="text-blue-400">{counts.low} low</span>
        </div>

        {/* Painpoints List */}
        <div className="space-y-2">
          {sorted.slice(0, 20).map((p, i) => (
            <div key={i} className={`px-4 py-3 rounded-lg border ${getSeverityColor(p.severity)}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-theme">{p.issue}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-theme-muted">{p.project}</span>
                  <span className="text-xs uppercase px-2 py-0.5 rounded">{p.severity}</span>
                </div>
              </div>
              <div className="text-sm opacity-75">{p.recommendation}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBenchmarkView = () => {
    if (!benchmarkData?.length) {
      return <div className="text-theme-muted text-center py-12">No benchmark data. Click "Run Benchmark" to start.</div>;
    }

    const sorted = [...benchmarkData].sort((a, b) => b.score - a.score);

    return (
      <div className="space-y-4">
        <div className="text-sm text-theme-muted mb-4">
          {sorted.length} projects benchmarked | Avg score: {Math.round(sorted.reduce((a, r) => a + r.score, 0) / sorted.length)}/100
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-theme-border text-left">
                <th className="pb-2 text-theme-muted">#</th>
                <th className="pb-2 text-theme-muted">Project</th>
                <th className="pb-2 text-theme-muted">Score</th>
                <th className="pb-2 text-theme-muted">Cold Start</th>
                <th className="pb-2 text-theme-muted">Warm Start</th>
                <th className="pb-2 text-theme-muted">Avg</th>
                <th className="pb-2 text-theme-muted">Rating</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const rating = r.startup.avg < 100 ? "Fast" : r.startup.avg < 500 ? "OK" : "Slow";
                const ratingColor = r.startup.avg < 100 ? "text-green-500" : r.startup.avg < 500 ? "text-yellow-500" : "text-red-500";
                return (
                  <tr key={r.project} className="border-b border-theme-border/50 hover:bg-theme-hover">
                    <td className="py-2 text-theme-muted">{i + 1}</td>
                    <td className="py-2 text-theme font-medium">{r.project}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-theme">{r.score}</span>
                        {getScoreBar(r.score, 100)}
                      </div>
                    </td>
                    <td className="py-2 text-theme">{r.startup.cold < 1 ? "<1ms" : `${Math.round(r.startup.cold)}ms`}</td>
                    <td className="py-2 text-theme">{r.startup.warm < 1 ? "<1ms" : `${Math.round(r.startup.warm)}ms`}</td>
                    <td className="py-2 text-theme">{r.startup.avg < 1 ? "<1ms" : `${Math.round(r.startup.avg)}ms`}</td>
                    <td className={`py-2 font-medium ${ratingColor}`}>{rating}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================
  // Main Render
  // ============================================

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-theme">Project Diagnostics</h2>
          <p className="text-sm text-theme-muted mt-1">
            Health analysis, grades, painpoints, and performance benchmarks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            placeholder="Project path..."
            className="px-3 py-2 bg-theme-surface border border-theme-border rounded-lg text-theme text-sm w-64"
          />
          <button
            onClick={clearCache}
            className="px-3 py-2 bg-theme-surface border border-theme-border rounded-lg text-theme-muted hover:text-theme text-sm"
            title="Clear cache"
          >
            Clear Cache
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-theme-border pb-2">
        {(["health", "grades", "painpoints", "benchmark"] as const).map((view) => (
          <button
            key={view}
            onClick={() => {
              setActiveView(view);
              if (view === "health" && !healthData) fetchHealth();
              if (view === "grades" && !gradesData) fetchGrades();
              if (view === "painpoints" && !painpointsData) fetchPainpoints();
              if (view === "benchmark" && !benchmarkData) fetchBenchmark();
            }}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeView === view
                ? "bg-theme-accent text-white"
                : "text-theme-muted hover:text-theme hover:bg-theme-hover"
            }`}
          >
            {view === "health" ? "Health" : view === "grades" ? "Grades" : view === "painpoints" ? "Painpoints" : "Benchmark"}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {activeView === "health" && (
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="px-4 py-2 bg-theme-accent text-white rounded-lg text-sm hover:bg-theme-accent/90 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Run Health Check"}
          </button>
        )}
        {activeView === "grades" && (
          <button
            onClick={fetchGrades}
            disabled={loading}
            className="px-4 py-2 bg-theme-accent text-white rounded-lg text-sm hover:bg-theme-accent/90 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load Grades"}
          </button>
        )}
        {activeView === "painpoints" && (
          <button
            onClick={fetchPainpoints}
            disabled={loading}
            className="px-4 py-2 bg-theme-accent text-white rounded-lg text-sm hover:bg-theme-accent/90 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load Painpoints"}
          </button>
        )}
        {activeView === "benchmark" && (
          <button
            onClick={fetchBenchmark}
            disabled={loading}
            className="px-4 py-2 bg-theme-accent text-white rounded-lg text-sm hover:bg-theme-accent/90 disabled:opacity-50"
          >
            {loading ? "Running..." : "Run Benchmark"}
          </button>
        )}
        <span className="text-xs text-theme-muted self-center ml-2">
          Shortcuts: <kbd className="px-1 bg-theme-surface rounded">d h</kbd> health,{" "}
          <kbd className="px-1 bg-theme-surface rounded">d g</kbd> grades,{" "}
          <kbd className="px-1 bg-theme-surface rounded">d p</kbd> painpoints,{" "}
          <kbd className="px-1 bg-theme-surface rounded">d b</kbd> benchmark
        </span>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-theme-accent border-t-transparent rounded-full" />
          </div>
        )}
        {!loading && activeView === "health" && renderHealthView()}
        {!loading && activeView === "grades" && renderGradesView()}
        {!loading && activeView === "painpoints" && renderPainpointsView()}
        {!loading && activeView === "benchmark" && renderBenchmarkView()}
      </div>
    </div>
  );
}

export default DiagnoseHealthTab;
