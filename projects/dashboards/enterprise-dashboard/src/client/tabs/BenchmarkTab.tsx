import { useState, useEffect, useCallback } from "react";
import { showGlobalToast } from "../hooks/useToast";
import type { ApiResponse, Benchmark, BenchmarkResult, RouteBenchmarkResult, ProjectBenchmarkResult } from "../types";

export function BenchmarkTab() {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState<Benchmark | null>(null);
  const [results, setResults] = useState<BenchmarkResult[] | RouteBenchmarkResult | ProjectBenchmarkResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<"runtime" | "route" | "project" | "all">("all");
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [routes, setRoutes] = useState<Array<{ path: string; methods: string[]; group: string }>>([]);
  const [testSeed, setTestSeed] = useState<number | null>(null);
  const [useTestSeed, setUseTestSeed] = useState(false);

  // Fetch benchmarks list
  const fetchBenchmarks = useCallback(async () => {
    try {
      const res = await fetch("/api/benchmarks");
      const data: ApiResponse<Benchmark[]> = await res.json();
      if (data.data) {
        setBenchmarks(data.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch benchmarks:", error);
      showGlobalToast("Failed to load benchmarks", "error");
    }
  }, []);

  // Fetch projects list for project benchmarks
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data: ApiResponse<any[]> = await res.json();
      if (data.data) {
        // Use project name (not ID) for benchmarking since getRepoPath expects name
        setProjects(data.data.map((p: any) => ({ id: p.name, name: p.name })));
      }
    } catch (error: any) {
      console.error("Failed to fetch projects:", error);
    }
  }, []);

  // Fetch routes from topology API
  const fetchRoutes = useCallback(async () => {
    try {
      const res = await fetch("/api/topology");
      const data: ApiResponse<any> = await res.json();
      if (data.data && data.data.routes) {
        setRoutes(data.data.routes);
      }
    } catch (error: any) {
      console.error("Failed to fetch routes:", error);
    }
  }, []);

  // Generate test seed
  const generateTestSeed = useCallback(async () => {
    try {
      const res = await fetch("/api/benchmarks/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data: ApiResponse<{ seed: number; generator: any }> = await res.json();
      if (data.data) {
        setTestSeed(data.data.seed);
        setUseTestSeed(true);
        showGlobalToast(`Test seed generated: ${data.data.seed}`, "success");
      }
    } catch (error: any) {
      showGlobalToast(`Failed to generate seed: ${error.message}`, "error");
    }
  }, []);

  useEffect(() => {
    fetchBenchmarks();
    fetchProjects();
    fetchRoutes();
  }, [fetchBenchmarks, fetchProjects, fetchRoutes]);

  // Get routes from topology for route benchmarks
  const routeOptions = routes.map(r => ({
    value: r.path,
    label: `${r.methods.join(", ")} ${r.path} (${r.group})`,
  }));

  // Filter benchmarks by category
  const filteredBenchmarks = benchmarks.filter(b => 
    selectedCategory === "all" || b.category === selectedCategory
  );

  // Run benchmark
  const runBenchmark = useCallback(async () => {
    if (!selectedBenchmark) return;

    setIsRunning(true);
    setResults(null);

    try {
      const body: any = {};
      if (selectedBenchmark.category === "route" && selectedRoute) {
        body.route = selectedRoute;
        body.method = "GET";
      } else if (selectedBenchmark.category === "project" && selectedProject) {
        body.projectId = selectedProject;
      }

      const bodyWithSeed: any = { ...body };
      if (useTestSeed && testSeed !== null) {
        bodyWithSeed.testSeed = testSeed;
      }

      const res = await fetch(`/api/benchmarks/${selectedBenchmark.name}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyWithSeed),
      });

      const data: ApiResponse<any> = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.data) {
        setResults(data.data);
        setHistory(prev => [{ benchmark: selectedBenchmark.name, results: data.data, timestamp: new Date() }, ...prev].slice(0, 10));
        showGlobalToast("Benchmark completed successfully", "success");
      }
    } catch (error: any) {
      console.error("Benchmark failed:", error);
      showGlobalToast(`Benchmark failed: ${error.message}`, "error");
    } finally {
      setIsRunning(false);
    }
  }, [selectedBenchmark, selectedRoute, selectedProject]);

  // Navigate to topology with route selected
  const viewInTopology = useCallback((route: string) => {
    window.dispatchEvent(new CustomEvent("navigate-to-topology", { detail: { route } }));
    showGlobalToast("Navigating to Topology tab", "info");
  }, []);

  const formatTime = (ns: number) => {
    if (ns < 1000) return `${ns.toFixed(2)} ns`;
    if (ns < 1_000_000) return `${(ns / 1000).toFixed(2)} µs`;
    if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)} ms`;
    return `${(ns / 1_000_000_000).toFixed(2)} s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <section className="tab-content space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Benchmarks</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={generateTestSeed}
            className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm transition-colors"
            title="Generate test seed for reproducible benchmarks"
          >
            🎲 Seed
          </button>
          {testSeed !== null && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={useTestSeed}
                  onChange={(e) => setUseTestSeed(e.target.checked)}
                  className="mr-1"
                />
                Use seed: {testSeed}
              </label>
            </div>
          )}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="px-3 py-1.5 rounded bg-gray-700 text-white text-sm border border-gray-600"
          >
            <option value="all">All Categories</option>
            <option value="runtime">Runtime</option>
            <option value="route">Routes</option>
            <option value="project">Projects</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Benchmark List */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Available Benchmarks</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredBenchmarks.map((benchmark) => (
                <button
                  key={benchmark.name}
                  onClick={() => setSelectedBenchmark(benchmark)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedBenchmark?.name === benchmark.name
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  }`}
                >
                  <div className="font-medium">{benchmark.name}</div>
                  <div className="text-xs opacity-75">{benchmark.description}</div>
                  <div className="text-xs mt-1">
                    <span className="px-1.5 py-0.5 rounded bg-gray-600">{benchmark.category}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Benchmark Details & Results */}
        <div className="lg:col-span-2 space-y-4">
          {selectedBenchmark && (
            <>
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">{selectedBenchmark.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{selectedBenchmark.description}</p>

                {/* Route selector for route benchmarks */}
                {selectedBenchmark.category === "route" && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Select Route</label>
                    <select
                      value={selectedRoute}
                      onChange={(e) => setSelectedRoute(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-gray-700 text-white text-sm border border-gray-600"
                    >
                      <option value="">Select a route...</option>
                      {routeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Project selector for project benchmarks */}
                {selectedBenchmark.category === "project" && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Select Project</label>
                    <select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-gray-700 text-white text-sm border border-gray-600"
                    >
                      <option value="">Select a project...</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={runBenchmark}
                  disabled={isRunning || (selectedBenchmark.category === "route" && !selectedRoute) || (selectedBenchmark.category === "project" && !selectedProject)}
                  className={`w-full px-4 py-2 rounded font-medium transition-colors ${
                    isRunning || (selectedBenchmark.category === "route" && !selectedRoute) || (selectedBenchmark.category === "project" && !selectedProject)
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {isRunning ? "Running..." : "Run Benchmark"}
                </button>
              </div>

              {/* Results Display */}
              {results && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Results</h3>

                  {/* Runtime benchmark results */}
                  {Array.isArray(results) && results.length > 0 && "avg" in results[0] && (
                    <div className="space-y-3">
                      {results.map((result: BenchmarkResult) => (
                        <div key={result.name} className="bg-gray-700 rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{result.name}</span>
                            <span className="text-blue-400">{formatTime(result.avg)}</span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-xs text-gray-400">
                            <div>Min: {formatTime(result.min)}</div>
                            <div>Max: {formatTime(result.max)}</div>
                            <div>P75: {formatTime(result.p75)}</div>
                            <div>P99: {formatTime(result.p99)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Route benchmark results */}
                  {"route" in results && (
                    <div className="space-y-3">
                      <div className="bg-gray-700 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{results.route}</span>
                          <button
                            onClick={() => viewInTopology(results.route)}
                            className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            View in Topology
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Response Time: <span className="text-blue-400">{results.responseTime.toFixed(2)} ms</span></div>
                          <div>P95: <span className="text-blue-400">{results.p95ResponseTime.toFixed(2)} ms</span></div>
                          <div>Status Code: <span className="text-green-400">{results.statusCode}</span></div>
                          <div>Payload Size: <span className="text-yellow-400">{formatBytes(results.payloadSize)}</span></div>
                          <div>Throughput: <span className="text-purple-400">{results.throughput.toFixed(2)} req/s</span></div>
                          <div>Error Rate: <span className={results.errorRate > 0 ? "text-red-400" : "text-green-400"}>{(results.errorRate * 100).toFixed(2)}%</span></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Project benchmark results */}
                  {"operations" in results && (
                    <div className="space-y-3">
                      <div className="bg-gray-700 rounded p-3">
                        <div className="font-medium mb-2">{results.projectName}</div>
                        <div className="text-sm text-gray-400 mb-3">Total Time: {results.totalTime.toFixed(2)} ms</div>
                        <div className="space-y-2">
                          {results.operations.map((op, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className={op.success ? "text-gray-300" : "text-red-400"}>
                                {op.operation}
                                {op.error && <span className="ml-2 text-xs">({op.error})</span>}
                              </span>
                              <span className={op.success ? "text-blue-400" : "text-red-400"}>
                                {op.time.toFixed(2)} ms
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* History */}
              {history.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Recent Runs</h3>
                  <div className="space-y-2">
                    {history.map((item, idx) => (
                      <div key={idx} className="text-sm text-gray-400">
                        {item.benchmark} - {new Date(item.timestamp).toLocaleTimeString()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!selectedBenchmark && (
            <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
              Select a benchmark to view details and run
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
